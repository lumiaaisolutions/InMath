<?php

use App\Core\Database;

/** Columnas del pipeline en el orden del embudo. */
function datosPipeline(?string $asesorId): array
{
    $etapas = ['prospecto', 'calificado', 'cita_agendada', 'pago_pendiente', 'inscrito'];
    $where = 'etapa = ?';
    $columnas = [];
    foreach ($etapas as $etapa) {
        $params = [$etapa];
        $sql = "SELECT p.*, u.nombre AS asesor_nombre,
                       (SELECT MAX(m.creado_en) FROM mensajes m
                        JOIN conversaciones c ON c.id = m.conversacion_id
                        WHERE c.prospecto_id = p.id) AS ultimo_mensaje_en
                FROM prospectos p
                LEFT JOIN usuarios u ON u.id = p.asesor_id
                WHERE p.{$where}";
        if ($asesorId !== null && $asesorId !== '') {
            $sql .= ' AND p.asesor_id = ?';
            $params[] = (int) $asesorId;
        }
        $sql .= ' ORDER BY p.actualizado_en DESC LIMIT 60';
        $columnas[$etapa] = Database::todos($sql, $params);
    }
    return $columnas;
}

function listaAsesores(): array
{
    return Database::todos(
        "SELECT id, nombre FROM usuarios WHERE rol = 'asesor' AND activo = 1 ORDER BY id"
    );
}

function datosProspecto(int $id): ?array
{
    $prospecto = Database::uno(
        'SELECT p.*, u.nombre AS asesor_nombre, c.nombre AS curso_nombre
         FROM prospectos p
         LEFT JOIN usuarios u ON u.id = p.asesor_id
         LEFT JOIN cursos c ON c.id = p.curso_interes_id
         WHERE p.id = ?',
        [$id]
    );
    if ($prospecto === null) {
        return null;
    }
    $conversacion = Database::uno(
        "SELECT * FROM conversaciones WHERE prospecto_id = ? AND canal = 'whatsapp'",
        [$id]
    );
    return [
        'prospecto' => $prospecto,
        'conversacion' => $conversacion,
        'mensajes' => $conversacion === null ? [] : Database::todos(
            'SELECT * FROM mensajes WHERE conversacion_id = ? ORDER BY creado_en, id',
            [$conversacion['id']]
        ),
        'bitacora' => Database::todos(
            'SELECT b.*, u.nombre AS usuario_nombre FROM bitacora_pipeline b
             LEFT JOIN usuarios u ON u.id = b.usuario_id
             WHERE b.prospecto_id = ? ORDER BY b.creado_en',
            [$id]
        ),
        'citas' => Database::todos(
            'SELECT c.*, u.nombre AS asesor_nombre FROM citas c
             JOIN usuarios u ON u.id = c.asesor_id
             WHERE c.prospecto_id = ? ORDER BY c.inicio DESC',
            [$id]
        ),
        'pagos' => Database::todos('SELECT * FROM pagos WHERE prospecto_id = ? ORDER BY id DESC', [$id]),
    ];
}

function citasDeSemana(int $inicioSemana, ?string $asesorId): array
{
    $desde = date('Y-m-d 00:00:00', $inicioSemana);
    $hasta = date('Y-m-d 00:00:00', strtotime('+7 days', $inicioSemana));
    $sql = "SELECT c.*, p.nombre AS prospecto_nombre, p.telefono_whatsapp, p.id AS prospecto_id, u.nombre AS asesor_nombre
            FROM citas c
            JOIN prospectos p ON p.id = c.prospecto_id
            JOIN usuarios u ON u.id = c.asesor_id
            WHERE c.inicio >= ? AND c.inicio < ? AND c.estado != 'cancelada'";
    $params = [$desde, $hasta];
    if ($asesorId !== null && $asesorId !== '') {
        $sql .= ' AND c.asesor_id = ?';
        $params[] = (int) $asesorId;
    }
    return Database::todos($sql . ' ORDER BY c.inicio', $params);
}

function listaAlumnos(): array
{
    return Database::todos(
        'SELECT a.*, c.nombre AS curso_nombre FROM alumnos a
         JOIN cursos c ON c.id = a.curso_id ORDER BY a.inscrito_en DESC LIMIT 300'
    );
}

function listaPagos(): array
{
    return Database::todos(
        'SELECT pg.*, p.nombre AS prospecto_nombre, p.telefono_whatsapp, p.id AS prospecto_id
         FROM pagos pg JOIN prospectos p ON p.id = pg.prospecto_id
         ORDER BY pg.creado_en DESC LIMIT 200'
    );
}

function listaConfiguraciones(): array
{
    return Database::todos('SELECT * FROM configuraciones ORDER BY clave');
}

function listaPrompts(): array
{
    return Database::todos('SELECT * FROM prompts ORDER BY clave, version DESC');
}
