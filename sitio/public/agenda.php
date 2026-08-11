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
$diasRango = 7; // días que pinta la tira del calendario (mismo horizonte que slotsDisponibles)

// Agrupa por día para no repetir "Miércoles 29 de julio" en cada horario —
// se muestra una sola vez como sub-encabezado y las horas quedan como chips.
$diasAgrupados = [];
$semanasCortas = [1 => 'Lun', 2 => 'Mar', 3 => 'Mié', 4 => 'Jue', 5 => 'Vie', 6 => 'Sáb', 7 => 'Dom'];
$semanasLargas = [1 => 'Lunes', 2 => 'Martes', 3 => 'Miércoles', 4 => 'Jueves', 5 => 'Viernes', 6 => 'Sábado', 7 => 'Domingo'];
$mesesNombre = [1 => 'enero', 2 => 'febrero', 3 => 'marzo', 4 => 'abril', 5 => 'mayo', 6 => 'junio', 7 => 'julio', 8 => 'agosto', 9 => 'septiembre', 10 => 'octubre', 11 => 'noviembre', 12 => 'diciembre'];
foreach ($slots as $s) {
    $dia = substr($s['inicio'], 0, 10);
    if (!isset($diasAgrupados[$dia])) {
        $partes = explode(',', $s['etiqueta'], 2);
        $ts = strtotime($dia);
        $diasAgrupados[$dia] = [
            'etiqueta' => trim($partes[0]),
            'num'      => date('j', $ts),
            'sem'      => $semanasCortas[(int) date('N', $ts)],
            'semLarga' => $semanasLargas[(int) date('N', $ts)],
            'mes'      => $mesesNombre[(int) date('n', $ts)],
            'horas'    => [],
        ];
    }
    $partes = explode(',', $s['etiqueta'], 2);
    $diasAgrupados[$dia]['horas'][] = ['inicio' => $s['inicio'], 'hora' => trim($partes[1] ?? $s['etiqueta'])];
}

cabeceraSitio('Agendar asesoría — Cursos Inmath', 'agenda');
?>
<section class="agenda-hero">
  <?= mallaSitio() ?>
  <div class="centrado">
    <a class="volver" href="/">← Volver al inicio</a>
    <div class="agenda-rej">
      <div class="agenda-lado">
        <div class="cab-seccion reveal-mueve" style="margin-bottom:22px">
          <span class="eyebrow"><?= icono('calendar', 'ic-ey') ?> Asesoría gratis</span>
          <h1>Agenda tu asesoría, sin costo.</h1>
          <p>Una videollamada breve con un asesor real para resolver tus dudas y armar tu plan de estudio. Te llega la confirmación con el enlace por WhatsApp.</p>
        </div>
        <div class="scrub scrub-agenda" aria-label="Asesor sonriendo en videollamada, y una agenda donde se marca la fecha de la cita">
          <img class="scrub-frame f1" src="/img/fotos/agenda-1.jpg" alt="Persona sonriendo durante una videollamada de trabajo" loading="lazy">
          <img class="scrub-frame f2" src="/img/fotos/agenda-2.jpg" alt="Pluma marcando una fecha en una agenda de papel" loading="lazy">
          <span class="tinte"></span>
        </div>
        <div class="agenda-respaldo">
          <span><?= icono('clock') ?> 20–30 minutos</span>
          <span><?= icono('user') ?> Con un asesor, no un bot</span>
          <span><?= icono('chat') ?> Confirmación por WhatsApp</span>
        </div>
      </div>

      <div class="agenda-form-col">
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
              <label for="nombre"><?= icono('user') ?> Nombre completo</label>
              <input type="text" id="nombre" name="nombre" required value="<?= e($_POST['nombre'] ?? '') ?>">
            </div>
            <div class="campo">
              <label for="telefono"><?= icono('chat') ?> WhatsApp (10 dígitos)</label>
              <input type="tel" id="telefono" name="telefono" required inputmode="numeric" placeholder="55 1234 5678" value="<?= e($_POST['telefono'] ?? '') ?>">
            </div>
            <div class="campo">
              <label><?= icono('calendar') ?> Fechas disponibles</label>
              <?php
                $primerDisponible = array_key_first($diasAgrupados);
                $rangoDias = [];
                for ($i = 0; $i < $diasRango; $i++) {
                    $ts = strtotime("+$i day");
                    $d = date('Y-m-d', $ts);
                    $rangoDias[] = [
                        'dia' => $d,
                        'num' => date('j', $ts),
                        'sem' => $semanasCortas[(int) date('N', $ts)],
                        'semLarga' => $semanasLargas[(int) date('N', $ts)],
                        'mes' => ucfirst($mesesNombre[(int) date('n', $ts)]),
                        'disp' => isset($diasAgrupados[$d]),
                    ];
                }
                $cabecera = $diasAgrupados[$primerDisponible] ?? null;
              ?>
              <div class="cal-widget">
                <div class="cal-cab">
                  <div class="cal-titulo">
                    <span class="cal-mes" id="calMes"><?= e($cabecera !== null ? ucfirst($cabecera['mes']) : ucfirst($mesesNombre[(int) date('n')])) ?></span>
                    <span class="cal-sem" id="calSem"><?= e($cabecera['semLarga'] ?? '') ?></span>
                  </div>
                  <span class="cal-num" id="calNum"><?= e($cabecera['num'] ?? date('j')) ?></span>
                </div>
                <div class="cal-strip" role="tablist" aria-label="Días de la semana">
                  <?php foreach ($rangoDias as $r): ?>
                    <button type="button" role="tab"
                      class="cal-dia<?= $r['disp'] ? ' disp' : '' ?><?= $r['dia'] === $primerDisponible ? ' activo' : '' ?>"
                      data-dia="<?= e($r['dia']) ?>" data-num="<?= e($r['num']) ?>"
                      data-mes="<?= e($r['mes']) ?>" data-sem="<?= e($r['semLarga']) ?>"
                      <?= $r['disp'] ? '' : 'disabled aria-disabled="true"' ?>
                      aria-selected="<?= $r['dia'] === $primerDisponible ? 'true' : 'false' ?>">
                      <span class="cd-sem"><?= e($r['sem']) ?></span>
                      <b class="cd-num"><?= e($r['num']) ?></b>
                    </button>
                  <?php endforeach; ?>
                </div>
                <div class="cal-horas">
                  <?php foreach ($diasAgrupados as $dia => $grupo): ?>
                    <div class="cal-grupo" data-dia="<?= e($dia) ?>" <?= $dia === $primerDisponible ? '' : 'hidden' ?>>
                      <div class="slots">
                        <?php foreach ($grupo['horas'] as $h): ?>
                        <label class="slot">
                          <input type="radio" name="slot" value="<?= e($h['inicio']) ?>" required>
                          <span><?= e($h['hora']) ?></span>
                        </label>
                        <?php endforeach; ?>
                      </div>
                    </div>
                  <?php endforeach; ?>
                </div>
              </div>
              <script>
              (function () {
                var dias = document.querySelectorAll('.cal-dia.disp');
                var grupos = document.querySelectorAll('.cal-grupo');
                var num = document.getElementById('calNum');
                var mes = document.getElementById('calMes');
                var sem = document.getElementById('calSem');
                dias.forEach(function (btn) {
                  btn.addEventListener('click', function () {
                    document.querySelectorAll('.cal-dia.activo').forEach(function (a) {
                      a.classList.remove('activo'); a.setAttribute('aria-selected', 'false');
                    });
                    btn.classList.add('activo'); btn.setAttribute('aria-selected', 'true');
                    grupos.forEach(function (g) {
                      var visible = g.dataset.dia === btn.dataset.dia;
                      g.hidden = !visible;
                      if (visible) { g.classList.remove('anima'); void g.offsetWidth; g.classList.add('anima'); }
                      else { g.querySelectorAll('input:checked').forEach(function (i) { i.checked = false; }); }
                    });
                    [num, mes, sem].forEach(function (el) { el.classList.remove('cambia'); void el.offsetWidth; el.classList.add('cambia'); });
                    num.textContent = btn.dataset.num;
                    mes.textContent = btn.dataset.mes;
                    sem.textContent = btn.dataset.sem;
                  });
                });
              })();
              </script>
            </div>
            <button type="submit" class="boton glow glow-halo bloque grande">Confirmar mi cita <span class="flecha"><?= icono('arrow') ?></span></button>
          </form>
          </div>
        <?php endif; ?>
      </div>
    </div>
  </div>
</section>
<?php pieSitio();
