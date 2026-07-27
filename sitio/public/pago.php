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
                $error = 'El pago en línea no está disponible en este momento. Escríbenos por WhatsApp y con gusto te ayudamos.';
            }
        }
    }
}

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
    <a class="boton glow glow-halo bloque grande" href="<?= e($pago['link_pago']) ?>">Pagar de forma segura <span class="flecha">→</span></a>
    <p class="sub" style="font-size:.86rem;margin:16px 0 0">También te enviaremos este enlace por WhatsApp. Si no completas el pago, te lo recordamos — tu lugar queda apartado unas horas.</p>
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
