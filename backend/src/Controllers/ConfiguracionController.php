<?php

namespace App\Controllers;

use App\Core\Database;
use App\Core\Respuesta;
use App\Core\Validar;

final class ConfiguracionController
{
    public function index(array $params, array $cuerpo): never
    {
        Respuesta::json(Database::todos('SELECT * FROM configuraciones ORDER BY clave'));
    }

    public function show(array $params, array $cuerpo): never
    {
        $config = Database::uno('SELECT * FROM configuraciones WHERE clave = ?', [$params['clave']]);
        if ($config === null) {
            Respuesta::error('Configuración no encontrada', 404);
        }
        if ($config['tipo'] === 'json') {
            $config['valor_decodificado'] = json_decode($config['valor'], true);
        }
        Respuesta::json($config);
    }

    /** Upsert de una clave de configuración. */
    public function actualizar(array $params, array $cuerpo): never
    {
        Validar::requeridos($cuerpo, ['valor']);
        $tipo = $cuerpo['tipo'] ?? 'texto';
        Validar::enOpciones($tipo, ['texto', 'numero', 'json', 'booleano'], 'tipo');
        $valor = is_array($cuerpo['valor'])
            ? json_encode($cuerpo['valor'], JSON_UNESCAPED_UNICODE)
            : (string) $cuerpo['valor'];

        Database::ejecutar(
            'INSERT INTO configuraciones (clave, valor, tipo, descripcion, actualizado_por)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE valor = VALUES(valor),
                                     actualizado_por = VALUES(actualizado_por)',
            [$params['clave'], $valor, $tipo, $cuerpo['descripcion'] ?? null, $cuerpo['usuario_id'] ?? null]
        );
        Respuesta::json(Database::uno('SELECT * FROM configuraciones WHERE clave = ?', [$params['clave']]));
    }
}
