<?php $titulo = 'Pagos'; ?>
<div class="cabecera">
  <div>
    <h1>Pagos</h1>
    <div class="sub">Links generados, confirmaciones y recuperación de carritos</div>
  </div>
</div>
<div class="tarjeta">
  <table class="lista">
    <thead>
      <tr><th>Prospecto</th><th>Monto</th><th>Procesador</th><th>Comprobante</th><th>Estado</th><th></th></tr>
    </thead>
    <tbody>
      <?php if ($pagos === []): ?>
        <tr><td colspan="6"><div class="vacio">Sin pagos registrados</div></td></tr>
      <?php endif; ?>
      <?php foreach ($pagos as $pg): ?>
      <tr>
        <td><a href="<?= e(u('/prospectos/' . (int) $pg['prospecto_id'])) ?>" style="font-weight:600;color:var(--navy)"><?= e($pg['prospecto_nombre'] ?? $pg['telefono_whatsapp']) ?></a></td>
        <td><?= e(dinero((int) $pg['monto_centavos'], $pg['moneda'])) ?></td>
        <td><?= e($pg['procesador'] ?? '—') ?></td>
        <td>
          <?php if (!empty($pg['comprobante'])): ?>
            <a href="<?= e(u('/comprobante/' . (int) $pg['id'])) ?>" target="_blank" style="font-weight:600;color:#6B9FFF">Ver comprobante</a>
            <div style="font:var(--t-mini);color:var(--tinta-3)"><?= e(fechaCorta($pg['comprobante_subido_en'])) ?></div>
          <?php else: ?>—<?php endif; ?>
        </td>
        <td><span class="gaje <?= $pg['estado'] === 'pagado' ? 'ok' : ($pg['estado'] === 'pendiente' ? 'alerta' : 'error') ?>"><?= e($pg['estado']) ?></span></td>
        <td>
          <?php if ($pg['estado'] === 'pendiente' && !empty($pg['comprobante'])): ?>
            <form method="post" action="<?= e(u('/accion/pago-aprobar')) ?>" data-confirmar="Se marcará como pagado y se inscribirá al alumno con sus datos de acceso.">
              <input type="hidden" name="csrf" value="<?= e(csrfToken()) ?>">
              <input type="hidden" name="pago_id" value="<?= (int) $pg['id'] ?>">
              <button class="boton mini primario">Aprobar e inscribir</button>
            </form>
          <?php endif; ?>
        </td>
      </tr>
      <?php endforeach; ?>
    </tbody>
  </table>
</div>
