<?php

declare(strict_types=1);

require __DIR__ . '/../_comun.php';

use App\Servicios\AgendaServicio;
use App\Servicios\ProspectoServicio;

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

// Freno de abuso: máximo 20 mensajes por sesión cada 10 minutos (la API de
// Gemini cuesta por llamada; sin esto cualquiera puede drenar la cuota).
$ahora = time();
$_SESSION['agente_hits'] = array_values(array_filter($_SESSION['agente_hits'] ?? [], fn ($t) => $t > $ahora - 600));
if (count($_SESSION['agente_hits']) >= 20) {
    http_response_code(429);
    echo json_encode(['error' => 'Muchos mensajes seguidos. Espera unos minutos e intenta de nuevo.']);
    exit;
}
$_SESSION['agente_hits'][] = $ahora;

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

// Disponibilidad REAL (el mismo servicio que usa la página de agenda y el
// panel): se inyecta al prompt para que Mathy solo ofrezca horarios que
// existen, y el agendamiento se ejecuta aquí en el servidor — nunca se da
// por hecha una cita que no se insertó en la base.
$slots = AgendaServicio::slotsDisponibles(null, 7, null, 24);
$listaSlots = [];
foreach ($slots as $s) {
    $listaSlots[$s['inicio']] = $s['etiqueta'];
}
$slotsTexto = $listaSlots === []
    ? '(por ahora no hay horarios disponibles esta semana)'
    : implode("\n", array_map(fn ($k, $v) => "- $k → $v", array_keys($listaSlots), $listaSlots));

$sistema = 'Eres Mathy, el asistente de IA de Cursos Inmath, una plataforma de cursos en línea con '
    . 'acompañamiento personal por WhatsApp. Ayudas con dudas sobre el curso, precios, inscripción '
    . 'y agendas asesorías gratuitas. Respondes siempre en español, breve, cálido y concreto '
    . '(máximo 3-4 frases). Nunca inventes precios, fechas ni datos.'
    . "\n\nHORARIOS DISPONIBLES REALES para asesoría gratuita (única fuente válida):\n" . $slotsTexto
    . "\n\nREGLAS PARA AGENDAR (obligatorias):"
    . "\n1. Solo puedes ofrecer horarios de la lista anterior, con su día y hora. Si piden un horario que no está (por ejemplo \"mañana a las 6pm\" y no aparece), dilo con claridad y ofrece los 2-3 horarios reales más cercanos."
    . "\n2. Para agendar necesitas: nombre, WhatsApp de 10 dígitos y UN horario exacto de la lista."
    . "\n3. Cuando tengas los tres datos confirmados, responde ÚNICAMENTE con este comando, sin ningún otro texto: "
    . '<agendar>{"nombre":"NOMBRE","telefono":"10DIGITOS","inicio":"YYYY-MM-DD HH:MM"}</agendar>'
    . " usando el valor exacto de 'inicio' que aparece en la lista."
    . "\n4. NUNCA digas que la cita quedó agendada tú mismo: el sistema la agenda al recibir el comando y él confirma. Si no emites el comando, la cita NO existe.";

try {
    $respuesta = \App\IA\GeminiClient::responder($sistema, $historial, $mensaje);

    // ¿Mathy emitió el comando de agendar? Ejecutarlo de verdad.
    if (preg_match('/<agendar>\s*(\{.*?\})\s*<\/agendar>/su', $respuesta, $m)) {
        $datos = json_decode($m[1], true);
        $nombre = trim((string) ($datos['nombre'] ?? ''));
        $telefono = preg_replace('/\D+/', '', (string) ($datos['telefono'] ?? ''));
        $inicio = trim((string) ($datos['inicio'] ?? ''));

        if ($nombre === '' || strlen($telefono) < 10 || strlen($telefono) > 15
            || !preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/', $inicio) || !isset($listaSlots[$inicio])) {
            echo json_encode(['respuesta' => 'Me falta confirmar bien tus datos: dime tu nombre, tu WhatsApp de 10 dígitos y elige uno de los horarios disponibles que te compartí.']);
            exit;
        }
        if (strlen($telefono) === 10) {
            $telefono = '521' . $telefono;
        }
        $resultado = ProspectoServicio::upsertPorTelefono($telefono, ['nombre' => $nombre, 'fuente' => 'organico']);
        $prospecto = $resultado['prospecto'];
        if (($prospecto['nombre'] ?? null) === null && $nombre !== '') {
            App\Core\Database::ejecutar('UPDATE prospectos SET nombre = ? WHERE id = ?', [$nombre, $prospecto['id']]);
        }
        $r = AgendaServicio::agendar((int) $prospecto['id'], $inicio);
        if (isset($r['error'])) {
            echo json_encode(['respuesta' => 'Ese horario se acaba de ocupar 😔. ¿Te late alguno de estos? ' . implode(' · ', array_slice(array_values($listaSlots), 0, 3))]);
            exit;
        }
        echo json_encode([
            'respuesta' => '¡Listo, ' . $nombre . '! 🎉 Tu asesoría gratuita quedó agendada para el ' . $listaSlots[$inicio]
                . '. Te llegará la confirmación con el enlace por WhatsApp. ¡Nos vemos!',
            'agendado' => true,
        ]);
        exit;
    }

    echo json_encode(['respuesta' => $respuesta]);
} catch (\Throwable $e) {
    error_log('[agente-ia:sitio] ' . $e->getMessage());
    http_response_code(502);
    echo json_encode(['error' => 'No pude conectarme en este momento. Intenta de nuevo en unos segundos.']);
}
