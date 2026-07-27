<?php

namespace App\Controllers;

use App\Core\Database;
use App\Core\Respuesta;
use App\Core\Validar;

final class AvanceController
{
    /** POST /api/avance — upsert del avance de un alumno en una fecha. */
    public function store(array $params, array $cuerpo): never
    {
        Validar::requeridos($cuerpo, ['alumno_id', 'porcentaje']);
        $alumnoId = (int) $cuerpo['alumno_id'];
        if (Database::uno('SELECT id FROM alumnos WHERE id = ?', [$alumnoId]) === null) {
            Respuesta::error('Alumno no encontrado', 404);
        }
        $porcentaje = max(0, min(100, (int) $cuerpo['porcentaje']));
        $fecha = $cuerpo['fecha'] ?? date('Y-m-d');
        $detalle = isset($cuerpo['detalle']) ? json_encode($cuerpo['detalle'], JSON_UNESCAPED_UNICODE) : null;

        Database::ejecutar(
            'INSERT INTO avance_alumnos (alumno_id, fecha, porcentaje, detalle) VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE porcentaje = VALUES(porcentaje), detalle = COALESCE(VALUES(detalle), detalle)',
            [$alumnoId, $fecha, $porcentaje, $detalle]
        );
        Respuesta::json(Database::uno(
            'SELECT * FROM avance_alumnos WHERE alumno_id = ? AND fecha = ?',
            [$alumnoId, $fecha]
        ), 201);
    }

    /** GET /api/alumnos/{id}/avance */
    public function porAlumno(array $params, array $cuerpo): never
    {
        Respuesta::json(Database::todos(
            'SELECT * FROM avance_alumnos WHERE alumno_id = ? ORDER BY fecha',
            [(int) $params['id']]
        ));
    }
}
