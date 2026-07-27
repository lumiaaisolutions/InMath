<?php

namespace App\Core;

final class Validar
{
    public static function requeridos(array $cuerpo, array $campos): void
    {
        $faltantes = [];
        foreach ($campos as $campo) {
            if (!isset($cuerpo[$campo]) || $cuerpo[$campo] === '') {
                $faltantes[] = $campo;
            }
        }
        if ($faltantes !== []) {
            Respuesta::error('Campos requeridos ausentes', 422, ['faltantes' => $faltantes]);
        }
    }

    public static function enOpciones(mixed $valor, array $opciones, string $campo): void
    {
        if (!in_array($valor, $opciones, true)) {
            Respuesta::error("Valor inválido para {$campo}", 422, ['opciones' => $opciones]);
        }
    }

    public static function fechaHora(string $valor, string $campo): void
    {
        $dt = \DateTime::createFromFormat('Y-m-d H:i:s', $valor);
        if ($dt === false || $dt->format('Y-m-d H:i:s') !== $valor) {
            Respuesta::error("Formato inválido para {$campo} (se espera Y-m-d H:i:s)", 422);
        }
    }

    /** Normaliza un teléfono de WhatsApp a solo dígitos (formato E.164 sin '+'). */
    public static function telefono(string $valor): string
    {
        $digitos = preg_replace('/\D+/', '', $valor);
        if (strlen($digitos) < 10 || strlen($digitos) > 15) {
            Respuesta::error('Teléfono inválido (se esperan 10 a 15 dígitos)', 422);
        }
        return $digitos;
    }
}
