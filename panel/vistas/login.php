<?php
// Carrusel del login: fotos/videos de public/img/login/ (los sube el admin
// desde Configuración). Sin archivos → imagen por defecto (login-default.jpg).
$mediaDirLogin = __DIR__ . '/../public/img/login';
$mediaLogin = is_dir($mediaDirLogin)
    ? array_values(array_filter(scandir($mediaDirLogin), fn ($f) => preg_match('/\.(jpe?g|png|webp|mp4)$/i', $f)))
    : [];
$sitioUrl = rtrim(App\Core\Env::get('APP_URL', ''), '/') ?: 'http://127.0.0.1:8125';

// Título y texto de bienvenida configurables desde el panel (Configuración).
$textosLogin = [];
try {
    foreach (App\Core\Database::todos("SELECT clave, valor FROM configuraciones WHERE clave IN ('login_titulo', 'login_texto')") as $r) {
        $textosLogin[$r['clave']] = $r['valor'];
    }
} catch (\Throwable $e) {
    // sin BD (p. ej. instalación a medias) el login sigue mostrando los textos por defecto
}
// Estos textos se muestran SOBRE la imagen del carrusel (personalizables desde
// el panel). El saludo de la derecha es fijo.
$overlayTitulo = trim($textosLogin['login_titulo'] ?? '');
$overlayTexto  = trim($textosLogin['login_texto'] ?? '');
?><!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Login — Cursos Inmath</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Figtree:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="<?= e(u('/css/inmath.css')) ?>?v=<?= e((string) (@filemtime(dirname(__DIR__) . '/public/css/inmath.css') ?: 1)) ?>">
  <link rel="icon" type="image/svg+xml" href="<?= e(u('/img/inmath.svg')) ?>?v=<?= e((string) (@filemtime(PANEL_PATH . '/public/img/inmath.svg') ?: 1)) ?>">
</head>
<body class="login-body">
<?= overlayCargaPanel() ?>
<div class="login-split">
  <div class="login-media" id="loginMedia" aria-hidden="true">
    <?php if ($mediaLogin === []): ?>
      <img class="lm-item activo" src="<?= e(u('/img/login-default.jpg')) ?>" alt="">
    <?php else: ?>
      <?php foreach ($mediaLogin as $i => $m): ?>
        <?php if (preg_match('/\.mp4$/i', $m)): ?>
          <video class="lm-item <?= $i === 0 ? 'activo' : '' ?>" src="<?= e(u('/img/login/' . $m)) ?>" autoplay muted loop playsinline></video>
        <?php else: ?>
          <img class="lm-item <?= $i === 0 ? 'activo' : '' ?>" src="<?= e(u('/img/login/' . $m)) ?>" alt="">
        <?php endif; ?>
      <?php endforeach; ?>
    <?php endif; ?>
    <span class="lm-velo"></span>
    <?php if ($overlayTitulo !== '' || $overlayTexto !== ''): ?>
      <div class="lm-overlay">
        <?php if ($overlayTitulo !== ''): ?><h2><?= e($overlayTitulo) ?></h2><?php endif; ?>
        <?php if ($overlayTexto !== ''): ?><p><?= e($overlayTexto) ?></p><?php endif; ?>
      </div>
    <?php endif; ?>
  </div>
  <div class="login-lado">
    <a class="login-volver" href="<?= e($sitioUrl) ?>">
      <img src="<?= e(u('/img/inmath.svg')) ?>" alt="" width="22" height="22">
      Volver al sitio
    </a>
    <div class="login-caja login-plano">
      <div class="login-logo lc-e e1">
        <img src="<?= e(u('/img/inmath.svg')) ?>" alt="" width="34" height="34">
        <b>Cursos <span>Inmath</span></b>
      </div>
      <h1 class="login-saludo lc-e e2">¡Hola de nuevo!</h1>
      <p class="login-sub lc-e e3">Inicia sesión para continuar.</p>
      <?php if ($f = flash()): ?>
        <div class="aviso <?= e($f['tipo']) ?> aviso-sacudida"><?= e($f['texto']) ?></div>
      <?php endif; ?>
      <form method="post" action="<?= e(u('/accion/login')) ?>">
        <div class="campo lc-e e4">
          <label for="email">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="m3 6 9 7 9-7"/></svg>
            Correo
          </label>
          <input type="email" id="email" name="email" required autofocus autocomplete="username" placeholder="tu@correo.com">
        </div>
        <div class="campo lc-e e5">
          <label for="password">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
            Contraseña
          </label>
          <div class="campo-pass">
            <input type="password" id="password" name="password" required autocomplete="current-password" placeholder="••••••••">
            <button type="button" class="ver-pass" id="verPass" aria-label="Mostrar contraseña" aria-pressed="false">
              <svg class="ojo-abierto" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
              <svg class="ojo-cerrado" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" hidden><path d="M17.94 17.94A10.6 10.6 0 0 1 12 19c-6.5 0-10-7-10-7a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.6 9.6 0 0 1 12 4c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19"/><path d="m1 1 22 22"/></svg>
            </button>
          </div>
        </div>
        <button type="submit" class="boton primario glow login-entrar lc-e e6">
          Entrar
          <svg class="flecha-login" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </button>
      </form>
    </div>
  </div>
</div>
<script>
(function () {
  var items = document.querySelectorAll('.login-media .lm-item');
  if (items.length > 1) {
    var media = document.getElementById('loginMedia');
    var puntos = document.createElement('div');
    puntos.className = 'lm-dots';
    items.forEach(function (_, i) {
      var d = document.createElement('i');
      d.className = 'lm-dot' + (i === 0 ? ' activo' : '');
      puntos.appendChild(d);
    });
    media.appendChild(puntos);
    var actual = 0;
    setInterval(function () {
      items[actual].classList.remove('activo');
      puntos.children[actual].classList.remove('activo');
      actual = (actual + 1) % items.length;
      items[actual].classList.add('activo');
      puntos.children[actual].classList.add('activo');
    }, 6500);
  }
  var btn = document.getElementById('verPass'), pass = document.getElementById('password');
  if (btn && pass) {
    btn.addEventListener('click', function () {
      var visible = pass.type === 'text';
      pass.type = visible ? 'password' : 'text';
      btn.setAttribute('aria-pressed', String(!visible));
      btn.setAttribute('aria-label', visible ? 'Mostrar contraseña' : 'Ocultar contraseña');
      btn.querySelector('.ojo-abierto').hidden = !visible;
      btn.querySelector('.ojo-cerrado').hidden = visible;
      pass.focus();
    });
  }
})();
</script>
</body>
</html>
