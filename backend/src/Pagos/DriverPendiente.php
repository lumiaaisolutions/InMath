<?php

namespace App\Pagos;

/**
 * Esqueleto común para los procesadores reales (Stripe, Conekta, MercadoPago).
 * La integración se escribe cuando el cliente confirme el procesador, verificando
 * la documentación oficial vigente en ese momento — ver docs/pagos.md para el plan
 * de integración y las credenciales que requiere cada uno.
 */
final class DriverPendiente implements ProcesadorPago
{
    public function __construct(private readonly string $nombre)
    {
    }

    public function crearLink(array $pago, array $prospecto, array $curso): array
    {
        throw new \RuntimeException(
            "El procesador '{$this->nombre}' aún no está integrado: requiere confirmación " .
            'del cliente y credenciales. Plan de integración en docs/pagos.md.'
        );
    }

    public function verificarWebhook(array $headers, string $cuerpoCrudo): ?array
    {
        throw new \RuntimeException("El procesador '{$this->nombre}' aún no está integrado.");
    }
}
