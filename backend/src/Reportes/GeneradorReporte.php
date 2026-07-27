<?php

namespace App\Reportes;

use App\Core\Database;

/**
 * Reporte semanal de avance por alumno: resumen, gráfica de barras del histórico y
 * desglose por módulo. Branding configurable (clave `reporte_branding`) — base
 * Cursos Inmath, adaptable a cualquier branding sin tocar código.
 */
final class GeneradorReporte
{
    /**
     * Genera los reportes de la semana para todos los alumnos activos (idempotente:
     * la restricción UNIQUE alumno+periodo hace que regenerar no duplique).
     * @return array<int,array> filas de reportes_generados creadas
     */
    public static function generarSemana(?string $lunes = null): array
    {
        $inicio = date('Y-m-d', strtotime($lunes ?? 'monday this week'));
        $fin = date('Y-m-d', strtotime($inicio . ' +6 days'));
        $alumnos = Database::todos(
            "SELECT a.*, c.nombre AS curso_nombre FROM alumnos a
             JOIN cursos c ON c.id = a.curso_id WHERE a.estado = 'activo'"
        );

        $generados = [];
        foreach ($alumnos as $alumno) {
            $existente = Database::uno(
                'SELECT id FROM reportes_generados WHERE alumno_id = ? AND periodo_inicio = ?',
                [$alumno['id'], $inicio]
            );
            if ($existente !== null) {
                continue;
            }
            $ruta = self::paraAlumno($alumno, $inicio, $fin);
            $id = Database::insertar(
                'INSERT INTO reportes_generados (alumno_id, periodo_inicio, periodo_fin, archivo, canal)
                 VALUES (?, ?, ?, ?, ?)',
                [$alumno['id'], $inicio, $fin, $ruta, $alumno['canal_reporte']]
            );
            $generados[] = Database::uno('SELECT * FROM reportes_generados WHERE id = ?', [$id]);
        }
        return $generados;
    }

    /** Dibuja el PDF y devuelve la ruta relativa dentro de storage/. */
    public static function paraAlumno(array $alumno, string $inicio, string $fin): string
    {
        $marca = json_decode(
            Database::uno("SELECT valor FROM configuraciones WHERE clave = 'reporte_branding'")['valor'] ?? '{}',
            true
        ) ?: [];
        $primario = $marca['color_primario'] ?? '3B6FF5';
        $acentoA = $marca['color_acento_a'] ?? 'F4A62A';
        $acentoB = $marca['color_acento_b'] ?? '8B6FF0';

        $avances = array_reverse(Database::todos(
            'SELECT fecha, porcentaje, detalle FROM avance_alumnos
             WHERE alumno_id = ? ORDER BY fecha DESC LIMIT 8',
            [$alumno['id']]
        ));
        $actual = $avances === [] ? 0 : (int) end($avances)['porcentaje'];

        $pdf = new PdfLienzo();

        // Cabecera: banda de marca (pino) con la franja de acento (sol).
        $pdf->rect(0, 742, PdfLienzo::ANCHO, 50, $primario);
        $pdf->rect(0, 738, PdfLienzo::ANCHO, 4, $acentoA);
        $pdf->texto(40, 762, 16, $marca['marca'] ?? 'Cursos Inmath', true, 'FFFFFF');
        $pdf->texto(40, 748, 9, 'Reporte semanal de avance — ' . ($marca['producto'] ?? 'Cursos Inmath'), false, 'C3D0F5');

        // Identificación
        $pdf->texto(40, 700, 20, $alumno['nombre'], true, $primario);
        $pdf->texto(40, 682, 10, $alumno['curso_nombre'] ?? '', false, '55625B');
        $pdf->texto(40, 668, 10, 'Periodo: ' . date('d/m/Y', strtotime($inicio)) . ' al ' . date('d/m/Y', strtotime($fin)), false, '55625B');

        // Resumen grande
        $pdf->texto(40, 600, 44, $actual . '%', true, $acentoA);
        $pdf->texto(40, 584, 10, 'Avance total del curso', false, '55625B');
        $mensaje = $actual >= 80 ? '¡Excelente ritmo! Estás en la recta final.'
            : ($actual >= 40 ? 'Buen avance, mantén la constancia semanal.'
            : 'Ánimo: dedicarle un poco cada día hace la diferencia.');
        $pdf->texto(220, 596, 11, $mensaje, false, '16261F');

        // Gráfica de barras: histórico semanal
        $pdf->texto(40, 540, 12, 'Historial de avance', true, $primario);
        $baseY = 420;
        $altoMax = 95.0;
        $x = 40.0;
        $anchoBarra = 44.0;
        $pdf->linea(40, $baseY, 560, $baseY, 'EAE3D4');
        if ($avances === []) {
            $pdf->texto(40, $baseY + 30, 10, 'Aún no hay registros de avance para este alumno.', false, '8A8A95');
        }
        foreach ($avances as $i => $registro) {
            $alto = max(2.0, $altoMax * ((int) $registro['porcentaje']) / 100);
            $color = $i % 2 === 0 ? $acentoA : $acentoB;
            $pdf->rect($x, $baseY, $anchoBarra, $alto, $color);
            $pdf->texto($x + 12, $baseY + $alto + 6, 9, $registro['porcentaje'] . '%', true, $primario);
            $pdf->texto($x + 6, $baseY - 14, 8, date('d/m', strtotime($registro['fecha'])), false, '8A8A95');
            $x += $anchoBarra + 20;
        }

        // Desglose por módulo (del último registro con detalle)
        $detalle = [];
        foreach (array_reverse($avances) as $registro) {
            $d = json_decode($registro['detalle'] ?? '', true);
            if (is_array($d) && $d !== []) {
                $detalle = $d;
                break;
            }
        }
        $y = 350.0;
        if ($detalle !== []) {
            $pdf->texto(40, $y, 12, 'Avance por módulo', true, $primario);
            $y -= 26;
            foreach (array_slice($detalle, 0, 10, true) as $modulo => $pct) {
                $pct = max(0, min(100, (int) $pct));
                $pdf->texto(40, $y, 10, (string) $modulo, false, '16261F');
                $pdf->rect(280, $y - 2, 220, 9, 'EFEADF');
                if ($pct > 0) {
                    $pdf->rect(280, $y - 2, 220 * $pct / 100, 9, $acentoB);
                }
                $pdf->texto(510, $y, 10, $pct . '%', true, $primario);
                $y -= 22;
            }
        }

        // Pie
        $pdf->linea(40, 52, 572, 52, 'EAE3D4');
        $pdf->texto(40, 38, 8, $marca['pie'] ?? 'Generado automáticamente', false, '8A8A95');
        $pdf->texto(460, 38, 8, date('d/m/Y H:i'), false, '8A8A95');

        $dir = dirname(__DIR__, 2) . '/storage/reportes';
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }
        $nombre = sprintf('reporte-%d-%s.pdf', $alumno['id'], $inicio);
        file_put_contents($dir . '/' . $nombre, $pdf->salida());
        return 'reportes/' . $nombre;
    }
}
