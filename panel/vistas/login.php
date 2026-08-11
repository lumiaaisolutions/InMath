<?php
// Carrusel del login: cualquier foto/video en public/img/login/ (los sube el
// admin desde Configuración). Sin archivos → escena animada de marca (curva
// de avance dibujándose sobre retícula + chips de vidrio flotantes).
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
  <div class="login-media" id="loginMedia" aria-hidden="true">
    <?php if ($mediaLogin === []): ?>
      <div class="lm-escena">
        <svg class="lm-curva" viewBox="0 0 520 400" fill="none">
          <defs>
            <linearGradient id="lmg" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stop-color="#3B6FF5"/>
              <stop offset="1" stop-color="#1E9EB8"/>
            </linearGradient>
          </defs>
          <path class="lm-trazo" d="M30 340 C 120 330, 150 260, 220 240 S 330 210, 370 150 S 460 70, 495 55"
                stroke="url(#lmg)" stroke-width="7" stroke-linecap="round"/>
          <circle class="lm-meta" cx="495" cy="55" r="11" fill="#F4A62A"/>
        </svg>
        <div class="lm-chip c1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/></svg> Avance 70%</div>
        <div class="lm-chip c2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg> Cita agendada</div>
        <div class="lm-chip c3"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> Nuevo prospecto</div>
      </div>
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
  </div>
  <div class="login-lado">
    <a class="login-volver" href="<?= e($sitioUrl) ?>">
      <img src="<?= e(u('/img/inmath.svg')) ?>" alt="" width="22" height="22">
      Volver al sitio
    </a>
    <div class="login-caja">
      <div class="login-logo lc-e e1">
        <img src="<?= e(u('/img/inmath.svg')) ?>" alt="" width="30" height="30">
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
  // Carrusel (solo si el admin subió archivos)
  var items = document.querySelectorAll('.login-media .lm-item');
  if (items.length > 1) {
    var actual = 0;
    setInterval(function () {
      items[actual].classList.remove('activo');
      actual = (actual + 1) % items.length;
      items[actual].classList.add('activo');
    }, 6500);
  }

  // Mostrar/ocultar contraseña
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

  // Parallax decorativo de los chips con el mouse (con lerp, solo puntero fino)
  if (matchMedia('(hover: hover) and (pointer: fine)').matches
      && matchMedia('(prefers-reduced-motion: no-preference)').matches) {
    var media = document.getElementById('loginMedia');
    var chips = document.querySelectorAll('.lm-chip, .lm-curva');
    if (media && chips.length) {
      var mx = 0, my = 0, cx = 0, cy = 0;
      media.addEventListener('mousemove', function (e) {
        var r = media.getBoundingClientRect();
        mx = (e.clientX - r.left) / r.width - .5;
        my = (e.clientY - r.top) / r.height - .5;
      });
      media.addEventListener('mouseleave', function () { mx = 0; my = 0; });
      (function anima() {
        cx += (mx - cx) * .06; cy += (my - cy) * .06;
        chips.forEach(function (ch, i) {
          var f = ch.classList.contains('lm-curva') ? 8 : 14 + i * 5;
          ch.style.transform = 'translate(' + (-cx * f) + 'px,' + (-cy * f) + 'px)';
        });
        requestAnimationFrame(anima);
      })();
    }
  }
})();
</script>
</body>
</html>
