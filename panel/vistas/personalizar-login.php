<?php
$titulo = 'Personalizar login';

$textosActuales = [];
foreach ($configuraciones as $c) {
    if (in_array($c['clave'], ['login_titulo', 'login_texto'], true)) {
        $textosActuales[$c['clave']] = $c['valor'];
    }
}
$tituloLogin = trim($textosActuales['login_titulo'] ?? '') !== '' ? $textosActuales['login_titulo'] : '¡Hola de nuevo!';
$textoLogin  = trim($textosActuales['login_texto'] ?? '') !== '' ? $textosActuales['login_texto'] : 'Inicia sesión para continuar.';

$mediaDirLogin = dirname(__DIR__) . '/public/img/login';
$mediaLogin = is_dir($mediaDirLogin)
    ? array_values(array_filter(scandir($mediaDirLogin), fn ($f) => preg_match('/\.(jpe?g|png|webp|mp4)$/i', $f)))
    : [];
$primerMedia = $mediaLogin[0] ?? null;
?>
<div class="cabecera">
  <div>
    <h1>Personalizar login</h1>
    <div class="sub">Lo primero que ve tu equipo al entrar — hazlo tuyo</div>
  </div>
</div>

<div class="pl-rejilla">
  <div class="pl-col">

    <div class="tarjeta pl-tarjeta">
      <h2 class="pl-titulo"><?= icono('prompts') ?> Mensaje de bienvenida</h2>
      <form method="post" action="<?= e(u('/accion/login-textos')) ?>" class="pl-form" id="formTextos">
        <input type="hidden" name="csrf" value="<?= e(csrfToken()) ?>">
        <label class="pl-campo">
          Título
          <input type="text" name="login_titulo" id="plTitulo" maxlength="60"
                 placeholder="¡Hola de nuevo!" value="<?= e($textosActuales['login_titulo'] ?? '') ?>">
        </label>
        <label class="pl-campo">
          Texto de apoyo
          <input type="text" name="login_texto" id="plTexto" maxlength="120"
                 placeholder="Inicia sesión para continuar." value="<?= e($textosActuales['login_texto'] ?? '') ?>">
        </label>
        <button class="boton primario">Guardar mensaje</button>
      </form>
    </div>

    <div class="tarjeta pl-tarjeta">
      <h2 class="pl-titulo"><?= icono('imagen') ?> Fotos y videos del carrusel</h2>
      <p class="pl-ayuda">Rotan automáticamente cada 6 segundos. JPG, PNG, WebP o MP4 · máx. 25 MB.</p>
      <form method="post" action="<?= e(u('/accion/login-media-subir')) ?>" enctype="multipart/form-data" id="formMedia">
        <input type="hidden" name="csrf" value="<?= e(csrfToken()) ?>">
        <label class="pl-dropzone" id="plDrop">
          <input type="file" name="media" accept=".jpg,.jpeg,.png,.webp,.mp4" required id="plFile">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4m0 0-4 4m4-4 4 4"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>
          <b>Arrastra una foto o video aquí</b>
          <span>o haz clic para elegir un archivo</span>
        </label>
      </form>
      <?php if ($mediaLogin === []): ?>
        <p class="pl-ayuda" style="margin-top:12px">Aún no hay archivos — el login muestra la foto por defecto.</p>
      <?php else: ?>
        <div class="pl-galeria">
          <?php foreach ($mediaLogin as $m): ?>
            <div class="pl-item">
              <?php if (preg_match('/\.mp4$/i', $m)): ?>
                <video src="<?= e(u('/img/login/' . $m)) ?>" muted></video>
                <span class="pl-tipo">Video</span>
              <?php else: ?>
                <img src="<?= e(u('/img/login/' . $m)) ?>" alt="">
              <?php endif; ?>
              <form method="post" action="<?= e(u('/accion/login-media-borrar')) ?>" class="pl-borrar-form">
                <input type="hidden" name="csrf" value="<?= e(csrfToken()) ?>">
                <input type="hidden" name="archivo" value="<?= e($m) ?>">
                <button class="pl-borrar" aria-label="Eliminar del carrusel">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                </button>
              </form>
            </div>
          <?php endforeach; ?>
        </div>
      <?php endif; ?>
    </div>

  </div>

  <div class="pl-col">
    <div class="tarjeta pl-tarjeta pl-sticky">
      <h2 class="pl-titulo"><?= icono('pipeline') ?> Vista previa</h2>
      <p class="pl-ayuda">Así se ve la pantalla de inicio de sesión ahora mismo.</p>
      <div class="pl-preview">
        <div class="plp-media">
          <?php if ($primerMedia !== null && preg_match('/\.mp4$/i', $primerMedia)): ?>
            <video src="<?= e(u('/img/login/' . $primerMedia)) ?>" autoplay muted loop playsinline></video>
          <?php elseif ($primerMedia !== null): ?>
            <img src="<?= e(u('/img/login/' . $primerMedia)) ?>" alt="">
          <?php else: ?>
            <img src="<?= e(u('/img/login-default.jpg')) ?>" alt="">
          <?php endif; ?>
        </div>
        <div class="plp-lado">
          <div class="plp-logo"><img src="<?= e(u('/img/inmath.svg')) ?>" alt="" width="14" height="14"> <b>Cursos <span>Inmath</span></b></div>
          <div class="plp-saludo" id="plpSaludo"><?= e($tituloLogin) ?></div>
          <div class="plp-texto" id="plpTexto"><?= e($textoLogin) ?></div>
          <div class="plp-input"></div>
          <div class="plp-input"></div>
          <div class="plp-boton">Entrar</div>
        </div>
      </div>
    </div>
  </div>
</div>

<script>
(function () {
  // La vista previa refleja lo que escribes, antes de guardar.
  var t = document.getElementById('plTitulo'), x = document.getElementById('plTexto');
  var pt = document.getElementById('plpSaludo'), px = document.getElementById('plpTexto');
  if (t && pt) t.addEventListener('input', function () { pt.textContent = t.value || '¡Hola de nuevo!'; });
  if (x && px) x.addEventListener('input', function () { px.textContent = x.value || 'Inicia sesión para continuar.'; });

  // Dropzone: subir al soltar o al elegir archivo (sin botón extra)
  var drop = document.getElementById('plDrop'), file = document.getElementById('plFile'), form = document.getElementById('formMedia');
  if (drop && file && form) {
    file.addEventListener('change', function () { if (file.files.length) form.submit(); });
    ['dragenter', 'dragover'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('activa'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('activa'); });
    });
    drop.addEventListener('drop', function (e) {
      if (e.dataTransfer.files.length) { file.files = e.dataTransfer.files; form.submit(); }
    });
  }
})();
</script>
