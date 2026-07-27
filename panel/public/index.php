<?php

declare(strict_types=1);

// Servidor embebido de PHP (desarrollo): servir archivos estáticos tal cual.
if (PHP_SAPI === 'cli-server') {
    $archivoEstatico = __DIR__ . (parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/');
    if ($archivoEstatico !== __DIR__ . '/' && is_file($archivoEstatico)) {
        return false;
    }
}

define('BACKEND_PATH', dirname(__DIR__, 2) . '/backend');
define('PANEL_PATH', dirname(__DIR__));

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
    $inicioSemana = strtotime($_GET['semana'] ?? 'monday this week');
    vista('citas', [
        'inicioSemana' => $inicioSemana,
        'citas' => citasDeSemana($inicioSemana, $_GET['asesor_id'] ?? null),
        'asesores' => listaAsesores(),
        'filtroAsesor' => $_GET['asesor_id'] ?? '',
    ]);
} elseif ($ruta === '/alumnos') {
    vista('alumnos', ['alumnos' => listaAlumnos()]);
} elseif ($ruta === '/pagos') {
    vista('pagos', ['pagos' => listaPagos()]);
} elseif ($ruta === '/configuracion') {
    requiereAdmin();
    vista('configuracion', ['configuraciones' => listaConfiguraciones()]);
} elseif ($ruta === '/prompts') {
    requiereAdmin();
    vista('prompts', ['prompts' => listaPrompts()]);
} else {
    http_response_code(404);
    vista('no-encontrado', []);
}
