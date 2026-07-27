<?php

namespace App\Servicios;

use App\Core\Database;

final class InscripcionServicio
{
    /**
     * Inscribe al alumno a partir de un pago confirmado y mueve el prospecto a
     * 'inscrito'. Idempotente: UNIQUE(prospecto_id) en alumnos absorbe webhooks
     * duplicados. Debe llamarse dentro de una transacción junto con la
     * actualización del pago.
     */
    public static function porPago(array $pago): int
    {
        $prospecto = Database::uno('SELECT * FROM prospectos WHERE id = ?', [$pago['prospecto_id']]);
        try {
            $alumnoId = Database::insertar(
                'INSERT INTO alumnos (prospecto_id, curso_id, nombre, telefono, inscrito_en)
                 VALUES (?, ?, ?, ?, NOW())',
                [
                    $prospecto['id'],
                    $pago['curso_id'],
                    $prospecto['nombre'] ?? ('Alumno ' . $prospecto['telefono_whatsapp']),
                    $prospecto['telefono_whatsapp'],
                ]
            );
        } catch (\PDOException $e) {
            if ($e->getCode() !== '23000') {
                throw $e;
            }
            $alumnoId = (int) Database::uno('SELECT id FROM alumnos WHERE prospecto_id = ?', [$prospecto['id']])['id'];
        }
        Database::ejecutar('UPDATE pagos SET alumno_id = ? WHERE id = ?', [$alumnoId, $pago['id']]);
        ProspectoServicio::cambiarEtapa((int) $prospecto['id'], 'inscrito', 'sistema', "Pago #{$pago['id']} confirmado");
        return $alumnoId;
    }
}
