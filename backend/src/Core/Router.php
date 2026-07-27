<?php

namespace App\Core;

/**
 * Router mínimo: rutas con parámetros {nombre}, despacha a [Clase, 'metodo'].
 * El handler recibe (array $params, array $cuerpo) y devuelve lo que Respuesta emita.
 */
final class Router
{
    /** @var array<int,array{metodo:string,regex:string,params:string[],handler:array{0:class-string,1:string}}> */
    private array $rutas = [];

    public function agregar(string $metodo, string $patron, array $handler): void
    {
        preg_match_all('/\{(\w+)\}/', $patron, $m);
        $regex = '#^' . preg_replace('/\{\w+\}/', '([^/]+)', $patron) . '$#';
        $this->rutas[] = [
            'metodo' => strtoupper($metodo),
            'regex' => $regex,
            'params' => $m[1],
            'handler' => $handler,
        ];
    }

    public function get(string $p, array $h): void { $this->agregar('GET', $p, $h); }
    public function post(string $p, array $h): void { $this->agregar('POST', $p, $h); }
    public function patch(string $p, array $h): void { $this->agregar('PATCH', $p, $h); }
    public function put(string $p, array $h): void { $this->agregar('PUT', $p, $h); }

    public function despachar(string $metodo, string $uri): never
    {
        $ruta = parse_url($uri, PHP_URL_PATH) ?? '/';
        $rutaExiste = false;

        foreach ($this->rutas as $r) {
            if (!preg_match($r['regex'], $ruta, $m)) {
                continue;
            }
            $rutaExiste = true;
            if ($r['metodo'] !== strtoupper($metodo)) {
                continue;
            }
            $params = array_combine($r['params'], array_slice($m, 1)) ?: [];
            $cuerpo = self::leerCuerpo();
            [$clase, $accion] = $r['handler'];
            (new $clase())->$accion($params, $cuerpo);
        }

        $rutaExiste
            ? Respuesta::error('Método no permitido', 405)
            : Respuesta::error('Ruta no encontrada', 404);
    }

    private static function leerCuerpo(): array
    {
        $crudo = file_get_contents('php://input');
        if ($crudo === '' || $crudo === false) {
            return [];
        }
        $datos = json_decode($crudo, true);
        if (!is_array($datos)) {
            Respuesta::error('Cuerpo JSON inválido', 400);
        }
        return $datos;
    }
}
