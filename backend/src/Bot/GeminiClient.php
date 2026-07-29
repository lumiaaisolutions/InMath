<?php

namespace App\Bot;

use App\Core\Env;

/**
 * Motor conversacional del bot de WhatsApp — Gemini (cURL puro, sin SDK).
 * Reemplaza al antiguo ClaudeClient: mismo contrato (completar()), mismo
 * fallback simulado con BOT_SIMULADO=1, misma expectativa de que el prompt
 * de sistema (tabla prompts) le pida a el modelo responder en JSON
 * ({respuesta, accion, calificacion, cita}) que MotorBot::interpretar() lee.
 */
final class GeminiClient
{
    private const URL = 'https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent';

    /**
     * @param array<int,array{role:string,content:string}> $mensajes roles: 'user'|'assistant'
     */
    public static function completar(string $sistema, array $mensajes, string $modelo, int $maxTokens = 1024): string
    {
        if (Env::get('BOT_SIMULADO', '0') === '1') {
            return self::respuestaSimulada($mensajes);
        }

        $apiKey = Env::requerir('GEMINI_API_KEY');

        $contents = [];
        foreach ($mensajes as $mensaje) {
            $contents[] = [
                'role' => ($mensaje['role'] ?? '') === 'assistant' ? 'model' : 'user',
                'parts' => [['text' => (string) ($mensaje['content'] ?? '')]],
            ];
        }

        $payload = json_encode([
            'systemInstruction' => ['parts' => [['text' => $sistema]]],
            'contents' => $contents,
            // thinkingLevel bajo: sin esto, Gemini gasta la mayoría de
            // maxOutputTokens en razonamiento interno y el JSON de salida
            // llega cortado a la mitad (mismo problema ya documentado y
            // resuelto para el agente Mathy en App\IA\GeminiClient).
            'generationConfig' => [
                'temperature' => 0.5,
                'maxOutputTokens' => $maxTokens,
                'thinkingConfig' => ['thinkingLevel' => 'low'],
            ],
        ], JSON_UNESCAPED_UNICODE);

        $ch = curl_init(sprintf(self::URL, $modelo));
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_TIMEOUT => 60,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'x-goog-api-key: ' . $apiKey,
            ],
        ]);
        $respuesta = curl_exec($ch);
        $codigo = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $errorCurl = curl_error($ch);
        curl_close($ch);

        if ($respuesta === false) {
            throw new \RuntimeException("Error de red al llamar a Gemini: {$errorCurl}");
        }
        $datos = json_decode($respuesta, true);
        if ($codigo !== 200) {
            $detalle = $datos['error']['message'] ?? substr($respuesta, 0, 300);
            throw new \RuntimeException("API de Gemini respondió {$codigo}: {$detalle}");
        }
        $texto = '';
        foreach ($datos['candidates'][0]['content']['parts'] ?? [] as $bloque) {
            $texto .= $bloque['text'] ?? '';
        }
        return $texto;
    }

    /** Respuestas deterministas por palabra clave para probar el flujo completo. */
    private static function respuestaSimulada(array $mensajes): string
    {
        $ultimo = '';
        for ($i = count($mensajes) - 1; $i >= 0; $i--) {
            if ($mensajes[$i]['role'] === 'user') {
                $ultimo = mb_strtolower($mensajes[$i]['content']);
                break;
            }
        }

        if (preg_match('/opci[oó]n\s*(\d+)|^(\d)$/u', $ultimo, $m)) {
            $indice = (int) ($m[1] !== '' ? $m[1] : $m[2]) - 1;
            for ($i = count($mensajes) - 1; $i >= 0; $i--) {
                if ($mensajes[$i]['role'] === 'assistant'
                    && preg_match_all('/\((\d{4}-\d{2}-\d{2} \d{2}:\d{2})\)/', $mensajes[$i]['content'], $mm)) {
                    $inicio = $mm[1][$indice] ?? $mm[1][0];
                    return json_encode([
                        'respuesta' => 'Perfecto, agendo tu cita en ese horario.',
                        'accion' => 'agendar_cita',
                        'cita' => ['inicio' => $inicio],
                        'calificacion' => null,
                    ], JSON_UNESCAPED_UNICODE);
                }
            }
        }
        if (preg_match('/asesor|humano|persona/', $ultimo)) {
            return json_encode([
                'respuesta' => 'Claro que sí, en un momento te comunico con uno de nuestros asesores para que te atienda personalmente.',
                'accion' => 'pasar_asesor',
                'calificacion' => null,
            ], JSON_UNESCAPED_UNICODE);
        }
        if (preg_match('/cita|llamada|videollamada|agendar/', $ultimo)) {
            return json_encode([
                'respuesta' => 'Con mucho gusto agendamos una sesión informativa. ¿Qué día y horario te acomodan mejor?',
                'accion' => 'ofrecer_cita',
                'calificacion' => ['urgencia' => 4, 'fecha_examen' => null, 'presupuesto' => 'desconocido'],
            ], JSON_UNESCAPED_UNICODE);
        }
        if (preg_match('/pagar|inscribir|comprar/', $ultimo)) {
            return json_encode([
                'respuesta' => 'Excelente decisión. Te comparto el enlace de pago seguro para completar tu inscripción.',
                'accion' => 'listo_para_pago',
                'calificacion' => ['urgencia' => 5, 'fecha_examen' => null, 'presupuesto' => 'si'],
            ], JSON_UNESCAPED_UNICODE);
        }
        if (preg_match('/examen|octubre|fecha/', $ultimo)) {
            return json_encode([
                'respuesta' => 'Gracias por contarme. Con esa fecha de examen, nuestro curso te da tiempo suficiente para prepararte bien. ¿Te gustaría conocer el temario?',
                'accion' => 'continuar',
                'calificacion' => ['urgencia' => 4, 'fecha_examen' => '2026-10-15', 'presupuesto' => 'desconocido'],
            ], JSON_UNESCAPED_UNICODE);
        }
        return json_encode([
            'respuesta' => '¡Hola! Qué gusto saludarte. Soy el asistente de Cursos Inmath. ¿Te platico cómo funciona el curso?',
            'accion' => 'continuar',
            'calificacion' => null,
        ], JSON_UNESCAPED_UNICODE);
    }
}
