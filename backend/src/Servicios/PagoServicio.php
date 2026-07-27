<?php

namespace App\Servicios;

use App\Core\Database;
use App\Pagos\Fabrica;

final class PagoServicio
{
    /**
     * Devuelve (o crea) el link de pago vigente del prospecto para el curso dado.
     * Reutiliza un pago pendiente con link si ya existe, para no duplicar cobros.
     * @return array{ok:bool, pago?:array, mensaje?:string}
     */
    public static function linkParaProspecto(array $prospecto, ?int $cursoId = null): array
    {
        $curso = $cursoId !== null
            ? Database::uno('SELECT * FROM cursos WHERE id = ? AND activo = 1', [$cursoId])
            : (($prospecto['curso_interes_id'] ?? null) !== null
                ? Database::uno('SELECT * FROM cursos WHERE id = ? AND activo = 1', [$prospecto['curso_interes_id']])
                : Database::uno('SELECT * FROM cursos WHERE activo = 1 ORDER BY id LIMIT 1'));
        if ($curso === null) {
            return ['ok' => false, 'mensaje' => 'No hay curso activo para cobrar'];
        }

        $existente = Database::uno(
            "SELECT * FROM pagos
             WHERE prospecto_id = ? AND curso_id = ? AND estado = 'pendiente' AND link_pago IS NOT NULL
               AND (expira_en IS NULL OR expira_en > NOW())
             ORDER BY id DESC LIMIT 1",
            [$prospecto['id'], $curso['id']]
        );
        if ($existente !== null) {
            return ['ok' => true, 'pago' => $existente];
        }

        return self::crearConLink($prospecto, $curso);
    }

    /** @return array{ok:bool, pago?:array, mensaje?:string} */
    public static function crearConLink(array $prospecto, array $curso): array
    {
        try {
            $procesador = Fabrica::activo();
        } catch (\RuntimeException $e) {
            return ['ok' => false, 'mensaje' => $e->getMessage()];
        }

        $pagoId = Database::insertar(
            'INSERT INTO pagos (prospecto_id, curso_id, monto_centavos, moneda) VALUES (?, ?, ?, ?)',
            [$prospecto['id'], $curso['id'], $curso['precio_centavos'], $curso['moneda']]
        );
        $pago = Database::uno('SELECT * FROM pagos WHERE id = ?', [$pagoId]);

        try {
            $link = $procesador->crearLink($pago, $prospecto, $curso);
        } catch (\RuntimeException $e) {
            Database::ejecutar("UPDATE pagos SET estado = 'fallido', metadatos = ? WHERE id = ?", [
                json_encode(['error_link' => $e->getMessage()], JSON_UNESCAPED_UNICODE),
                $pagoId,
            ]);
            return ['ok' => false, 'mensaje' => $e->getMessage()];
        }

        $nombreProcesador = Database::uno("SELECT valor FROM configuraciones WHERE clave = 'procesador_pago_activo'")['valor'] ?? null;
        Database::ejecutar(
            'UPDATE pagos SET procesador = ?, link_pago = ?, referencia_externa = ?, link_generado_en = NOW() WHERE id = ?',
            [$nombreProcesador, $link['link'], $link['referencia_externa'], $pagoId]
        );
        ProspectoServicio::cambiarEtapa((int) $prospecto['id'], 'pago_pendiente', 'sistema', "Link de pago #{$pagoId} generado");
        return ['ok' => true, 'pago' => Database::uno('SELECT * FROM pagos WHERE id = ?', [$pagoId])];
    }

    /**
     * Aplica un evento de webhook ya verificado por el driver.
     * @return array{ok:bool, mensaje:string}
     */
    public static function aplicarEvento(array $evento): array
    {
        $pago = Database::uno('SELECT * FROM pagos WHERE referencia_externa = ?', [$evento['referencia_externa']]);
        if ($pago === null) {
            return ['ok' => false, 'mensaje' => 'Pago no encontrado para esa referencia'];
        }
        if ($pago['estado'] === 'pagado') {
            return ['ok' => true, 'mensaje' => 'Pago ya estaba confirmado (webhook duplicado)'];
        }

        if ($evento['estado'] === 'pagado') {
            Database::transaccion(function () use ($pago, $evento) {
                Database::ejecutar(
                    "UPDATE pagos SET estado = 'pagado', pagado_en = NOW(), metadatos = ? WHERE id = ?",
                    [json_encode($evento['metadatos'] ?? [], JSON_UNESCAPED_UNICODE), $pago['id']]
                );
                InscripcionServicio::porPago($pago);
            });
            return ['ok' => true, 'mensaje' => 'Pago confirmado y alumno inscrito'];
        }

        Database::ejecutar("UPDATE pagos SET estado = 'fallido' WHERE id = ? AND estado = 'pendiente'", [$pago['id']]);
        return ['ok' => true, 'mensaje' => 'Pago marcado como fallido'];
    }
}
