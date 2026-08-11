<?php
// Carrusel del login: cualquier foto/video en public/img/login/ (los sube el
// admin desde Configuración). Sin archivos → fondo degradado por defecto.
$mediaDirLogin = __DIR__ . '/../public/img/login';
$mediaLogin = is_dir($mediaDirLogin)
    ? array_values(array_filter(scandir($mediaDirLogin), fn ($f) => preg_match('/\.(jpe?g|png|webp|mp4)$/i', $f)))
    : [];
$sitioUrl = rtrim(App\Core\Env::get('APP_URL', ''), '/') ?: 'http://127.0.0.1:8125';
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
  <link rel="icon" type="image/svg+xml" href="<?= e(u('/img/inmath.svg')) ?>">
</head>
<body class="login-body">
<?= overlayCargaPanel() ?>
<div class="login-split">
  <div class="login-media" aria-hidden="true">
    <?php foreach ($mediaLogin as $i => $m): ?>
      <?php if (preg_match('/\.mp4$/i', $m)): ?>
        <video class="lm-item <?= $i === 0 ? 'activo' : '' ?>" src="<?= e(u('/img/login/' . $m)) ?>" autoplay muted loop playsinline></video>
      <?php else: ?>
        <img class="lm-item <?= $i === 0 ? 'activo' : '' ?>" src="<?= e(u('/img/login/' . $m)) ?>" alt="">
      <?php endif; ?>
    <?php endforeach; ?>
    <span class="lm-velo"></span>
  </div>
  <div class="login-lado">
    <a class="login-volver" href="<?= e($sitioUrl) ?>">
      <img src="<?= e(u('/img/inmath.svg')) ?>" alt="" width="22" height="22">
      Volver al sitio
    </a>
    <div class="login-caja">
      <div class="login-logo">
        <img src="<?= e(u('/img/inmath.svg')) ?>" alt="" width="30" height="30">
        <b>Cursos <span>Inmath</span></b>
      </div>
      <h1 class="login-saludo">¡Hola de nuevo!</h1>
      <p class="login-sub">Inicia sesión para continuar.</p>
      <?php if ($f = flash()): ?>
        <div class="aviso <?= e($f['tipo']) ?>"><?= e($f['texto']) ?></div>
      <?php endif; ?>
      <form method="post" action="<?= e(u('/accion/login')) ?>">
        <div class="campo">
          <label for="email">Correo</label>
          <input type="email" id="email" name="email" required autofocus autocomplete="username">
        </div>
        <div class="campo">
          <label for="password">Contraseña</label>
          <input type="password" id="password" name="password" required autocomplete="current-password">
        </div>
        <button type="submit" class="boton primario glow" style="justify-content:center;padding:12px">Entrar</button>
      </form>
    </div>
  </div>
</div>
<script>
(function () {
  var items = document.querySelectorAll('.login-media .lm-item');
  if (items.length < 2) return;
  var actual = 0;
  setInterval(function () {
    items[actual].classList.remove('activo');
    actual = (actual + 1) % items.length;
    items[actual].classList.add('activo');
  }, 6500);
})();
</script>
</body>
</html>
