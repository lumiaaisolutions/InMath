<?php
$titulo = 'Pipeline';
$colores = [
    'prospecto' => 'var(--etapa-1)',
    'calificado' => 'var(--etapa-2)',
    'cita_agendada' => 'var(--etapa-3)',
    'pago_pendiente' => 'var(--etapa-4)',
    'inscrito' => 'var(--etapa-5)',
];
?>
<div class="cabecera">
  <div>
    <h1>Pipeline de ventas</h1>
    <div class="sub">Del primer contacto en WhatsApp a la inscripción</div>
  </div>
  <form method="get" action="<?= e(u('/')) ?>" class="form-inline">
    <select name="asesor_id" onchange="this.form.submit()">
      <option value="">Todos los asesores</option>
      <?php foreach ($asesores as $a): ?>
        <option value="<?= (int) $a['id'] ?>" <?= $filtroAsesor == $a['id'] ? 'selected' : '' ?>><?= e($a['nombre']) ?></option>
      <?php endforeach; ?>
    </select>
  </form>
</div>

<div class="pipeline">
  <?php foreach ($columnas as $etapa => $tarjetas): ?>
  <section class="columna" style="--col: <?= $colores[$etapa] ?>">
    <header class="columna-cab">
      <span class="nodo"></span>
      <h2><?= e(etiquetaEtapa($etapa)) ?></h2>
      <span class="cuenta"><?= count($tarjetas) ?></span>
    </header>
    <div class="pila">
      <?php if ($tarjetas === []): ?>
        <div class="vacio">Sin prospectos aquí</div>
      <?php endif; ?>
      <?php foreach ($tarjetas as $p): ?>
      <a class="tarjeta-prospecto" href="<?= e(u('/prospectos/' . (int) $p['id'])) ?>">
        <b><?= e($p['nombre'] ?? 'Sin nombre') ?></b>
        <span class="tel"><?= e($p['telefono_whatsapp']) ?></span>
        <div class="meta">
          <?php if ($p['puntaje_calificacion'] !== null): ?>
            <span class="gaje grad">◆ <?= (int) $p['puntaje_calificacion'] ?></span>
          <?php endif; ?>
          <?php if ($p['asesor_nombre']): ?>
            <span class="gaje neutro"><?= e($p['asesor_nombre']) ?></span>
          <?php else: ?>
            <span class="gaje alerta">Sin asesor</span>
          <?php endif; ?>
          <?php if ($p['ultimo_mensaje_en']): ?>
            <span class="gaje neutro" title="Último mensaje"><?= e(fechaCorta($p['ultimo_mensaje_en'])) ?></span>
          <?php endif; ?>
        </div>
      </a>
      <?php endforeach; ?>
    </div>
  </section>
  <?php endforeach; ?>
</div>
