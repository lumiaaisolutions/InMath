<?php

namespace App\Bot;

use App\Core\Database;
use App\Core\Env;
use App\Servicios\AgendaServicio;
use App\Servicios\ConversacionServicio;
use App\Servicios\ProspectoServicio;

/**
 * Motor conversacional: recibe un mensaje entrante de WhatsApp, arma el contexto
 * (prompt de BD + datos del curso + historial), llama a Gemini, aplica la decisión
 * (calificación, traspaso a asesor, oferta de cita/pago) y persiste todo.
 *
 * n8n solo transporta: recibe el webhook de Meta, llama a POST /api/bot/procesar
 * y envía por WhatsApp las respuestas que este motor devuelve.
 */
final class MotorBot
{
    /**
     * @return array{prospecto_id:int, conversacion_id:int, respuestas:string[], accion:string, duplicado?:bool}
     */
    public static function procesar(string $telefono, string $contenido, array $extras = []): array
    {
        $resultado = ProspectoServicio::upsertPorTelefono($telefono, $extras);
        $prospecto = $resultado['prospecto'];
        $conversacion = ConversacionServicio::obtenerOCrear((int) $prospecto['id']);

        $registro = ConversacionServicio::registrarMensaje((int) $conversacion['id'], [
            'direccion' => 'entrante',
            'emisor' => 'prospecto',
            'contenido' => $contenido,
            'tipo' => $extras['tipo'] ?? 'texto',
            'wa_message_id' => $extras['wa_message_id'] ?? null,
        ]);
        if ($registro['duplicado']) {
            return self::salida($prospecto, $conversacion, [], 'ninguna', true);
        }

        // Conversación tomada por un asesor humano (o cerrada): el bot no interviene.
        if ($conversacion['estado'] !== 'bot') {
            return self::salida($prospecto, $conversacion, [], 'ninguna');
        }

        $decision = self::decidir($prospecto, (int) $conversacion['id']);

        if (!empty($decision['calificacion'])) {
            $prospecto = self::aplicarCalificacion($prospecto, $decision['calificacion']);
        }

        $accion = $decision['accion'];
        if ($accion === 'pasar_asesor') {
            $asignacion = ProspectoServicio::asignar((int) $prospecto['id']);
            Database::ejecutar(
                "UPDATE conversaciones SET estado = 'asesor', asesor_id = ? WHERE id = ?",
                [$asignacion['asesor_id'] ?? null, $conversacion['id']]
            );
        }

        $respuestas = [];
        if ($decision['respuesta'] !== '') {
            $respuestas[] = $decision['respuesta'];
        }
        $extraSalida = [];

        if ($accion === 'ofrecer_cita') {
            $max = (int) self::config('max_slots_ofrecidos', '6');
            $slots = AgendaServicio::slotsDisponibles(null, 7, null, $max);
            if ($slots === []) {
                $respuestas[] = 'Por el momento no tengo horarios disponibles esta semana; un asesor te contactará para coordinar. 🙂';
                $accion = 'pasar_asesor';
            } else {
                $respuestas[] = self::listarSlots($slots);
                $extraSalida['slots'] = $slots;
            }
        } elseif ($accion === 'agendar_cita') {
            [$mensajeCita, $cita] = self::intentarAgendar((int) $prospecto['id'], $decision['cita']);
            $respuestas[] = $mensajeCita;
            if ($cita !== null) {
                $extraSalida['cita'] = $cita;
                $prospecto = Database::uno('SELECT * FROM prospectos WHERE id = ?', [$prospecto['id']]);
            } else {
                $accion = 'ofrecer_cita';
                $slots = AgendaServicio::slotsDisponibles(null, 7, null, (int) self::config('max_slots_ofrecidos', '6'));
                if ($slots !== []) {
                    $respuestas[] = self::listarSlots($slots);
                    $extraSalida['slots'] = $slots;
                }
            }
        } elseif ($accion === 'listo_para_pago') {
            $resultado = \App\Servicios\PagoServicio::linkParaProspecto($prospecto);
            if ($resultado['ok']) {
                $monto = '$' . number_format($resultado['pago']['monto_centavos'] / 100, 2) . ' ' . $resultado['pago']['moneda'];
                $respuestas[] = "Aquí tienes tu enlace de pago seguro por {$monto}:\n{$resultado['pago']['link_pago']}\nEn cuanto se acredite, tu acceso al curso se activa automáticamente. 🙂";
                $extraSalida['pago'] = $resultado['pago'];
                $prospecto = Database::uno('SELECT * FROM prospectos WHERE id = ?', [$prospecto['id']]);
            } else {
                // Sin procesador configurado: el asesor envía el link manualmente.
                $respuestas[] = 'En un momento uno de nuestros asesores te comparte el enlace de pago para completar tu inscripción.';
                $asignacion = ProspectoServicio::asignar((int) $prospecto['id']);
                Database::ejecutar(
                    "UPDATE conversaciones SET estado = 'asesor', asesor_id = COALESCE(?, asesor_id) WHERE id = ?",
                    [$asignacion['asesor_id'] ?? null, $conversacion['id']]
                );
                $accion = 'pasar_asesor';
            }
        }

        foreach ($respuestas as $texto) {
            ConversacionServicio::registrarMensaje((int) $conversacion['id'], [
                'direccion' => 'saliente',
                'emisor' => 'bot',
                'contenido' => $texto,
            ]);
        }

        return self::salida($prospecto, $conversacion, $respuestas, $accion) + $extraSalida;
    }

    /** @return array{respuesta:string, accion:string, calificacion:?array} */
    private static function decidir(array $prospecto, int $conversacionId): array
    {
        $sistema = self::armarPromptSistema($prospecto);
        $historial = self::armarHistorial($conversacionId);
        $modelo = self::config('modelo_bot', Env::get('GEMINI_MODEL', 'gemini-3.6-flash'));

        $crudo = GeminiClient::completar($sistema, $historial, $modelo);
        return self::interpretar($crudo);
    }

    private static function armarPromptSistema(array $prospecto): string
    {
        $prompt = Database::uno(
            "SELECT contenido FROM prompts WHERE clave = 'sistema_bot' AND activo = 1 ORDER BY version DESC LIMIT 1"
        );
        $base = $prompt['contenido'] ?? 'Eres un asistente de ventas amable y profesional.';

        $curso = null;
        if (!empty($prospecto['curso_interes_id'])) {
            $curso = Database::uno('SELECT * FROM cursos WHERE id = ?', [$prospecto['curso_interes_id']]);
        }
        $curso ??= Database::uno('SELECT * FROM cursos WHERE activo = 1 ORDER BY id LIMIT 1');

        $reemplazos = [
            '{{curso_nombre}}' => $curso['nombre'] ?? 'el curso',
            '{{curso_descripcion}}' => $curso['descripcion'] ?? '',
            '{{curso_precio}}' => $curso !== null
                ? '$' . number_format($curso['precio_centavos'] / 100, 2) . ' ' . $curso['moneda']
                : 'por confirmar',
            '{{curso_duracion}}' => isset($curso['duracion_semanas']) ? $curso['duracion_semanas'] . ' semanas' : 'por confirmar',
            '{{criterios_calificacion}}' => self::config('criterios_calificacion', '{}'),
            '{{nombre_prospecto}}' => $prospecto['nombre'] ?? 'aún sin nombre',
            '{{etapa_prospecto}}' => $prospecto['etapa'],
            '{{fecha_hoy}}' => date('Y-m-d'),
        ];
        return strtr($base, $reemplazos);
    }

    /** @return array<int,array{role:string,content:string}> */
    private static function armarHistorial(int $conversacionId): array
    {
        $limite = (int) self::config('max_mensajes_contexto', '20');
        $filas = array_reverse(Database::todos(
            "SELECT emisor, contenido FROM mensajes
             WHERE conversacion_id = ? AND tipo IN ('texto', 'interactivo', 'plantilla')
             ORDER BY id DESC LIMIT {$limite}",
            [$conversacionId]
        ));

        // La API exige roles alternados: fusiona mensajes consecutivos del mismo rol.
        $mensajes = [];
        foreach ($filas as $fila) {
            $rol = $fila['emisor'] === 'prospecto' ? 'user' : 'assistant';
            $ultimo = count($mensajes) - 1;
            if ($ultimo >= 0 && $mensajes[$ultimo]['role'] === $rol) {
                $mensajes[$ultimo]['content'] .= "\n" . $fila['contenido'];
            } else {
                $mensajes[] = ['role' => $rol, 'content' => $fila['contenido']];
            }
        }
        if ($mensajes === [] || $mensajes[0]['role'] !== 'user') {
            array_unshift($mensajes, ['role' => 'user', 'content' => '(inicio de conversación)']);
        }
        return $mensajes;
    }

    /**
     * Extrae el JSON de la respuesta del modelo. Si no hay JSON válido, degrada con
     * gracia: usa el texto completo como respuesta y no ejecuta ninguna acción.
     */
    private static function interpretar(string $crudo): array
    {
        $texto = trim($crudo);
        $json = null;
        $inicio = strpos($texto, '{');
        $fin = strrpos($texto, '}');
        if ($inicio !== false && $fin !== false && $fin > $inicio) {
            $json = json_decode(substr($texto, $inicio, $fin - $inicio + 1), true);
        }
        if (!is_array($json) || !isset($json['respuesta'])) {
            return ['respuesta' => $texto, 'accion' => 'continuar', 'calificacion' => null, 'cita' => null];
        }
        $acciones = ['continuar', 'ofrecer_cita', 'agendar_cita', 'pasar_asesor', 'listo_para_pago'];
        $accion = in_array($json['accion'] ?? '', $acciones, true) ? $json['accion'] : 'continuar';
        $cita = is_array($json['cita'] ?? null) ? $json['cita'] : null;
        if ($accion === 'agendar_cita' && empty($cita['inicio'])) {
            $accion = 'ofrecer_cita';
        }
        return [
            'respuesta' => (string) $json['respuesta'],
            'accion' => $accion,
            'calificacion' => is_array($json['calificacion'] ?? null) ? $json['calificacion'] : null,
            'cita' => $cita,
        ];
    }

    private static function listarSlots(array $slots): string
    {
        $lineas = ['Estos son los horarios disponibles para tu videollamada:'];
        foreach ($slots as $i => $slot) {
            $lineas[] = sprintf('%d) %s (%s)', $i + 1, $slot['etiqueta'], $slot['inicio']);
        }
        $lineas[] = 'Respóndeme con el número de la opción que prefieras.';
        return implode("\n", $lineas);
    }

    /** @return array{0:string, 1:?array} mensaje para el prospecto y cita creada (o null) */
    private static function intentarAgendar(int $prospectoId, array $cita): array
    {
        $resultado = AgendaServicio::agendar($prospectoId, $cita['inicio']);
        if (isset($resultado['error'])) {
            return ['Ese horario acaba de ocuparse, una disculpa. Te comparto los horarios que siguen disponibles:', null];
        }
        $etiqueta = AgendaServicio::etiqueta(strtotime($resultado['cita']['inicio']));
        return [
            "¡Listo! Tu cita quedó agendada para el {$etiqueta}. Te llegará la confirmación con el enlace de la videollamada por aquí. 🙂",
            $resultado['cita'],
        ];
    }

    /**
     * Fusiona los datos de calificación, calcula el puntaje según los pesos
     * configurables y sube la etapa a 'calificado' al cruzar el umbral.
     */
    private static function aplicarCalificacion(array $prospecto, array $calificacion): array
    {
        $previos = json_decode($prospecto['datos_calificacion'] ?? '', true) ?: [];
        $datos = array_merge($previos, array_filter($calificacion, fn ($v) => $v !== null && $v !== 'desconocido'));

        $criterios = json_decode(self::config('criterios_calificacion', '{}'), true) ?: [];
        $pesos = $criterios['pesos'] ?? ['urgencia' => 40, 'fecha_examen' => 30, 'presupuesto' => 30];
        $umbral = (int) ($criterios['umbral'] ?? 60);

        $puntaje = 0;
        if (isset($datos['urgencia'])) {
            $puntaje += (int) round(min(5, max(1, (int) $datos['urgencia'])) / 5 * ($pesos['urgencia'] ?? 0));
        }
        if (!empty($datos['fecha_examen'])) {
            $dias = (strtotime($datos['fecha_examen']) - time()) / 86400;
            $factor = $dias <= 90 ? 1.0 : ($dias <= 180 ? 0.5 : 0.25);
            $puntaje += (int) round($factor * ($pesos['fecha_examen'] ?? 0));
        }
        if (($datos['presupuesto'] ?? '') === 'si') {
            $puntaje += (int) ($pesos['presupuesto'] ?? 0);
        }

        Database::ejecutar(
            'UPDATE prospectos SET datos_calificacion = ?, puntaje_calificacion = ? WHERE id = ?',
            [json_encode($datos, JSON_UNESCAPED_UNICODE), $puntaje, $prospecto['id']]
        );
        if ($puntaje >= $umbral && $prospecto['etapa'] === 'prospecto') {
            ProspectoServicio::cambiarEtapa((int) $prospecto['id'], 'calificado', 'bot', "Puntaje {$puntaje} ≥ umbral {$umbral}");
        }
        return Database::uno('SELECT * FROM prospectos WHERE id = ?', [$prospecto['id']]);
    }

    private static function config(string $clave, string $default): string
    {
        $fila = Database::uno('SELECT valor FROM configuraciones WHERE clave = ?', [$clave]);
        return $fila['valor'] ?? $default;
    }

    private static function salida(array $prospecto, array $conversacion, array $respuestas, string $accion, bool $duplicado = false): array
    {
        $salida = [
            'prospecto_id' => (int) $prospecto['id'],
            'conversacion_id' => (int) $conversacion['id'],
            'etapa' => $prospecto['etapa'],
            'respuestas' => $respuestas,
            'accion' => $accion,
        ];
        if ($duplicado) {
            $salida['duplicado'] = true;
        }
        return $salida;
    }
}
