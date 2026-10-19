<?php $titulo = 'Alumnos'; ?>
<div class="cabecera">
  <div>
    <h1>Alumnos inscritos</h1>
    <div class="sub"><?= count($alumnos) ?> en total</div>
  </div>
  <button type="button" class="boton primario" id="btnNuevoAlumno">+ Registrar alumno</button>
</div>

<div class="us-velo" id="alumnoModal" hidden>
  <div class="us-frame" role="dialog" aria-modal="true">
    <div class="us-frame-cab">
      <div class="us-quien"><b>Registrar alumno</b><span>Alta manual sin pasar por el pipeline</span></div>
      <button type="button" class="toast-x us-cerrar" aria-label="Cerrar"><?= icono('x') ?></button>
    </div>
    <form method="post" action="<?= e(u('/accion/alumno-crear')) ?>" class="pl-form">
      <input type="hidden" name="csrf" value="<?= e(csrfToken()) ?>">
      <label class="pl-campo">Nombre completo<input type="text" name="nombre" required maxlength="120"></label>
      <label class="pl-campo">WhatsApp (10 dígitos)<input type="tel" name="telefono" required inputmode="numeric" maxlength="15" placeholder="55 1234 5678"></label>
      <label class="pl-campo">Curso
        <select name="curso_id" required>
          <?php foreach ($cursos as $cu): ?><option value="<?= (int) $cu['id'] ?>"><?= e($cu['nombre']) ?></option><?php endforeach; ?>
        </select>
      </label>
      <div class="us-pie"><button class="boton primario">Registrar</button></div>
    </form>
  </div>
</div>
<script>
(function () {
  var v = document.getElementById('alumnoModal');
  document.getElementById('btnNuevoAlumno').addEventListener('click', function () {
    v.hidden = false; requestAnimationFrame(function () { v.classList.add('visible'); });
  });
  function cerrar() { v.classList.remove('visible'); setTimeout(function () { v.hidden = true; }, 200); }
  v.querySelector('.us-cerrar').addEventListener('click', cerrar);
  v.addEventListener('click', function (e) { if (e.target === v) cerrar(); });
})();
</script>
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
