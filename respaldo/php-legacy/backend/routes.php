<?php

use App\Controllers\AlumnosController;
use App\Controllers\CitasController;
use App\Controllers\ConfiguracionController;
use App\Controllers\ConversacionesController;
use App\Controllers\CursosController;
use App\Controllers\HealthController;
use App\Controllers\PagosController;
use App\Controllers\ProspectosController;
use App\Controllers\UsuariosController;
use App\Core\Router;

return function (Router $r): void {
    $r->get('/api/health', [HealthController::class, 'estado']);

    $r->post('/api/bot/procesar', [\App\Controllers\BotController::class, 'procesar']);

    $r->get('/api/prospectos', [ProspectosController::class, 'index']);
    $r->post('/api/prospectos', [ProspectosController::class, 'upsert']);
    $r->get('/api/prospectos/{id}', [ProspectosController::class, 'show']);
    $r->patch('/api/prospectos/{id}', [ProspectosController::class, 'update']);
    $r->post('/api/prospectos/{id}/asignar', [ProspectosController::class, 'asignar']);

    $r->post('/api/conversaciones', [ConversacionesController::class, 'obtenerOCrear']);
    $r->patch('/api/conversaciones/{id}', [ConversacionesController::class, 'update']);
    $r->get('/api/conversaciones/{id}/mensajes', [ConversacionesController::class, 'mensajes']);
    $r->post('/api/mensajes', [ConversacionesController::class, 'crearMensaje']);

    $r->get('/api/agenda/disponibilidad', [\App\Controllers\AgendaController::class, 'disponibilidad']);

    $r->get('/api/citas', [CitasController::class, 'index']);
    $r->get('/api/citas/por-recordar', [CitasController::class, 'porRecordar']);
    $r->post('/api/citas', [CitasController::class, 'store']);
    $r->patch('/api/citas/{id}', [CitasController::class, 'update']);

    $r->get('/api/pagos', [PagosController::class, 'index']);
    $r->post('/api/pagos', [PagosController::class, 'store']);
    $r->get('/api/pagos/abandonados', [PagosController::class, 'abandonados']);
    $r->patch('/api/pagos/{id}', [PagosController::class, 'update']);
    $r->post('/api/pagos/{id}/generar-link', [PagosController::class, 'generarLink']);

    $r->post('/api/webhooks/pago/{procesador}', [\App\Controllers\WebhooksController::class, 'pago']);

    $r->get('/api/cursos', [CursosController::class, 'index']);
    $r->post('/api/cursos', [CursosController::class, 'store']);
    $r->patch('/api/cursos/{id}', [CursosController::class, 'update']);

    $r->get('/api/alumnos', [AlumnosController::class, 'index']);
    $r->get('/api/alumnos/{id}', [AlumnosController::class, 'show']);
    $r->patch('/api/alumnos/{id}', [AlumnosController::class, 'update']);
    $r->get('/api/alumnos/{id}/avance', [\App\Controllers\AvanceController::class, 'porAlumno']);
    $r->post('/api/avance', [\App\Controllers\AvanceController::class, 'store']);

    $r->post('/api/reportes/generar', [\App\Controllers\ReportesController::class, 'generar']);
    $r->get('/api/reportes/pendientes-envio', [\App\Controllers\ReportesController::class, 'pendientes']);
    $r->get('/api/reportes/{id}/archivo', [\App\Controllers\ReportesController::class, 'archivo']);
    $r->patch('/api/reportes/{id}', [\App\Controllers\ReportesController::class, 'update']);

    $r->get('/api/asesores', [UsuariosController::class, 'asesores']);

    $r->get('/api/configuracion', [ConfiguracionController::class, 'index']);
    $r->get('/api/configuracion/{clave}', [ConfiguracionController::class, 'show']);
    $r->put('/api/configuracion/{clave}', [ConfiguracionController::class, 'actualizar']);
};
