<?php

namespace App\Controllers;

use App\Core\Database;
use App\Core\Respuesta;
use App\Core\Validar;

final class AlumnosController
{
    public function index(array $params, array $cuerpo): never
    {
        $condiciones = [];
        $valores = [];
        if (!empty($_GET['estado'])) {
            Validar::enOpciones($_GET['estado'], ['activo', 'pausado', 'completado', 'baja'], 'estado');
            $condiciones[] = 'a.estado = ?';
            $valores[] = $_GET['estado'];
        }
        $where = $condiciones === [] ? '' : 'WHERE ' . implode(' AND ', $condiciones);
        Respuesta::json(Database::todos(
            "SELECT a.*, c.nombre AS curso_nombre
             FROM alumnos a JOIN cursos c ON c.id = a.curso_id
             {$where} ORDER BY a.inscrito_en DESC",
            $valores
        ));
    }

    public function show(array $params, array $cuerpo): never
    {
        $alumno = Database::uno(
            'SELECT a.*, c.nombre AS curso_nombre
             FROM alumnos a JOIN cursos c ON c.id = a.curso_id
             WHERE a.id = ?',
            [(int) $params['id']]
        );
        if ($alumno === null) {
            Respuesta::error('Alumno no encontrado', 404);
        }
        Respuesta::json($alumno);
    }

    public function update(array $params, array $cuerpo): never
    {
        $id = (int) $params['id'];
        if (Database::uno('SELECT id FROM alumnos WHERE id = ?', [$id]) === null) {
            Respuesta::error('Alumno no encontrado', 404);
        }
        $sets = [];
        $valores = [];
        if (array_key_exists('estado', $cuerpo)) {
            Validar::enOpciones($cuerpo['estado'], ['activo', 'pausado', 'completado', 'baja'], 'estado');
            $sets[] = 'estado = ?';
            $valores[] = $cuerpo['estado'];
        }
        if (array_key_exists('canal_reporte', $cuerpo)) {
            Validar::enOpciones($cuerpo['canal_reporte'], ['whatsapp', 'email'], 'canal_reporte');
            $sets[] = 'canal_reporte = ?';
            $valores[] = $cuerpo['canal_reporte'];
        }
        foreach (['nombre', 'email'] as $campo) {
            if (array_key_exists($campo, $cuerpo)) {
                $sets[] = "{$campo} = ?";
                $valores[] = $cuerpo[$campo];
            }
        }
        if ($sets === []) {
            Respuesta::error('Nada que actualizar', 422);
        }
        $valores[] = $id;
        Database::ejecutar('UPDATE alumnos SET ' . implode(', ', $sets) . ' WHERE id = ?', $valores);
        Respuesta::json(Database::uno('SELECT * FROM alumnos WHERE id = ?', [$id]));
    }
}
