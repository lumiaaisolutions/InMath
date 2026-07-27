<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Entrar — Inmath CRM</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=Hanken+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="<?= e(u('/css/inmath.css')) ?>">
  <link rel="icon" type="image/svg+xml" href="<?= e(u('/img/inmath.svg')) ?>">
</head>
<body>
<?= overlayCargaPanel() ?>
<div class="login-fondo">
  <div class="login-caja">
    <div class="marca">
      <img src="<?= e(u('/img/inmath.svg')) ?>" alt="Inmath" width="42" height="42">
      <div>
        <h1>Inmath CRM</h1>
        <span>Sistema de ventas · Cursos en línea</span>
      </div>
    </div>
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
</body>
</html>
