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
      <tr><th>Prospecto</th><th>Monto</th><th>Procesador</th><th>Link generado</th><th>Recordatorio</th><th>Estado</th></tr>
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
        <td><?= e(fechaCorta($pg['link_generado_en'])) ?></td>
        <td><?= e(fechaCorta($pg['recordatorio_enviado_en'])) ?></td>
        <td><span class="gaje <?= $pg['estado'] === 'pagado' ? 'ok' : ($pg['estado'] === 'pendiente' ? 'alerta' : 'error') ?>"><?= e($pg['estado']) ?></span></td>
      </tr>
      <?php endforeach; ?>
    </tbody>
  </table>
</div>
