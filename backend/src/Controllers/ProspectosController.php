<?php

namespace App\Controllers;

use App\Core\Bitacora;
use App\Core\Database;
use App\Core\Respuesta;
use App\Core\Validar;

final class ProspectosController
{
    private const ETAPAS = ['prospecto', 'calificado', 'cita_agendada', 'pago_pendiente', 'inscrito', 'descartado'];
    private const FUENTES = ['facebook', 'instagram', 'organico', 'otro'];

    public function index(array $params, array $cuerpo): never
    {
        $condiciones = [];
        $valores = [];
        if (!empty($_GET['etapa'])) {
            Validar::enOpciones($_GET['etapa'], self::ETAPAS, 'etapa');
            $condiciones[] = 'etapa = ?';
            $valores[] = $_GET['etapa'];
        }
        if (!empty($_GET['asesor_id'])) {
            $condiciones[] = 'asesor_id = ?';
            $valores[] = (int) $_GET['asesor_id'];
        }
        if (!empty($_GET['buscar'])) {
            $condiciones[] = '(nombre LIKE ? OR telefono_whatsapp LIKE ?)';
            $busqueda = '%' . $_GET['buscar'] . '%';
            array_push($valores, $busqueda, $busqueda);
        }
        $where = $condiciones === [] ? '' : 'WHERE ' . implode(' AND ', $condiciones);
        $limite = min(200, max(1, (int) ($_GET['limite'] ?? 50)));
        $desplazamiento = max(0, (int) ($_GET['desplazamiento'] ?? 0));

        $filas = Database::todos(
            "SELECT * FROM prospectos {$where} ORDER BY actualizado_en DESC LIMIT {$limite} OFFSET {$desplazamiento}",
            $valores
        );
        $total = Database::uno("SELECT COUNT(*) AS n FROM prospectos {$where}", $valores)['n'];
        Respuesta::json(['datos' => $filas, 'total' => (int) $total]);
    }

    public function show(array $params, array $cuerpo): never
    {
        $prospecto = Database::uno('SELECT * FROM prospectos WHERE id = ?', [(int) $params['id']]);
        if ($prospecto === null) {
            Respuesta::error('Prospecto no encontrado', 404);
        }
        $prospecto['bitacora'] = Database::todos(
            'SELECT etapa_anterior, etapa_nueva, origen, usuario_id, nota, creado_en
             FROM bitacora_pipeline WHERE prospecto_id = ? ORDER BY creado_en',
            [$prospecto['id']]
        );
        Respuesta::json($prospecto);
    }

    /**
     * Upsert por teléfono de WhatsApp: n8n lo invoca en cada mensaje entrante.
     * Si el prospecto ya existe lo devuelve sin modificarlo (200); si no, lo crea (201).
     */
    public function upsert(array $params, array $cuerpo): never
    {
        Validar::requeridos($cuerpo, ['telefono_whatsapp']);
        $telefono = Validar::telefono($cuerpo['telefono_whatsapp']);
        $fuente = $cuerpo['fuente'] ?? 'facebook';
        Validar::enOpciones($fuente, self::FUENTES, 'fuente');

        $resultado = \App\Servicios\ProspectoServicio::upsertPorTelefono(
            $telefono,
            array_intersect_key($cuerpo, array_flip(['nombre', 'curso_interes_id'])) + ['fuente' => $fuente]
        );
        Respuesta::json(
            ['creado' => $resultado['creado'], 'prospecto' => $resultado['prospecto']],
            $resultado['creado'] ? 201 : 200
        );
    }

    public function update(array $params, array $cuerpo): never
    {
        $id = (int) $params['id'];
        $actual = Database::uno('SELECT * FROM prospectos WHERE id = ?', [$id]);
        if ($actual === null) {
            Respuesta::error('Prospecto no encontrado', 404);
        }

        $sets = [];
        $valores = [];
        foreach (['nombre', 'puntaje_calificacion', 'curso_interes_id', 'motivo_descarte'] as $campo) {
            if (array_key_exists($campo, $cuerpo)) {
                $sets[] = "{$campo} = ?";
                $valores[] = $cuerpo[$campo];
            }
        }
        if (array_key_exists('datos_calificacion', $cuerpo)) {
            $sets[] = 'datos_calificacion = ?';
            $valores[] = json_encode($cuerpo['datos_calificacion'], JSON_UNESCAPED_UNICODE);
        }
        if (array_key_exists('etapa', $cuerpo)) {
            Validar::enOpciones($cuerpo['etapa'], self::ETAPAS, 'etapa');
            $sets[] = 'etapa = ?';
            $valores[] = $cuerpo['etapa'];
        }
        if ($sets === []) {
            Respuesta::error('Nada que actualizar', 422);
        }

        $valores[] = $id;
        Database::ejecutar('UPDATE prospectos SET ' . implode(', ', $sets) . ' WHERE id = ?', $valores);

        if (isset($cuerpo['etapa']) && $cuerpo['etapa'] !== $actual['etapa']) {
            Bitacora::cambioEtapa(
                $id,
                $actual['etapa'],
                $cuerpo['etapa'],
                $cuerpo['origen'] ?? 'sistema',
                isset($cuerpo['usuario_id']) ? (int) $cuerpo['usuario_id'] : null,
                $cuerpo['nota'] ?? null
            );
        }
        Respuesta::json(Database::uno('SELECT * FROM prospectos WHERE id = ?', [$id]));
    }

    /**
     * Asignación de asesor sin condiciones de carrera:
     * - Bloquea las filas de asesores (FOR UPDATE) para serializar asignaciones concurrentes.
     * - Sin asesor_id explícito, elige al asesor activo con menos prospectos vivos.
     * - El UPDATE exige asesor_id IS NULL: si otra petición ganó, responde 409.
     */
    public function asignar(array $params, array $cuerpo): never
    {
        $id = (int) $params['id'];
        $resultado = \App\Servicios\ProspectoServicio::asignar(
            $id,
            isset($cuerpo['asesor_id']) ? (int) $cuerpo['asesor_id'] : null
        );

        if (isset($resultado['error'])) {
            Respuesta::error($resultado['error'], $resultado['codigo'], array_diff_key($resultado, ['error' => 1, 'codigo' => 1]));
        }
        Respuesta::json(Database::uno('SELECT * FROM prospectos WHERE id = ?', [$id]));
    }
}
