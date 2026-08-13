<?php
$titulo = 'Usuarios';
$modulosCatalogo = ['pipeline' => 'Pipeline', 'citas' => 'Citas', 'alumnos' => 'Alumnos', 'pagos' => 'Pagos'];
$yo = usuarioActual();
?>
<div class="cabecera">
  <div>
    <h1>Usuarios</h1>
    <div class="sub">Quién entra al panel, con qué rol y a qué módulos</div>
  </div>
  <button type="button" class="boton primario" id="btnNuevoUsuario">+ Agregar usuario</button>
</div>

<div class="us-filtros" role="tablist" aria-label="Filtrar por tipo de usuario">
  <button type="button" class="us-filtro activo" data-rol="todos">Todos</button>
  <button type="button" class="us-filtro" data-rol="admin">Administradores</button>
  <button type="button" class="us-filtro" data-rol="asesor">Asesores</button>
</div>

<div class="us-rejilla" id="usRejilla">
  <?php foreach ($usuarios as $us):
      $fotoUs = dirname(__DIR__) . '/public/img/avatars/' . (int) $us['id'] . '.jpg';
      $fotoUsUrl = is_file($fotoUs) ? u('/img/avatars/' . (int) $us['id'] . '.jpg') . '?v=' . filemtime($fotoUs) : null;
      $modulosUs = $us['modulos'] !== null ? (json_decode((string) $us['modulos'], true) ?: []) : array_keys($modulosCatalogo);
      $esYo = (int) $us['id'] === (int) $yo['id'];
  ?>
  <button type="button" class="tarjeta us-mini <?= $us['activo'] ? '' : 'bloqueado' ?>" data-rol="<?= e($us['rol']) ?>"
          data-modal="usModal<?= (int) $us['id'] ?>">
    <span class="pw-avatar">
      <?php if ($fotoUsUrl !== null): ?><img src="<?= e($fotoUsUrl) ?>" alt=""><?php else: ?><?= e(mb_strtoupper(mb_substr($us['nombre'], 0, 1))) ?><?php endif; ?>
    </span>
    <span class="us-quien">
      <b><?= e($us['nombre']) ?><?= $esYo ? ' · tú' : '' ?></b>
      <span><?= e($us['email']) ?></span>
    </span>
    <i class="pw-chip <?= $us['rol'] === 'admin' ? 'admin' : '' ?>"><?= e($us['rol'] === 'admin' ? 'Administrador' : 'Asesor') ?></i>
    <?php if (!$us['activo']): ?><i class="pw-chip suave">Bloqueado</i><?php endif; ?>
  </button>

  <div class="us-velo" id="usModal<?= (int) $us['id'] ?>" hidden>
    <div class="us-frame" role="dialog" aria-modal="true">
      <div class="us-frame-cab">
        <span class="pw-avatar">
          <?php if ($fotoUsUrl !== null): ?><img src="<?= e($fotoUsUrl) ?>" alt=""><?php else: ?><?= e(mb_strtoupper(mb_substr($us['nombre'], 0, 1))) ?><?php endif; ?>
        </span>
        <div class="us-quien"><b><?= e($us['nombre']) ?></b><span><?= e($us['email']) ?></span></div>
        <button type="button" class="toast-x us-cerrar" aria-label="Cerrar"><?= icono('x') ?></button>
      </div>
      <form method="post" action="<?= e(u('/accion/usuario-guardar')) ?>" class="pl-form">
        <input type="hidden" name="csrf" value="<?= e(csrfToken()) ?>">
        <input type="hidden" name="usuario_id" value="<?= (int) $us['id'] ?>">
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
          <label class="pl-campo" style="align-content:end">
            <span style="display:flex;align-items:center;gap:8px">
              <input type="checkbox" name="es_asesor" <?= !empty($us['es_asesor']) ? 'checked' : '' ?>> Atiende citas y prospectos
            </span>
            <span style="display:flex;align-items:center;gap:8px;margin-top:8px">
              <input type="checkbox" name="activo" <?= $us['activo'] ? 'checked' : '' ?> <?= $esYo ? 'disabled' : '' ?>> Acceso activo
            </span>
            <?php if ($esYo): ?><input type="hidden" name="activo" value="1"><?php endif; ?>
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
          <button class="boton primario">Guardar cambios</button>
        </div>
      </form>
      <?php if (!$esYo): ?>
      <form method="post" action="<?= e(u('/accion/usuario-eliminar')) ?>" class="us-eliminar-form"
            data-confirmar="El usuario perderá el acceso al panel. Sus registros históricos se conservan.">
        <input type="hidden" name="csrf" value="<?= e(csrfToken()) ?>">
        <input type="hidden" name="usuario_id" value="<?= (int) $us['id'] ?>">
        <button class="boton peligro">Eliminar usuario</button>
      </form>
      <?php endif; ?>
    </div>
  </div>
  <?php endforeach; ?>
</div>

<div class="us-velo" id="usModalNuevo" hidden>
  <div class="us-frame" role="dialog" aria-modal="true">
    <div class="us-frame-cab">
      <div class="us-quien"><b>Agregar usuario</b><span>Se le comparte la contraseña y la cambia en su perfil</span></div>
      <button type="button" class="toast-x us-cerrar" aria-label="Cerrar"><?= icono('x') ?></button>
    </div>
    <form method="post" action="<?= e(u('/accion/usuario-crear')) ?>" class="pl-form">
      <input type="hidden" name="csrf" value="<?= e(csrfToken()) ?>">
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
</div>

<script>
(function () {
  // Filtros por rol
  document.querySelectorAll('.us-filtro').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('.us-filtro').forEach(function (x) { x.classList.remove('activo'); });
      b.classList.add('activo');
      document.querySelectorAll('.us-mini').forEach(function (t) {
        t.hidden = b.dataset.rol !== 'todos' && t.dataset.rol !== b.dataset.rol;
      });
    });
  });
  // Abrir/cerrar frames
  function abrir(id) {
    var v = document.getElementById(id);
    if (!v) return;
    v.hidden = false;
    requestAnimationFrame(function () { v.classList.add('visible'); });
  }
  function cerrar(v) {
    v.classList.remove('visible');
    setTimeout(function () { v.hidden = true; }, 200);
  }
  document.querySelectorAll('.us-mini').forEach(function (t) {
    t.addEventListener('click', function () { abrir(t.dataset.modal); });
  });
  document.getElementById('btnNuevoUsuario').addEventListener('click', function () { abrir('usModalNuevo'); });
  document.querySelectorAll('.us-velo').forEach(function (v) {
    v.addEventListener('click', function (e) { if (e.target === v) cerrar(v); });
    v.querySelector('.us-cerrar').addEventListener('click', function () { cerrar(v); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.us-velo:not([hidden])').forEach(cerrar);
  });
})();
</script>
