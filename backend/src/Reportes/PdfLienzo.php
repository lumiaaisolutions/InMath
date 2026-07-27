<?php

namespace App\Reportes;

/**
 * Escritor de PDF mínimo en PHP puro (sin dependencias, apto para hosting
 * compartido). Suficiente para el reporte: texto Helvetica, rectángulos y líneas.
 * Página carta (612 x 792 pt), origen abajo-izquierda como manda el formato PDF.
 */
final class PdfLienzo
{
    public const ANCHO = 612;
    public const ALTO = 792;

    private string $contenido = '';

    public function texto(float $x, float $y, float $tamano, string $texto, bool $negrita = false, string $colorHex = '000000'): void
    {
        $fuente = $negrita ? '/F2' : '/F1';
        [$r, $g, $b] = self::rgb($colorHex);
        $this->contenido .= sprintf(
            "BT %.3f %.3f %.3f rg %s %.1f Tf %.1f %.1f Td (%s) Tj ET\n",
            $r, $g, $b, $fuente, $tamano, $x, $y, self::escapar($texto)
        );
    }

    public function rect(float $x, float $y, float $ancho, float $alto, string $colorHex): void
    {
        [$r, $g, $b] = self::rgb($colorHex);
        $this->contenido .= sprintf("%.3f %.3f %.3f rg %.1f %.1f %.1f %.1f re f\n", $r, $g, $b, $x, $y, $ancho, $alto);
    }

    public function linea(float $x1, float $y1, float $x2, float $y2, string $colorHex, float $grosor = 1): void
    {
        [$r, $g, $b] = self::rgb($colorHex);
        $this->contenido .= sprintf(
            "%.3f %.3f %.3f RG %.2f w %.1f %.1f m %.1f %.1f l S\n",
            $r, $g, $b, $grosor, $x1, $y1, $x2, $y2
        );
    }

    /** Ancho aproximado de un texto en Helvetica (para centrar/alinear). */
    public static function anchoTexto(string $texto, float $tamano): float
    {
        return mb_strlen($texto) * $tamano * 0.52;
    }

    public function salida(): string
    {
        $stream = $this->contenido;
        $objetos = [
            '<< /Type /Catalog /Pages 2 0 R >>',
            '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
            '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' . self::ANCHO . ' ' . self::ALTO . '] '
                . '/Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>',
            '<< /Length ' . strlen($stream) . " >>\nstream\n" . $stream . 'endstream',
            '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
            '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
        ];

        $pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
        $offsets = [];
        foreach ($objetos as $i => $cuerpo) {
            $offsets[$i + 1] = strlen($pdf);
            $pdf .= ($i + 1) . " 0 obj\n" . $cuerpo . "\nendobj\n";
        }
        $inicioXref = strlen($pdf);
        $pdf .= 'xref' . "\n0 " . (count($objetos) + 1) . "\n";
        $pdf .= "0000000000 65535 f \n";
        foreach ($offsets as $offset) {
            $pdf .= sprintf("%010d 00000 n \n", $offset);
        }
        $pdf .= "trailer\n<< /Size " . (count($objetos) + 1) . " /Root 1 0 R >>\n";
        $pdf .= "startxref\n" . $inicioXref . "\n%%EOF";
        return $pdf;
    }

    /** UTF-8 → WinAnsi (CP1252) y escape de paréntesis/backslash. */
    private static function escapar(string $texto): string
    {
        $cp1252 = @iconv('UTF-8', 'CP1252//TRANSLIT//IGNORE', $texto) ?: $texto;
        return strtr($cp1252, ['\\' => '\\\\', '(' => '\\(', ')' => '\\)', "\r" => '', "\n" => ' ']);
    }

    /** @return array{0:float,1:float,2:float} */
    private static function rgb(string $hex): array
    {
        $hex = ltrim($hex, '#');
        return [
            hexdec(substr($hex, 0, 2)) / 255,
            hexdec(substr($hex, 2, 2)) / 255,
            hexdec(substr($hex, 4, 2)) / 255,
        ];
    }
}
