<?php

namespace App\Pagos;

use App\Core\Env;

/**
 * Driver de MercadoPago (Checkout Pro): crea una preferencia de pago y valida
 * los webhooks de notificación. Verificado contra la documentación oficial
 * vigente al integrar (mercadopago.com.mx/developers, sección Checkout Pro):
 *
 * - Crear preferencia: POST https://api.mercadopago.com/checkout/preferences
 *   con Authorization: Bearer {access_token}; la respuesta trae `init_point`
 *   (URL de pago) e `id` (id de la preferencia).
 * - Webhook: MercadoPago llama a `notification_url` con un POST JSON
 *   ({type, data: {id}}) y dos headers de firma: `x-signature`
 *   (formato "ts=...,v1=...") y `x-request-id`. La autenticidad se valida
 *   armando el manifest `id:{data.id en minúsculas};request-id:{x-request-id};ts:{ts};`,
 *   calculando HMAC-SHA256 con el secreto del webhook y comparando en tiempo
 *   constante contra `v1`. El estado real del pago se re-consulta a la API
 *   (GET /v1/payments/{id}) en vez de confiar en el cuerpo del webhook, que
 *   MercadoPago documenta como "no confiable por sí solo".
 */
final class DriverMercadoPago implements ProcesadorPago
{
    private const URL_PREFERENCIAS = 'https://api.mercadopago.com/checkout/preferences';
    private const URL_PAGO = 'https://api.mercadopago.com/v1/payments/%s';

    public function crearLink(array $pago, array $prospecto, array $curso): array
    {
        $accessToken = Env::requerir('MERCADOPAGO_ACCESS_TOKEN');
        $baseUrl = rtrim(Env::get('APP_URL', ''), '/');

        $payload = json_encode([
            'items' => [[
                'title' => (string) ($curso['nombre'] ?? 'Curso Inmath'),
                'quantity' => 1,
                'currency_id' => $pago['moneda'] ?? 'MXN',
                'unit_price' => round($pago['monto_centavos'] / 100, 2),
            ]],
            'payer' => array_filter([
                'name' => $prospecto['nombre'] ?? null,
            ]),
            'external_reference' => 'pago-' . $pago['id'],
            'notification_url' => $baseUrl !== '' ? $baseUrl . '/api/webhooks/pago/mercadopago' : null,
            // El flujo principal de pago es el link que el bot manda por WhatsApp
            // (ver docs/pagos.md); estas back_urls solo cubren el caso secundario
            // de que alguien pague desde pago.php en el sitio. Reutiliza esa misma
            // página con ?estado= en vez de crear páginas nuevas.
            'back_urls' => $baseUrl !== '' ? [
                'success' => $baseUrl . '/pago.php?estado=exitoso',
                'pending' => $baseUrl . '/pago.php?estado=pendiente',
                'failure' => $baseUrl . '/pago.php?estado=fallido',
            ] : null,
        ], JSON_UNESCAPED_UNICODE);

        [$codigo, $datos, $error] = self::llamar('POST', self::URL_PREFERENCIAS, $payload, $accessToken);
        if ($error !== '') {
            throw new \RuntimeException("Error de red al crear preferencia en MercadoPago: {$error}");
        }
        if ($codigo !== 201 || empty($datos['init_point'])) {
            $detalle = $datos['message'] ?? substr(json_encode($datos), 0, 300);
            throw new \RuntimeException("MercadoPago respondió {$codigo} al crear la preferencia: {$detalle}");
        }

        return [
            'link' => $datos['init_point'],
            'referencia_externa' => (string) $datos['id'],
        ];
    }

    public function verificarWebhook(array $headers, string $cuerpoCrudo): ?array
    {
        $secreto = Env::get('MERCADOPAGO_WEBHOOK_SECRET', '');
        $firma = $headers['x-signature'] ?? '';
        $requestId = $headers['x-request-id'] ?? '';
        if ($secreto === '' || $firma === '') {
            return null;
        }

        $partes = [];
        foreach (explode(',', $firma) as $par) {
            [$clave, $valor] = array_pad(explode('=', trim($par), 2), 2, '');
            $partes[trim($clave)] = trim($valor);
        }
        $ts = $partes['ts'] ?? '';
        $v1 = $partes['v1'] ?? '';
        if ($ts === '' || $v1 === '') {
            return null;
        }

        $datos = json_decode($cuerpoCrudo, true);
        $pagoId = (string) ($datos['data']['id'] ?? '');
        if ($pagoId === '') {
            return null;
        }

        $manifest = 'id:' . mb_strtolower($pagoId) . ';';
        if ($requestId !== '') {
            $manifest .= 'request-id:' . $requestId . ';';
        }
        $manifest .= 'ts:' . $ts . ';';

        $esperado = hash_hmac('sha256', $manifest, $secreto);
        if (!hash_equals($esperado, $v1)) {
            return null;
        }

        if (($datos['type'] ?? '') !== 'payment') {
            return null; // Notificación válida pero no es de un pago (p. ej. merchant_order): se ignora.
        }

        // El cuerpo del webhook no es confiable por sí solo (documentado por
        // MercadoPago): se re-consulta el pago real antes de aplicar el evento.
        return self::consultarPago($pagoId);
    }

    /** @return array{referencia_externa:string, estado:'pagado'|'fallido', metadatos?:array}|null */
    private static function consultarPago(string $pagoId): ?array
    {
        $accessToken = Env::requerir('MERCADOPAGO_ACCESS_TOKEN');
        [$codigo, $datos, $error] = self::llamar('GET', sprintf(self::URL_PAGO, $pagoId), null, $accessToken);
        if ($error !== '' || $codigo !== 200 || empty($datos['external_reference'])) {
            return null;
        }

        $estado = ($datos['status'] ?? '') === 'approved' ? 'pagado' : 'fallido';
        return [
            'referencia_externa' => str_replace('pago-', '', (string) $datos['external_reference']),
            'estado' => $estado,
            'metadatos' => ['origen' => 'mercadopago', 'mp_payment_id' => $pagoId, 'mp_status' => $datos['status'] ?? null],
        ];
    }

    /** @return array{0:int, 1:array, 2:string} código HTTP, cuerpo decodificado, error de red */
    private static function llamar(string $metodo, string $url, ?string $payload, string $accessToken): array
    {
        $ch = curl_init($url);
        $headers = ['Authorization: Bearer ' . $accessToken];
        $opciones = [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_CUSTOMREQUEST => $metodo,
        ];
        if ($payload !== null) {
            $headers[] = 'Content-Type: application/json';
            $opciones[CURLOPT_POSTFIELDS] = $payload;
        }
        $opciones[CURLOPT_HTTPHEADER] = $headers;
        curl_setopt_array($ch, $opciones);

        $respuesta = curl_exec($ch);
        $codigo = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($respuesta === false) {
            return [0, [], $error];
        }
        $datos = json_decode($respuesta, true);
        return [$codigo, is_array($datos) ? $datos : [], ''];
    }
}
