<?php
$titulo = 'Pipeline';
$colores = [
    'prospecto' => 'var(--etapa-1)',
    'calificado' => 'var(--etapa-2)',
    'cita_agendada' => 'var(--etapa-3)',
    'pago_pendiente' => 'var(--etapa-4)',
    'inscrito' => 'var(--etapa-5)',
];
$totalPipeline = array_sum(array_map('count', $columnas));
$inscritosN = count($columnas['inscrito'] ?? []);
$sinAsesorN = 0;
foreach ($columnas as $tarjetas) {
    foreach ($tarjetas as $p) {
        if (empty($p['asesor_nombre'])) {
            $sinAsesorN++;
        }
    }
}
?>
<div class="cabecera cabecera-hero">
  <div>
    <h1>Pipeline de ventas</h1>
    <div class="sub">Del primer contacto en WhatsApp a la inscripción — arrastra las tarjetas para cambiarlas de etapa</div>
    <div class="ch-stats">
      <span class="ch-stat"><b><?= $totalPipeline ?></b> en el pipeline</span>
      <span class="ch-stat ok"><b><?= $inscritosN ?></b> inscritos</span>
      <?php if ($sinAsesorN > 0): ?><span class="ch-stat alerta"><b><?= $sinAsesorN ?></b> sin asesor</span><?php endif; ?>
    </div>
  </div>
  <form method="get" action="<?= e(u('/')) ?>" class="form-inline">
    <select name="asesor_id" onchange="this.form.submit()">
      <option value="">Todos los asesores</option>
      <?php foreach ($asesores as $a): ?>
        <option value="<?= (int) $a['id'] ?>" <?= $filtroAsesor == $a['id'] ? 'selected' : '' ?>><?= e($a['nombre']) ?></option>
      <?php endforeach; ?>
    </select>
  </form>
</div>

<div class="pipeline" id="pipeline" data-endpoint="<?= e(u('/accion/etapa')) ?>" data-csrf="<?= e(csrfToken()) ?>">
  <?php foreach ($columnas as $etapa => $tarjetas): ?>
  <section class="columna" style="--col: <?= $colores[$etapa] ?>" data-etapa="<?= e($etapa) ?>">
    <header class="columna-cab">
      <span class="nodo"></span>
      <h2><?= e(etiquetaEtapa($etapa)) ?></h2>
      <span class="cuenta"><?= count($tarjetas) ?></span>
    </header>
    <div class="pila">
      <div class="vacio" <?= $tarjetas !== [] ? 'hidden' : '' ?>>Suelta un prospecto aquí</div>
      <?php foreach ($tarjetas as $p): ?>
      <a class="tarjeta-prospecto" draggable="true" href="<?= e(u('/prospectos/' . (int) $p['id'])) ?>"
         data-id="<?= (int) $p['id'] ?>">
        <span class="tp-avatar"><?= e(mb_strtoupper(mb_substr($p['nombre'] ?? '?', 0, 1))) ?></span>
        <span class="tp-cuerpo">
          <b><?= e($p['nombre'] ?? 'Sin nombre') ?></b>
          <span class="tel"><?= e($p['telefono_whatsapp']) ?></span>
          <span class="meta">
            <?php if ($p['puntaje_calificacion'] !== null): ?>
              <span class="gaje grad">◆ <?= (int) $p['puntaje_calificacion'] ?></span>
            <?php endif; ?>
            <?php if ($p['asesor_nombre']): ?>
              <span class="gaje neutro"><?= e($p['asesor_nombre']) ?></span>
            <?php else: ?>
              <span class="gaje alerta">Sin asesor</span>
            <?php endif; ?>
            <?php if ($p['ultimo_mensaje_en']): ?>
              <span class="gaje neutro" title="Último mensaje"><?= e(fechaCorta($p['ultimo_mensaje_en'])) ?></span>
            <?php endif; ?>
          </span>
        </span>
      </a>
      <?php endforeach; ?>
    </div>
  </section>
  <?php endforeach; ?>
</div>

<script>
// Arrastrar y soltar entre etapas: mueve la tarjeta al soltar (optimista) y
// persiste con POST a /accion/etapa; si el servidor falla, la regresa.
(function () {
  var tablero = document.getElementById('pipeline');
  if (!tablero) return;
  var endpoint = tablero.dataset.endpoint, csrf = tablero.dataset.csrf;
  var arrastrada = null, origen = null;

  function actualizarColumna(col) {
    var n = col.querySelectorAll('.tarjeta-prospecto').length;
    col.closest('.columna').querySelector('.cuenta').textContent = n;
    var vacio = col.querySelector('.vacio');
    if (vacio) vacio.hidden = n > 0;
  }

  tablero.addEventListener('dragstart', function (e) {
    var t = e.target.closest('.tarjeta-prospecto');
    if (!t) return;
    arrastrada = t; origen = t.closest('.pila');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', t.dataset.id);
    requestAnimationFrame(function () { t.classList.add('arrastrando'); });
  });
  tablero.addEventListener('dragend', function () {
    if (arrastrada) arrastrada.classList.remove('arrastrando');
    tablero.querySelectorAll('.pila.recibiendo').forEach(function (p) { p.classList.remove('recibiendo'); });
    arrastrada = null; origen = null;
  });
  tablero.addEventListener('dragover', function (e) {
    var pila = e.target.closest('.pila');
    if (!pila || !arrastrada) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!pila.classList.contains('recibiendo')) {
      tablero.querySelectorAll('.pila.recibiendo').forEach(function (p) { p.classList.remove('recibiendo'); });
      pila.classList.add('recibiendo');
    }
  });
  tablero.addEventListener('drop', function (e) {
    var pila = e.target.closest('.pila');
    if (!pila || !arrastrada) return;
    e.preventDefault();
    pila.classList.remove('recibiendo');
    var etapaNueva = pila.closest('.columna').dataset.etapa;
    var etapaVieja = origen.closest('.columna').dataset.etapa;
    if (etapaNueva === etapaVieja) return;

    var tarjeta = arrastrada, pilaOrigen = origen;
    pila.appendChild(tarjeta);
    tarjeta.classList.add('recien-movida');
    setTimeout(function () { tarjeta.classList.remove('recien-movida'); }, 450);
    actualizarColumna(pila); actualizarColumna(pilaOrigen);

    var datos = new FormData();
    datos.append('csrf', csrf);
    datos.append('prospecto_id', tarjeta.dataset.id);
    datos.append('etapa', etapaNueva);
    datos.append('volver', '/');
    fetch(endpoint, { method: 'POST', body: datos, credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error(); })
      .catch(function () {
        pilaOrigen.appendChild(tarjeta);
        actualizarColumna(pila); actualizarColumna(pilaOrigen);
        alertaPipeline('No se pudo mover el prospecto. Revisa tu conexión.');
      });
  });
  // Evitar que un drag accidental dispare la navegación del enlace
  tablero.addEventListener('click', function (e) {
    if (arrastrada) e.preventDefault();
  });

  function alertaPipeline(texto) {
    var t = document.createElement('div');
    t.className = 'toast error'; t.setAttribute('role', 'status');
    t.innerHTML = '<span class="toast-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5h.01"/></svg></span>'
      + '<span class="toast-cuerpo"><b>Atención</b><p></p></span>';
    t.querySelector('p').textContent = texto;
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add('saliendo'); setTimeout(function () { t.remove(); }, 350); }, 4200);
  }
})();
</script>
