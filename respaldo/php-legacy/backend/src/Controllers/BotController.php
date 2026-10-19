<?php

namespace App\Controllers;

use App\Bot\MotorBot;
use App\Core\Respuesta;
use App\Core\Validar;

final class BotController
{
    /**
     * POST /api/bot/procesar — n8n lo llama por cada mensaje entrante de WhatsApp.
     * Devuelve las respuestas a enviar y la acción decidida por el bot
     * (continuar | ofrecer_cita | pasar_asesor | listo_para_pago | ninguna).
     */
    public function procesar(array $params, array $cuerpo): never
    {
        Validar::requeridos($cuerpo, ['telefono_whatsapp', 'contenido']);
        $telefono = Validar::telefono($cuerpo['telefono_whatsapp']);

        $extras = array_intersect_key($cuerpo, array_flip(['nombre', 'fuente', 'curso_interes_id', 'wa_message_id', 'tipo']));
        Respuesta::json(MotorBot::procesar($telefono, (string) $cuerpo['contenido'], $extras));
    }
}
