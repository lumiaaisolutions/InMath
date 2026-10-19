<?php

namespace App\Controllers;

use App\Core\Database;
use App\Core\Respuesta;
use App\Core\Validar;

final class ConversacionesController
{
    public function obtenerOCrear(array $params, array $cuerpo): never
    {
        Validar::requeridos($cuerpo, ['prospecto_id']);
        $prospectoId = (int) $cuerpo['prospecto_id'];
        if (Database::uno('SELECT id FROM prospectos WHERE id = ?', [$prospectoId]) === null) {
            Respuesta::error('Prospecto no encontrado', 404);
        }
        Respuesta::json(self::conversacionDeProspecto($prospectoId));
    }

    public function mensajes(array $params, array $cuerpo): never
    {
        $id = (int) $params['id'];
        if (Database::uno('SELECT id FROM conversaciones WHERE id = ?', [$id]) === null) {
            Respuesta::error('Conversación no encontrada', 404);
        }
        $limite = min(500, max(1, (int) ($_GET['limite'] ?? 100)));
        Respuesta::json(Database::todos(
            "SELECT * FROM mensajes WHERE conversacion_id = ? ORDER BY creado_en, id LIMIT {$limite}",
            [$id]
        ));
    }

    /**
     * Registra un mensaje (entrante o saliente). Idempotente por wa_message_id:
     * si Meta reenvía el webhook, se devuelve el mensaje ya registrado.
     * Acepta conversacion_id directo o prospecto_id (resuelve/crea la conversación).
     */
    public function crearMensaje(array $params, array $cuerpo): never
    {
        Validar::requeridos($cuerpo, ['direccion', 'emisor', 'contenido']);
        Validar::enOpciones($cuerpo['direccion'], ['entrante', 'saliente'], 'direccion');
        Validar::enOpciones($cuerpo['emisor'], ['prospecto', 'bot', 'asesor', 'sistema'], 'emisor');
        $tipo = $cuerpo['tipo'] ?? 'texto';
        Validar::enOpciones($tipo, ['texto', 'imagen', 'audio', 'video', 'documento', 'plantilla', 'interactivo'], 'tipo');

        if (isset($cuerpo['conversacion_id'])) {
            $conversacion = Database::uno('SELECT * FROM conversaciones WHERE id = ?', [(int) $cuerpo['conversacion_id']]);
            if ($conversacion === null) {
                Respuesta::error('Conversación no encontrada', 404);
            }
        } elseif (isset($cuerpo['prospecto_id'])) {
            if (Database::uno('SELECT id FROM prospectos WHERE id = ?', [(int) $cuerpo['prospecto_id']]) === null) {
                Respuesta::error('Prospecto no encontrado', 404);
            }
            $conversacion = self::conversacionDeProspecto((int) $cuerpo['prospecto_id']);
        } else {
            Respuesta::error('Se requiere conversacion_id o prospecto_id', 422);
        }

        $registro = \App\Servicios\ConversacionServicio::registrarMensaje((int) $conversacion['id'], $cuerpo + ['tipo' => $tipo]);
        Respuesta::json(
            ['duplicado' => $registro['duplicado'], 'mensaje' => $registro['mensaje']],
            $registro['duplicado'] ? 200 : 201
        );
    }

    /** PATCH /api/conversaciones/{id} — cambia estado (bot|asesor|cerrada) y asesor a cargo. */
    public function update(array $params, array $cuerpo): never
    {
        $id = (int) $params['id'];
        if (Database::uno('SELECT id FROM conversaciones WHERE id = ?', [$id]) === null) {
            Respuesta::error('Conversación no encontrada', 404);
        }
        $sets = [];
        $valores = [];
        if (array_key_exists('estado', $cuerpo)) {
            Validar::enOpciones($cuerpo['estado'], ['bot', 'asesor', 'cerrada'], 'estado');
            $sets[] = 'estado = ?';
            $valores[] = $cuerpo['estado'];
        }
        if (array_key_exists('asesor_id', $cuerpo)) {
            $sets[] = 'asesor_id = ?';
            $valores[] = $cuerpo['asesor_id'];
        }
        if ($sets === []) {
            Respuesta::error('Nada que actualizar', 422);
        }
        $valores[] = $id;
        Database::ejecutar('UPDATE conversaciones SET ' . implode(', ', $sets) . ' WHERE id = ?', $valores);
        Respuesta::json(Database::uno('SELECT * FROM conversaciones WHERE id = ?', [$id]));
    }

    private static function conversacionDeProspecto(int $prospectoId): array
    {
        return \App\Servicios\ConversacionServicio::obtenerOCrear($prospectoId);
    }
}
