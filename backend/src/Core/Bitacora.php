<?php

namespace App\Core;

final class Bitacora
{
    public static function cambioEtapa(
        int $prospectoId,
        ?string $etapaAnterior,
        string $etapaNueva,
        string $origen = 'sistema',
        ?int $usuarioId = null,
        ?string $nota = null
    ): void {
        Database::ejecutar(
            'INSERT INTO bitacora_pipeline (prospecto_id, etapa_anterior, etapa_nueva, origen, usuario_id, nota)
             VALUES (?, ?, ?, ?, ?, ?)',
            [$prospectoId, $etapaAnterior, $etapaNueva, $origen, $usuarioId, $nota]
        );
    }
}
