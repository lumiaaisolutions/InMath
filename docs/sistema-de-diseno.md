# Sistema de diseño

Identidad visual de **Cursos Inmath**, aplicada al sitio (`sitio/public/css/inmath.css`)
y al panel (`panel/public/css/inmath.css`). Referencia de calidez/estructura:
lattice.com. Tokens **bloqueados**: ningún color o tipografía fuera del bloque `:root`.

## Regla de color 60-30-10

- **60% Blanco** — fondo dominante (`--blanco` / `--lienzo`).
- **30% Pasteles** — washes y malla difuminada (azul, teal, menta, durazno, rosa, cielo).
- **10% Azul** `#3B6FF5` — el acento: botones, links, iconos, detalles.
- **Apoyo:** pino teal `#0E9E7E`, sol/ámbar `#F4A62A`, teal-cian `#1E9EB8`.

> En el CSS del panel, la variable `--pino` conserva su nombre por compatibilidad
> pero **su valor es el azul** `#3B6FF5` (así se evitó renombrar en cascada).

> **Sin morado en el sistema.** La variable `--lila`/`--p-lila` conserva su nombre
> por compatibilidad con ~19 sitios de uso en el CSS, pero su valor ya no es morado:
> es un teal-cian (`#1E9EB8` / pastel `#D6F1F3`) elegido para combinar con azul y
> pino. Esto se aplicó a nivel de token una sola vez — no se tocó cada sitio de uso
> individualmente. Un barrido posterior encontró y corrigió morado que **no** vivía
> en el token (hex/rgb hardcodeados fuera de `:root`): gradientes SVG inline del
> ícono del libro de carga y del agente Mathy (`_comun.php`, `panel/lib/ayuda.php`),
> el subrayado "swoosh" del héroe, la malla de blobs de fondo (`body::before` en
> ambos CSS), el blob de la pantalla de carga del panel, y el color de acento por
> default del branding de reportes PDF (`GeneradorReporte.php` + seed
> `004_reportes_fase6.sql`). **Lección:** al pedir "quita el morado", no basta con
> buscar `var(--lila)` — hay que además grepear hex/rgb literales
> (`#8B6FF0` / `rgba(139,111,240,...)`) por si algún sitio no pasó por el token.
>
> **Segunda ronda:** grepear hex conocidos no basta — aparecieron dos morados
> distintos que ningún grep anterior tenía en su lista: `#C9B6FF` en el anillo
> degradado de los botones `.boton.glow`/`.glow-halo` (¡en todos los CTA
> primarios del sitio y del panel desde el inicio!) y `#8B5CF6` como color de
> respaldo en el calendario de citas del panel (`panel/vistas/citas.php`). Se
> encontraron con un barrido por **tono (hue)**, no por valor exacto: un script
> en Python convierte cada hex/rgb del repo a HSL y marca cualquiera con hue
> 255–330° (rango morado/violeta/magenta), saturación >12% y luminosidad entre
> 10–92% — así no importa si es un morado "nuevo" que nadie había visto todavía.
> Repetir este barrido por tono (no solo buscar hex conocidos) cada vez que se
> pida "quita todo el morado".

## Tipografía

- **Display:** Bricolage Grotesque (grotesca humanista, títulos)
- **Cuerpo/UI:** Hanken Grotesk
- **Datos/números:** JetBrains Mono

Se cargan por Google Fonts en sitio y panel. Las **pantallas de estado** usan fuentes
de sistema a propósito (deben verse aunque el servidor/CDN esté caído).

## Motivos y reglas visuales

- **Firma:** la *curva de avance sobre una retícula* (plano cartesiano) — es lo que el
  producto mide y reporta. Aparece en el héroe, el isotipo (`img/inmath.svg`, tile
  azul→lila con meta ámbar), la sección "Qué incluye" (gráfica sticky) y las 3
  pantallas de estado.
- **Malla difuminada:** blobs pastel con `blur` sobre blanco (`.mesh`/`.blob`).
- **Superficies suaves:** las tarjetas NO son cajas cuadradas. Fondo translúcido con
  `backdrop-filter`, **borde superior desvanecido a transparente** (hairline por
  gradiente enmascarado), **splash de color difuminado** interno (en vez de relleno
  plano) y esquinas amplias.
- **Sin rellenos sólidos** en tiles/badges: estilo *ghost* (borde + contenido de
  color). Ej.: los números "01–04" y todos los badges del panel.
- **Iconos, no puntos:** los antiguos puntitos se reemplazaron por iconos de línea.
  Helpers: `icono()` en `sitio/public/_comun.php` y `panel/lib/ayuda.php`.

## Animaciones

- **Hover:** botones con anillo degradado + halo + barrido de brillo; tarjetas con
  lift + icono animado + flecha ghost que se rellena; links con subrayado que crece.
- **Ligadas al scroll (CSS puro, `animation-timeline`):** reveals escalonados,
  parallax de los blobs y dibujo de la curva de avance en una sección *sticky*.
- **Image sequence scrubbing** (`.scrub`/`.scrub-frame`, definido una vez en
  `inmath.css` alrededor de la línea 590): dos fotos reales en crossfade + Ken Burns
  mapeados 1:1 al scroll. Componente genérico — cualquier `<div class="scrub
  scrub-X">` con dos `.scrub-frame` (`f1`/`f2`) y un `.tinte` lo hereda
  automáticamente, sin CSS adicional salvo el `aspect-ratio` de `scrub-X`. Usado
  en: `.scrub-hero` (héroe), `.scrub-avance` ("Qué incluye"), `.scrub-acompana`
  ("Acompañamiento real", entre "Cómo funciona" y "Por qué Inmath"),
  `.scrub-agenda` (página de agendar cita — ver más abajo).
  - **Ya NO usa `animation-timeline` nativo de CSS.** Se intentó dos veces
    detectar si Safari soportaba el timeline de verdad (primero
    `CSS.supports('animation-timeline: view()')`, luego `element.getAnimations()`
    tras un `requestAnimationFrame`) y **las dos veces Safari mintió**: registraba
    la animación pero no la corría ligada al scroll real, dejando los frames
    congelados a medio cruce — efecto "encimado"/fantasma, visible incluso arriba
    de la página sin haber scrolleado nada. El motor ahora es un único script JS
    (en `pieSitio()`, `_comun.php`) que **siempre** corre, sin intentar detectar
    soporte: lee la posición real de cada `.scrub` con `getBoundingClientRect()` y
    aplica opacidad/transform con `style.setProperty(..., 'important')` en cada
    frame de scroll. Resultado idéntico en todos los navegadores, sin la clase de
    bug de "el navegador dice que sí pero no corre".
  - **Bug de fórmula (no de navegador):** el cálculo de progreso original,
    `(vh - top) / (vh + height)`, asume que el elemento empieza invisible y entra
    por abajo — funciona para secciones bajo el pliegue, pero el héroe está
    visible **desde la carga**, así que esa fórmula ya lo daba a medio camino del
    cruce sin que el usuario hubiera scrolleado un solo píxel (el bug real detrás
    del "se ven encimadas" reportado). El fix: el progreso se ancla a la
    **distancia de scroll recorrida desde la carga**, no a la posición cruda en
    el viewport — cada caja guarda un "ancla" en `scrollY` (`0` si ya es visible
    al cargar, o el `scrollY` en el que empezaría a entrar si está más abajo),
    garantizando frame 1 limpio en `scrollY=0` siempre, sin importar dónde viva
    el elemento en la página.
- **Fotos de fondo tenues:** además del scrubbing, `.cta-caja::after` (CTA final)
  aplica una foto real (`/img/fotos/cta-whatsapp.jpg`) como textura de fondo a
  opacidad muy baja (~26%), enmascarada con `mask-image` para que solo se asome del
  lado del formulario y no compita con el texto — mismo lenguaje de "foto real
  desaturada" que `.scrub`, pero estático.
- Todo respeta `prefers-reduced-motion`.

## v6 — Lienzo degradado, hover de fotos con acción, WhatsApp directo

Bloque v6 al final de `sitio/public/css/inmath.css` (misma disciplina append-only
que v3/v5). Referencia visual: dashboards pastel con wash cielo→durazno.

- **Lienzo:** `body::before` pasa de manchas radiales puntuales a un wash
  diagonal continuo — cielo/teal arriba-izquierda que se disuelve a blanco al
  centro, durazno/rosa subiendo desde abajo-derecha. Solo cambia el
  `background`; la deriva animada y el parallax de scroll del bloque v3 siguen
  aplicando.
- **Tarjetas más limpias:** el wash de color de `.card` baja de intensidad
  (26/36% → 20/10%) para que el vidrio blanco domine y el color viva en
  íconos/tags, como en la referencia.
- **`.scrub-accion` (genérico):** cualquier `.scrub` con un
  `<a class="scrub-accion" href="…">` dentro gana un botón circular de vidrio
  con flecha (rotada -45° = ↗) que aparece al hover con lift sutil del
  contenedor (`:has()`). En táctil (`hover:none`) y con `reduced-motion` el
  botón queda siempre visible. Usado en las 3 fotos del landing (héroe→/agenda,
  acompaña→/agenda, avance→/pago).
- **WhatsApp directo (`wa.me`):** `WHATSAPP_NUMERO` en `backend/.env` (formato
  internacional sin `+`). Helper `whatsappUrl()` en `_comun.php`; si la
  variable está vacía devuelve `null` y el enlace `.wa-directo` (pastilla verde
  bajo el formulario del CTA) simplemente no se pinta. Decisión de producto:
  el inicio NO usa la API de WhatsApp — solo enlace directo.

## v7 — Rediseño audaz (nav píldora, lienzo pleno, fotos de borde duro)

Bloque v7 al final de `sitio/public/css/inmath.css`. Evolución deliberada sobre
v6 porque el cliente pidió cambios más notorios (referencias: dashboards pastel
tipo app). Cambios, todos a nivel de clases genéricas:

- **Nav píldora flotante** (archetype N5 de Hallmark): `.barra` se despega del
  borde (sticky a 14px, centrada, `border-radius:999px`, vidrio con sombra).
- **Lienzo pleno:** el degradado cielo→durazno de `body::before` sube de
  intensidad (~.9 de alpha) y pinta toda la página, ya no se disuelve al centro.
- **Fotos de borde duro:** `.scrub` pierde el mask radial desvanecido; ahora es
  `overflow:hidden` + radio 28px + **anillo blanco** (`box-shadow 0 0 0 7px`) +
  sombra profunda. `.demo-marco` pasa de gradiente pastel a tarjeta blanca de
  vidrio (polaroid).
- **Secciones flotantes:** `.proceso` e `.incluye` son paneles redondeados
  (44px) centrados con vidrio, ya no bandas de borde a borde.
- El pie queda translúcido sobre el lienzo.

**Rutas en el servidor local (`php -S`):** el built-in server no procesa
`.htaccess`, y `/agenda`//`/pago` caían de vuelta a `index.php` (los botones
"no navegaban": recargaban el landing). Fix: `sitio/public/router.php` como
script de router (`php -S … sitio/public/router.php`, ya cableado en
`scripts/servir-local.sh`). Producción no cambia: sigue con `.htaccess`.

## Liquid glass — barrido especular

Todas las superficies de vidrio principales (`.card`, `.plan`, `.cta-caja`,
`.precio-caja`/`.tarjeta-form`/`.demo-chat`/`.grafica-firma`, `.boton`) llevan
una capa adicional de `background`: un `linear-gradient(122deg, rgba(255,255,255,X)
0%, transparent 26%, transparent 68%, rgba(255,255,255,Y) 100%)` colocado como
**primera** capa (se pinta encima de las demás). Simula luz especular pegando en
vidrio curvo — más claro arriba-izquierda, se apaga hacia abajo-derecha — en vez
de un panel translúcido plano. Se combina con `saturate()` un poco más alto en el
`backdrop-filter` (1.3→1.4/1.45) para que el color detrás del vidrio se sienta más
vivo. Para agregar esta capa a una superficie nueva: es el primer gradiente en la
lista de `background`, nunca reemplaza los que ya había (wash de color, tinte del
fondo) — solo se antepone.

## Tipografía editorial — énfasis de dos tonos

El h1 del héroe usa `<span class="marca-pino">` para pintar "sí terminas" en el
verde de marca (`--pino`), inspirado en el patrón de Udemy de mezclar pesos/estilos
dentro de un mismo titular para que no todo pese igual ("Learn *essential* career
and life skills"). **No se usó itálica** para esto: Bricolage Grotesque no tiene un
archivo de itálica real en Google Fonts (se verificó pidiendo el eje `ital` a la
API — la devuelve igual sin él), así que `<em>`/`font-style:italic` caerían en
itálica falsa (slant sintético), que se ve mal en una grotesca geométrica como
esta. El énfasis es de **color**, no de estilo, por esa razón puntual — no por
preferencia general.

## Imágenes reales — disciplina de curaduría

Solo se usan fotos verificadas de `images.unsplash.com` (CDN gratuito de Unsplash),
nunca `plus.unsplash.com` (nivel de pago). Antes de subir una foto que muestra la UI
de una app (p. ej. un teléfono con WhatsApp abierto), **hay que revisar el contenido
visible en la pantalla del teléfono**, no solo el tema general: una foto de stock de
"persona con teléfono mostrando WhatsApp" venía con la pantalla de bienvenida de
WhatsApp completa **en ruso** (`hero-1.jpg`), invisible en las miniaturas pero muy
notoria a tamaño completo en el héroe. Se resolvió recortando la imagen (Python/PIL)
para quedarse solo con la mano + parte superior del teléfono + el ícono decorativo
(sin texto), en vez de re-buscar otra foto — más rápido y sin perder la composición
original. Revisar esto a tamaño completo, no solo en la miniatura de búsqueda.

## Accesibilidad — contraste

`--tinta-3` (texto terciario: placeholders, letra pequeña, etiquetas) bajó de
`#9298AB` (contraste 2.88:1 sobre blanco, **reprueba** WCAG AA) a `#6E7488`
(4.65:1, aprueba). Se usaba en texto real y legible (aviso legal del CTA, nombre del
agente en el chat, mensaje "escribiendo…", encabezados de tabla del panel), no solo
en elementos decorativos — por eso el fallo importaba. Token corregido una sola vez
en ambos `inmath.css` (sitio y panel).

## Skills de diseño usadas

Instaladas manualmente en `~/.claude/skills/<nombre>/SKILL.md` (no existe un
instalador `npx skills add` en este entorno — una skill es solo un directorio con
`SKILL.md`; colocarlo ahí basta para que el Skill tool la reconozca):

- **frontend-design** (`anthropics/skills`) — dirección de tokens y jerarquía.
- **hallmark** (`Nutlope/hallmark`) — anti-genérico, tokens bloqueados, copy honesto
  sin métricas inventadas, auto-crítica.
- **ui-ux-pro-max** + `banner-design`, `brand`, `design`, `design-system`, `slides`,
  `ui-styling` (`nextlevelbuilder/ui-ux-pro-max-skill`, bajo `.claude/skills/`).
- **animation-vocabulary**, **apple-design**, **emil-design-eng**,
  **find-animation-opportunities**, **improve-animations**, **pick-ui-library**,
  **prototype**, **review-animations** (`emilkowalski/skills` — el repo se movió de
  `emilkowalski/skill` a `emilkowalski/skills`, la URL vieja redirige 301).
- **genjutsu-cast**, **genjutsu-paint**, **genjutsu-css-native**,
  **genjutsu-design-audit**, **genjutsu-motion-principles** (`AThevon/genjutsu`,
  subset relevante para un stack sin librería de animación: `cast`/`paint` son los
  puntos de entrada, el resto son sub-skills de `skills/_jutsu/`).
- **lumia-loading-screens** (local del usuario) — base de las pantallas de estado
  (rebrandeadas a la identidad Inmath).

## Página de agenda (`agenda.php`)

Rediseñada de un formulario angosto de una columna a dos columnas, con el mismo
lenguaje que el héroe/"Acompañamiento real": foto real con `.scrub-agenda`
(videollamada con asesor → agenda de papel), lista de reaseguro con iconos
(`.agenda-respaldo`), y el formulario a la derecha con labels con ícono y los
horarios **agrupados por día** (`.dia-grupo`/`.dia-etiqueta`) en vez de repetir
"Miércoles 29 de julio" en cada botón de horario — antes eran filas planas de
`AgendaServicio::slotsDisponibles()` sin agrupar, ahora se agrupan en PHP por el
día de `inicio` antes de pintarlos.

**Calendario "liquid glass":** cada `.dia-grupo` es una tarjeta de vidrio
esmerilado (`backdrop-filter: blur(20px) saturate(1.7)`, fondo translúcido) con
tres orbes de color difuminados detrás (`::before` con `radial-gradient` +
`blur(34px)`, azul/lila/sol, referencia: widgets de calendario tipo iOS). El
horario seleccionado usa gradiente azul→pino en vez de un tono sólido. Aplica
también a `.slot span` (chips de hora), que ahora llevan su propio
`backdrop-filter` sutil.

**Bug recurrente — `position:sticky` sin desactivar en el breakpoint móvil:**
dos columnas que colapsan a una a `max-width:900px` (`.acompana-rej`,
`.incluye-rej`, `.agenda-rej`) tenían su columna de imagen/formulario con
`position:sticky` fija SOLO para el layout de escritorio. Si el elemento
correspondiente (`.grafica-wrap`, `.agenda-form-col`) no agrega
`position:static` dentro del mismo `@media (max-width:900px)`, en móvil la
columna se queda pegada al hacer scroll y tapa el contenido que debería
aparecer debajo. Ya se corrigió en ambos casos — al agregar una nueva sección
de dos columnas con imagen sticky, replicar el mismo patrón de raíz.

## Caché del CDN de Hostinger — por qué un cambio de CSS "no se ve"

El CDN de Hostinger (`x-hcdn-cache-status`) cachea `/css/inmath.css` hasta 7
días (`cache-control: public, max-age=604800`) **sin invalidarlo cuando el
archivo cambia en el servidor** — ni el toggle "Automatic cache" del hPanel
(que es un caché distinto y separado) lo controla. Reemplazar el archivo por
FTP/git-deploy no basta: el navegador (y hasta un hard-reload) puede seguir
recibiendo la versión vieja desde el edge del CDN.

Solución aplicada: `_comun.php` ahora genera el link como
`/css/inmath.css?v=<?= filemtime(...) ?>` — cada vez que el archivo se
reemplaza en el servidor, su `mtime` cambia, la URL cambia, y el CDN la trata
como un recurso nuevo (cache miss) sin necesidad de purgar nada a mano. Para
verificar si un cambio de CSS realmente llegó a producción sin depender del
caché del navegador: `curl -s "https://dominio/css/inmath.css?v=$(date +%s)"`
(la query string fuerza un cache-miss) y comparar contra el archivo local.

**Pendiente:** el panel (`panel/vistas/login.php`,
`panel/vistas/_layout-inicio.php`) referencia su propio `inmath.css` sin este
cache-busting — aplicar el mismo patrón si un cambio de CSS del panel no se
refleja en producción.

## Rebranding a otro cliente

Cambiar solo el bloque `:root` de cada `inmath.css` (colores y tipografía) y el
isotipo `img/inmath.svg`. El branding del reporte PDF se ajusta desde la clave de
configuración `reporte_branding` sin tocar código (ver [`base-de-datos.md`](base-de-datos.md)).
