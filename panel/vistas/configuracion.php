<?php $titulo = 'Configuración'; ?>
<div class="cabecera">
  <div>
    <h1>Configuración</h1>
    <div class="sub">Los cambios aplican de inmediato</div>
  </div>
</div>

<?php
// Solo se muestran los ajustes que le sirven al cliente, con nombre y
// explicación en lenguaje claro. Las claves técnicas (JSON internos, modelo
// de IA, procesador de pago, branding del PDF, textos del login) se
// administran desde sus propias pantallas o por soporte.
$ajustesAmigables = [
    'duracion_cita_minutos'      => ['Duración de la asesoría', 'Minutos que dura cada cita agendada.'],
    'horario_atencion'           => ['Horario de atención', 'Días y horas en que se ofrecen citas para asesorías.'],
    'max_slots_ofrecidos'        => ['Horarios que ofrece el bot', 'Cuántas opciones de horario propone el asistente en cada mensaje.'],
    'recordatorio_cita_horas'    => ['Recordatorio de cita', 'Horas antes de la cita para enviar el recordatorio por WhatsApp.'],
    'recuperacion_carrito_horas' => ['Recordatorio de pago', 'Horas de espera tras generar el link de pago antes de recordar al alumno.'],
];
$visibles = array_values(array_filter($configuraciones, fn ($c) => isset($ajustesAmigables[$c['clave']])));
?>
<div class="tarjeta">
  <table class="lista">
    <thead><tr><th style="width:260px">Ajuste</th><th>Valor</th><th style="width:90px"></th></tr></thead>
    <tbody>
      <?php foreach ($visibles as $c): [$nombreAj, $descAj] = $ajustesAmigables[$c['clave']]; ?>
      <tr>
        <td>
          <div style="font-weight:600"><?= e($nombreAj) ?></div>
          <div style="font:var(--t-mini);color:var(--tinta-3);margin-top:3px"><?= e($descAj) ?></div>
        </td>
        <td colspan="2">
          <form method="post" action="<?= e(u('/accion/config')) ?>" style="display:flex;gap:8px;align-items:flex-start">
            <input type="hidden" name="csrf" value="<?= e(csrfToken()) ?>">
            <input type="hidden" name="clave" value="<?= e($c['clave']) ?>">
            <input type="hidden" name="volver" value="/configuracion">
            <?php if ($c['clave'] === 'horario_atencion'):
                $h = json_decode($c['valor'], true) ?: [];
                $diasSel = $h['dias'] ?? [1, 2, 3, 4, 5];
                $nombresDia = [1 => 'Lun', 2 => 'Mar', 3 => 'Mié', 4 => 'Jue', 5 => 'Vie', 6 => 'Sáb', 7 => 'Dom'];
            ?>
              <input type="hidden" name="valor">
              <div class="horario-ui" style="flex:1;display:grid;gap:10px">
                <div style="display:flex;gap:6px;flex-wrap:wrap">
                  <?php foreach ($nombresDia as $n => $nombre): ?>
                    <label style="display:inline-flex;align-items:center;gap:5px;font:500 .8rem var(--cuerpo);background:rgba(255,255,255,.6);border:1px solid var(--linea-2);border-radius:999px;padding:6px 11px;cursor:pointer">
                      <input type="checkbox" class="hu-dia" value="<?= $n ?>" <?= in_array($n, $diasSel, true) ? 'checked' : '' ?>>
                      <?= $nombre ?>
                    </label>
                  <?php endforeach; ?>
                </div>
                <div style="display:flex;gap:8px;align-items:center;font:500 .82rem var(--cuerpo);color:var(--tinta-2)">
                  De <input type="time" class="hu-inicio" value="<?= e($h['inicio'] ?? '09:00') ?>" style="width:auto">
                  a <input type="time" class="hu-fin" value="<?= e($h['fin'] ?? '19:00') ?>" style="width:auto">
                </div>
              </div>
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
<script>
document.querySelectorAll('form').forEach(function (form) {
  var ui = form.querySelector('.horario-ui');
  if (!ui) return;
  form.addEventListener('submit', function () {
    var dias = Array.prototype.map.call(ui.querySelectorAll('.hu-dia:checked'), function (c) { return parseInt(c.value, 10); });
    form.querySelector('input[name="valor"]').value = JSON.stringify({
      dias: dias, inicio: ui.querySelector('.hu-inicio').value, fin: ui.querySelector('.hu-fin').value
    });
  });
});
</script>
