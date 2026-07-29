<?php
$titulo = 'Citas';
$coloresAsesor = ['#0E5A4E', '#3E9E86', '#EBA23C', '#6E93B5', '#D4703A'];
$horas = range(9, 18);
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
</div>

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
