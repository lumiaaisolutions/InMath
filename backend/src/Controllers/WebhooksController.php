<?php

namespace App\Controllers;

use App\Core\Respuesta;
use App\Pagos\Fabrica;
use App\Servicios\PagoServicio;

/**
 * Webhooks de procesadores de pago. Estas rutas NO llevan X-API-Key (las llama el
 * procesador externo); la autenticidad la valida cada driver (firma HMAC, etc.).
 */
final class WebhooksController
{
    public function pago(array $params, array $cuerpo): never
    {
        $procesador = Fabrica::porNombre($params['procesador']);

        $headers = [];
        foreach ($_SERVER as $clave => $valor) {
            if (str_starts_with($clave, 'HTTP_')) {
                $headers[str_replace('_', '-', strtolower(substr($clave, 5)))] = $valor;
            }
        }
        $crudo = file_get_contents('php://input') ?: '';

        $evento = $procesador->verificarWebhook($headers, $crudo);
        if ($evento === null) {
            Respuesta::error('Webhook no auténtico o irrelevante', 400);
        }
        $resultado = PagoServicio::aplicarEvento($evento);
        Respuesta::json(['recibido' => true, 'detalle' => $resultado['mensaje']], $resultado['ok'] ? 200 : 404);
    }
}
