<?php

namespace App\Core;

/**
 * Carga de variables desde .env sin dependencias externas
 * (requisito: hosting compartido sin Composer).
 */
final class Env
{
    /** @var array<string,string> */
    private static array $vars = [];

    public static function cargar(string $ruta): void
    {
        if (!is_file($ruta)) {
            return;
        }
        foreach (file($ruta, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $linea) {
            $linea = trim($linea);
            if ($linea === '' || str_starts_with($linea, '#') || !str_contains($linea, '=')) {
                continue;
            }
            [$clave, $valor] = explode('=', $linea, 2);
            $valor = trim($valor);
            if (strlen($valor) >= 2 && ($valor[0] === '"' || $valor[0] === "'") && $valor[0] === substr($valor, -1)) {
                $valor = substr($valor, 1, -1);
            }
            self::$vars[trim($clave)] = $valor;
        }
    }

    public static function get(string $clave, ?string $default = null): ?string
    {
        return self::$vars[$clave] ?? getenv($clave) ?: $default;
    }

    public static function requerir(string $clave): string
    {
        $valor = self::get($clave);
        if ($valor === null || $valor === '') {
            throw new \RuntimeException("Variable de entorno requerida ausente: {$clave}");
        }
        return $valor;
    }
}
