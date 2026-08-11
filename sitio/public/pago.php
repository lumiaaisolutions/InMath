<?php
$estatico = require __DIR__ . '/_comun.php';
if ($estatico === false) {
    return false;
}

use App\Core\Validar as ValidarApi;
use App\Servicios\PagoServicio;
use App\Servicios\ProspectoServicio;

$curso = cursoActivo();
$error = null;
$pago = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrfValido()) {
        $error = 'La sesión expiró, intenta de nuevo.';
    } elseif (!empty($_POST['sitio_web'])) {
        // Honeypot anti-bots: campo oculto que un humano deja vacío.
        $error = 'No pudimos procesar tu solicitud.';
    } else {
        $telefono = preg_replace('/\D+/', '', $_POST['telefono'] ?? '');
        $nombre = trim($_POST['nombre'] ?? '');
        if ($nombre === '' || strlen($telefono) < 10 || strlen($telefono) > 15) {
            $error = 'Escribe tu nombre y un teléfono de WhatsApp válido (10 dígitos).';
        } elseif ($curso === null) {
            $error = 'No hay curso disponible por el momento.';
        } else {
            if (strlen($telefono) === 10) {
                $telefono = '521' . $telefono; // México: WhatsApp usa 521 + 10 dígitos
            }
            $resultado = ProspectoServicio::upsertPorTelefono($telefono, ['nombre' => $nombre, 'fuente' => 'organico']);
            $prospecto = $resultado['prospecto'];
            if ($prospecto['nombre'] === null && $nombre !== '') {
                App\Core\Database::ejecutar('UPDATE prospectos SET nombre = ? WHERE id = ?', [$nombre, $prospecto['id']]);
            }
            $r = PagoServicio::linkParaProspecto($prospecto, (int) $curso['id']);
            if ($r['ok']) {
                $pago = $r['pago'];
            } else {
                // Sin procesador en línea: registrar el pago como transferencia
                // para que el alumno suba su comprobante (Fase 3.2).
                $pagoId = App\Core\Database::insertar(
                    'INSERT INTO pagos (prospecto_id, curso_id, procesador, monto_centavos, moneda, estado, link_generado_en)
                     VALUES (?, ?, \'transferencia\', ?, ?, \'pendiente\', NOW())',
                    [(int) $prospecto['id'], (int) $curso['id'], (int) $curso['precio_centavos'], $curso['moneda']]
                );
                $pago = App\Core\Database::uno('SELECT * FROM pagos WHERE id = ?', [$pagoId]);
            }
            $_SESSION['pagos_propios'][] = (int) $pago['id'];
        }
    }
}

$comprobanteOk = false;
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['accion'] ?? '') === 'comprobante') {
    $pagoId = (int) ($_POST['pago_id'] ?? 0);
    $archivo = $_FILES['comprobante'] ?? null;
    if (!csrfValido() || !in_array($pagoId, $_SESSION['pagos_propios'] ?? [], true)) {
        $error = 'La sesión expiró, vuelve a llenar tus datos.';
    } elseif ($archivo === null || ($archivo['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || $archivo['size'] > 8 * 1024 * 1024) {
        $error = 'Adjunta tu comprobante (imagen o PDF de hasta 8 MB).';
    } else {
        $ext = strtolower(pathinfo($archivo['name'], PATHINFO_EXTENSION));
        $tiposOk = ['jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp', 'pdf' => 'application/pdf'];
        if (!isset($tiposOk[$ext]) || $tiposOk[$ext] !== mime_content_type($archivo['tmp_name'])) {
            $error = 'Solo aceptamos JPG, PNG, WebP o PDF.';
        } else {
            $dir = BACKEND_PATH . '/storage/comprobantes';
            if (!is_dir($dir)) { mkdir($dir, 0775, true); }
            $nombreArchivo = $pagoId . '-' . bin2hex(random_bytes(5)) . '.' . $ext;
            move_uploaded_file($archivo['tmp_name'], $dir . '/' . $nombreArchivo);
            App\Core\Database::ejecutar(
                "UPDATE pagos SET comprobante = ?, comprobante_subido_en = NOW() WHERE id = ? AND estado = 'pendiente'",
                [$nombreArchivo, $pagoId]
            );
            $comprobanteOk = true;
        }
    }
    if (!$comprobanteOk && $pagoId > 0) {
        $pago = App\Core\Database::uno('SELECT * FROM pagos WHERE id = ?', [$pagoId]);
        $curso = $curso ?? cursoActivo();
    }
}
$datosPago = App\Core\Database::uno("SELECT valor FROM configuraciones WHERE clave = 'datos_pago'")['valor'] ?? '';

cabeceraSitio('Inscripción — Cursos Inmath', 'pago');
?>
<div class="pagina-form">
  <a class="volver" href="/">← Volver al inicio</a>
  <h1>Inscripción al curso</h1>
  <p class="sub">Llena tus datos y te llevamos al pago seguro. Al confirmarse, tu acceso se activa automáticamente.</p>

  <?php if ($error): ?><div class="aviso error"><?= e($error) ?></div><?php endif; ?>

  <div class="tarjeta-form">
  <?php if ($pago !== null): ?>
    <div class="aviso ok">¡Listo, <?= e($_POST['nombre'] ?? '') ?>! Tu enlace de pago está preparado.</div>
    <div class="resumen-pago" style="margin-bottom:18px">
      <span><?= e($curso['nombre']) ?></span>
      <b>$<?= number_format($pago['monto_centavos'] / 100, 2) ?> <?= e($pago['moneda']) ?></b>
    </div>
    <?php if (!empty($pago['link_pago'])): ?>
      <a class="boton glow glow-halo bloque grande" href="<?= e($pago['link_pago']) ?>">Pagar de forma segura <span class="flecha">→</span></a>
      <div class="pago-sep">o paga por transferencia</div>
    <?php endif; ?>
    <div class="transferencia">
      <b>Pago por transferencia</b>
      <p class="datos-transferencia"><?= nl2br(e($datosPago)) ?></p>
      <form method="post" enctype="multipart/form-data" class="formulario" style="margin-top:12px">
        <input type="hidden" name="csrf" value="<?= e(csrfSitio()) ?>">
        <input type="hidden" name="accion" value="comprobante">
        <input type="hidden" name="pago_id" value="<?= (int) $pago['id'] ?>">
        <div class="campo">
          <label for="comprobante">Sube tu comprobante (foto o PDF)</label>
          <input type="file" id="comprobante" name="comprobante" accept=".jpg,.jpeg,.png,.webp,.pdf" required>
        </div>
        <button type="submit" class="boton bloque grande">Enviar comprobante <span class="flecha">→</span></button>
      </form>
    </div>
    <p class="sub" style="font-size:.86rem;margin:16px 0 0">También te enviaremos este enlace por WhatsApp. Si no completas el pago, te lo recordamos — tu lugar queda apartado unas horas.</p>
  <?php elseif ($comprobanteOk): ?>
    <div class="aviso ok">¡Recibimos tu comprobante! Lo revisamos y en cuanto se confirme te llegan tus datos de acceso por WhatsApp.</div>
    <a class="boton ghost grande" href="/" style="margin-top:16px">← Volver al inicio</a>
  <?php else: ?>
    <form method="post" class="formulario">
      <input type="hidden" name="csrf" value="<?= e(csrfSitio()) ?>">
      <input type="text" name="sitio_web" value="" style="display:none" tabindex="-1" autocomplete="off">
      <div class="campo">
        <label for="nombre">Nombre completo</label>
        <input type="text" id="nombre" name="nombre" required value="<?= e($_POST['nombre'] ?? '') ?>">
      </div>
      <div class="campo">
        <label for="telefono">WhatsApp (10 dígitos)</label>
        <input type="tel" id="telefono" name="telefono" required inputmode="numeric" placeholder="55 1234 5678" value="<?= e($_POST['telefono'] ?? '') ?>">
      </div>
      <?php if ($curso !== null): ?>
      <div class="resumen-pago">
        <span><?= e($curso['nombre']) ?></span>
        <b>$<?= number_format($curso['precio_centavos'] / 100, 2) ?> <?= e($curso['moneda']) ?></b>
      </div>
      <?php endif; ?>
      <button type="submit" class="boton glow glow-halo bloque grande">Continuar al pago <span class="flecha">→</span></button>
    </form>
  <?php endif; ?>
  </div>
</div>
<?php pieSitio();
