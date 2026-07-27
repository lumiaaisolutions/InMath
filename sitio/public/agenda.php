<?php
$estatico = require __DIR__ . '/_comun.php';
if ($estatico === false) {
    return false;
}

use App\Servicios\AgendaServicio;
use App\Servicios\ProspectoServicio;

$error = null;
$cita = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrfValido()) {
        $error = 'La sesión expiró, intenta de nuevo.';
    } elseif (!empty($_POST['sitio_web'])) {
        $error = 'No pudimos procesar tu solicitud.';
    } else {
        $telefono = preg_replace('/\D+/', '', $_POST['telefono'] ?? '');
        $nombre = trim($_POST['nombre'] ?? '');
        $inicio = $_POST['slot'] ?? '';
        if ($nombre === '' || strlen($telefono) < 10 || strlen($telefono) > 15) {
            $error = 'Escribe tu nombre y un teléfono de WhatsApp válido (10 dígitos).';
        } elseif (!preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/', $inicio)) {
            $error = 'Elige uno de los horarios disponibles.';
        } else {
            if (strlen($telefono) === 10) {
                $telefono = '521' . $telefono;
            }
            $resultado = ProspectoServicio::upsertPorTelefono($telefono, ['nombre' => $nombre, 'fuente' => 'organico']);
            $prospecto = $resultado['prospecto'];
            if ($prospecto['nombre'] === null && $nombre !== '') {
                App\Core\Database::ejecutar('UPDATE prospectos SET nombre = ? WHERE id = ?', [$nombre, $prospecto['id']]);
            }
            $r = AgendaServicio::agendar((int) $prospecto['id'], $inicio);
            if (isset($r['error'])) {
                $error = 'Ese horario acaba de ocuparse. Elige otro, por favor.';
            } else {
                $cita = $r['cita'];
            }
        }
    }
}

// Mismo calendario que usa el chatbot: la disponibilidad sale del mismo servicio.
$slots = AgendaServicio::slotsDisponibles(null, 7, null, 12);

cabeceraSitio('Agendar asesoría — Cursos Inmath', 'agenda');
?>
<div class="pagina-form">
  <a class="volver" href="/">← Volver al inicio</a>
  <h1>Agenda tu asesoría gratuita</h1>
  <p class="sub">Una videollamada breve con un asesor para resolver tus dudas y armar tu plan. Te llega la confirmación con el enlace por WhatsApp.</p>

  <?php if ($error): ?><div class="aviso error"><?= e($error) ?></div><?php endif; ?>

  <?php if ($cita !== null): ?>
    <div class="tarjeta-form">
      <div class="aviso ok" style="margin-bottom:0">
        ¡Cita confirmada! Te esperamos el
        <strong><?= e(AgendaServicio::etiqueta(strtotime($cita['inicio']))) ?></strong>.
        En breve recibirás la confirmación con el enlace de la videollamada en tu WhatsApp.
      </div>
      <a class="boton ghost grande" href="/" style="margin-top:20px">← Volver al inicio</a>
    </div>
  <?php elseif ($slots === []): ?>
    <div class="tarjeta-form"><div class="aviso error" style="margin-bottom:0">Por ahora no hay horarios disponibles esta semana. Escríbenos por WhatsApp y buscamos un espacio para ti.</div></div>
  <?php else: ?>
    <div class="tarjeta-form">
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
      <div class="campo">
        <label>Elige un horario</label>
        <div class="slots">
          <?php foreach ($slots as $s): ?>
          <label class="slot">
            <input type="radio" name="slot" value="<?= e($s['inicio']) ?>" required>
            <span><?= e($s['etiqueta']) ?></span>
          </label>
          <?php endforeach; ?>
        </div>
      </div>
      <button type="submit" class="boton glow glow-halo bloque grande">Confirmar mi cita <span class="flecha">→</span></button>
    </form>
    </div>
  <?php endif; ?>
</div>
<?php pieSitio();
