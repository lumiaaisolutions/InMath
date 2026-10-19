<?php

namespace App\Pagos;

use App\Core\Env;

/**
 * Procesador simulado para desarrollo y pruebas end-to-end del embudo completo
 * sin credenciales reales. El webhook se firma con HMAC-SHA256 usando
 * PAGO_WEBHOOK_SECRET (header X-Firma-Simulada).
 */
final class DriverSimulado implements ProcesadorPago
{
    public function crearLink(array $pago, array $prospecto, array $curso): array
    {
        $referencia = 'SIM-' . $pago['id'] . '-' . bin2hex(random_bytes(6));
        return [
            'link' => 'https://pagos.simulado.local/checkout/' . $referencia,
            'referencia_externa' => $referencia,
        ];
    }

    public function verificarWebhook(array $headers, string $cuerpoCrudo): ?array
    {
        $secreto = Env::get('PAGO_WEBHOOK_SECRET', '');
        $firma = $headers['x-firma-simulada'] ?? '';
        if ($secreto === '' || !hash_equals(hash_hmac('sha256', $cuerpoCrudo, $secreto), $firma)) {
            return null;
        }
        $datos = json_decode($cuerpoCrudo, true);
        if (!is_array($datos) || empty($datos['referencia_externa'])) {
            return null;
        }
        $estado = ($datos['estado'] ?? '') === 'pagado' ? 'pagado' : 'fallido';
        return [
            'referencia_externa' => (string) $datos['referencia_externa'],
            'estado' => $estado,
            'metadatos' => ['origen' => 'simulado'],
        ];
    }
}
