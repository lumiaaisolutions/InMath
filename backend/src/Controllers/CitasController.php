<?php

namespace App\Controllers;

use App\Core\Database;
use App\Core\Respuesta;
use App\Core\Validar;

final class CitasController
{
    private const ESTADOS = ['agendada', 'confirmada', 'completada', 'cancelada', 'no_asistio'];

    public function index(array $params, array $cuerpo): never
    {
        $condiciones = [];
        $valores = [];
        if (!empty($_GET['asesor_id'])) {
            $condiciones[] = 'c.asesor_id = ?';
            $valores[] = (int) $_GET['asesor_id'];
        }
        if (!empty($_GET['estado'])) {
            Validar::enOpciones($_GET['estado'], self::ESTADOS, 'estado');
            $condiciones[] = 'c.estado = ?';
            $valores[] = $_GET['estado'];
        }
        if (!empty($_GET['desde'])) {
            $condiciones[] = 'c.inicio >= ?';
            $valores[] = $_GET['desde'];
        }
        if (!empty($_GET['hasta'])) {
            $condiciones[] = 'c.inicio < ?';
            $valores[] = $_GET['hasta'];
        }
        $where = $condiciones === [] ? '' : 'WHERE ' . implode(' AND ', $condiciones);
        Respuesta::json(Database::todos(
            "SELECT c.*, p.nombre AS prospecto_nombre, p.telefono_whatsapp, u.nombre AS asesor_nombre
             FROM citas c
             JOIN prospectos p ON p.id = c.prospecto_id
             JOIN usuarios u ON u.id = c.asesor_id
             {$where} ORDER BY c.inicio",
            $valores
        ));
    }

    /**
     * Crea la cita validando traslapes dentro de una transacción (SELECT ... FOR UPDATE
     * sobre las citas vivas del asesor en el rango). UNIQUE (asesor_id, inicio) en la BD
     * es la última defensa si dos peticiones concurrentes piden exactamente la misma hora.
     */
    public function store(array $params, array $cuerpo): never
    {
        Validar::requeridos($cuerpo, ['prospecto_id', 'asesor_id', 'inicio', 'fin']);
        Validar::fechaHora($cuerpo['inicio'], 'inicio');
        Validar::fechaHora($cuerpo['fin'], 'fin');
        if ($cuerpo['fin'] <= $cuerpo['inicio']) {
            Respuesta::error('fin debe ser posterior a inicio', 422);
        }

        $prospectoId = (int) $cuerpo['prospecto_id'];
        $asesorId = (int) $cuerpo['asesor_id'];
        $prospecto = Database::uno('SELECT id, etapa FROM prospectos WHERE id = ?', [$prospectoId]);
        if ($prospecto === null) {
            Respuesta::error('Prospecto no encontrado', 404);
        }
        if (Database::uno("SELECT id FROM usuarios WHERE id = ? AND rol = 'asesor' AND activo = 1", [$asesorId]) === null) {
            Respuesta::error('Asesor inexistente o inactivo', 422);
        }

        $resultado = \App\Servicios\AgendaServicio::crearCita(
            $prospectoId,
            $asesorId,
            $cuerpo['inicio'],
            $cuerpo['fin'],
            array_intersect_key($cuerpo, array_flip(['google_event_id', 'meet_link']))
        );
        if (isset($resultado['error'])) {
            Respuesta::error($resultado['error'], $resultado['codigo']);
        }
        Respuesta::json($resultado['cita'], 201);
    }

    /**
     * GET /api/citas/por-recordar — citas agendadas/confirmadas que inician dentro
     * de las próximas `recordatorio_cita_horas` y aún sin recordatorio. n8n (flujo 04)
     * las consulta por cron, envía el recordatorio y marca recordatorio_enviado_en.
     */
    public function porRecordar(array $params, array $cuerpo): never
    {
        $horas = (int) (Database::uno("SELECT valor FROM configuraciones WHERE clave = 'recordatorio_cita_horas'")['valor'] ?? 2);
        Respuesta::json(Database::todos(
            "SELECT c.*, p.telefono_whatsapp, p.nombre AS prospecto_nombre, u.nombre AS asesor_nombre
             FROM citas c
             JOIN prospectos p ON p.id = c.prospecto_id
             JOIN usuarios u ON u.id = c.asesor_id
             WHERE c.estado IN ('agendada', 'confirmada')
               AND c.recordatorio_enviado_en IS NULL
               AND c.inicio > NOW()
               AND c.inicio <= NOW() + INTERVAL {$horas} HOUR
             ORDER BY c.inicio"
        ));
    }

    public function update(array $params, array $cuerpo): never
    {
        $id = (int) $params['id'];
        if (Database::uno('SELECT id FROM citas WHERE id = ?', [$id]) === null) {
            Respuesta::error('Cita no encontrada', 404);
        }
        $sets = [];
        $valores = [];
        if (array_key_exists('estado', $cuerpo)) {
            Validar::enOpciones($cuerpo['estado'], self::ESTADOS, 'estado');
            $sets[] = 'estado = ?';
            $valores[] = $cuerpo['estado'];
        }
        foreach (['google_event_id', 'meet_link', 'recordatorio_enviado_en'] as $campo) {
            if (array_key_exists($campo, $cuerpo)) {
                $sets[] = "{$campo} = ?";
                $valores[] = $cuerpo[$campo];
            }
        }
        if ($sets === []) {
            Respuesta::error('Nada que actualizar', 422);
        }
        $valores[] = $id;
        Database::ejecutar('UPDATE citas SET ' . implode(', ', $sets) . ' WHERE id = ?', $valores);
        Respuesta::json(Database::uno('SELECT * FROM citas WHERE id = ?', [$id]));
    }
}
