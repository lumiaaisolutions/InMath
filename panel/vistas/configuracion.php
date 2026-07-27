<?php $titulo = 'Configuración'; ?>
<div class="cabecera">
  <div>
    <h1>Configuración</h1>
    <div class="sub">Parámetros del sistema — los cambios aplican de inmediato, sin despliegue</div>
  </div>
</div>
<div class="tarjeta">
  <table class="lista">
    <thead><tr><th style="width:220px">Clave</th><th>Valor</th><th style="width:90px"></th></tr></thead>
    <tbody>
      <?php foreach ($configuraciones as $c): ?>
      <tr>
        <td>
          <div style="font-weight:600;font-family:var(--mono);font-size:.78rem"><?= e($c['clave']) ?></div>
          <div style="font:var(--t-mini);color:var(--tinta-3);margin-top:3px"><?= e($c['descripcion'] ?? '') ?></div>
        </td>
        <td colspan="2">
          <form method="post" action="<?= e(u('/accion/config')) ?>" style="display:flex;gap:8px;align-items:flex-start">
            <input type="hidden" name="csrf" value="<?= e(csrfToken()) ?>">
            <input type="hidden" name="clave" value="<?= e($c['clave']) ?>">
            <input type="hidden" name="volver" value="/configuracion">
            <?php if ($c['tipo'] === 'json' || mb_strlen($c['valor']) > 80): ?>
              <textarea name="valor" style="flex:1;min-height:70px"><?= e($c['valor']) ?></textarea>
            <?php else: ?>
              <input type="text" name="valor" value="<?= e($c['valor']) ?>" style="flex:1">
            <?php endif; ?>
            <button class="boton mini">Guardar</button>
          </form>
        </td>
      </tr>
      <?php endforeach; ?>
    </tbody>
  </table>
</div>
