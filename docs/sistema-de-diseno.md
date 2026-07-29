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
  mapeados 1:1 al scroll vía `animation-timeline: view()`. Componente genérico —
  cualquier `<div class="scrub scrub-X">` con dos `.scrub-frame` (`f1`/`f2`) y un
  `.tinte` lo hereda automáticamente, sin CSS adicional salvo el `aspect-ratio` de
  `scrub-X`. Usado en: `.scrub-hero` (héroe), `.scrub-avance` ("Qué incluye"),
  `.scrub-acompana` (sección "Acompañamiento real", agregada entre "Cómo funciona"
  y "Por qué Inmath" para alternar ritmo texto/foto en vez de dos secciones
  seguidas sin imagen).
  - **Compatibilidad Safari:** `CSS.supports('animation-timeline: view()')` **no es
    confiable** — puede reportar `true` sin que el navegador realmente corra el
    timeline. El fallback real usa `element.getAnimations()` tras un `requestAnimationFrame`
    para confirmar si la animación (`scrubOut`/`kenburns1`) está genuinamente
    corriendo; si no, un fallback JS por scroll activa las mismas clases con
    `style.setProperty(..., 'important')`. Código en `pieSitio()` dentro de
    `_comun.php`. Ya no es "estático en Safari" — el scrubbing funciona ahí también.
- **Fotos de fondo tenues:** además del scrubbing, `.cta-caja::after` (CTA final)
  aplica una foto real (`/img/fotos/cta-whatsapp.jpg`) como textura de fondo a
  opacidad muy baja (~26%), enmascarada con `mask-image` para que solo se asome del
  lado del formulario y no compita con el texto — mismo lenguaje de "foto real
  desaturada" que `.scrub`, pero estático.
- Todo respeta `prefers-reduced-motion`.

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

## Rebranding a otro cliente

Cambiar solo el bloque `:root` de cada `inmath.css` (colores y tipografía) y el
isotipo `img/inmath.svg`. El branding del reporte PDF se ajusta desde la clave de
configuración `reporte_branding` sin tocar código (ver [`base-de-datos.md`](base-de-datos.md)).
