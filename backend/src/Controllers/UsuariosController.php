<?php

namespace App\Controllers;

use App\Core\Database;
use App\Core\Respuesta;

final class UsuariosController
{
    /** Lista asesores activos con su carga de prospectos vivos (para n8n y el panel). */
    public function asesores(array $params, array $cuerpo): never
    {
        Respuesta::json(Database::todos(
            "SELECT u.id, u.nombre, u.email, u.telefono, u.google_calendar_id,
                    COUNT(p.id) AS prospectos_activos
             FROM usuarios u
             LEFT JOIN prospectos p ON p.asesor_id = u.id AND p.etapa NOT IN ('inscrito', 'descartado')
             WHERE u.rol = 'asesor' AND u.activo = 1
             GROUP BY u.id
             ORDER BY u.id"
        ));
    }
}
