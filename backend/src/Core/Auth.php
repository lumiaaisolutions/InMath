<?php

namespace App\Core;

/**
 * Autenticación máquina-a-máquina para n8n vía header X-API-Key.
 * La autenticación de usuarios del panel (sesiones) se agrega en Fase 5.
 */
final class Auth
{
    public static function verificarApiKey(): void
    {
        $esperada = Env::get('API_KEY', '');
        if ($esperada === '') {
            Respuesta::error('API_KEY no configurada en el servidor', 500);
        }
        $recibida = $_SERVER['HTTP_X_API_KEY'] ?? '';
        if (!hash_equals($esperada, $recibida)) {
            Respuesta::error('No autorizado', 401);
        }
    }
}
