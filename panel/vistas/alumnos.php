<?php $titulo = 'Alumnos'; ?>
<div class="cabecera">
  <div>
    <h1>Alumnos inscritos</h1>
    <div class="sub"><?= count($alumnos) ?> en total</div>
  </div>
</div>
<div class="tarjeta">
  <table class="lista">
    <thead>
      <tr><th>Nombre</th><th>Teléfono</th><th>Curso</th><th>Inscrito</th><th>Reportes por</th><th>Estado</th></tr>
    </thead>
    <tbody>
      <?php if ($alumnos === []): ?>
        <tr><td colspan="6"><div class="vacio">Aún no hay alumnos inscritos</div></td></tr>
      <?php endif; ?>
      <?php foreach ($alumnos as $a): ?>
      <tr>
        <td><a href="<?= e(u('/prospectos/' . (int) $a['prospecto_id'])) ?>" style="font-weight:600;color:var(--navy)"><?= e($a['nombre']) ?></a></td>
        <td style="font-family:var(--mono);font-size:.8rem"><?= e($a['telefono']) ?></td>
        <td><?= e($a['curso_nombre']) ?></td>
        <td><?= e(fechaCorta($a['inscrito_en'])) ?></td>
        <td><?= e($a['canal_reporte']) ?></td>
        <td><span class="gaje <?= $a['estado'] === 'activo' ? 'ok' : 'neutro' ?>"><?= e($a['estado']) ?></span></td>
      </tr>
      <?php endforeach; ?>
    </tbody>
  </table>
</div>
