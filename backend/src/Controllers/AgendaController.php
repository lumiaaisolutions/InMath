<?php

namespace App\Controllers;

use App\Core\Respuesta;
use App\Servicios\AgendaServicio;

final class AgendaController
{
    /** GET /api/agenda/disponibilidad?desde=&dias=7&asesor_id=&max=30 */
    public function disponibilidad(array $params, array $cuerpo): never
    {
        Respuesta::json(AgendaServicio::slotsDisponibles(
            $_GET['desde'] ?? null,
            min(30, max(1, (int) ($_GET['dias'] ?? 7))),
            isset($_GET['asesor_id']) ? (int) $_GET['asesor_id'] : null,
            min(100, max(1, (int) ($_GET['max'] ?? 30)))
        ));
    }
}
