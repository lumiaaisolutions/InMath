<?php
$titulo = 'Mi perfil';
$fotoRuta = dirname(__DIR__) . '/public/img/avatars/' . (int) $yo['id'] . '.jpg';
$fotoUrl = is_file($fotoRuta) ? u('/img/avatars/' . (int) $yo['id'] . '.jpg') . '?v=' . filemtime($fotoRuta) : null;
?>
<div class="cabecera">
  <div>
    <h1>Mi perfil</h1>
    <div class="sub">Tu información y tu foto — como te ve el equipo</div>
  </div>
</div>

<div class="perfil-rejilla">
  <div class="tarjeta perfil-carta">
    <div class="pc-banner"></div>
    <form method="post" action="<?= e(u('/accion/perfil-foto')) ?>" enctype="multipart/form-data" class="pc-foto-form" id="formFoto">
      <input type="hidden" name="csrf" value="<?= e(csrfToken()) ?>">
      <label class="pc-avatar" title="Cambiar foto">
        <?php if ($fotoUrl !== null): ?>
          <img src="<?= e($fotoUrl) ?>" alt="Tu foto de perfil">
        <?php else: ?>
          <span class="pc-inicial"><?= e(mb_strtoupper(mb_substr($yo['nombre'], 0, 1))) ?></span>
        <?php endif; ?>
        <span class="pc-camara">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h2l2-3h8l2 3h2a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/></svg>
        </span>
        <input type="file" name="foto" accept=".jpg,.jpeg,.png,.webp" id="inputFoto">
      </label>
    </form>
    <div class="pc-nombre"><?= e($yo['nombre']) ?></div>
    <div class="pc-chips">
      <span class="pw-chip <?= $yo['rol'] === 'admin' ? 'admin' : '' ?>"><?= e($yo['rol'] === 'admin' ? 'Administrador' : 'Asesor') ?></span>
      <span class="pw-chip suave"><?= e($yo['email']) ?></span>
    </div>
    <p class="pc-nota">Tu foto se recorta automáticamente en círculo. JPG, PNG o WebP de hasta 8 MB.</p>
    <form method="post" action="<?= e(u('/accion/logout')) ?>" class="pc-salir">
      <input type="hidden" name="csrf" value="<?= e(csrfToken()) ?>">
      <button type="submit" class="boton fantasma"><?= icono('logout') ?> Cerrar sesión</button>
    </form>
  </div>

  <div class="tarjeta pl-tarjeta">
    <h2 class="pl-titulo"><?= icono('user') ?> Mis datos</h2>
    <form method="post" action="<?= e(u('/accion/perfil')) ?>" class="pl-form">
      <input type="hidden" name="csrf" value="<?= e(csrfToken()) ?>">
      <label class="pl-campo">
        Nombre completo
        <input type="text" name="nombre" required maxlength="120" value="<?= e($yo['nombre']) ?>">
      </label>
      <label class="pl-campo">
        Teléfono (WhatsApp)
        <input type="tel" name="telefono" maxlength="20" inputmode="numeric" placeholder="55 1234 5678" value="<?= e($yo['telefono'] ?? '') ?>">
      </label>
      <div class="pl-separador">Cambiar contraseña <small>(opcional — déjalo vacío para no cambiarla)</small></div>
      <label class="pl-campo">
        Contraseña nueva
        <input type="password" name="password" minlength="8" autocomplete="new-password" placeholder="Mínimo 8 caracteres">
      </label>
      <label class="pl-campo">
        Repite la contraseña
        <input type="password" name="password2" autocomplete="new-password">
      </label>
      <button class="boton primario">Guardar cambios</button>
    </form>
  </div>
</div>
<script>
(function () {
  var input = document.getElementById('inputFoto'), form = document.getElementById('formFoto');
  if (input && form) input.addEventListener('change', function () { if (input.files.length) form.submit(); });
})();
</script>
