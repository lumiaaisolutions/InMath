<?php

declare(strict_types=1);

// Router SOLO para el servidor embebido de PHP (php -S), que no procesa el
// .htaccess. Producción sigue usando el .htaccess de este directorio (301 de
// /agenda.php→/agenda y rewrite interno /agenda→agenda.php).
//   php -S 127.0.0.1:8125 -t sitio/public sitio/public/router.php

$ruta = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';

// Archivos reales (estáticos y .php directos como /api/agente.php): servir tal cual.
if ($ruta !== '/' && is_file(__DIR__ . $ruta)) {
    return false;
}

$paginas = [
    '/'       => 'index.php',
    '/agenda' => 'agenda.php',
    '/pago'   => 'pago.php',
];
$destino = $paginas[rtrim($ruta, '/') === '' ? '/' : rtrim($ruta, '/')] ?? null;

if ($destino === null) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'No encontrado';
    return true;
}

require __DIR__ . '/' . $destino;
