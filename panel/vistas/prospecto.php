<?php
$titulo = $prospecto['nombre'] ?? $prospecto['telefono_whatsapp'];
$volver = '/prospectos/' . (int) $prospecto['id'];
$u = usuarioActual();
?>
<div class="cabecera">
  <div>
    <h1><?= e($prospecto['nombre'] ?? 'Sin nombre') ?></h1>
    <div class="sub">
      <span style="font-family:var(--mono)"><?= e($prospecto['telefono_whatsapp']) ?></span>
      · <?= e(etiquetaEtapa($prospecto['etapa'])) ?>
      · Fuente: <?= e($prospecto['fuente']) ?>
    </div>
  </div>
  <a class="boton fantasma" href="<?= e(u('/')) ?>">← Pipeline</a>
</div>

<div class="rejilla-detalle">
  <div class="tarjeta">
    <div class="seccion">
      <h3>Conversación de WhatsApp</h3>
      <?php if ($conversacion === null): ?>
        <div class="vacio">Aún no hay conversación con este prospecto</div>
      <?php else: ?>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <span class="gaje <?= $conversacion['estado'] === 'bot' ? 'grad' : ($conversacion['estado'] === 'asesor' ? 'alerta' : 'neutro') ?>">
            <?= $conversacion['estado'] === 'bot' ? '● Atiende el bot' : ($conversacion['estado'] === 'asesor' ? '● Atiende un asesor' : 'Cerrada') ?>
          </span>
          <form method="post" action="<?= e(u('/accion/conversacion')) ?>" class="form-inline">
            <input type="hidden" name="csrf" value="<?= e(csrfToken()) ?>">
            <input type="hidden" name="conversacion_id" value="<?= (int) $conversacion['id'] ?>">
            <input type="hidden" name="volver" value="<?= e($volver) ?>">
            <?php if ($conversacion['estado'] === 'bot'): ?>
              <input type="hidden" name="estado" value="asesor">
              <button class="boton mini">Tomar conversación</button>
            <?php else: ?>
              <input type="hidden" name="estado" value="bot">
              <button class="boton mini fantasma">Devolver al bot</button>
            <?php endif; ?>
          </form>
        </div>
        <div class="chat" id="chat">
          <?php foreach ($mensajes as $m): ?>
            <div class="burbuja <?= $m['direccion'] === 'entrante' ? 'entrante' : ($m['emisor'] === 'asesor' ? 'asesor' : 'bot') ?>">
              <span class="quien"><?= e(ucfirst($m['emisor'])) ?></span><?= e($m['contenido']) ?>
              <span class="cuando"><?= e(fechaCorta($m['creado_en'])) ?></span>
            </div>
          <?php endforeach; ?>
        </div>
        <form method="post" action="<?= e(u('/accion/mensaje-asesor')) ?>" style="display:flex;gap:8px;margin-top:12px">
          <input type="hidden" name="csrf" value="<?= e(csrfToken()) ?>">
          <input type="hidden" name="conversacion_id" value="<?= (int) $conversacion['id'] ?>">
          <input type="hidden" name="volver" value="<?= e($volver) ?>">
          <input type="text" name="contenido" placeholder="Registrar nota / mensaje de asesor…" style="flex:1">
          <button class="boton">Registrar</button>
        </form>
        <script>document.getElementById('chat').scrollTop = 1e9;</script>
      <?php endif; ?>
    </div>
  </div>

  <div>
    <div class="tarjeta">
      <div class="seccion">
        <h3>Ficha</h3>
        <dl>
          <div class="dato"><dt>Etapa</dt><dd><?= e(etiquetaEtapa($prospecto['etapa'])) ?></dd></div>
          <div class="dato"><dt>Puntaje</dt><dd><?= $prospecto['puntaje_calificacion'] !== null ? (int) $prospecto['puntaje_calificacion'] . ' / 100' : '—' ?></dd></div>
          <div class="dato"><dt>Asesor</dt><dd><?= e($prospecto['asesor_nombre'] ?? 'Sin asignar') ?></dd></div>
          <div class="dato"><dt>Curso de interés</dt><dd><?= e($prospecto['curso_nombre'] ?? '—') ?></dd></div>
          <div class="dato"><dt>Alta</dt><dd><?= e(fechaCorta($prospecto['creado_en'])) ?></dd></div>
        </dl>
        <?php if ($prospecto['datos_calificacion']): ?>
          <h3 style="margin-top:14px">Calificación</h3>
          <?php foreach (json_decode($prospecto['datos_calificacion'], true) ?: [] as $k => $v): ?>
            <div class="dato"><dt><?= e(ucfirst(str_replace('_', ' ', $k))) ?></dt><dd><?= e(is_scalar($v) ? (string) $v : json_encode($v)) ?></dd></div>
          <?php endforeach; ?>
        <?php endif; ?>
      </div>

      <div class="seccion">
        <h3>Acciones</h3>
        <div class="acciones-rapidas">
          <form method="post" action="<?= e(u('/accion/etapa')) ?>" class="form-inline">
            <input type="hidden" name="csrf" value="<?= e(csrfToken()) ?>">
            <input type="hidden" name="prospecto_id" value="<?= (int) $prospecto['id'] ?>">
            <input type="hidden" name="volver" value="<?= e($volver) ?>">
            <select name="etapa">
              <?php foreach (['prospecto', 'calificado', 'cita_agendada', 'pago_pendiente', 'inscrito', 'descartado'] as $et): ?>
                <option value="<?= $et ?>" <?= $prospecto['etapa'] === $et ? 'selected' : '' ?>><?= e(etiquetaEtapa($et)) ?></option>
              <?php endforeach; ?>
            </select>
            <button class="boton mini">Mover</button>
          </form>
          <form method="post" action="<?= e(u($prospecto['asesor_id'] ? '/accion/reasignar' : '/accion/asignar')) ?>" class="form-inline">
            <input type="hidden" name="csrf" value="<?= e(csrfToken()) ?>">
            <input type="hidden" name="prospecto_id" value="<?= (int) $prospecto['id'] ?>">
            <input type="hidden" name="volver" value="<?= e($volver) ?>">
            <select name="asesor_id">
              <?php if (!$prospecto['asesor_id']): ?><option value="">Auto (menor carga)</option><?php endif; ?>
              <?php foreach ($asesores as $a): ?>
                <option value="<?= (int) $a['id'] ?>" <?= $prospecto['asesor_id'] == $a['id'] ? 'selected' : '' ?>><?= e($a['nombre']) ?></option>
              <?php endforeach; ?>
            </select>
            <button class="boton mini fantasma"><?= $prospecto['asesor_id'] ? 'Reasignar' : 'Asignar' ?></button>
          </form>
          <form method="post" action="<?= e(u('/accion/generar-link')) ?>">
            <input type="hidden" name="csrf" value="<?= e(csrfToken()) ?>">
            <input type="hidden" name="prospecto_id" value="<?= (int) $prospecto['id'] ?>">
            <input type="hidden" name="volver" value="<?= e($volver) ?>">
            <button class="boton mini primario">Generar link de pago</button>
          </form>
        </div>
      </div>

      <?php if ($citas !== []): ?>
      <div class="seccion">
        <h3>Citas</h3>
        <?php foreach ($citas as $c): ?>
          <div class="dato">
            <dt><?= e(fechaCorta($c['inicio'])) ?> · <?= e($c['asesor_nombre']) ?></dt>
            <dd><span class="gaje <?= $c['estado'] === 'completada' ? 'ok' : ($c['estado'] === 'cancelada' || $c['estado'] === 'no_asistio' ? 'error' : 'neutro') ?>"><?= e($c['estado']) ?></span></dd>
          </div>
        <?php endforeach; ?>
      </div>
      <?php endif; ?>

      <?php if ($pagos !== []): ?>
      <div class="seccion">
        <h3>Pagos</h3>
        <?php foreach ($pagos as $pg): ?>
          <div class="dato">
            <dt><?= e(dinero((int) $pg['monto_centavos'], $pg['moneda'])) ?></dt>
            <dd><span class="gaje <?= $pg['estado'] === 'pagado' ? 'ok' : ($pg['estado'] === 'pendiente' ? 'alerta' : 'error') ?>"><?= e($pg['estado']) ?></span></dd>
          </div>
          <?php if ($pg['link_pago'] && $pg['estado'] === 'pendiente'): ?>
            <div style="font:var(--t-mini);font-family:var(--mono);color:var(--tinta-2);word-break:break-all;margin-bottom:6px"><?= e($pg['link_pago']) ?></div>
          <?php endif; ?>
        <?php endforeach; ?>
      </div>
      <?php endif; ?>

      <div class="seccion">
        <h3>Historial del pipeline</h3>
        <div class="linea-tiempo">
          <?php foreach ($bitacora as $b): ?>
            <div class="evento">
              <b><?= e($b['etapa_anterior'] ? etiquetaEtapa($b['etapa_anterior']) . ' → ' : '') ?><?= e(etiquetaEtapa($b['etapa_nueva'])) ?></b>
              <small><?= e(fechaCorta($b['creado_en'])) ?> · <?= e($b['origen']) ?><?= $b['usuario_nombre'] ? ' · ' . e($b['usuario_nombre']) : '' ?><?= $b['nota'] ? ' — ' . e($b['nota']) : '' ?></small>
            </div>
          <?php endforeach; ?>
        </div>
      </div>
    </div>
  </div>
</div>
