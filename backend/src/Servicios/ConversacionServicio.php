<?php

namespace App\Servicios;

use App\Core\Database;

final class ConversacionServicio
{
    public static function obtenerOCrear(int $prospectoId): array
    {
        $conversacion = Database::uno(
            "SELECT * FROM conversaciones WHERE prospecto_id = ? AND canal = 'whatsapp'",
            [$prospectoId]
        );
        if ($conversacion !== null) {
            return $conversacion;
        }
        try {
            $id = Database::insertar('INSERT INTO conversaciones (prospecto_id) VALUES (?)', [$prospectoId]);
        } catch (\PDOException $e) {
            // Carrera: otra petición la creó primero (UNIQUE prospecto_id+canal).
            if ($e->getCode() === '23000') {
                return Database::uno(
                    "SELECT * FROM conversaciones WHERE prospecto_id = ? AND canal = 'whatsapp'",
                    [$prospectoId]
                );
            }
            throw $e;
        }
        return Database::uno('SELECT * FROM conversaciones WHERE id = ?', [$id]);
    }

    /**
     * Registra un mensaje de forma idempotente por wa_message_id.
     * @return array{mensaje: array, duplicado: bool}
     */
    public static function registrarMensaje(int $conversacionId, array $datos): array
    {
        $waMessageId = $datos['wa_message_id'] ?? null;
        try {
            $id = Database::insertar(
                'INSERT INTO mensajes (conversacion_id, direccion, emisor, tipo, contenido, wa_message_id, estado_entrega, metadatos)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    $conversacionId,
                    $datos['direccion'],
                    $datos['emisor'],
                    $datos['tipo'] ?? 'texto',
                    $datos['contenido'],
                    $waMessageId,
                    $datos['estado_entrega'] ?? null,
                    isset($datos['metadatos']) ? json_encode($datos['metadatos'], JSON_UNESCAPED_UNICODE) : null,
                ]
            );
        } catch (\PDOException $e) {
            if ($e->getCode() === '23000' && $waMessageId !== null) {
                return [
                    'mensaje' => Database::uno('SELECT * FROM mensajes WHERE wa_message_id = ?', [$waMessageId]),
                    'duplicado' => true,
                ];
            }
            throw $e;
        }
        Database::ejecutar('UPDATE conversaciones SET ultima_actividad_en = NOW() WHERE id = ?', [$conversacionId]);
        return ['mensaje' => Database::uno('SELECT * FROM mensajes WHERE id = ?', [$id]), 'duplicado' => false];
    }
}
