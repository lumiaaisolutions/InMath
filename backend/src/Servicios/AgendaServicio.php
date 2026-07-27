<?php

namespace App\Servicios;

use App\Core\Bitacora;
use App\Core\Database;

/**
 * Disponibilidad y creación de citas con 3 asesores en paralelo, cada uno con su
 * propio calendario, sin cruces de horario. El evento de Google Calendar/Meet lo
 * crea n8n después (flujo 03) y guarda google_event_id/meet_link vía PATCH.
 */
final class AgendaServicio
{
    private const DIAS = [1 => 'lunes', 2 => 'martes', 3 => 'miércoles', 4 => 'jueves', 5 => 'viernes', 6 => 'sábado', 7 => 'domingo'];
    private const MESES = [1 => 'enero', 2 => 'febrero', 3 => 'marzo', 4 => 'abril', 5 => 'mayo', 6 => 'junio', 7 => 'julio', 8 => 'agosto', 9 => 'septiembre', 10 => 'octubre', 11 => 'noviembre', 12 => 'diciembre'];

    /**
     * Slots libres dentro del horario de atención configurado.
     * @return array<int,array{inicio:string,fin:string,etiqueta:string,asesores_libres:int[]}>
     */
    public static function slotsDisponibles(?string $desde = null, int $dias = 7, ?int $asesorId = null, int $max = 30): array
    {
        $horario = json_decode(self::config('horario_atencion', '{"dias":[1,2,3,4,5],"inicio":"09:00","fin":"19:00"}'), true);
        $duracion = (int) self::config('duracion_cita_minutos', '30');

        $sqlAsesores = "SELECT id FROM usuarios WHERE rol = 'asesor' AND activo = 1";
        $paramsAsesores = [];
        if ($asesorId !== null) {
            $sqlAsesores .= ' AND id = ?';
            $paramsAsesores[] = $asesorId;
        }
        $asesores = array_map('intval', array_column(Database::todos($sqlAsesores, $paramsAsesores), 'id'));
        if ($asesores === []) {
            return [];
        }

        $inicioRango = max(strtotime($desde ?? 'now'), time());
        $finRango = strtotime('+' . $dias . ' days', $inicioRango);
        $ocupadas = Database::todos(
            "SELECT asesor_id, inicio, fin FROM citas
             WHERE estado IN ('agendada', 'confirmada') AND inicio < ? AND fin > ?",
            [date('Y-m-d H:i:s', $finRango), date('Y-m-d H:i:s', $inicioRango)]
        );

        // Las citas se ofrecen con al menos 1 hora de anticipación.
        $minimo = time() + 3600;
        $slots = [];
        for ($dia = strtotime('today', $inicioRango); $dia < $finRango && count($slots) < $max; $dia = strtotime('+1 day', $dia)) {
            if (!in_array((int) date('N', $dia), $horario['dias'] ?? [1, 2, 3, 4, 5], true)) {
                continue;
            }
            $slotInicio = strtotime(date('Y-m-d', $dia) . ' ' . ($horario['inicio'] ?? '09:00'));
            $cierre = strtotime(date('Y-m-d', $dia) . ' ' . ($horario['fin'] ?? '19:00'));
            for (; $slotInicio + $duracion * 60 <= $cierre && count($slots) < $max; $slotInicio += $duracion * 60) {
                if ($slotInicio < $minimo) {
                    continue;
                }
                $slotFin = $slotInicio + $duracion * 60;
                $libres = array_values(array_filter($asesores, function (int $a) use ($ocupadas, $slotInicio, $slotFin) {
                    foreach ($ocupadas as $c) {
                        if ((int) $c['asesor_id'] === $a
                            && strtotime($c['inicio']) < $slotFin
                            && strtotime($c['fin']) > $slotInicio) {
                            return false;
                        }
                    }
                    return true;
                }));
                if ($libres !== []) {
                    $slots[] = [
                        'inicio' => date('Y-m-d H:i', $slotInicio),
                        'fin' => date('Y-m-d H:i', $slotFin),
                        'etiqueta' => self::etiqueta($slotInicio),
                        'asesores_libres' => $libres,
                    ];
                }
            }
        }
        return $slots;
    }

    /**
     * Crea una cita validando traslape dentro de una transacción (FOR UPDATE);
     * UNIQUE (asesor_id, inicio) en BD es la última defensa.
     * @return array{cita?:array, error?:string, codigo?:int}
     */
    public static function crearCita(int $prospectoId, int $asesorId, string $inicio, string $fin, array $extras = []): array
    {
        $prospecto = Database::uno('SELECT id, etapa FROM prospectos WHERE id = ?', [$prospectoId]);
        if ($prospecto === null) {
            return ['error' => 'Prospecto no encontrado', 'codigo' => 404];
        }
        try {
            $resultado = Database::transaccion(function () use ($prospecto, $prospectoId, $asesorId, $inicio, $fin, $extras) {
                $traslape = Database::uno(
                    "SELECT id FROM citas
                     WHERE asesor_id = ? AND estado IN ('agendada', 'confirmada')
                       AND inicio < ? AND fin > ?
                     FOR UPDATE",
                    [$asesorId, $fin, $inicio]
                );
                if ($traslape !== null) {
                    return ['error' => 'El asesor ya tiene una cita en ese horario', 'codigo' => 409];
                }
                $citaId = Database::insertar(
                    'INSERT INTO citas (prospecto_id, asesor_id, inicio, fin, google_event_id, meet_link)
                     VALUES (?, ?, ?, ?, ?, ?)',
                    [$prospectoId, $asesorId, $inicio, $fin, $extras['google_event_id'] ?? null, $extras['meet_link'] ?? null]
                );
                if (in_array($prospecto['etapa'], ['prospecto', 'calificado'], true)) {
                    Database::ejecutar("UPDATE prospectos SET etapa = 'cita_agendada' WHERE id = ?", [$prospectoId]);
                    Bitacora::cambioEtapa($prospectoId, $prospecto['etapa'], 'cita_agendada', 'sistema', null, "Cita #{$citaId} creada");
                }
                return ['cita_id' => $citaId];
            });
        } catch (\PDOException $e) {
            if ($e->getCode() === '23000') {
                return ['error' => 'El asesor ya tiene una cita que inicia exactamente a esa hora', 'codigo' => 409];
            }
            throw $e;
        }
        if (isset($resultado['error'])) {
            return $resultado;
        }
        return ['cita' => Database::uno('SELECT * FROM citas WHERE id = ?', [$resultado['cita_id']])];
    }

    /**
     * Agenda en el horario pedido eligiendo asesor libre (el de menos citas futuras).
     * Reintenta con el siguiente asesor libre si pierde la carrera por el horario.
     * @return array{cita?:array, error?:string, codigo?:int}
     */
    public static function agendar(int $prospectoId, string $inicio, ?int $asesorId = null): array
    {
        $inicio = strlen($inicio) === 16 ? $inicio . ':00' : $inicio;
        $ts = strtotime($inicio);
        if ($ts === false || $ts < time()) {
            return ['error' => 'Horario inválido o en el pasado', 'codigo' => 422];
        }
        $duracion = (int) self::config('duracion_cita_minutos', '30');
        $fin = date('Y-m-d H:i:s', $ts + $duracion * 60);
        $inicio = date('Y-m-d H:i:s', $ts);

        if ($asesorId !== null) {
            return self::crearCita($prospectoId, $asesorId, $inicio, $fin);
        }

        $candidatos = Database::todos(
            "SELECT u.id
             FROM usuarios u
             LEFT JOIN citas c ON c.asesor_id = u.id AND c.estado IN ('agendada', 'confirmada') AND c.inicio >= NOW()
             WHERE u.rol = 'asesor' AND u.activo = 1
             GROUP BY u.id
             ORDER BY COUNT(c.id) ASC, u.id ASC"
        );
        foreach ($candidatos as $candidato) {
            $resultado = self::crearCita($prospectoId, (int) $candidato['id'], $inicio, $fin);
            if (!isset($resultado['error']) || $resultado['codigo'] !== 409) {
                return $resultado;
            }
        }
        return ['error' => 'Ningún asesor tiene libre ese horario', 'codigo' => 409];
    }

    /** "Lunes 28 de julio, 10:00" — para mostrar en WhatsApp. */
    public static function etiqueta(int $timestamp): string
    {
        $dia = ucfirst(self::DIAS[(int) date('N', $timestamp)]);
        $mes = self::MESES[(int) date('n', $timestamp)];
        return sprintf('%s %d de %s, %s', $dia, (int) date('j', $timestamp), $mes, date('H:i', $timestamp));
    }

    private static function config(string $clave, string $default): string
    {
        $fila = Database::uno('SELECT valor FROM configuraciones WHERE clave = ?', [$clave]);
        return $fila['valor'] ?? $default;
    }
}
