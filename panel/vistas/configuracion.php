<?php $titulo = 'Configuración'; ?>
<div class="cabecera">
  <div>
    <h1>Configuración</h1>
    <div class="sub">Parámetros del sistema — los cambios aplican de inmediato, sin despliegue</div>
  </div>
</div>
<div class="tarjeta">
  <table class="lista">
    <thead><tr><th style="width:220px">Clave</th><th>Valor</th><th style="width:90px"></th></tr></thead>
    <tbody>
      <?php foreach ($configuraciones as $c): ?>
      <tr>
        <td>
          <div style="font-weight:600;font-family:var(--mono);font-size:.78rem"><?= e($c['clave']) ?></div>
          <div style="font:var(--t-mini);color:var(--tinta-3);margin-top:3px"><?= e($c['descripcion'] ?? '') ?></div>
        </td>
        <td colspan="2">
          <form method="post" action="<?= e(u('/accion/config')) ?>" style="display:flex;gap:8px;align-items:flex-start">
            <input type="hidden" name="csrf" value="<?= e(csrfToken()) ?>">
            <input type="hidden" name="clave" value="<?= e($c['clave']) ?>">
            <input type="hidden" name="volver" value="/configuracion">
            <?php if ($c['tipo'] === 'json' || mb_strlen($c['valor']) > 80): ?>
              <textarea name="valor" style="flex:1;min-height:70px"><?= e($c['valor']) ?></textarea>
            <?php else: ?>
              <input type="text" name="valor" value="<?= e($c['valor']) ?>" style="flex:1">
            <?php endif; ?>
            <button class="boton mini">Guardar</button>
          </form>
        </td>
      </tr>
      <?php endforeach; ?>
    </tbody>
  </table>
</div>

<?php
$mediaDirLogin = dirname(__DIR__) . '/public/img/login';
$mediaLogin = is_dir($mediaDirLogin)
    ? array_values(array_filter(scandir($mediaDirLogin), fn ($f) => preg_match('/\.(jpe?g|png|webp|mp4)$/i', $f)))
    : [];
?>
<div class="tarjeta" style="margin-top:18px">
  <h2 style="font:600 1rem var(--display);margin-bottom:4px">Carrusel del login</h2>
  <p style="font:var(--t-mini);color:var(--tinta-3);margin-bottom:14px">
    Fotos o videos que rotan en la pantalla de inicio de sesión. JPG, PNG, WebP o MP4, máximo 25 MB.
  </p>
  <form method="post" action="<?= e(u('/accion/login-media-subir')) ?>" enctype="multipart/form-data"
        style="display:flex;gap:8px;align-items:center;margin-bottom:14px;flex-wrap:wrap">
    <input type="hidden" name="csrf" value="<?= e(csrfToken()) ?>">
    <input type="file" name="media" accept=".jpg,.jpeg,.png,.webp,.mp4" required>
    <button class="boton mini">Subir al carrusel</button>
  </form>
  <?php if ($mediaLogin === []): ?>
    <p style="font:var(--t-mini);color:var(--tinta-3)">Sin archivos — el login muestra el fondo degradado por defecto.</p>
  <?php else: ?>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <?php foreach ($mediaLogin as $m): ?>
        <div style="width:130px">
          <?php if (preg_match('/\.mp4$/i', $m)): ?>
            <video src="<?= e(u('/img/login/' . $m)) ?>" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:10px" muted></video>
          <?php else: ?>
            <img src="<?= e(u('/img/login/' . $m)) ?>" alt="" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:10px">
          <?php endif; ?>
          <form method="post" action="<?= e(u('/accion/login-media-borrar')) ?>" style="margin-top:6px">
            <input type="hidden" name="csrf" value="<?= e(csrfToken()) ?>">
            <input type="hidden" name="archivo" value="<?= e($m) ?>">
            <button class="boton mini" style="width:100%">Eliminar</button>
          </form>
        </div>
      <?php endforeach; ?>
    </div>
  <?php endif; ?>
</div>
