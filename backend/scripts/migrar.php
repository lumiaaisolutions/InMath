<?php

/**
 * Aplica migraciones y seeds pendientes, en orden, con registro en la tabla
 * `migraciones`. Uso: php backend/scripts/migrar.php [--solo-migraciones]
 */

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

use App\Core\Database;
use App\Core\Env;

Env::cargar(BASE_PATH . '/.env');

$pdo = Database::pdo();
$pdo->exec(
    'CREATE TABLE IF NOT EXISTS migraciones (
        archivo VARCHAR(190) PRIMARY KEY,
        aplicado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
);

$directorios = ['migrations' => BASE_PATH . '/../database/migrations'];
if (!in_array('--solo-migraciones', $argv, true)) {
    $directorios['seeds'] = BASE_PATH . '/../database/seeds';
}

$aplicadas = array_column($pdo->query('SELECT archivo FROM migraciones')->fetchAll(), 'archivo');

foreach ($directorios as $prefijo => $dir) {
    $archivos = glob($dir . '/*.sql') ?: [];
    sort($archivos);
    foreach ($archivos as $ruta) {
        $nombre = $prefijo . '/' . basename($ruta);
        if (in_array($nombre, $aplicadas, true)) {
            continue;
        }
        echo "Aplicando {$nombre}... ";
        $sql = file_get_contents($ruta);
        // Divide en sentencias por ';' a fin de línea (las sentencias del proyecto
        // no contienen ese patrón dentro de literales).
        $sentencias = preg_split('/;\s*(?:\r?\n|$)/', $sql);
        foreach ($sentencias as $sentencia) {
            $limpia = trim(preg_replace('/^\s*--.*$/m', '', $sentencia));
            if ($limpia !== '') {
                $pdo->exec($limpia);
            }
        }
        $stmt = $pdo->prepare('INSERT INTO migraciones (archivo) VALUES (?)');
        $stmt->execute([$nombre]);
        echo "OK\n";
    }
}

echo "Migraciones al día.\n";
