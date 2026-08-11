<?php $u = usuarioActual(); $rutaActiva = rutaPanel(); ?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= e($titulo ?? 'Panel') ?> — Inmath CRM</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Figtree:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="<?= e(u('/css/inmath.css')) ?>?v=<?= e((string) (@filemtime(PANEL_PATH . '/public/css/inmath.css') ?: 1)) ?>">
  <link rel="icon" type="image/svg+xml" href="<?= e(u('/img/inmath.svg')) ?>?v=<?= e((string) (@filemtime(PANEL_PATH . '/public/img/inmath.svg') ?: 1)) ?>">
</head>
<body>
<?= overlayCargaPanel() ?>
<div class="app">
  <aside class="sidebar">
    <div class="marca">
      <img src="<?= e(u('/img/inmath.svg')) ?>" alt="" width="34" height="34">
      <div><strong>Inmath CRM</strong><span>Cursos · Ventas</span></div>
    </div>
    <nav class="nav">
      <?php
      $items = [];
      foreach ([
          '/' => ['Pipeline', 'pipeline', 'pipeline'],
          '/citas' => ['Citas', 'calendar', 'citas'],
          '/alumnos' => ['Alumnos', 'alumnos', 'alumnos'],
          '/pagos' => ['Pagos', 'pagos', 'pagos'],
      ] as $href => [$texto, $ic, $mod]) {
          if (moduloPermitido($u, $mod)) {
              $items[$href] = [$texto, $ic];
          }
      }
      if (($u['rol'] ?? '') === 'admin') {
          $items['/usuarios'] = ['Usuarios', 'user'];
          $items['/personalizar-login'] = ['Personalizar login', 'imagen'];
          $items['/configuracion'] = ['Configuración', 'config'];
      }
      foreach ($items as $href => [$texto, $ic]):
          $activo = $href === '/' ? in_array($rutaActiva, ['/', '/pipeline'], true) : str_starts_with($rutaActiva, $href);
      ?>
      <a href="<?= e(u($href)) ?>" class="<?= $activo ? 'activo' : '' ?>"><?= icono($ic) ?><?= e($texto) ?></a>
      <?php endforeach; ?>
    </nav>
    <?php
      $fotoPerfil = PANEL_PATH . '/public/img/avatars/' . (int) $u['id'] . '.jpg';
      $fotoUrl = is_file($fotoPerfil) ? u('/img/avatars/' . (int) $u['id'] . '.jpg') . '?v=' . filemtime($fotoPerfil) : null;
    ?>
    <div class="pie perfil-widget">
      <a class="pw-link" href="<?= e(u('/perfil')) ?>" title="Ver mi perfil">
        <span class="pw-avatar">
          <?php if ($fotoUrl !== null): ?><img src="<?= e($fotoUrl) ?>" alt=""><?php else: ?><?= e(mb_strtoupper(mb_substr($u['nombre'], 0, 1))) ?><?php endif; ?>
        </span>
        <span class="pw-quien">
          <b><?= e($u['nombre']) ?></b>
          <i class="pw-chip <?= $u['rol'] === 'admin' ? 'admin' : '' ?>"><?= e($u['rol'] === 'admin' ? 'Administrador' : 'Asesor') ?></i>
        </span>
      </a>
      <form method="post" action="<?= e(u('/accion/logout')) ?>" class="pw-salir-form">
        <input type="hidden" name="csrf" value="<?= e(csrfToken()) ?>">
        <button type="submit" class="pw-salir" title="Cerrar sesión" aria-label="Cerrar sesión"><?= icono('logout') ?></button>
      </form>
    </div>
  </aside>
  <main class="contenido">
  <?php if ($f = flash()): ?>
    <div class="toast <?= e($f['tipo']) ?>" id="toastFlash" role="status">
      <span class="toast-ic"><?= icono($f['tipo'] === 'error' ? 'alerta' : 'check') ?></span>
      <span class="toast-cuerpo">
        <b><?= $f['tipo'] === 'error' ? 'Atención' : 'Listo' ?></b>
        <p><?= e($f['texto']) ?></p>
      </span>
      <button type="button" class="toast-x" aria-label="Cerrar aviso" onclick="this.parentElement.remove()"><?= icono('x') ?></button>
      <i class="toast-barra"></i>
    </div>
    <script>setTimeout(function(){var t=document.getElementById('toastFlash');if(t){t.classList.add('saliendo');setTimeout(function(){t.remove();},350);}},5200);</script>
  <?php endif; ?>
  <div class="confirmar-velo" id="confirmarVelo" hidden>
    <div class="confirmar-caja" role="alertdialog" aria-modal="true" aria-labelledby="confirmarTitulo">
      <span class="toast-ic error"><?= icono('alerta') ?></span>
      <b id="confirmarTitulo">¿Confirmar esta acción?</b>
      <p id="confirmarTexto">Esta acción no se puede deshacer.</p>
      <div class="confirmar-botones">
        <button type="button" class="boton fantasma" id="confirmarNo">Cancelar</button>
        <button type="button" class="boton peligro" id="confirmarSi">Sí, continuar</button>
      </div>
    </div>
  </div>
  <script>
  // Confirmación con diseño propio: cualquier <form data-confirmar="mensaje">
  // pasa por este diálogo en vez del confirm() nativo del navegador.
  (function () {
    var velo = document.getElementById('confirmarVelo');
    var texto = document.getElementById('confirmarTexto');
    var si = document.getElementById('confirmarSi'), no = document.getElementById('confirmarNo');
    var pendiente = null;
    document.addEventListener('submit', function (e) {
      var form = e.target.closest('form[data-confirmar]');
      if (!form || form.dataset.confirmado === '1') return;
      e.preventDefault();
      pendiente = form;
      texto.textContent = form.dataset.confirmar || 'Esta acción no se puede deshacer.';
      velo.hidden = false;
      requestAnimationFrame(function () { velo.classList.add('visible'); si.focus(); });
    });
    function cerrar() {
      velo.classList.remove('visible');
      setTimeout(function () { velo.hidden = true; }, 220);
      pendiente = null;
    }
    no.addEventListener('click', cerrar);
    velo.addEventListener('click', function (e) { if (e.target === velo) cerrar(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !velo.hidden) cerrar(); });
    si.addEventListener('click', function () {
      if (!pendiente) return;
      pendiente.dataset.confirmado = '1';
      pendiente.requestSubmit();
      cerrar();
    });
  })();
  </script>
