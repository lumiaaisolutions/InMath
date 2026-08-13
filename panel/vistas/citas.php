<?php
$titulo = 'Citas';
$coloresAsesor = ['#0E5A4E', '#3E9E86', '#EBA23C', '#6E93B5', '#D4703A'];
$horas = range(8, 20);
$dias = [];
for ($i = 0; $i < 6; $i++) {
    $dias[] = strtotime("+{$i} days", $inicioSemana);
}
$porCelda = [];
foreach ($citas as $c) {
    $clave = date('Y-m-d H', strtotime($c['inicio']));
    $porCelda[$clave][] = $c;
}
$mapaColor = [];
foreach ($asesores as $i => $a) {
    $mapaColor[$a['id']] = $coloresAsesor[$i % count($coloresAsesor)];
}
?>
<div class="cabecera">
  <div>
    <h1>Calendario de citas</h1>
    <div class="sub">Semana del <?= e(date('d/m/Y', $inicioSemana)) ?> — cada asesor con su color</div>
  </div>
  <div class="form-inline">
    <a class="boton mini fantasma" href="<?= e(u('/citas')) ?>?semana=<?= e(date('Y-m-d', strtotime('-7 days', $inicioSemana))) ?>&asesor_id=<?= e($filtroAsesor) ?>">← Anterior</a>
    <a class="boton mini fantasma" href="<?= e(u('/citas')) ?>?semana=<?= e(date('Y-m-d', strtotime('+7 days', $inicioSemana))) ?>&asesor_id=<?= e($filtroAsesor) ?>">Siguiente →</a>
    <form method="get" action="<?= e(u('/citas')) ?>" class="form-inline">
      <input type="hidden" name="semana" value="<?= e(date('Y-m-d', $inicioSemana)) ?>">
      <select name="asesor_id" onchange="this.form.submit()">
        <option value="">Todos</option>
        <?php foreach ($asesores as $a): ?>
          <option value="<?= (int) $a['id'] ?>" <?= $filtroAsesor == $a['id'] ? 'selected' : '' ?>><?= e($a['nombre']) ?></option>
        <?php endforeach; ?>
      </select>
    </form>
  </div>
  <button type="button" class="boton primario" id="btnNuevaCita">+ Nueva cita</button>
</div>

<div class="us-velo" id="citaModal" hidden>
  <div class="us-frame" role="dialog" aria-modal="true">
    <div class="us-frame-cab">
      <div class="us-quien"><b>Nueva cita</b><span>Se valida que el horario no se empalme</span></div>
      <button type="button" class="toast-x us-cerrar" aria-label="Cerrar"><?= icono('x') ?></button>
    </div>
    <form method="post" action="<?= e(u('/accion/cita-crear')) ?>" class="pl-form">
      <input type="hidden" name="csrf" value="<?= e(csrfToken()) ?>">
      <label class="pl-campo">Nombre del prospecto<input type="text" name="nombre" required maxlength="120"></label>
      <label class="pl-campo">WhatsApp (10 dígitos)<input type="tel" name="telefono" required inputmode="numeric" maxlength="15" placeholder="55 1234 5678"></label>
      <div class="us-campos">
        <label class="pl-campo">Fecha<input type="date" name="fecha" required min="<?= date('Y-m-d') ?>"></label>
        <label class="pl-campo">Hora<input type="time" name="hora" required min="08:00" max="20:30" step="1800"></label>
      </div>
      <label class="pl-campo">Asesor
        <select name="asesor_id">
          <option value="">Asignar automáticamente</option>
          <?php foreach ($asesores as $a): ?><option value="<?= (int) $a['id'] ?>"><?= e($a['nombre']) ?></option><?php endforeach; ?>
        </select>
      </label>
      <div class="us-pie"><button class="boton primario">Agendar cita</button></div>
    </form>
  </div>
</div>
<script>
(function () {
  var v = document.getElementById('citaModal');
  document.getElementById('btnNuevaCita').addEventListener('click', function () {
    v.hidden = false; requestAnimationFrame(function () { v.classList.add('visible'); });
  });
  function cerrar() { v.classList.remove('visible'); setTimeout(function () { v.hidden = true; }, 200); }
  v.querySelector('.us-cerrar').addEventListener('click', cerrar);
  v.addEventListener('click', function (e) { if (e.target === v) cerrar(); });
})();
</script>

<div style="display:flex;gap:12px;margin-bottom:14px">
  <?php foreach ($asesores as $a): ?>
    <span class="gaje neutro"><span style="width:9px;height:9px;border-radius:50%;background:<?= $mapaColor[$a['id']] ?>;display:inline-block"></span> <?= e($a['nombre']) ?></span>
  <?php endforeach; ?>
</div>

<div class="tarjeta" style="overflow-x:auto">
  <div class="calendario" style="min-width:820px">
    <div></div>
    <?php foreach ($dias as $d): ?>
      <div class="dia-cab"><?= e(['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][(int) date('w', $d)]) ?> <?= e(date('d/m', $d)) ?></div>
    <?php endforeach; ?>
    <?php foreach ($horas as $h): ?>
      <div class="hora"><?= sprintf('%02d:00', $h) ?></div>
      <?php foreach ($dias as $d): ?>
        <div class="celda">
          <?php foreach ($porCelda[date('Y-m-d', $d) . ' ' . sprintf('%02d', $h)] ?? [] as $c): ?>
            <a class="cita-bloque" style="--asesor-color: <?= $mapaColor[$c['asesor_id']] ?? '#3B6FF5' ?>"
               href="<?= e(u('/prospectos/' . (int) $c['prospecto_id'])) ?>"
               title="<?= e($c['estado']) ?>">
              <?= e(date('H:i', strtotime($c['inicio']))) ?> · <?= e($c['prospecto_nombre'] ?? $c['telefono_whatsapp']) ?>
              <small><?= e($c['asesor_nombre']) ?><?= $c['meet_link'] ? ' · Meet' : '' ?></small>
            </a>
          <?php endforeach; ?>
        </div>
      <?php endforeach; ?>
    <?php endforeach; ?>
  </div>
</div>
