<?php

declare(strict_types=1);

require __DIR__ . '/../_comun.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
    exit;
}

if (!csrfValido()) {
    http_response_code(419);
    echo json_encode(['error' => 'Sesión expirada. Recarga la página e intenta de nuevo.']);
    exit;
}

$mensaje = trim($_POST['mensaje'] ?? '');
if ($mensaje === '' || mb_strlen($mensaje) > 800) {
    http_response_code(400);
    echo json_encode(['error' => 'Escribe un mensaje válido.']);
    exit;
}

$historial = json_decode($_POST['historial'] ?? '[]', true);
if (!is_array($historial)) {
    $historial = [];
}
$historial = array_slice($historial, -12);

$sistema = 'Eres Mathy, el asistente de IA de Cursos Inmath, una plataforma de cursos en línea con '
    . 'acompañamiento personal por WhatsApp. Ayudas a quien visita la página con dudas sobre '
    . 'cómo funciona el curso, qué incluye, precios, el proceso de inscripción y cómo agendar '
    . 'una asesoría gratuita. Respondes siempre en español, de forma breve, cálida y concreta '
    . '(máximo 3-4 frases). Si preguntan algo fuera de este contexto, redirige con amabilidad '
    . 'hacia el curso. Nunca inventes precios, fechas ni datos que no tengas.';

try {
    $respuesta = \App\IA\GeminiClient::responder($sistema, $historial, $mensaje);
    echo json_encode(['respuesta' => $respuesta]);
} catch (\Throwable $e) {
    error_log('[agente-ia:sitio] ' . $e->getMessage());
    http_response_code(502);
    echo json_encode(['error' => 'No pude conectarme en este momento. Intenta de nuevo en unos segundos.']);
}
