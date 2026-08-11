<?php

use App\Core\Database;
use App\IA\GeminiClient;
use App\Servicios\PagoServicio;
use App\Servicios\ProspectoServicio;

function ejecutarAccion(string $ruta): void
{
    if ($ruta === '/accion/login') {
        if (iniciarSesion($_POST['email'] ?? '', $_POST['password'] ?? '')) {
            redirigir('/');
        }
        flash('Correo o contraseña incorrectos', 'error');
        redirigir('/login');
    }

    requiereSesion();
    verificarCsrf();

    if ($ruta === '/accion/agente-ia') {
        header('Content-Type: application/json; charset=utf-8');
        $mensaje = trim($_POST['mensaje'] ?? '');
        if ($mensaje === '' || mb_strlen($mensaje) > 800) {
            http_response_code(400);
            echo json_encode(['error' => 'Escribe un mensaje válido.']);
            exit;
        }
        $historial = json_decode($_POST['historial'] ?? '[]', true);
        if (!is_array($historial)) {
            $historial = [];
        }
        $historial = array_slice($historial, -12);
        $sistema = 'Eres Mathy, el asistente de IA del CRM interno de Cursos Inmath. Ayudas a asesores '
            . 'y administradores a usar el panel: mover prospectos de etapa en el pipeline, agendar '
            . 'y gestionar citas, revisar alumnos y pagos, y (solo administradores) editar el prompt '
            . 'del bot y la configuración. Respondes en español, breve y directo (máximo 3-4 frases). '
            . 'No inventes datos de prospectos, cifras ni información que no tengas.';
        try {
            $respuesta = GeminiClient::responder($sistema, $historial, $mensaje);
            echo json_encode(['respuesta' => $respuesta]);
        } catch (\Throwable $e) {
            error_log('[agente-ia:panel] ' . $e->getMessage());
            http_response_code(502);
            echo json_encode(['error' => 'No pude conectarme en este momento. Intenta de nuevo en unos segundos.']);
        }
        exit;
    }
    $usuario = usuarioActual();
    $volver = $_POST['volver'] ?? '/';

    switch ($ruta) {
        case '/accion/logout':
            session_destroy();
            redirigir('/login');

        case '/accion/etapa':
            $prospectoId = (int) $_POST['prospecto_id'];
            $etapa = $_POST['etapa'] ?? '';
            $validas = ['prospecto', 'calificado', 'cita_agendada', 'pago_pendiente', 'inscrito', 'descartado'];
            if (!in_array($etapa, $validas, true)) {
                flash('Etapa inválida', 'error');
                redirigir($volver);
            }
            $actual = Database::uno('SELECT etapa FROM prospectos WHERE id = ?', [$prospectoId]);
            if ($actual !== null && $actual['etapa'] !== $etapa) {
                Database::ejecutar('UPDATE prospectos SET etapa = ? WHERE id = ?', [$etapa, $prospectoId]);
                \App\Core\Bitacora::cambioEtapa($prospectoId, $actual['etapa'], $etapa, 'asesor', (int) $usuario['id'], 'Cambio manual desde el panel');
            }
            flash('Etapa actualizada');
            redirigir($volver);

        case '/accion/asignar':
            $resultado = ProspectoServicio::asignar(
                (int) $_POST['prospecto_id'],
                !empty($_POST['asesor_id']) ? (int) $_POST['asesor_id'] : null
            );
            flash($resultado['error'] ?? 'Asesor asignado', isset($resultado['error']) ? 'error' : 'ok');
            redirigir($volver);

        case '/accion/reasignar':
            // A diferencia de /accion/asignar (solo prospectos sin asesor), esto es
            // una decisión humana explícita: sobreescribe la asignación.
            Database::ejecutar(
                'UPDATE prospectos SET asesor_id = ?, asignado_en = NOW() WHERE id = ?',
                [(int) $_POST['asesor_id'], (int) $_POST['prospecto_id']]
            );
            flash('Prospecto reasignado');
            redirigir($volver);

        case '/accion/conversacion':
            $conversacionId = (int) $_POST['conversacion_id'];
            $estado = $_POST['estado'] === 'bot' ? 'bot' : 'asesor';
            Database::ejecutar(
                'UPDATE conversaciones SET estado = ?, asesor_id = ? WHERE id = ?',
                [$estado, $estado === 'asesor' ? (int) $usuario['id'] : null, $conversacionId]
            );
            flash($estado === 'asesor' ? 'Tomaste la conversación; el bot queda en pausa.' : 'El bot retomó la conversación.');
            redirigir($volver);

        case '/accion/mensaje-asesor':
            // Registra la nota/mensaje del asesor en la bitácora de conversación.
            // El envío real por WhatsApp lo hace n8n (flujo de envío manual) leyendo
            // los mensajes de emisor 'asesor' pendientes, o el asesor desde su app.
            $conversacionId = (int) $_POST['conversacion_id'];
            $texto = trim($_POST['contenido'] ?? '');
            if ($texto !== '') {
                \App\Servicios\ConversacionServicio::registrarMensaje($conversacionId, [
                    'direccion' => 'saliente',
                    'emisor' => 'asesor',
                    'contenido' => $texto,
                ]);
                flash('Mensaje registrado');
            }
            redirigir($volver);

        case '/accion/generar-link':
            $prospecto = Database::uno('SELECT * FROM prospectos WHERE id = ?', [(int) $_POST['prospecto_id']]);
            if ($prospecto === null) {
                flash('Prospecto no encontrado', 'error');
                redirigir($volver);
            }
            $resultado = PagoServicio::linkParaProspecto($prospecto);
            flash($resultado['ok'] ? 'Link de pago listo: ' . $resultado['pago']['link_pago'] : $resultado['mensaje'], $resultado['ok'] ? 'ok' : 'error');
            redirigir($volver);

        case '/accion/cita-estado':
            $validos = ['agendada', 'confirmada', 'completada', 'cancelada', 'no_asistio'];
            if (in_array($_POST['estado'] ?? '', $validos, true)) {
                Database::ejecutar('UPDATE citas SET estado = ? WHERE id = ?', [$_POST['estado'], (int) $_POST['cita_id']]);
                flash('Cita actualizada');
            }
            redirigir($volver);

        case '/accion/config':
            requiereAdmin();
            Database::ejecutar(
                'UPDATE configuraciones SET valor = ?, actualizado_por = ? WHERE clave = ?',
                [$_POST['valor'] ?? '', (int) $usuario['id'], $_POST['clave'] ?? '']
            );
            flash('Configuración guardada');
            redirigir($volver);

        case '/accion/login-textos':
            requiereAdmin();
            $textosLogin = [
                'login_titulo' => 'Título de bienvenida en la pantalla de inicio de sesión.',
                'login_texto'  => 'Texto de apoyo bajo el título del inicio de sesión.',
            ];
            foreach ($textosLogin as $claveTexto => $descTexto) {
                Database::ejecutar(
                    'INSERT INTO configuraciones (clave, valor, tipo, descripcion) VALUES (?, ?, \'texto\', ?)
                     ON DUPLICATE KEY UPDATE valor = VALUES(valor), actualizado_por = ?',
                    [$claveTexto, trim($_POST[$claveTexto] ?? ''), $descTexto, (int) $usuario['id']]
                );
            }
            flash('Textos del login guardados');
            redirigir('/personalizar-login');

        case '/accion/login-media-subir':
            requiereAdmin();
            $archivo = $_FILES['media'] ?? null;
            if ($archivo === null || ($archivo['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
                flash('Elige un archivo válido', 'error');
                redirigir('/personalizar-login');
            }
            $ext = strtolower(pathinfo($archivo['name'], PATHINFO_EXTENSION));
            $tiposOk = ['jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp', 'mp4' => 'video/mp4'];
            if (!isset($tiposOk[$ext]) || $tiposOk[$ext] !== mime_content_type($archivo['tmp_name'])) {
                flash('Solo se aceptan JPG, PNG, WebP o MP4', 'error');
                redirigir('/personalizar-login');
            }
            if ($archivo['size'] > 25 * 1024 * 1024) {
                flash('El archivo no puede pesar más de 25 MB', 'error');
                redirigir('/personalizar-login');
            }
            $dirMedia = dirname(__DIR__) . '/public/img/login';
            if (!is_dir($dirMedia)) {
                mkdir($dirMedia, 0775, true);
            }
            $nombreMedia = date('Ymd-His') . '-' . bin2hex(random_bytes(4)) . '.' . $ext;
            move_uploaded_file($archivo['tmp_name'], $dirMedia . '/' . $nombreMedia);
            flash('Archivo agregado al carrusel del login');
            redirigir('/personalizar-login');

        case '/accion/login-media-borrar':
            requiereAdmin();
            $nombreMedia = basename($_POST['archivo'] ?? '');
            $rutaMedia = dirname(__DIR__) . '/public/img/login/' . $nombreMedia;
            if ($nombreMedia !== '' && is_file($rutaMedia)) {
                unlink($rutaMedia);
                flash('Archivo eliminado del carrusel');
            }
            redirigir('/configuracion');

        case '/accion/prompt':
            requiereAdmin();
            $clave = $_POST['clave'] ?? 'sistema_bot';
            $contenido = trim($_POST['contenido'] ?? '');
            if ($contenido === '') {
                flash('El prompt no puede quedar vacío', 'error');
                redirigir($volver);
            }
            Database::transaccion(function () use ($clave, $contenido, $usuario) {
                $ultima = Database::uno('SELECT MAX(version) AS v FROM prompts WHERE clave = ?', [$clave]);
                Database::ejecutar('UPDATE prompts SET activo = 0 WHERE clave = ?', [$clave]);
                Database::ejecutar(
                    'INSERT INTO prompts (clave, contenido, version, activo, notas, actualizado_por) VALUES (?, ?, ?, 1, ?, ?)',
                    [$clave, $contenido, ((int) ($ultima['v'] ?? 0)) + 1, $_POST['notas'] ?? 'Editado desde el panel', (int) $usuario['id']]
                );
            });
            flash('Nueva versión del prompt activada');
            redirigir($volver);

        case '/accion/prompt-activar':
            requiereAdmin();
            Database::transaccion(function () {
                $prompt = Database::uno('SELECT * FROM prompts WHERE id = ?', [(int) $_POST['prompt_id']]);
                if ($prompt !== null) {
                    Database::ejecutar('UPDATE prompts SET activo = 0 WHERE clave = ?', [$prompt['clave']]);
                    Database::ejecutar('UPDATE prompts SET activo = 1 WHERE id = ?', [$prompt['id']]);
                }
            });
            flash('Versión activada');
            redirigir($volver);

        default:
            http_response_code(404);
            exit('Acción desconocida');
    }
}
