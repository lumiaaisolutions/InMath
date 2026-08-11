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
  <link rel="stylesheet" href="<?= e(u('/css/inmath.css')) ?>">
  <link rel="icon" type="image/svg+xml" href="<?= e(u('/img/inmath.svg')) ?>">
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
      $items = [
          '/' => ['Pipeline', 'pipeline'],
          '/citas' => ['Citas', 'calendar'],
          '/alumnos' => ['Alumnos', 'alumnos'],
          '/pagos' => ['Pagos', 'pagos'],
      ];
      if (($u['rol'] ?? '') === 'admin') {
          $items['/prompts'] = ['Prompts del bot', 'prompts'];
          $items['/configuracion'] = ['Configuración', 'config'];
      }
      foreach ($items as $href => [$texto, $ic]):
          $activo = $href === '/' ? in_array($rutaActiva, ['/', '/pipeline'], true) : str_starts_with($rutaActiva, $href);
      ?>
      <a href="<?= e(u($href)) ?>" class="<?= $activo ? 'activo' : '' ?>"><?= icono($ic) ?><?= e($texto) ?></a>
      <?php endforeach; ?>
    </nav>
    <div class="pie">
      <div class="avatar"><?= e(mb_strtoupper(mb_substr($u['nombre'], 0, 1))) ?></div>
      <div class="quien"><b><?= e($u['nombre']) ?></b><i><?= e($u['rol'] === 'admin' ? 'Administrador' : 'Asesor') ?></i></div>
      <form method="post" action="<?= e(u('/accion/logout')) ?>">
        <input type="hidden" name="csrf" value="<?= e(csrfToken()) ?>">
        <button type="submit">Salir</button>
      </form>
    </div>
  </aside>
  <main class="contenido">
  <?php if ($f = flash()): ?>
    <div class="aviso <?= e($f['tipo']) ?>"><?= e($f['texto']) ?></div>
  <?php endif; ?>
