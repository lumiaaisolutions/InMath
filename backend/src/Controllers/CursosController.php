<?php

namespace App\Controllers;

use App\Core\Database;
use App\Core\Respuesta;
use App\Core\Validar;

final class CursosController
{
    public function index(array $params, array $cuerpo): never
    {
        $soloActivos = ($_GET['activos'] ?? '1') !== '0';
        $where = $soloActivos ? 'WHERE activo = 1' : '';
        Respuesta::json(Database::todos("SELECT * FROM cursos {$where} ORDER BY id"));
    }

    public function store(array $params, array $cuerpo): never
    {
        Validar::requeridos($cuerpo, ['nombre', 'precio_centavos']);
        $id = Database::insertar(
            'INSERT INTO cursos (nombre, descripcion, precio_centavos, moneda, duracion_semanas)
             VALUES (?, ?, ?, ?, ?)',
            [
                $cuerpo['nombre'],
                $cuerpo['descripcion'] ?? null,
                (int) $cuerpo['precio_centavos'],
                $cuerpo['moneda'] ?? 'MXN',
                $cuerpo['duracion_semanas'] ?? null,
            ]
        );
        Respuesta::json(Database::uno('SELECT * FROM cursos WHERE id = ?', [$id]), 201);
    }

    public function update(array $params, array $cuerpo): never
    {
        $id = (int) $params['id'];
        if (Database::uno('SELECT id FROM cursos WHERE id = ?', [$id]) === null) {
            Respuesta::error('Curso no encontrado', 404);
        }
        $sets = [];
        $valores = [];
        foreach (['nombre', 'descripcion', 'precio_centavos', 'moneda', 'duracion_semanas', 'activo'] as $campo) {
            if (array_key_exists($campo, $cuerpo)) {
                $sets[] = "{$campo} = ?";
                $valores[] = $cuerpo[$campo];
            }
        }
        if ($sets === []) {
            Respuesta::error('Nada que actualizar', 422);
        }
        $valores[] = $id;
        Database::ejecutar('UPDATE cursos SET ' . implode(', ', $sets) . ' WHERE id = ?', $valores);
        Respuesta::json(Database::uno('SELECT * FROM cursos WHERE id = ?', [$id]));
    }
}
