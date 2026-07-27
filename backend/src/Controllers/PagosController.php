<?php

namespace App\Controllers;

use App\Core\Bitacora;
use App\Core\Database;
use App\Core\Respuesta;
use App\Core\Validar;

final class PagosController
{
    private const ESTADOS = ['pendiente', 'pagado', 'expirado', 'fallido', 'reembolsado'];

    public function index(array $params, array $cuerpo): never
    {
        $condiciones = [];
        $valores = [];
        if (!empty($_GET['estado'])) {
            Validar::enOpciones($_GET['estado'], self::ESTADOS, 'estado');
            $condiciones[] = 'estado = ?';
            $valores[] = $_GET['estado'];
        }
        if (!empty($_GET['prospecto_id'])) {
            $condiciones[] = 'prospecto_id = ?';
            $valores[] = (int) $_GET['prospecto_id'];
        }
        $where = $condiciones === [] ? '' : 'WHERE ' . implode(' AND ', $condiciones);
        Respuesta::json(Database::todos("SELECT * FROM pagos {$where} ORDER BY creado_en DESC LIMIT 200", $valores));
    }

    /** Crea un pago pendiente; el link real lo genera el procesador en Fase 4. */
    public function store(array $params, array $cuerpo): never
    {
        Validar::requeridos($cuerpo, ['prospecto_id', 'curso_id']);
        $prospecto = Database::uno('SELECT id, etapa FROM prospectos WHERE id = ?', [(int) $cuerpo['prospecto_id']]);
        if ($prospecto === null) {
            Respuesta::error('Prospecto no encontrado', 404);
        }
        $curso = Database::uno('SELECT * FROM cursos WHERE id = ? AND activo = 1', [(int) $cuerpo['curso_id']]);
        if ($curso === null) {
            Respuesta::error('Curso inexistente o inactivo', 422);
        }

        $monto = isset($cuerpo['monto_centavos']) ? (int) $cuerpo['monto_centavos'] : (int) $curso['precio_centavos'];
        $tieneLink = !empty($cuerpo['link_pago']);

        $pagoId = Database::transaccion(function () use ($cuerpo, $prospecto, $curso, $monto, $tieneLink) {
            $pagoId = Database::insertar(
                'INSERT INTO pagos (prospecto_id, curso_id, procesador, monto_centavos, moneda, link_pago,
                                    referencia_externa, link_generado_en, expira_en)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    $prospecto['id'],
                    $curso['id'],
                    $cuerpo['procesador'] ?? null,
                    $monto,
                    $cuerpo['moneda'] ?? $curso['moneda'],
                    $cuerpo['link_pago'] ?? null,
                    $cuerpo['referencia_externa'] ?? null,
                    $tieneLink ? date('Y-m-d H:i:s') : null,
                    $cuerpo['expira_en'] ?? null,
                ]
            );
            if ($tieneLink && !in_array($prospecto['etapa'], ['pago_pendiente', 'inscrito'], true)) {
                Database::ejecutar("UPDATE prospectos SET etapa = 'pago_pendiente' WHERE id = ?", [$prospecto['id']]);
                Bitacora::cambioEtapa($prospecto['id'], $prospecto['etapa'], 'pago_pendiente', 'sistema', null, "Link de pago #{$pagoId} enviado");
            }
            return $pagoId;
        });

        Respuesta::json(Database::uno('SELECT * FROM pagos WHERE id = ?', [$pagoId]), 201);
    }

    /**
     * Actualiza un pago. Al pasar a 'pagado' (webhook del procesador vía n8n):
     * crea el alumno, liga el pago y mueve el prospecto a 'inscrito' — todo en una
     * transacción. UNIQUE(prospecto_id) en alumnos hace idempotente un webhook doble.
     */
    public function update(array $params, array $cuerpo): never
    {
        $id = (int) $params['id'];
        $pago = Database::uno('SELECT * FROM pagos WHERE id = ?', [$id]);
        if ($pago === null) {
            Respuesta::error('Pago no encontrado', 404);
        }
        if (isset($cuerpo['estado'])) {
            Validar::enOpciones($cuerpo['estado'], self::ESTADOS, 'estado');
        }

        $sets = [];
        $valores = [];
        foreach (['estado', 'procesador', 'link_pago', 'referencia_externa', 'recordatorio_enviado_en', 'expira_en'] as $campo) {
            if (array_key_exists($campo, $cuerpo)) {
                $sets[] = "{$campo} = ?";
                $valores[] = $cuerpo[$campo];
            }
        }
        if (array_key_exists('metadatos', $cuerpo)) {
            $sets[] = 'metadatos = ?';
            $valores[] = json_encode($cuerpo['metadatos'], JSON_UNESCAPED_UNICODE);
        }
        if (isset($cuerpo['link_pago']) && $pago['link_generado_en'] === null) {
            $sets[] = 'link_generado_en = NOW()';
        }

        $seConfirma = ($cuerpo['estado'] ?? null) === 'pagado' && $pago['estado'] !== 'pagado';
        if ($seConfirma) {
            $sets[] = 'pagado_en = ?';
            $valores[] = $cuerpo['pagado_en'] ?? date('Y-m-d H:i:s');
        }
        if ($sets === []) {
            Respuesta::error('Nada que actualizar', 422);
        }

        Database::transaccion(function () use ($sets, $valores, $id, $pago, $seConfirma) {
            $valores[] = $id;
            Database::ejecutar('UPDATE pagos SET ' . implode(', ', $sets) . ' WHERE id = ?', $valores);
            if ($seConfirma) {
                \App\Servicios\InscripcionServicio::porPago($pago);
            }
        });

        Respuesta::json(Database::uno('SELECT * FROM pagos WHERE id = ?', [$id]));
    }

    /** POST /api/pagos/{id}/generar-link — genera el link con el procesador activo. */
    public function generarLink(array $params, array $cuerpo): never
    {
        $pago = Database::uno('SELECT * FROM pagos WHERE id = ?', [(int) $params['id']]);
        if ($pago === null) {
            Respuesta::error('Pago no encontrado', 404);
        }
        if ($pago['estado'] !== 'pendiente') {
            Respuesta::error('Solo se puede generar link de un pago pendiente', 409);
        }
        if ($pago['link_pago'] !== null) {
            Respuesta::json($pago);
        }

        $prospecto = Database::uno('SELECT * FROM prospectos WHERE id = ?', [$pago['prospecto_id']]);
        $curso = Database::uno('SELECT * FROM cursos WHERE id = ?', [$pago['curso_id']]);
        try {
            $procesador = \App\Pagos\Fabrica::activo();
            $link = $procesador->crearLink($pago, $prospecto, $curso);
        } catch (\RuntimeException $e) {
            Respuesta::error($e->getMessage(), 409);
        }
        $nombre = Database::uno("SELECT valor FROM configuraciones WHERE clave = 'procesador_pago_activo'")['valor'] ?? null;
        Database::ejecutar(
            'UPDATE pagos SET procesador = ?, link_pago = ?, referencia_externa = ?, link_generado_en = NOW() WHERE id = ?',
            [$nombre, $link['link'], $link['referencia_externa'], $pago['id']]
        );
        \App\Servicios\ProspectoServicio::cambiarEtapa((int) $pago['prospecto_id'], 'pago_pendiente', 'sistema', "Link de pago #{$pago['id']} generado");
        Respuesta::json(Database::uno('SELECT * FROM pagos WHERE id = ?', [$pago['id']]));
    }

    /**
     * Pagos con link enviado, sin completar ni recordar, más viejos que el umbral de
     * recuperación de carrito. n8n consulta esto periódicamente para enviar recordatorios.
     */
    public function abandonados(array $params, array $cuerpo): never
    {
        $horas = isset($_GET['horas'])
            ? max(1, (int) $_GET['horas'])
            : (int) (Database::uno("SELECT valor FROM configuraciones WHERE clave = 'recuperacion_carrito_horas'")['valor'] ?? 24);

        Respuesta::json(Database::todos(
            "SELECT pg.*, p.telefono_whatsapp, p.nombre AS prospecto_nombre
             FROM pagos pg
             JOIN prospectos p ON p.id = pg.prospecto_id
             WHERE pg.estado = 'pendiente'
               AND pg.link_generado_en IS NOT NULL
               AND pg.link_generado_en <= NOW() - INTERVAL {$horas} HOUR
               AND pg.recordatorio_enviado_en IS NULL
               AND (pg.expira_en IS NULL OR pg.expira_en > NOW())
             ORDER BY pg.link_generado_en"
        ));
    }

}
