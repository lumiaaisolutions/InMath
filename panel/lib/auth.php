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
            'SELECT id, nombre, email, rol, modulos FROM usuarios WHERE id = ? AND activo = 1',
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

/**
 * Módulos operativos que un usuario puede ver. Los admin ven todo siempre;
 * para asesores, `usuarios.modulos` (JSON) restringe — NULL = todos.
 */
function moduloPermitido(?array $usuario, string $modulo): bool
{
    if ($usuario === null) {
        return false;
    }
    if (($usuario['rol'] ?? '') === 'admin') {
        return true;
    }
    if (($usuario['modulos'] ?? null) === null) {
        return true;
    }
    $lista = json_decode((string) $usuario['modulos'], true);
    return !is_array($lista) || in_array($modulo, $lista, true);
}

function requiereModulo(string $modulo): void
{
    if (!moduloPermitido(usuarioActual(), $modulo)) {
        flash('No tienes acceso a ese módulo', 'error');
        redirigir('/perfil');
    }
}
