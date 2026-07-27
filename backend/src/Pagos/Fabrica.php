<?php

namespace App\Pagos;

use App\Core\Database;

final class Fabrica
{
    public static function activo(): ProcesadorPago
    {
        $fila = Database::uno("SELECT valor FROM configuraciones WHERE clave = 'procesador_pago_activo'");
        return self::porNombre(trim($fila['valor'] ?? ''));
    }

    public static function porNombre(string $nombre): ProcesadorPago
    {
        return match ($nombre) {
            'simulado' => new DriverSimulado(),
            'stripe', 'conekta', 'mercadopago' => new DriverPendiente($nombre),
            default => throw new \RuntimeException(
                'No hay procesador de pago configurado (clave procesador_pago_activo).'
            ),
        };
    }
}
