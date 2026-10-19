<?php

declare(strict_types=1);

define('BASE_PATH', dirname(__DIR__));

spl_autoload_register(function (string $clase): void {
    if (str_starts_with($clase, 'App\\')) {
        $ruta = BASE_PATH . '/src/' . str_replace('\\', '/', substr($clase, 4)) . '.php';
        if (is_file($ruta)) {
            require $ruta;
        }
    }
});

use App\Core\Auth;
use App\Core\Env;
use App\Core\Respuesta;
use App\Core\Router;

Env::cargar(BASE_PATH . '/.env');
date_default_timezone_set(Env::get('APP_TZ', 'America/Mexico_City'));

set_exception_handler(function (\Throwable $e): void {
    error_log($e->getMessage() . ' en ' . $e->getFile() . ':' . $e->getLine());
    $detalle = Env::get('APP_ENV', 'produccion') === 'desarrollo' ? ['detalle' => $e->getMessage()] : [];
    Respuesta::error('Error interno del servidor', 500, $detalle);
});

$rutaActual = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
// /api/webhooks/* lo llaman procesadores externos: la autenticidad la valida el
// driver (firma HMAC), no la API key.
if (str_starts_with($rutaActual, '/api')
    && $rutaActual !== '/api/health'
    && !str_starts_with($rutaActual, '/api/webhooks/')) {
    Auth::verificarApiKey();
}

$router = new Router();
(require BASE_PATH . '/routes.php')($router);
$router->despachar($_SERVER['REQUEST_METHOD'] ?? 'GET', $_SERVER['REQUEST_URI'] ?? '/');
