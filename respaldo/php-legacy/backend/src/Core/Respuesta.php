<?php

namespace App\Core;

final class Respuesta
{
    public static function json(mixed $datos, int $codigo = 200): never
    {
        http_response_code($codigo);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($datos, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function error(string $mensaje, int $codigo, array $detalles = []): never
    {
        $cuerpo = ['error' => $mensaje];
        if ($detalles !== []) {
            $cuerpo['detalles'] = $detalles;
        }
        self::json($cuerpo, $codigo);
    }
}
