<?php

declare(strict_types=1);

// El sitio corre junto al backend y reutiliza sus servicios directamente
// (la API key nunca llega al navegador).

if (PHP_SAPI === 'cli-server') {
    $archivoEstatico = __DIR__ . (parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/');
    if ($archivoEstatico !== __DIR__ . '/' && is_file($archivoEstatico)
        && pathinfo($archivoEstatico, PATHINFO_EXTENSION) !== 'php') {
        return false;
    }
}

// dirname(__DIR__, 2) asume la disposición del repo local (sitio/public ->
// raíz, junto a backend/). Algunos hostings resuelven __DIR__ como una ruta
// real más plana (p. ej. si el contenido de sitio/public/ se despliega
// directo en public_html/), así que se detecta cada caso.
define('BACKEND_PATH', dirname(__DIR__, is_dir(dirname(__DIR__, 1) . '/backend') ? 1 : 2) . '/backend');

spl_autoload_register(function (string $clase): void {
    if (str_starts_with($clase, 'App\\')) {
        $ruta = BACKEND_PATH . '/src/' . str_replace('\\', '/', substr($clase, 4)) . '.php';
        if (is_file($ruta)) {
            require $ruta;
        }
    }
});

App\Core\Env::cargar(BACKEND_PATH . '/.env');
date_default_timezone_set(App\Core\Env::get('APP_TZ', 'America/Mexico_City'));

header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: strict-origin-when-cross-origin');

session_name('inmath_sitio');
session_start();

function e(?string $t): string
{
    return htmlspecialchars($t ?? '', ENT_QUOTES, 'UTF-8');
}

function csrfSitio(): string
{
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(24));
    }
    return $_SESSION['csrf'];
}

function csrfValido(): bool
{
    return hash_equals($_SESSION['csrf'] ?? '', $_POST['csrf'] ?? '');
}

function cursoActivo(): ?array
{
    return App\Core\Database::uno('SELECT * FROM cursos WHERE activo = 1 ORDER BY id LIMIT 1');
}

/**
 * URL del panel CRM (PANEL_URL en backend/.env) para el enlace "Entrar" del
 * sitio. Devuelve null si no está configurada — el enlace no se pinta.
 */
function panelUrl(): ?string
{
    $url = rtrim(trim(App\Core\Env::get('PANEL_URL', '')), '/');
    return $url !== '' ? $url : null;
}

/**
 * Enlace directo wa.me al WhatsApp del negocio (WHATSAPP_NUMERO en backend/.env,
 * formato internacional sin +). Devuelve null si no está configurado — el
 * llamador decide no pintar el botón.
 */
function whatsappUrl(string $texto = ''): ?string
{
    $numero = preg_replace('/\D+/', '', App\Core\Env::get('WHATSAPP_NUMERO', ''));
    if ($numero === '') {
        return null;
    }
    return 'https://wa.me/' . $numero . ($texto !== '' ? '?text=' . rawurlencode($texto) : '');
}

/** Iconos de línea (stroke=currentColor). Reemplazan a los antiguos puntos. */
function icono(string $n, string $cls = ''): string
{
    $p = [
        'arrow'    => '<path d="M5 12h14M13 6l6 6-6 6"/>',
        'plus'     => '<path d="M12 5v14M5 12h14"/>',
        'check'    => '<path d="M20 6L9 17l-5-5"/>',
        'spark'    => '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/>',
        'route'    => '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h6a4 4 0 0 0 4-4V7"/>',
        'book'     => '<path d="M12 7v14M4 5h5a3 3 0 0 1 3 3 3 3 0 0 1 3-3h5v13h-5a3 3 0 0 0-3 3 3 3 0 0 0-3-3H4z"/>',
        'list'     => '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
        'play'     => '<polygon points="6 4 20 12 6 20 6 4" fill="currentColor" stroke="none"/>',
        'chat'     => '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
        'trend'    => '<path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/>',
        'video'    => '<rect x="2" y="6" width="14" height="12" rx="2"/><path d="M22 8l-6 4 6 4z"/>',
        'calendar' => '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
        'card'     => '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
        'clock'    => '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
        'user'     => '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
        'cap'      => '<path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1 3 3 6 3s6-2 6-3v-5"/>',
        'columns'  => '<rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="10" rx="1"/><rect x="17" y="4" width="4" height="13" rx="1"/>',
        'msg'      => '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
        'settings' => '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 6 19.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
        'logout'   => '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    ];
    $inner = $p[$n] ?? '';
    return '<svg class="' . e($cls) . '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
        . 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' . $inner . '</svg>';
}

function mallaSitio(): string
{
    return '<div class="mesh" aria-hidden="true">'
        . '<span class="blob b1 par"></span><span class="blob b2 par"></span>'
        . '<span class="blob b3"></span><span class="blob b4 par"></span><span class="blob b5"></span></div>';
}

/**
 * Pantalla de carga global: se muestra por defecto (recarga/primera visita) y
 * se reactiva por JS al navegar a otra página o enviar un formulario/botón.
 * Libro que se dibuja una sola vez + barra de progreso en barrido continuo —
 * sin pulso, sin giro 3D.
 */
function overlayCarga(): string
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
          <stop offset="0" stop-color="#6B9FFF"/><stop offset="1" stop-color="#AFCFFF"/>
        </linearGradient>
      </defs>
      <path pathLength="1" class="carga-pagina carga-pagina-a" d="M24 15 C 17 10.5 10 10 6 13.5 V 33 C 10 29.5 17 30 24 34.5" fill="none" stroke="url(#carga-trazo)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
      <path pathLength="1" class="carga-pagina carga-pagina-b" d="M24 15 C 31 10.5 38 10 42 13.5 V 33 C 38 29.5 31 30 24 34.5" fill="none" stroke="url(#carga-trazo)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
      <line class="carga-lomo" x1="24" y1="15" x2="24" y2="34.5" stroke="url(#carga-trazo)" stroke-width="1.6" stroke-linecap="round"/>
    </svg>
    <div class="carga-marca">Cursos <span>Inmath</span></div>
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

  // Cambiar de página: clic en cualquier <a> que navegue a otra ruta interna.
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    var href = a.getAttribute('href') || '';
    if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return;
    var destino;
    try { destino = new URL(a.href, location.href); } catch (err) { return; }
    if (destino.origin !== location.origin) return;
    if (destino.pathname === location.pathname) return; // ancla en la misma página: no recarga
    mostrar();
  });

  // Enviar un formulario (inscripción, agenda, contacto): la navegación resultante
  // también dispara la pantalla de carga.
  document.addEventListener('submit', function (e) {
    if (!e.target || e.target.tagName !== 'FORM') return;
    // Esperar a que corran los demás handlers: si alguno canceló el envío
    // (p. ej. el diálogo de confirmación), NO mostrar la pantalla de carga.
    setTimeout(function () { if (!e.defaultPrevented) mostrar(); }, 0);
  });

  // Restaurar desde bfcache (botón atrás): asegura que no quede visible.
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) overlay.classList.add('oculta');
  });
})();
</script>
HTML;
}

/**
 * Agente de IA (Gemini): burbuja flotante con el libro-logo cuyos ojos
 * parpadean en estilo 8-bit (sin tics ni movimiento del libro en sí) que
 * abre un panel de chat de vidrio, coherente con el resto del sitio.
 */
function agenteIA(): string
{
    $csrf = e(csrfSitio());
    return <<<HTML
<div class="agente-ia" id="agenteIA" data-endpoint="/api/agente.php" data-csrf="{$csrf}">
  <button type="button" class="agente-btn" id="agenteBtn" aria-expanded="false" aria-controls="agentePanel" aria-label="Abrir a Mathy, el asistente de Cursos Inmath">
    <svg class="agente-libro" viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id="agicono-trazo" x1="6" y1="34" x2="42" y2="13" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#6B9FFF"/><stop offset="1" stop-color="#AFCFFF"/>
        </linearGradient>
      </defs>
      <path d="M24 15 C 17 10.5 10 10 6 13.5 V 33 C 10 29.5 17 30 24 34.5" fill="none" stroke="url(#agicono-trazo)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M24 15 C 31 10.5 38 10 42 13.5 V 33 C 38 29.5 31 30 24 34.5" fill="none" stroke="url(#agicono-trazo)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="24" y1="15" x2="24" y2="34.5" stroke="url(#agicono-trazo)" stroke-width="1.6" stroke-linecap="round" opacity=".5"/>
      <rect class="agente-ojo i" x="18.6" y="18.4" width="3.8" height="3.8"/>
      <rect class="agente-ojo d" x="25.6" y="18.4" width="3.8" height="3.8"/>
    </svg>
  </button>
  <div class="agente-panel abriendo" id="agentePanel" role="dialog" aria-modal="false" aria-label="Mathy, el asistente de Cursos Inmath" hidden>
    <div class="ap-cab">
      <div class="ap-quien">
        <svg class="agente-libro ap-avatar" viewBox="0 0 48 48" aria-hidden="true">
          <defs>
            <linearGradient id="agicono-trazo-cab" x1="6" y1="34" x2="42" y2="13" gradientUnits="userSpaceOnUse">
              <stop offset="0" stop-color="#6B9FFF"/><stop offset="1" stop-color="#AFCFFF"/>
            </linearGradient>
          </defs>
          <path d="M24 15 C 17 10.5 10 10 6 13.5 V 33 C 10 29.5 17 30 24 34.5" fill="none" stroke="url(#agicono-trazo-cab)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M24 15 C 31 10.5 38 10 42 13.5 V 33 C 38 29.5 31 30 24 34.5" fill="none" stroke="url(#agicono-trazo-cab)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
          <line x1="24" y1="15" x2="24" y2="34.5" stroke="url(#agicono-trazo-cab)" stroke-width="1.6" stroke-linecap="round" opacity=".5"/>
          <rect class="agente-ojo i" x="18.6" y="18.4" width="3.8" height="3.8"/>
          <rect class="agente-ojo d" x="25.6" y="18.4" width="3.8" height="3.8"/>
        </svg>
        <div><b>Mathy</b><span>La IA de Cursos Inmath</span></div>
      </div>
      <button type="button" class="ap-cerrar" id="agenteCerrar" aria-label="Cerrar asistente">✕</button>
    </div>
    <div class="ap-mensajes" id="agenteMensajes">
      <div class="ap-msg bot">¡Hola! Soy Mathy, la IA de Cursos Inmath. ¿Qué te gustaría saber sobre el curso, el precio o cómo inscribirte?</div>
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

function cabeceraSitio(string $titulo, string $activo = ''): void
{
    ?><!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= e($titulo) ?></title>
  <meta name="description" content="Cursos Inmath: cursos en línea con asesoría 1 a 1 por WhatsApp y reporte de tu avance cada semana. Aprende a tu ritmo.">
  <link rel="icon" type="image/svg+xml" href="/img/inmath.svg?v=<?= e((string) (@filemtime(__DIR__ . '/img/inmath.svg') ?: 1)) ?>">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Figtree:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/inmath.css?v=<?= e((string) (@filemtime(__DIR__ . '/css/inmath.css') ?: 1)) ?>">
</head>
<body>
<?= overlayCarga() ?>
<header class="barra">
  <a class="logo" href="/"><img src="/img/inmath.svg" alt=""><b>Cursos <span>Inmath</span></b></a>
  <button type="button" class="nav-toggle" id="navToggle" aria-expanded="false" aria-controls="navPrincipal" aria-label="Abrir menú">
    <?= icono('list') ?>
  </button>
  <nav id="navPrincipal">
    <a href="/#como" class="n-como <?= $activo === 'como' ? 'activo' : '' ?>"><?= icono('route') ?> Cómo funciona</a>
    <a href="/#incluye" class="n-incl"><?= icono('list') ?> Qué incluye</a>
    <a href="/agenda" class="n-ases <?= $activo === 'agenda' ? 'activo' : '' ?>"><?= icono('calendar') ?> Asesoría gratis</a>
    <?php if (($panel = panelUrl()) !== null): ?>
      <a href="<?= e($panel) ?>" class="n-login"><?= icono('user') ?> Entrar</a>
    <?php endif; ?>
    <a href="/pago" class="cta <?= $activo === 'pago' ? 'activo' : '' ?>">Inscribirme</a>
  </nav>
</header>
<script>
  (function () {
    var btn = document.getElementById('navToggle'), nav = document.getElementById('navPrincipal');
    if (!btn || !nav) return;
    btn.addEventListener('click', function () {
      var abierto = nav.classList.toggle('abierto');
      btn.setAttribute('aria-expanded', abierto ? 'true' : 'false');
    });
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { nav.classList.remove('abierto'); btn.setAttribute('aria-expanded', 'false'); });
    });
  })();
</script>
<?php
}

function pieSitio(): void
{
    $anio = date('Y');
    ?>
<footer class="pie">
  <div class="centrado">
    <div class="marca-pie">
      <img src="/img/inmath.svg" alt="">
      <p><b>Cursos Inmath</b><br>Cursos en línea con asesoría · <?= e($anio) ?></p>
    </div>
    <nav>
      <a href="/#como">Cómo funciona</a>
      <a href="/#incluye">Qué incluye</a>
      <a href="/agenda">Agendar asesoría</a>
      <a href="/pago">Inscribirme</a>
      <?php if (($panelPie = panelUrl()) !== null): ?>
        <a href="<?= e($panelPie) ?>">Acceso asesores</a>
      <?php endif; ?>
    </nav>
    <a class="lumia-badge" href="https://lumiaaisolutions.com/" target="_blank" rel="noopener">
      <img src="/img/lumia.svg" alt="" width="18" height="18">
      Desarrollado por <b>LUMIA</b>
    </a>
  </div>
</footer>
<?= agenteIA() ?>
<script>
/* Motor único (sin CSS animation-timeline) del crossfade + Ken Burns de .scrub:
   recalcula a mano la opacidad/transform de cada frame leyendo el scroll real.
   Antes esto solo corría como "fallback" cuando se detectaba que el navegador
   no soportaba animation-timeline:view() — la detección se intentó dos veces
   (CSS.supports(), luego getAnimations()) y las dos veces Safari mintió: el
   navegador registraba la animación pero no la corría ligada al scroll de
   verdad, dejando los frames congelados a medio cruce (efecto "encimado"/
   fantasma, visible incluso arriba de la página). Correr siempre este motor
   JS, sin intentar detectar soporte nativo, elimina esa clase de bug por
   completo — el resultado es idéntico en todos los navegadores. */
(function () {
  if (window.matchMedia && !matchMedia('(prefers-reduced-motion: no-preference)').matches) return;
  var cajas = Array.prototype.slice.call(document.querySelectorAll('.scrub'));
  if (!cajas.length) return;

  // El progreso se ancla a la distancia de scroll recorrida desde la carga,
  // no a la posición cruda del elemento en el viewport. Con la posición cruda
  // (vh - top)/(vh + height), un elemento ya visible al cargar (el héroe, que
  // vive arriba del todo) arranca con progreso >0 sin que el usuario haya
  // scrolleado nada — eso mezclaba las dos fotos desde el primer render (el
  // bug "se ven encimadas" reportado, visible incluso sin tocar el scroll).
  // Aquí cada caja guarda un "ancla" en scrollY: 0 si ya está visible al
  // cargar (garantiza frame 1 limpio en scrollY=0), o el scrollY en el que
  // empezaría a entrar al viewport si está más abajo en la página.
  var medidas = [];
  function medir() {
    var scrollY = window.scrollY || window.pageYOffset, vh = window.innerHeight || document.documentElement.clientHeight;
    medidas = cajas.map(function (caja) {
      var r = caja.getBoundingClientRect();
      var absTop = r.top + scrollY;
      return { caja: caja, ancla: Math.max(0, absTop - vh), recorrido: Math.max(280, r.height) };
    });
  }
  function progreso(m) {
    var scrollY = window.scrollY || window.pageYOffset;
    return Math.min(1, Math.max(0, (scrollY - m.ancla) / m.recorrido));
  }
  function enRango(p, ini, fin) { return Math.min(1, Math.max(0, (p - ini) / (fin - ini))); }
  function mezcla(a, b, t) { return a + (b - a) * t; }
  function opacidadCruce(lp, entra) {
    if (lp <= 0.42) return entra ? 0 : 1;
    var t = (lp - 0.42) / (1 - 0.42);
    return entra ? t : 1 - t;
  }

  function pintar() {
    medidas.forEach(function (m) {
      var f1 = m.caja.querySelector('.scrub-frame.f1'), f2 = m.caja.querySelector('.scrub-frame.f2');
      if (!f1 || !f2) return;
      var p = progreso(m), lp = enRango(p, 0.15, 0.85);
      f1.style.setProperty('opacity', opacidadCruce(lp, false), 'important');
      f2.style.setProperty('opacity', opacidadCruce(lp, true), 'important');
      f1.style.setProperty('transform', 'scale(' + mezcla(1.1, 1, p) + ') translate(' + mezcla(0, -1.5, p) + '%, ' + mezcla(0, 1.5, p) + '%)', 'important');
      f2.style.setProperty('transform', 'scale(' + mezcla(1, 1.1, p) + ') translate(' + mezcla(1.5, 0, p) + '%, ' + mezcla(-1.5, 0, p) + '%)', 'important');
    });
    marcado = false;
  }
  var marcado = false;
  function pedir() { if (!marcado) { marcado = true; requestAnimationFrame(pintar); } }
  function remedir() { medir(); pedir(); }
  window.addEventListener('scroll', pedir, { passive: true });
  window.addEventListener('resize', remedir);
  medir();
  pintar();
})();
</script>
</body>
</html>
<?php
}
