<?php

use App\Core\Database;

function usuarioActual(): ?array
{
    if (empty($_SESSION['usuario_id'])) {
        return null;
    }
    static $usuario = false;
    if ($usuario === false) {
        $usuario = Database::uno(
            'SELECT id, nombre, email, rol FROM usuarios WHERE id = ? AND activo = 1',
            [$_SESSION['usuario_id']]
        );
    }
    return $usuario;
}

function requiereSesion(): void
{
    if (usuarioActual() === null) {
        redirigir('/login');
    }
}

function requiereAdmin(): void
{
    if ((usuarioActual()['rol'] ?? '') !== 'admin') {
        http_response_code(403);
        exit('Solo el administrador puede entrar aquí.');
    }
}

function iniciarSesion(string $email, string $password): bool
{
    $usuario = Database::uno('SELECT * FROM usuarios WHERE email = ? AND activo = 1', [$email]);
    if ($usuario === null || !password_verify($password, $usuario['password_hash'])) {
        return false;
    }
    session_regenerate_id(true);
    $_SESSION['usuario_id'] = (int) $usuario['id'];
    return true;
}
