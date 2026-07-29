<?php

namespace App\IA;

use App\Core\Env;

/**
 * Cliente mínimo de la API de Gemini (sin SDK, cURL puro) para el agente de
 * IA del sitio y del panel ("Mathy") — independiente de App\Bot\GeminiClient,
 * que usa Gemini para el motor conversacional del bot de WhatsApp con un
 * contrato distinto (mensajes role/content estilo Claude, en vez de
 * historial rol/texto, y sin el manejo de BOT_SIMULADO).
 */
final class GeminiClient
{
    private const URL = 'https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent';

    /**
     * @param array<int,array{rol:string,texto:string}> $historial turnos previos, rol: 'usuario'|'asistente'
     */
    public static function responder(string $sistema, array $historial, string $mensaje): string
    {
        $apiKey = Env::requerir('GEMINI_API_KEY');
        $modelo = Env::get('GEMINI_MODEL', 'gemini-3.6-flash');

        $contents = [];
        foreach ($historial as $turno) {
            $contents[] = [
                'role' => ($turno['rol'] ?? '') === 'asistente' ? 'model' : 'user',
                'parts' => [['text' => (string) ($turno['texto'] ?? '')]],
            ];
        }
        $contents[] = ['role' => 'user', 'parts' => [['text' => $mensaje]]];

        $payload = json_encode([
            'systemInstruction' => ['parts' => [['text' => $sistema]]],
            'contents' => $contents,
            // thinkingLevel bajo: este es un chat de soporte breve, no necesita
            // razonamiento profundo — sin esto, el "pensamiento" interno del
            // modelo consume casi todo maxOutputTokens y la respuesta llega
            // cortada a medias (visto con thinkingConfig por defecto: 383/400
            // tokens en "pensamiento", texto final truncado en MAX_TOKENS).
            'generationConfig' => [
                'temperature' => 0.6,
                'maxOutputTokens' => 800,
                'thinkingConfig' => ['thinkingLevel' => 'low'],
            ],
        ], JSON_UNESCAPED_UNICODE);

        $ch = curl_init(sprintf(self::URL, $modelo));
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_TIMEOUT => 30,
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
        foreach ($datos['candidates'][0]['content']['parts'] ?? [] as $parte) {
            $texto .= $parte['text'] ?? '';
        }
        if ($texto === '') {
            throw new \RuntimeException('Gemini no devolvió texto (posible bloqueo de seguridad del contenido).');
        }
        return trim($texto);
    }
}
