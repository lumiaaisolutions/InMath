<?php
$titulo = 'Usuarios';
$modulosCatalogo = [
    'pipeline' => 'Pipeline',
    'citas'    => 'Citas',
    'alumnos'  => 'Alumnos',
    'pagos'    => 'Pagos',
];
$yo = usuarioActual();
?>
<div class="cabecera">
  <div>
    <h1>Usuarios</h1>
    <div class="sub">Quién entra al panel, con qué rol y a qué módulos</div>
  </div>
</div>

<div class="us-rejilla">
  <?php foreach ($usuarios as $us):
      $fotoUs = dirname(__DIR__) . '/public/img/avatars/' . (int) $us['id'] . '.jpg';
      $fotoUsUrl = is_file($fotoUs) ? u('/img/avatars/' . (int) $us['id'] . '.jpg') . '?v=' . filemtime($fotoUs) : null;
      $modulosUs = $us['modulos'] !== null ? (json_decode((string) $us['modulos'], true) ?: []) : array_keys($modulosCatalogo);
      $esYo = (int) $us['id'] === (int) $yo['id'];
  ?>
  <form method="post" action="<?= e(u('/accion/usuario-guardar')) ?>" class="tarjeta us-carta <?= $us['activo'] ? '' : 'bloqueado' ?>">
    <input type="hidden" name="csrf" value="<?= e(csrfToken()) ?>">
    <input type="hidden" name="usuario_id" value="<?= (int) $us['id'] ?>">
    <div class="us-cab">
      <span class="pw-avatar">
        <?php if ($fotoUsUrl !== null): ?><img src="<?= e($fotoUsUrl) ?>" alt=""><?php else: ?><?= e(mb_strtoupper(mb_substr($us['nombre'], 0, 1))) ?><?php endif; ?>
      </span>
      <div class="us-quien">
        <b><?= e($us['nombre']) ?><?= $esYo ? ' · tú' : '' ?></b>
        <span><?= e($us['email']) ?></span>
      </div>
      <label class="interruptor" title="<?= $us['activo'] ? 'Usuario activo' : 'Usuario bloqueado' ?>">
        <input type="checkbox" name="activo" <?= $us['activo'] ? 'checked' : '' ?> <?= $esYo ? 'disabled' : '' ?>>
        <i></i>
      </label>
      <?php if ($esYo): ?><input type="hidden" name="activo" value="1"><?php endif; ?>
    </div>
    <div class="us-campos">
      <label class="pl-campo">Nombre<input type="text" name="nombre" required maxlength="120" value="<?= e($us['nombre']) ?>"></label>
      <label class="pl-campo">Correo<input type="email" name="email" required maxlength="190" value="<?= e($us['email']) ?>"></label>
      <label class="pl-campo">Teléfono<input type="tel" name="telefono" maxlength="20" value="<?= e($us['telefono'] ?? '') ?>"></label>
      <label class="pl-campo">Rol
        <select name="rol" <?= $esYo ? 'disabled' : '' ?>>
          <option value="asesor" <?= $us['rol'] === 'asesor' ? 'selected' : '' ?>>Asesor</option>
          <option value="admin" <?= $us['rol'] === 'admin' ? 'selected' : '' ?>>Administrador</option>
        </select>
        <?php if ($esYo): ?><input type="hidden" name="rol" value="admin"><?php endif; ?>
      </label>
      <label class="pl-campo">Contraseña nueva <small>(opcional)</small>
        <input type="password" name="password" minlength="8" autocomplete="new-password" placeholder="Sin cambio">
      </label>
    </div>
    <div class="us-modulos">
      <span class="us-etiqueta">Módulos permitidos<?= $us['rol'] === 'admin' ? ' (los administradores ven todo)' : '' ?></span>
      <div class="us-chips">
        <?php foreach ($modulosCatalogo as $clave => $nombreMod): ?>
          <label class="chip-modulo">
            <input type="checkbox" name="modulos[]" value="<?= e($clave) ?>"
              <?= in_array($clave, $modulosUs, true) ? 'checked' : '' ?> <?= $us['rol'] === 'admin' ? 'disabled' : '' ?>>
            <span><?= e($nombreMod) ?></span>
          </label>
        <?php endforeach; ?>
      </div>
    </div>
    <div class="us-pie">
      <?php if (!$us['activo']): ?><span class="gaje alerta">Bloqueado</span><?php endif; ?>
      <button class="boton primario">Guardar cambios</button>
    </div>
  </form>
  <?php endforeach; ?>

  <form method="post" action="<?= e(u('/accion/usuario-crear')) ?>" class="tarjeta us-carta us-nueva">
    <input type="hidden" name="csrf" value="<?= e(csrfToken()) ?>">
    <h2 class="pl-titulo"><?= icono('user') ?> Agregar usuario</h2>
    <div class="us-campos">
      <label class="pl-campo">Nombre<input type="text" name="nombre" required maxlength="120"></label>
      <label class="pl-campo">Correo<input type="email" name="email" required maxlength="190"></label>
      <label class="pl-campo">Contraseña<input type="password" name="password" required minlength="8" autocomplete="new-password" placeholder="Mínimo 8 caracteres"></label>
      <label class="pl-campo">Rol
        <select name="rol"><option value="asesor">Asesor</option><option value="admin">Administrador</option></select>
      </label>
    </div>
    <div class="us-pie"><button class="boton primario">Crear usuario</button></div>
  </form>
</div>
