<?php

namespace App\Core;

use PDO;

final class Database
{
    private static ?PDO $pdo = null;

    public static function pdo(): PDO
    {
        if (self::$pdo === null) {
            $socket = Env::get('DB_SOCKET');
            if ($socket) {
                $dsn = sprintf('mysql:unix_socket=%s;dbname=%s;charset=utf8mb4', $socket, Env::requerir('DB_NAME'));
            } else {
                $dsn = sprintf(
                    'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
                    Env::get('DB_HOST', '127.0.0.1'),
                    Env::get('DB_PORT', '3306'),
                    Env::requerir('DB_NAME')
                );
            }
            self::$pdo = new PDO($dsn, Env::requerir('DB_USER'), Env::get('DB_PASS', ''), [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        }
        return self::$pdo;
    }

    /** @return array<int,array<string,mixed>> */
    public static function todos(string $sql, array $params = []): array
    {
        $stmt = self::pdo()->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    /** @return array<string,mixed>|null */
    public static function uno(string $sql, array $params = []): ?array
    {
        $stmt = self::pdo()->prepare($sql);
        $stmt->execute($params);
        $fila = $stmt->fetch();
        return $fila === false ? null : $fila;
    }

    /** Ejecuta INSERT/UPDATE/DELETE y devuelve filas afectadas. */
    public static function ejecutar(string $sql, array $params = []): int
    {
        $stmt = self::pdo()->prepare($sql);
        $stmt->execute($params);
        return $stmt->rowCount();
    }

    public static function insertar(string $sql, array $params = []): int
    {
        self::ejecutar($sql, $params);
        return (int) self::pdo()->lastInsertId();
    }

    /**
     * Ejecuta $fn dentro de una transacción; hace rollback si lanza.
     * @template T
     * @param callable():T $fn
     * @return T
     */
    public static function transaccion(callable $fn): mixed
    {
        $pdo = self::pdo();
        $pdo->beginTransaction();
        try {
            $resultado = $fn();
            $pdo->commit();
            return $resultado;
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }
}
