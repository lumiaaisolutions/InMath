<?php
$titulo = 'Personalizar login';

$textosActuales = [];
foreach ($configuraciones as $c) {
    if (in_array($c['clave'], ['login_titulo', 'login_texto'], true)) {
        $textosActuales[$c['clave']] = $c['valor'];
    }
}
$tituloLogin = trim($textosActuales['login_titulo'] ?? '');
$textoLogin  = trim($textosActuales['login_texto'] ?? '');

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
      <h2 class="pl-titulo"><?= icono('prompts') ?> Texto sobre la imagen</h2>
      <p class="pl-ayuda">Aparece encima de la foto o video del carrusel. Déjalo vacío si no quieres texto.</p>
      <form method="post" action="<?= e(u('/accion/login-textos')) ?>" class="pl-form" id="formTextos">
        <input type="hidden" name="csrf" value="<?= e(csrfToken()) ?>">
        <label class="pl-campo">
          Título
          <input type="text" name="login_titulo" id="plTitulo" maxlength="60"
                 placeholder="Aprende a tu ritmo" value="<?= e($textosActuales['login_titulo'] ?? '') ?>">
        </label>
        <label class="pl-campo">
          Texto de apoyo
          <input type="text" name="login_texto" id="plTexto" maxlength="120"
                 placeholder="Cursos con acompañamiento real." value="<?= e($textosActuales['login_texto'] ?? '') ?>">
        </label>
        <button class="boton primario">Guardar texto</button>
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
      <div class="aj-caja" id="ajCaja" hidden>
        <canvas class="aj-lienzo" id="ajLienzo" width="432" height="540"></canvas>
        <div class="aj-controles">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3M8 11h6"/></svg>
          <input type="range" class="aj-zoom" id="ajZoom" min="100" max="250" value="100" aria-label="Acercar o alejar la foto">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3M8 11h6M11 8v6"/></svg>
        </div>
        <p class="aj-nota">Arrastra la foto para encuadrarla y usa el control para acercar — así se verá en el login.</p>
        <div class="aj-botones">
          <button type="button" class="boton fantasma" id="ajCancelar">Cancelar</button>
          <button type="button" class="boton primario" id="ajUsar">Usar esta foto</button>
        </div>
      </div>
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
              <form method="post" action="<?= e(u('/accion/login-media-borrar')) ?>" class="pl-borrar-form" data-confirmar="El archivo se quitará del carrusel del login.">
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
          <div class="plp-overlay"><b id="plpOverTitulo"><?= e($tituloLogin) ?></b><i id="plpOverTexto"><?= e($textoLogin) ?></i></div>
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
          <div class="plp-saludo">¡Hola de nuevo!</div>
          <div class="plp-texto">Inicia sesión para continuar.</div>
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
  var pt = document.getElementById('plpOverTitulo'), px = document.getElementById('plpOverTexto');
  if (t && pt) t.addEventListener('input', function () { pt.textContent = t.value; });
  if (x && px) x.addEventListener('input', function () { px.textContent = x.value; });

  // Dropzone + ajuste de encuadre: los videos se suben directo; las fotos
  // pasan por el encuadre 4:5 (pan + zoom) para ver cómo quedarán en el login.
  var drop = document.getElementById('plDrop'), file = document.getElementById('plFile'), form = document.getElementById('formMedia');
  var caja = document.getElementById('ajCaja'), lienzo = document.getElementById('ajLienzo');
  var zoom = document.getElementById('ajZoom'), usar = document.getElementById('ajUsar'), cancelar = document.getElementById('ajCancelar');
  if (!drop || !file || !form) return;

  var ctx = lienzo.getContext('2d'), img = null, escBase = 1, z = 1, ox = 0, oy = 0, arrastre = null;

  function pintar() {
    if (!img) return;
    var s = escBase * z, w = img.naturalWidth * s, h = img.naturalHeight * s;
    ox = Math.min(0, Math.max(lienzo.width - w, ox));
    oy = Math.min(0, Math.max(lienzo.height - h, oy));
    ctx.clearRect(0, 0, lienzo.width, lienzo.height);
    ctx.drawImage(img, ox, oy, w, h);
  }
  function abrirAjuste(archivo) {
    img = new Image();
    img.onload = function () {
      escBase = Math.max(lienzo.width / img.naturalWidth, lienzo.height / img.naturalHeight);
      z = 1; zoom.value = 100;
      ox = (lienzo.width - img.naturalWidth * escBase) / 2;
      oy = (lienzo.height - img.naturalHeight * escBase) / 2;
      caja.hidden = false; drop.parentElement.querySelector('.pl-dropzone').style.display = 'none';
      pintar();
    };
    img.src = URL.createObjectURL(archivo);
  }
  function cerrarAjuste() {
    caja.hidden = true; img = null; file.value = '';
    drop.parentElement.querySelector('.pl-dropzone').style.display = '';
  }
  function alElegir() {
    if (!file.files.length) return;
    var f = file.files[0];
    if (/\.mp4$/i.test(f.name) || f.type === 'video/mp4') { form.submit(); return; }
    abrirAjuste(f);
  }

  file.addEventListener('change', alElegir);
  ['dragenter', 'dragover'].forEach(function (ev) {
    drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('activa'); });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('activa'); });
  });
  drop.addEventListener('drop', function (e) {
    if (e.dataTransfer.files.length) { file.files = e.dataTransfer.files; alElegir(); }
  });

  zoom.addEventListener('input', function () {
    var zNuevo = zoom.value / 100;
    // acercar manteniendo el centro del encuadre
    var cx = lienzo.width / 2, cy = lienzo.height / 2;
    ox = cx - (cx - ox) * (zNuevo / z); oy = cy - (cy - oy) * (zNuevo / z);
    z = zNuevo; pintar();
  });
  lienzo.addEventListener('pointerdown', function (e) {
    arrastre = { x: e.clientX, y: e.clientY }; lienzo.setPointerCapture(e.pointerId);
  });
  lienzo.addEventListener('pointermove', function (e) {
    if (!arrastre) return;
    var r = lienzo.getBoundingClientRect(), f = lienzo.width / r.width;
    ox += (e.clientX - arrastre.x) * f; oy += (e.clientY - arrastre.y) * f;
    arrastre = { x: e.clientX, y: e.clientY }; pintar();
  });
  ['pointerup', 'pointercancel'].forEach(function (ev) {
    lienzo.addEventListener(ev, function () { arrastre = null; });
  });
  cancelar.addEventListener('click', cerrarAjuste);
  usar.addEventListener('click', function () {
    if (!img) return;
    var salida = document.createElement('canvas');
    salida.width = 1080; salida.height = 1350;
    var f = salida.width / lienzo.width, sctx = salida.getContext('2d');
    var s = escBase * z * f;
    sctx.drawImage(img, ox * f, oy * f, img.naturalWidth * s, img.naturalHeight * s);
    salida.toBlob(function (blob) {
      var dt = new DataTransfer();
      dt.items.add(new File([blob], 'encuadre.jpg', { type: 'image/jpeg' }));
      file.files = dt.files;
      form.submit();
    }, 'image/jpeg', 0.9);
  });
})();
</script>
