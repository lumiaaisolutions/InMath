<?php

namespace App\Pagos;

/**
 * Contrato de un procesador de pago. El procesador activo se elige con la clave de
 * configuración `procesador_pago_activo` (stripe | conekta | mercadopago | simulado)
 * sin tocar código.
 */
interface ProcesadorPago
{
    /**
     * Crea un link de pago para el monto del pago dado.
     * @return array{link:string, referencia_externa:string}
     */
    public function crearLink(array $pago, array $prospecto, array $curso): array;

    /**
     * Valida la autenticidad de un webhook y lo traduce a un evento neutro.
     * Devuelve null si el webhook no es auténtico o no es un evento de pago relevante.
     * @param array<string,string> $headers headers HTTP en minúsculas
     * @return array{referencia_externa:string, estado:'pagado'|'fallido', metadatos?:array}|null
     */
    public function verificarWebhook(array $headers, string $cuerpoCrudo): ?array;
}
