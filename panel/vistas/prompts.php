<?php
$titulo = 'Prompts del bot';
$porClave = [];
foreach ($prompts as $p) {
    $porClave[$p['clave']][] = $p;
}
?>
<div class="cabecera">
  <div>
    <h1>Prompts del bot</h1>
    <div class="sub">Editar crea una versión nueva; puedes reactivar cualquier versión anterior</div>
  </div>
</div>

<?php foreach ($porClave as $clave => $versiones): $activa = null;
    foreach ($versiones as $v) { if ($v['activo']) { $activa = $v; break; } }
?>
<div class="tarjeta" style="margin-bottom:24px">
  <div class="seccion">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <h3 style="margin:0"><?= e($clave) ?></h3>
      <span class="gaje grad">versión activa: v<?= (int) ($activa['version'] ?? 0) ?></span>
    </div>
    <form method="post" action="<?= e(u('/accion/prompt')) ?>">
      <input type="hidden" name="csrf" value="<?= e(csrfToken()) ?>">
      <input type="hidden" name="clave" value="<?= e($clave) ?>">
      <input type="hidden" name="volver" value="/prompts">
      <textarea name="contenido" style="width:100%;min-height:320px"><?= e($activa['contenido'] ?? '') ?></textarea>
      <div style="display:flex;gap:8px;margin-top:10px;align-items:center">
        <input type="text" name="notas" placeholder="Nota del cambio (opcional)" style="flex:1">
        <button class="boton primario">Guardar como nueva versión</button>
      </div>
    </form>
  </div>
  <div class="seccion">
    <h3>Versiones</h3>
    <?php foreach ($versiones as $v): ?>
      <div class="dato">
        <dt>v<?= (int) $v['version'] ?> · <?= e(fechaCorta($v['creado_en'])) ?><?= $v['notas'] ? ' — ' . e($v['notas']) : '' ?></dt>
        <dd>
          <?php if ($v['activo']): ?>
            <span class="gaje ok">activa</span>
          <?php else: ?>
            <form method="post" action="<?= e(u('/accion/prompt-activar')) ?>" class="form-inline">
              <input type="hidden" name="csrf" value="<?= e(csrfToken()) ?>">
              <input type="hidden" name="prompt_id" value="<?= (int) $v['id'] ?>">
              <input type="hidden" name="volver" value="/prompts">
              <button class="boton mini fantasma">Reactivar</button>
            </form>
          <?php endif; ?>
        </dd>
      </div>
    <?php endforeach; ?>
  </div>
</div>
<?php endforeach; ?>
