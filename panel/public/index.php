<?php

declare(strict_types=1);

// Servidor embebido de PHP (desarrollo): servir archivos estáticos tal cual.
if (PHP_SAPI === 'cli-server') {
    $archivoEstatico = __DIR__ . (parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/');
    if ($archivoEstatico !== __DIR__ . '/' && is_file($archivoEstatico)) {
        return false;
    }
}

// Rutas relativas: en el repo local panel/public/index.php cuelga de
// panel/ (que a su vez cuelga de la raíz, junto a backend/). Algunos
// hostings resuelven __DIR__ como una ruta real más plana (p. ej. si el
// contenido de panel/public/ se despliega directo en public_html/panel/,
// sin la carpeta "public" intermedia), así que se detecta cada caso.
define('BACKEND_PATH', dirname(__DIR__, is_dir(dirname(__DIR__, 1) . '/backend') ? 1 : 2) . '/backend');
define('PANEL_PATH', is_dir(__DIR__ . '/lib') ? __DIR__ : dirname(__DIR__));

spl_autoload_register(function (string $clase): void {
    if (str_starts_with($clase, 'App\\')) {
        $ruta = BACKEND_PATH . '/src/' . str_replace('\\', '/', substr($clase, 4)) . '.php';
        if (is_file($ruta)) {
            require $ruta;
        }
    }
});

use App\Core\Env;

Env::cargar(BACKEND_PATH . '/.env');
date_default_timezone_set(Env::get('APP_TZ', 'America/Mexico_City'));

// Vacío en local (el panel se sirve en la raíz de su propio puerto). En
// producción, si el CRM cuelga como subcarpeta del sitio (p. ej.
// inmath.lumiaaisolutions.com/panel), se define PANEL_BASE_PATH=/panel.
define('PANEL_BASE', rtrim(Env::get('PANEL_BASE_PATH', ''), '/'));

header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');

session_name('inmath_panel');
session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax', 'path' => PANEL_BASE !== '' ? PANEL_BASE : '/']);
session_start();

require PANEL_PATH . '/lib/ayuda.php';
require PANEL_PATH . '/lib/auth.php';
require PANEL_PATH . '/lib/datos.php';

$ruta = rutaPanel();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require PANEL_PATH . '/lib/acciones.php';
    ejecutarAccion($ruta);
    exit;
}

if ($ruta === '/login') {
    if (usuarioActual() !== null) {
        redirigir('/');
    }
    vista('login', ['sinLayout' => true]);
    exit;
}

requiereSesion();

if ($ruta === '/' || $ruta === '/pipeline') {
    requiereModulo('pipeline');
    vista('pipeline', [
        'columnas' => datosPipeline($_GET['asesor_id'] ?? null),
        'asesores' => listaAsesores(),
        'filtroAsesor' => $_GET['asesor_id'] ?? '',
    ]);
} elseif (preg_match('#^/prospectos/(\d+)$#', $ruta, $m)) {
    $detalle = datosProspecto((int) $m[1]);
    if ($detalle === null) {
        http_response_code(404);
        exit('Prospecto no encontrado');
    }
    vista('prospecto', $detalle + ['asesores' => listaAsesores()]);
} elseif ($ruta === '/citas') {
    requiereModulo('citas');
    $inicioSemana = strtotime($_GET['semana'] ?? 'monday this week');
    vista('citas', [
        'inicioSemana' => $inicioSemana,
        'citas' => citasDeSemana($inicioSemana, $_GET['asesor_id'] ?? null),
        'asesores' => listaAsesores(),
        'filtroAsesor' => $_GET['asesor_id'] ?? '',
    ]);
} elseif ($ruta === '/alumnos') {
    requiereModulo('alumnos');
    vista('alumnos', ['alumnos' => listaAlumnos()]);
} elseif ($ruta === '/pagos') {
    requiereModulo('pagos');
    vista('pagos', ['pagos' => listaPagos()]);
} elseif ($ruta === '/configuracion') {
    requiereAdmin();
    vista('configuracion', ['configuraciones' => listaConfiguraciones()]);
} elseif ($ruta === '/personalizar-login') {
    requiereAdmin();
    vista('personalizar-login', ['configuraciones' => listaConfiguraciones()]);
} elseif (preg_match('#^/comprobante/(\d+)$#', $ruta, $m)) {
    requiereModulo('pagos');
    $pg = App\Core\Database::uno('SELECT comprobante FROM pagos WHERE id = ?', [(int) $m[1]]);
    $rutaArchivo = $pg !== null && $pg['comprobante'] !== null
        ? BACKEND_PATH . '/storage/comprobantes/' . basename($pg['comprobante']) : null;
    if ($rutaArchivo === null || !is_file($rutaArchivo)) {
        http_response_code(404);
        exit('Comprobante no encontrado');
    }
    header('Content-Type: ' . (mime_content_type($rutaArchivo) ?: 'application/octet-stream'));
    header('Content-Disposition: inline; filename="' . basename($rutaArchivo) . '"');
    readfile($rutaArchivo);
    exit;
} elseif ($ruta === '/usuarios') {
    requiereAdmin();
    vista('usuarios', ['usuarios' => App\Core\Database::todos(
        'SELECT id, nombre, email, rol, telefono, activo, modulos FROM usuarios ORDER BY rol, nombre'
    )]);
} elseif ($ruta === '/perfil') {
    $yo = App\Core\Database::uno(
        'SELECT id, nombre, email, rol, telefono FROM usuarios WHERE id = ?',
        [(int) usuarioActual()['id']]
    );
    vista('perfil', ['yo' => $yo]);
} elseif ($ruta === '/prompts') {
    requiereAdmin();
    vista('prompts', ['prompts' => listaPrompts()]);
} else {
    http_response_code(404);
    vista('no-encontrado', []);
}
