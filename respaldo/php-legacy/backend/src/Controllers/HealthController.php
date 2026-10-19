<?php

namespace App\Controllers;

use App\Core\Database;
use App\Core\Respuesta;

final class HealthController
{
    public function estado(array $params, array $cuerpo): never
    {
        try {
            Database::uno('SELECT 1');
            $db = 'ok';
        } catch (\Throwable) {
            $db = 'error';
        }
        Respuesta::json(['estado' => 'ok', 'base_datos' => $db], $db === 'ok' ? 200 : 503);
    }
}
