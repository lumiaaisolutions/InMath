# Sistema de diseño

Identidad visual de **Cursos Inmath**, aplicada al sitio (`sitio/public/css/inmath.css`)
y al panel (`panel/public/css/inmath.css`). Referencia de calidez/estructura:
lattice.com. Tokens **bloqueados**: ningún color o tipografía fuera del bloque `:root`.

## Regla de color 60-30-10

- **60% Blanco** — fondo dominante (`--blanco` / `--lienzo`).
- **30% Pasteles** — washes y malla difuminada (azul, lila, menta, durazno, rosa, cielo).
- **10% Azul** `#3B6FF5` — el acento: botones, links, iconos, detalles.
- **Apoyo:** pino teal `#0E9E7E`, sol/ámbar `#F4A62A`, lila `#8B6FF0`.

> En el CSS del panel, la variable `--pino` conserva su nombre por compatibilidad
> pero **su valor es el azul** `#3B6FF5` (así se evitó renombrar en cascada).

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
  - Compatibilidad: funciona en Chrome/Chromium. **Safari aún no soporta
    `animation-timeline`**, así que ahí el contenido se ve visible pero estático (no
    se rompe). Si se requiere el scroll-scrubbing también en Safari, se reimplementa
    con JS (IntersectionObserver + rAF).
- Todo respeta `prefers-reduced-motion`.

## Skills de diseño usadas

Instaladas con autorización del usuario en `~/.claude/.agents/skills/` (evaluadas por
Socket/Snyk al instalar):

- **frontend-design** (Anthropic, oficial) — dirección de tokens y jerarquía.
- **hallmark** (Nutlope) — variedad estructural, tokens bloqueados, copy honesto sin
  métricas inventadas, auto-crítica.
- **ui-ux-pro-max** (nextlevelbuilder) — reglas de UI/accesibilidad. *Nota: el
  evaluador genérico la marcó "High Risk"; Socket/Snyk la dieron "Low Risk".*
- **emilkowalski/skill** — vocabulario de animación.
- **lumia-loading-screens** (local del usuario) — base de las pantallas de estado
  (rebrandeadas a la identidad Inmath).

## Rebranding a otro cliente

Cambiar solo el bloque `:root` de cada `inmath.css` (colores y tipografía) y el
isotipo `img/inmath.svg`. El branding del reporte PDF se ajusta desde la clave de
configuración `reporte_branding` sin tocar código (ver [`base-de-datos.md`](base-de-datos.md)).
