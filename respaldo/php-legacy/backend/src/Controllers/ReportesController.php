<?php

namespace App\Controllers;

use App\Core\Database;
use App\Core\Respuesta;
use App\Core\Validar;
use App\Reportes\GeneradorReporte;

final class ReportesController
{
    /** POST /api/reportes/generar — n8n lo dispara semanalmente (flujo 08). */
    public function generar(array $params, array $cuerpo): never
    {
        $generados = GeneradorReporte::generarSemana($cuerpo['semana'] ?? null);
        Respuesta::json(['generados' => count($generados), 'reportes' => $generados], 201);
    }

    /** GET /api/reportes/pendientes-envio — reportes sin enviar, con datos de contacto. */
    public function pendientes(array $params, array $cuerpo): never
    {
        Respuesta::json(Database::todos(
            'SELECT r.*, a.nombre AS alumno_nombre, a.telefono, a.email
             FROM reportes_generados r
             JOIN alumnos a ON a.id = r.alumno_id
             WHERE r.enviado_en IS NULL
             ORDER BY r.creado_en'
        ));
    }

    /** GET /api/reportes/{id}/archivo — descarga el PDF (n8n lo sube a WhatsApp/correo). */
    public function archivo(array $params, array $cuerpo): never
    {
        $reporte = Database::uno('SELECT * FROM reportes_generados WHERE id = ?', [(int) $params['id']]);
        if ($reporte === null) {
            Respuesta::error('Reporte no encontrado', 404);
        }
        $ruta = dirname(__DIR__, 2) . '/storage/' . $reporte['archivo'];
        if (!is_file($ruta)) {
            Respuesta::error('Archivo no disponible en el servidor', 410);
        }
        header('Content-Type: application/pdf');
        header('Content-Disposition: inline; filename="' . basename($ruta) . '"');
        header('Content-Length: ' . filesize($ruta));
        readfile($ruta);
        exit;
    }

    /** PATCH /api/reportes/{id} — marca el envío. */
    public function update(array $params, array $cuerpo): never
    {
        $id = (int) $params['id'];
        if (Database::uno('SELECT id FROM reportes_generados WHERE id = ?', [$id]) === null) {
            Respuesta::error('Reporte no encontrado', 404);
        }
        Validar::requeridos($cuerpo, ['enviado_en']);
        Database::ejecutar('UPDATE reportes_generados SET enviado_en = ? WHERE id = ?', [$cuerpo['enviado_en'], $id]);
        Respuesta::json(Database::uno('SELECT * FROM reportes_generados WHERE id = ?', [$id]));
    }
}
