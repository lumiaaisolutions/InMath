<?php

namespace App\Servicios;

use App\Core\Bitacora;
use App\Core\Database;

final class ProspectoServicio
{
    /** @return array{prospecto: array, creado: bool} */
    public static function upsertPorTelefono(string $telefono, array $datos = []): array
    {
        $existente = Database::uno('SELECT * FROM prospectos WHERE telefono_whatsapp = ?', [$telefono]);
        if ($existente !== null) {
            return ['prospecto' => $existente, 'creado' => false];
        }
        try {
            $id = Database::insertar(
                'INSERT INTO prospectos (telefono_whatsapp, nombre, fuente, curso_interes_id) VALUES (?, ?, ?, ?)',
                [$telefono, $datos['nombre'] ?? null, $datos['fuente'] ?? 'facebook', $datos['curso_interes_id'] ?? null]
            );
        } catch (\PDOException $e) {
            // Carrera entre dos webhooks simultáneos del mismo teléfono: devolver el ganador.
            if ($e->getCode() === '23000') {
                return [
                    'prospecto' => Database::uno('SELECT * FROM prospectos WHERE telefono_whatsapp = ?', [$telefono]),
                    'creado' => false,
                ];
            }
            throw $e;
        }
        Bitacora::cambioEtapa($id, null, 'prospecto', 'sistema', null, 'Alta por primer contacto');
        return ['prospecto' => Database::uno('SELECT * FROM prospectos WHERE id = ?', [$id]), 'creado' => true];
    }

    /**
     * Asignación segura ante concurrencia: bloquea asesores (FOR UPDATE), elige al de
     * menor carga si no se indica uno, y exige asesor_id IS NULL al asignar.
     * @return array{asesor_id?: int, error?: string, codigo?: int}
     */
    public static function asignar(int $prospectoId, ?int $asesorId = null): array
    {
        return Database::transaccion(function () use ($prospectoId, $asesorId) {
            Database::todos("SELECT id FROM usuarios WHERE rol = 'asesor' AND activo = 1 FOR UPDATE");

            if ($asesorId !== null) {
                $asesor = Database::uno(
                    "SELECT id FROM usuarios WHERE id = ? AND rol = 'asesor' AND activo = 1",
                    [$asesorId]
                );
                if ($asesor === null) {
                    return ['error' => 'Asesor inexistente o inactivo', 'codigo' => 422];
                }
            } else {
                $asesor = Database::uno(
                    "SELECT u.id
                     FROM usuarios u
                     LEFT JOIN prospectos p ON p.asesor_id = u.id AND p.etapa NOT IN ('inscrito', 'descartado')
                     WHERE u.rol = 'asesor' AND u.activo = 1
                     GROUP BY u.id
                     ORDER BY COUNT(p.id) ASC, u.id ASC
                     LIMIT 1"
                );
                if ($asesor === null) {
                    return ['error' => 'No hay asesores activos', 'codigo' => 409];
                }
                $asesorId = (int) $asesor['id'];
            }

            $afectadas = Database::ejecutar(
                'UPDATE prospectos SET asesor_id = ?, asignado_en = NOW() WHERE id = ? AND asesor_id IS NULL',
                [$asesorId, $prospectoId]
            );
            if ($afectadas === 0) {
                $actual = Database::uno('SELECT id, asesor_id FROM prospectos WHERE id = ?', [$prospectoId]);
                if ($actual === null) {
                    return ['error' => 'Prospecto no encontrado', 'codigo' => 404];
                }
                return [
                    'error' => 'El prospecto ya tiene asesor asignado',
                    'codigo' => 409,
                    'asesor_id' => (int) $actual['asesor_id'],
                ];
            }
            return ['asesor_id' => $asesorId];
        });
    }

    public static function cambiarEtapa(int $prospectoId, string $etapaNueva, string $origen, ?string $nota = null): void
    {
        $actual = Database::uno('SELECT etapa FROM prospectos WHERE id = ?', [$prospectoId]);
        if ($actual === null || $actual['etapa'] === $etapaNueva) {
            return;
        }
        Database::ejecutar('UPDATE prospectos SET etapa = ? WHERE id = ?', [$etapaNueva, $prospectoId]);
        Bitacora::cambioEtapa($prospectoId, $actual['etapa'], $etapaNueva, $origen, null, $nota);
    }
}
