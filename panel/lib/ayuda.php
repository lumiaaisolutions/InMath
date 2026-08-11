<?php

/** Escapa para HTML. */
function e(?string $texto): string
{
    return htmlspecialchars($texto ?? '', ENT_QUOTES, 'UTF-8');
}

function redirigir(string $ruta): never
{
    header('Location: ' . PANEL_BASE . $ruta);
    exit;
}

/**
 * Prefija una ruta interna del panel con PANEL_BASE (vacío en local, p. ej.
 * "/panel" en producción si el CRM se sirve como subcarpeta del sitio).
 * Úsalo en todo href/action/src que apunte dentro del panel.
 */
function u(string $ruta): string
{
    return PANEL_BASE . $ruta;
}

/** Ruta actual sin el prefijo PANEL_BASE (misma lógica que public/index.php). */
function rutaPanel(): string
{
    $ruta = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
    if (PANEL_BASE !== '' && str_starts_with($ruta, PANEL_BASE)) {
        $ruta = substr($ruta, strlen(PANEL_BASE)) ?: '/';
    }
    return $ruta;
}

function flash(?string $mensaje = null, string $tipo = 'ok'): ?array
{
    if ($mensaje !== null) {
        $_SESSION['flash'] = ['texto' => $mensaje, 'tipo' => $tipo];
        return null;
    }
    $f = $_SESSION['flash'] ?? null;
    unset($_SESSION['flash']);
    return $f;
}

function vista(string $nombre, array $datos): void
{
    extract($datos, EXTR_SKIP);
    if (empty($datos['sinLayout'])) {
        require PANEL_PATH . '/vistas/_layout-inicio.php';
        require PANEL_PATH . '/vistas/' . $nombre . '.php';
        require PANEL_PATH . '/vistas/_layout-fin.php';
    } else {
        require PANEL_PATH . '/vistas/' . $nombre . '.php';
    }
}

function csrfToken(): string
{
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(24));
    }
    return $_SESSION['csrf'];
}

function verificarCsrf(): void
{
    if (!hash_equals($_SESSION['csrf'] ?? '', $_POST['csrf'] ?? '')) {
        http_response_code(419);
        exit('Sesión expirada. Recarga la página.');
    }
}

function etiquetaEtapa(string $etapa): string
{
    return [
        'prospecto' => 'Prospecto',
        'calificado' => 'Calificado',
        'cita_agendada' => 'Cita agendada',
        'pago_pendiente' => 'Pago pendiente',
        'inscrito' => 'Inscrito',
        'descartado' => 'Descartado',
    ][$etapa] ?? $etapa;
}

function fechaCorta(?string $fecha): string
{
    if ($fecha === null) {
        return '—';
    }
    $ts = strtotime($fecha);
    return date('d/m H:i', $ts);
}

function dinero(int $centavos, string $moneda = 'MXN'): string
{
    return '$' . number_format($centavos / 100, 2) . ' ' . $moneda;
}

/**
 * Pantalla de carga del panel: visible por defecto, se reactiva al cambiar de
 * apartado (sidebar) o enviar un formulario/acción. Mismo lenguaje visual que
 * el sitio — libro que se dibuja una vez + barra en barrido continuo.
 */
function overlayCargaPanel(): string
{
    return <<<HTML
<div id="cargaOverlay" class="carga-overlay" aria-hidden="true">
  <div class="carga-mesh" aria-hidden="true">
    <span class="c-blob c-b1"></span><span class="c-blob c-b2"></span><span class="c-blob c-b3"></span>
  </div>
  <div class="carga-centro">
    <svg class="carga-libro" viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id="carga-trazo" x1="6" y1="34" x2="42" y2="13" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#668DC0"/><stop offset="1" stop-color="#9DB8E4"/>
        </linearGradient>
      </defs>
      <path pathLength="1" class="carga-pagina carga-pagina-a" d="M24 15 C 17 10.5 10 10 6 13.5 V 33 C 10 29.5 17 30 24 34.5" fill="none" stroke="url(#carga-trazo)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
      <path pathLength="1" class="carga-pagina carga-pagina-b" d="M24 15 C 31 10.5 38 10 42 13.5 V 33 C 38 29.5 31 30 24 34.5" fill="none" stroke="url(#carga-trazo)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
      <line class="carga-lomo" x1="24" y1="15" x2="24" y2="34.5" stroke="url(#carga-trazo)" stroke-width="1.6" stroke-linecap="round"/>
    </svg>
    <div class="carga-marca">Inmath <span>CRM</span></div>
    <div class="carga-barra"><i></i></div>
  </div>
</div>
<script>
(function () {
  var overlay = document.getElementById('cargaOverlay');
  if (!overlay) return;
  var MINIMO = 380;
  var inicio = Date.now();

  function ocultar() {
    var falta = MINIMO - (Date.now() - inicio);
    setTimeout(function () { overlay.classList.add('oculta'); }, Math.max(0, falta));
  }
  function mostrar() { overlay.classList.remove('oculta'); inicio = Date.now(); }

  if (document.readyState === 'complete') ocultar();
  else window.addEventListener('load', ocultar);

  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    var href = a.getAttribute('href') || '';
    if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return;
    var destino;
    try { destino = new URL(a.href, location.href); } catch (err) { return; }
    if (destino.origin !== location.origin) return;
    if (destino.pathname === location.pathname && destino.search === location.search) return;
    mostrar();
  });

  document.addEventListener('submit', function (e) {
    if (e.target && e.target.tagName === 'FORM') mostrar();
  });

  window.addEventListener('pageshow', function (e) {
    if (e.persisted) overlay.classList.add('oculta');
  });
})();
</script>
HTML;
}

/**
 * Agente de IA (Gemini) del panel: burbuja flotante con el libro-logo cuyos
 * ojos parpadean en estilo 8-bit (el libro no se mueve) que abre un chat de
 * vidrio para dudas de uso del CRM.
 */
function agenteIAPanel(): string
{
    $csrf = e(csrfToken());
    $endpoint = e(u('/accion/agente-ia'));
    return <<<HTML
<div class="agente-ia" id="agenteIA" data-endpoint="{$endpoint}" data-csrf="{$csrf}">
  <button type="button" class="agente-btn" id="agenteBtn" aria-expanded="false" aria-controls="agentePanel" aria-label="Abrir a Mathy, el asistente del panel">
    <svg class="agente-libro" viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id="agicono-trazo" x1="6" y1="34" x2="42" y2="13" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#668DC0"/><stop offset="1" stop-color="#9DB8E4"/>
        </linearGradient>
      </defs>
      <path d="M24 15 C 17 10.5 10 10 6 13.5 V 33 C 10 29.5 17 30 24 34.5" fill="none" stroke="url(#agicono-trazo)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M24 15 C 31 10.5 38 10 42 13.5 V 33 C 38 29.5 31 30 24 34.5" fill="none" stroke="url(#agicono-trazo)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="24" y1="15" x2="24" y2="34.5" stroke="url(#agicono-trazo)" stroke-width="1.6" stroke-linecap="round" opacity=".5"/>
      <rect class="agente-ojo i" x="18.6" y="18.4" width="3.8" height="3.8"/>
      <rect class="agente-ojo d" x="25.6" y="18.4" width="3.8" height="3.8"/>
    </svg>
  </button>
  <div class="agente-panel abriendo" id="agentePanel" role="dialog" aria-modal="false" aria-label="Mathy, el asistente del panel" hidden>
    <div class="ap-cab">
      <div class="ap-quien">
        <svg class="agente-libro ap-avatar" viewBox="0 0 48 48" aria-hidden="true">
          <defs>
            <linearGradient id="agicono-trazo-cab" x1="6" y1="34" x2="42" y2="13" gradientUnits="userSpaceOnUse">
              <stop offset="0" stop-color="#668DC0"/><stop offset="1" stop-color="#9DB8E4"/>
            </linearGradient>
          </defs>
          <path d="M24 15 C 17 10.5 10 10 6 13.5 V 33 C 10 29.5 17 30 24 34.5" fill="none" stroke="url(#agicono-trazo-cab)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M24 15 C 31 10.5 38 10 42 13.5 V 33 C 38 29.5 31 30 24 34.5" fill="none" stroke="url(#agicono-trazo-cab)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
          <line x1="24" y1="15" x2="24" y2="34.5" stroke="url(#agicono-trazo-cab)" stroke-width="1.6" stroke-linecap="round" opacity=".5"/>
          <rect class="agente-ojo i" x="18.6" y="18.4" width="3.8" height="3.8"/>
          <rect class="agente-ojo d" x="25.6" y="18.4" width="3.8" height="3.8"/>
        </svg>
        <div><b>Mathy</b><span>La IA del panel</span></div>
      </div>
      <button type="button" class="ap-cerrar" id="agenteCerrar" aria-label="Cerrar asistente">✕</button>
    </div>
    <div class="ap-mensajes" id="agenteMensajes">
      <div class="ap-msg bot">¡Hola! Soy Mathy. ¿En qué te ayudo: mover un prospecto de etapa, agendar una cita o revisar pagos?</div>
    </div>
    <div class="ap-entrada">
      <input type="text" id="agenteInput" placeholder="Escribe tu pregunta…" maxlength="500" autocomplete="off">
      <button type="button" id="agenteEnviar" aria-label="Enviar mensaje">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </button>
    </div>
  </div>
</div>
<script>
(function () {
  var raiz = document.getElementById('agenteIA');
  if (!raiz) return;
  var btn = document.getElementById('agenteBtn'), panel = document.getElementById('agentePanel');
  var cerrar = document.getElementById('agenteCerrar'), lista = document.getElementById('agenteMensajes');
  var input = document.getElementById('agenteInput'), enviar = document.getElementById('agenteEnviar');
  var historial = [], abierto = false;

  function alternar() {
    abierto = !abierto;
    btn.setAttribute('aria-expanded', abierto ? 'true' : 'false');
    if (abierto) {
      panel.hidden = false;
      requestAnimationFrame(function () { panel.classList.remove('abriendo'); input.focus(); });
    } else {
      panel.classList.add('abriendo');
      setTimeout(function () { panel.hidden = true; }, 200);
    }
  }
  btn.addEventListener('click', alternar);
  cerrar.addEventListener('click', alternar);

  function burbuja(texto, clase) {
    var b = document.createElement('div');
    b.className = 'ap-msg ' + clase;
    b.textContent = texto;
    lista.appendChild(b);
    lista.scrollTop = lista.scrollHeight;
    return b;
  }

  function enviarMensaje() {
    var texto = input.value.trim();
    if (!texto) return;
    burbuja(texto, 'usuario');
    input.value = '';
    input.disabled = true; enviar.disabled = true;
    var pensando = burbuja('Escribiendo…', 'bot cargando');

    var datos = new URLSearchParams();
    datos.set('csrf', raiz.dataset.csrf);
    datos.set('mensaje', texto);
    datos.set('historial', JSON.stringify(historial));

    fetch(raiz.dataset.endpoint, { method: 'POST', body: datos })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        pensando.remove();
        if (data.error) { burbuja(data.error, 'bot'); return; }
        burbuja(data.respuesta, 'bot');
        historial.push({ rol: 'usuario', texto: texto });
        historial.push({ rol: 'asistente', texto: data.respuesta });
        if (historial.length > 12) historial = historial.slice(-12);
      })
      .catch(function () {
        pensando.remove();
        burbuja('No pude conectarme. Intenta de nuevo en un momento.', 'bot');
      })
      .finally(function () { input.disabled = false; enviar.disabled = false; input.focus(); });
  }
  enviar.addEventListener('click', enviarMensaje);
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); enviarMensaje(); } });
})();
</script>
HTML;
}

/** Iconos de línea del panel (reemplazan a los puntos del nav). */
function icono(string $n, string $cls = 'ic'): string
{
    $p = [
        'pipeline' => '<rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="10" rx="1"/><rect x="17" y="4" width="4" height="13" rx="1"/>',
        'calendar' => '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
        'alumnos'  => '<path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1 3 3 6 3s6-2 6-3v-5"/>',
        'pagos'    => '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
        'prompts'  => '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
        'config'   => '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9 2 2 0 1 1-2.8 2.8 1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.9-1.2 2 2 0 1 1-2.8-2.8A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.5-1 2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9 2 2 0 1 1 2.8-2.8A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.5 2 2 0 1 1 4 0 1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3 2 2 0 1 1 2.8 2.8 1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1 2 2 0 1 1 0 4 1.7 1.7 0 0 0-1.5 1z"/>',
        'logout'   => '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
        'imagen'   => '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-4.5-4.5L6 21"/>',
        'user'     => '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
        'check'    => '<path d="M20 6L9 17l-5-5"/>',
        'alerta'   => '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5h.01"/>',
        'x'        => '<path d="M18 6 6 18M6 6l12 12"/>',
    ];
    return '<svg class="' . e($cls) . '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" '
        . 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' . ($p[$n] ?? '') . '</svg>';
}
