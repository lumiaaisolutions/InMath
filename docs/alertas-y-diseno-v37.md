# Portal del alumno — Fase B completa (21-ago-2026)

Detalle modular en `docs/portal-fase-b.md`. Resumen de lo entregado y verificado
en local (sin desplegar):

- **Íconos con firma `eyebrow`** en todo el portal (sin caja, splash de color).
- **Avance %** en dot-matrix que **cuenta de 0 al valor** al recargar/entrar en
  viewport (respeta reduced-motion).
- **Parallax + tilt + reveals** escalonados en las tarjetas del portal;
  **pantalla de carga** al recargar/navegar (faltaba en el portal).
- **Mi cuenta personalizable:** foto, **portada** (si no hay, transparente sin
  blur, solo color), **nombre** y **WhatsApp** editables (con verificación de
  unicidad).
- **2FA opcional (M6):** interruptor en Mi cuenta → Seguridad; al entrar, código
  **OTP de 6 dígitos por correo** (hash en config, 10 min); segundo paso animado
  en el login. Librería `src/lib/portal/dosfactores.ts`.
- **Login animado (M7):** entrada escalonada del formulario + entrada del paso
  2FA + aviso con sacudida.
- **Google → registro obligatorio (M8):** si el correo de Google no tiene
  cuenta, el callback manda al **wizard** de `/pago` (pre-llenado, sin
  contraseña) y no deja entrar al portal hasta completarlo.
- **Registro paso a paso (M9):** `/pago` es un **wizard** (nombre → WhatsApp →
  correo → contraseña → pago), crea la cuenta y permite **pagar después**.
- **Gate de pago (M10):** sin pago confirmado, el dashboard muestra "Falta
  completar tu pago", Material/Reportes redirigen, **Mathy abre solo y recuerda
  pagar** (con opción de agendar la sesión gratis); Mi cuenta y agenda quedan
  accesibles. El login ya no exige pago; el gate vive en el portal.
- **Mathy (M11):** manos con manga hacia el libro y **dedos/pulgares afuera**,
  separadas del libro; mascota más grande. Menú con burbuja llamativa y texto
  visible.

---

# v37 — Alertas de la landing + rediseño de paquetes + Mathy (18-ago-2026)

## Alertas personalizables de la landing (nuevo módulo)

**Qué es:** mensajes/banners que el admin crea desde el panel y aparecen en la
página pública como frames de vidrio SIN bordes con manchas de color difuminadas
(estilo mesh) en los colores del sitio.

**Dónde:**
- Panel: **/panel/alertas** ("Alertas de la página", solo admin). Agregar (máx 6),
  quitar, editar: título, texto, estilo (azul/menta/ámbar/coral), enlace opcional
  + texto de botón, posición y visible/oculta. **Preview en vivo** con el diseño
  real de la landing.
- Posiciones en la landing: `arriba` (después del héroe), `precios` (antes de
  los paquetes), `final` (antes del CTA).

**Cómo está hecho:**
- Storage: fila `alertas_landing` en `configuraciones` (JSON array) — sin
  migración de BD.
- `src/lib/alertas-tipos.ts` — tipos/constantes SIN dependencias de servidor
  (⚠️ los componentes cliente importan de AQUÍ; importar `lib/alertas` desde un
  "use client" rompe el build porque arrastra Prisma).
- `src/lib/alertas.ts` — lectura/normalización (server).
- `src/components/AlertasLanding.tsx` — render server en la landing; se insertó
  en `page.tsx` en las 3 posiciones.
- Panel: `panel/(app)/alertas/{page,ClienteAlertas,acciones}.tsx`.
- CSS: `.alerta-frame` + estilos en `inmath.css` (landing) y réplica en
  `panel.css` (preview). Editor: clases `.al-*`.

## Paquetes v37 (rediseño limpio)

Se reemplazó el carrusel con fotos (v33) por tarjetas limpias estilo referencia:
- Fila de confianza arriba (pago único / acceso inmediato / asesoría 1 a 1).
- Central "Recomendado" en tinta de marca (#1B2F52) con CTA naranja y badge;
  laterales claras con tinte menta/coral suave.
- Precio grande con **tachado inline** ($4,500) y chip sutil "Ahorras $500 por
  tiempo limitado" (SIN pulso).
- Clic en una tarjeta la eleva (activo); en móvil se apilan sin transform.
- Componente: `src/components/Planes.tsx` (clases `pk2-*`). El CSS viejo `pk-*`
  quedó sin uso en `inmath.css` (candidato a limpieza futura).

## Mathy (agente IA)

- **Acento verde** (#22C1A6) en el borde del botón flotante y del panel de chat,
  para resaltarlo del resto (todo lo demás es azul).
- **Abierto por defecto** en cada carga/entrada de página (decisión de
  producto); el usuario lo cierra/reabre con el botón.
- **Efecto "genio" (Aladino)** al abrir y al cerrar: el panel se estira/encoge
  hacia el botón flotante (`transform-origin` en el botón; keyframes
  `genioAbre`/`genioCierra`; el cierre espera 360ms antes de desmontar).
  Respeta `prefers-reduced-motion`.

## Marketing aplicado (resumen)

- Chip de ahorro y tachado de precio en el paquete recomendado (anclaje).
- Alerta ámbar activa "Inscripciones abiertas — precio especial" (urgencia,
  editable/eliminable desde /panel/alertas).
- Fila de confianza sobre los paquetes (reducción de fricción).
- CTA naranja único en la tarjeta recomendada (jerarquía de acción).
Regla: NO inventar métricas ni testimonios; solo copy verificable.

---

## v38–v39 (18-ago, tarde)

### Planes v39 (referencia "partnership")
Layout final: 2 tarjetas claras arriba (Diagnóstico / Para equipos: CTA pill
oscuro, bullets en 2 columnas) + **banda oscura de ancho completo** para el
curso recomendado: punto verde "Oferta por tiempo limitado" (arriba-derecha),
$4,000 con $4,500 tachado, **descuento tipo marcador ámbar** ("Ahorras $500
inscribiéndote hoy", rotado -1.2°, sin pulso) y checks verdes en 2 columnas.
Clases `pk3-*` en `Planes.tsx`. (Los CSS `pk-*` y `pk2-*` quedaron sin uso.)

### Interludios de pantalla completa (parallax fijo)
Dos secciones full-viewport con fotos contextuales descargadas
(`full-estudio.jpg` tras "acompaña", `full-meta.jpg` antes del CTA):
`background-attachment: fixed` → la imagen queda ESTÁTICA mientras el contenido
(kicker, título, texto, CTAs) se CONSTRUYE encima con animaciones scroll-driven
escalonadas (`view()` + rangos). En táctiles/`<760px` cae a scroll normal (el
fixed es janky en iOS). Copys de marketing: "Estudiar acompañado se siente
diferente" y "Tu lugar te está esperando" + CTA con descuento.

### Alertas v38–v39
- Banner más llamativo: mesh de 3 manchas, anillo, brillo que cruza cada 6s,
  tipografía mayor, CTA más grande.
- **Nuevo formato "emergente"**: ventana sobre toda la página al entrar
  (elegible al configurar cada alerta en /panel/alertas). Muestra el aviso +
  el plan con su precio/tachado/marcador de ahorro; cierra con X, clic fuera o
  "Quizá después"; se muestra UNA vez por visita (sessionStorage).
  Componente `AlertaEmergente.tsx`; campo `formato` en el tipo Alerta.

### Mathy — genio "enredado"
Keyframes con giro/torbellino (rotate ±26°, skew, blur y rebote) al abrir y
cerrar; cierre 480ms (timeout 470ms en ClienteSitio).

---

## v40–v43 (18-ago, noche)

### Alertas — módulo completo
- **Editor por TARJETAS** en /panel/alertas: cada alerta es una tarjeta; al
  seleccionarla se abre un frame con **preview en vivo** (del formato elegido:
  banner o ventana) + toda la configuración.
- **Imagen o video por alerta**: subida desde el editor (imagen re-codificada
  1600×1000 con sharp; MP4 validado). Se guardan en PANEL_IMG_DIR/alertas y se
  sirven por /panel/img/alertas/... (ruta pública).
- **Enlace guiado**: select de destinos existentes con descripción (Inscripción
  y pago, Agendar asesoría, Paquetes, Cómo funciona, Qué incluye) o "Link
  específico…" libre.
- **Banner v40**: gradiente saturado por estilo, texto blanco, thumb de media,
  CTA blanco, brillo que cruza.
- **Emergente v40/v43**: PANTALLA COMPLETA con gradiente TRANSLÚCIDO (la página
  se ve debajo, con blur), media de fondo opcional, plan con precio/tachado/
  marcador. Una vez por visita (sessionStorage); cierra con X/click-fuera/
  "Quizá después".
- Fix: el botón "Guardar cambios" quedaba debajo del botón flotante de Mathy
  en el panel (padding-right en .al-guardar).

### Kicker UNIFICADO (v42) — regla de diseño
eyebrow + interludio-kicker + am-kicker comparten UNA firma: mancha splash
SUAVE y semitransparente (wash radial con fade, sin bordes ni píldora) +
texto en gradiente + icono en acento. PROHIBIDO el chip/píldora "encerrado
en color" para kickers. Tonos por sección vía --kick-a/b/t1/t2/ic.

### Mathy (v43)
Azul de base con detalle verde: glow radial SUAVE degradado a transparente
(nada de bola saturada). Chat abierto por defecto + genio enredado se mantienen.

### Tipografía — regla
PROHIBIDA la fuente mono (JetBrains Mono) en el sistema: --mono ahora apunta a
Figtree (se dejó la variable por compatibilidad) y ya no se carga la fuente.

### Correos (¡ACTIVOS!) + Olvidé mi contraseña
- SMTP configurado con Hostinger: envía noreply@lumiaaisolutions.com (buzón
  fernando@lumiaaisolutions.com), SMTP_URL en el .env del VPS. Probado: ENVIO_OK.
- TODOS los correos llevan la leyenda: "dirección de solo envío… escríbenos a
  inmath@gmail.com" (se agrega en lib/correo.ts).
- **Olvidé mi contraseña** (panel): enlace en el login → /panel/login/recuperar
  (pide correo, respuesta siempre genérica) → correo con enlace de 30 min →
  /panel/login/restablecer (token de un solo uso hasheado en
  configuraciones.resets_password) → nueva contraseña con bcrypt.
- El recordatorio semanal de disponibilidad (cron del viernes) ahora SÍ envía.

---

## v44–v45 (18-ago, cierre)

### Alertas: personalización TOTAL
Cada alerta guarda un objeto `diseno` (normalizado con defaults, sin migración):
- **Tipografías**: fuente del título y del texto, eligiendo entre las DOS de la
  página (Sora/display, Figtree/cuerpo) — respetando la regla de tipografía única.
- **Tamaños**: título (chico/normal/grande/extra) y texto (chico/normal/grande).
- **Distribución**: alineación (izq/centro/der), lado de la imagen/video en el
  banner, bordes (rectos suaves/redondeados/muy redondeados).
- **Cuadritos del emergente**: estilo del cuadro del plan (claro/vidrio/oscuro),
  mostrar/ocultar y TEXTO editable de: etiqueta superior (kicker), cuadrito del
  plan (título, subtítulo, precio, precio tachado — vacíos = datos reales del
  curso) y marcador de ahorro.
- Implementación: `DisenoAlerta` + `varsDiseno()` en `lib/alertas-tipos.ts`
  emiten variables CSS (`--a-f-tit`, `--a-tam-tit`, `--a-alin`, `--a-radio`,
  `--a-cuadro-*`…) que consumen `.alerta-frame`/`.am-*` en inmath.css y su
  réplica de preview en panel.css. El editor (ClienteAlertas) tiene secciones
  "Tipografía y distribución", "Contenido de la ventana" y "Botón".

### Kicker: fin del corte cuadrado (v44)
La mancha del kicker unificado se veía cortada (parecía un rectángulo). Fix:
caja del ::before mucho más amplia (inset -52/-110px), degradados que mueren
al 68–70% y blur 12px — el wash se desvanece sin borde perceptible.

### Fix del editor
"Guardar cambios" quedaba debajo del botón flotante de Mathy (padding-right).

---

## v47–v48 (18-ago, tarde-2) — Mathy interactivo + correos de contacto

### Rendimiento del agente (¡de 6–15s a ~1s!)
El modelo pensaba de más: `gemini-3.6-flash` con `thinkingLevel: low` tardaba
6–15 s. Se midió con curl directo y se cambió a **gemini-3.5-flash-lite** +
`thinkingLevel: minimal` + maxOutputTokens 400 → ~0.7–2 s. (GEMINI_MODEL en el
.env del VPS). El cliente además tiene timeout de 25 s (no más "escribiendo…"
infinito).

### Chat interactivo (protocolo de etiquetas)
El modelo emite etiquetas que el sitio convierte en BOTONES:
- `[OPCIONES: a | b | c]` → chips de respuesta rápida (máx 4; solo en el último
  mensaje). Usadas para horarios ("Martes 18, 15:00"), sí/no y "Agéndala por mí
  | Prefiero agendarla yo".
- `[IR_AGENDA]` → botón "Ver horarios y agendar yo" → /agenda.
- `[CONTACTO_HUMANO]` → botón verde de WhatsApp (sustituye al FAB, que se quitó).
Parser en `parseaBot()` (ClienteSitio). Prompt en api/agente/route.ts.

### Modo AMPLIO (PC/tableta) + mascota reactiva
- Botón de ampliar en la cabecera del chat (≥761px): frame centrado
  min(760px, 94vw) × 82vh sobre velo difuminado; clic fuera lo reduce.
- La mascota reacciona: `piensa` (ojos buscan) mientras escribe, `feliz`
  (brinco + ojos felices) al agendar, `triste` al fallar. Clases
  `animo-*` en `.agente-ia`, aplican al botón flotante y al avatar.
- Halo del botón: degradado suave verde↔azul translúcido (v47).

### Correos del negocio
- Contacto real: **cursosinmath@gmail.com** (leyenda de los correos, dato que
  Mathy puede compartir, y destino del formulario del CTA).
- **CTA final** ("Déjanos tus datos"): ahora pide nombre, WhatsApp, CORREO y un
  mensaje opcional; guarda el prospecto (con correo) y ENVÍA la duda por correo
  a cursosinmath@gmail.com.
- **Mathy agenda con correo**: pide el correo al agendar ("tu confirmación se
  enviará por correo"; si no lo dan, agenda sin correo), lo guarda en el
  prospecto y envía la confirmación de la cita por correo (noreply).

---

## v49–v50 (18-ago, cierre-2)

### Pulido del chat (reportes del dueño)
- Aire entre la mascota y el texto de la cabecera (.ap-quien gap 12 + caja 42px).
- Icono de minimizar rediseñado (flechas hacia adentro, legible).
- Modo AMPLIO centrado bulletproof (inset:0 + margin:auto) y responsive
  (94vw × 86dvh bajo 820px).
- Los botones de acción del chat van en su propia línea (no pegados al texto).
- El botón "Ver horarios y agendar yo" CIERRA el chat al navegar a /agenda
  (verificado E2E).

### Calendario de /agenda (referencia glass)
.cal-widget v50: tarjeta esmerilada con mesh VIVO de los colores de la página
(azul→violeta + ámbar + menta), "Agosto 18" blanco grande, día activo en
píldora ámbar→coral, horas como píldoras de vidrio que se encienden al elegir
(blanco sólido + texto tinta).

### /pago + marketing psicológico (honesto)
- Leyenda de oferta como MARCADOR dorado rotado ("Precio de oferta: ahorras
  $500 · POR TIEMPO LIMITADO"), sin pulso.
- Héroe: 4º respaldo "Hoy con $500 de descuento" (anclaje temprano, en ámbar).
- FAQ nueva: "¿Hasta cuándo dura el descuento de $500?" (urgencia honesta:
  hoy aseguras $4,000; al terminar la oferta vuelve a $4,500).
- Nota de planes: "Al completar tu inscripción hoy aseguras el precio con
  descuento."
Regla: urgencia/escasez solo con datos verificables; nada inventado.

---

## v51–v54 (18-ago, cierre-3)

### Correos con DISEÑO (aplica a TODOS los envíos del sistema)
lib/correo.ts arma texto plano + HTML de marca: regla 60-30-10 (blanco
dominante), hairline superior de gradiente (azul→violeta→ámbar), borde 1px
#E3EEFF, logo con splash de color (PNG adjunto por cid: public/img/
correo-logo.png, generado con sharp) + wordmark, y 3 botones: WhatsApp
(verde), Visitar la página (azul) y Escribirnos (mailto cursosinmath@gmail.com).
Como TODO pasa por enviarCorreo(), aplica a: confirmación de cita, reset de
contraseña, recordatorio semanal, dudas del CTA y seguimiento de pago.

### /pago — bloque de descuento
"-$500" GIGANTE en gradiente azul→violeta con glow (referencia -55%),
"OFERTA POR TIEMPO LIMITADO" en ámbar y sub con $4,000 vs $4,500. v54: el
fondo pasó de marino a GLASS transparente con splash suave (blanco translúcido
+ blur + manchas azul/ámbar/menta), sin bordes.

### Plan recomendado (landing) — v52
Fuera el azul marino: tarjeta CLARA con splash suave (azul/ámbar/menta al 12-16%)
y ANILLO de gradiente en el margen (azul→violeta→ámbar→menta) que la señala
como la oferta. Texto en tinta, checks menta, CTA naranja único.

### Calendario /agenda — v53
De mesh saturado a VIDRIO CLARO: rgba(255,255,255,.55) + blur 16 + splashes
suaves en las esquinas (sin bordes duros). Tipografía en tinta; día activo
en píldora ámbar; horas de vidrio con anillo azul → gradiente al elegir.
v54: días/etiquetas del strip forzados a tinta (legibilidad).

---

## v55–v56 (18-ago, cierre del día)

### Sin bordes, estilo eyebrow (regla de diseño consolidada)
El calendario de /agenda y el bloque -$500 de /pago perdieron la CAJA: sin
fondo, sin sombra, sin borde — solo manchas splash multicolor que se desvanecen
(::before con radial-gradients que mueren al 64% + blur 42-46px, caja del
pseudo-elemento mucho más grande que el contenido). Es la MISMA firma del
eyebrow: cualquier bloque destacado nuevo usa este patrón, no tarjetas.
Fix de legibilidad: los selectores reales del calendario son .cd-sem/.cd-num
(no .dc-*); días en tinta, activo en píldora ámbar→coral, no disponibles al 38%.

### Auditoría responsive móvil (v56)
- html/body con overflow-x: clip en sitio y panel → las manchas que sobresalen
  NO generan scroll horizontal.
- Alertas banner en ≤560px: media a lo ancho (150px alto, arriba), CTA al 100%.
- Cifras con clamp para no desbordar: precio de la banda (2.2rem–3rem) y
  -$500 (2.6–3.6rem).
- Chat: ancho seguro min(392px, 100vw-24px); modo amplio 94vw × 86dvh ≤820px.
- Ya cubiertos antes: panel con hamburguesa y kanban vertical, banda de planes
  apilada con badge reubicado, interludios con attachment scroll en táctil,
  emergente full-screen fluida.

## v58 — Segunda pasada responsive: agenda, chat de Mathy, pago, panel (18-ago-2026)

Reporte del dueño con capturas reales de celular: el encabezado de "Agendar tu
asesoría gratis" se salía del ancho, el chat de Mathy no quedaba centrado, y el
resumen de precio de /pago (inscribirme) se rompía. Se pidió auditar TODO el
sitio y el panel, no solo esas tres capturas.

**Causa técnica común:** varios elementos son hijos de `flex`/`grid` con el
`min-width: auto` por defecto — un texto largo sin espacios (nombre de curso,
encabezado) fuerza la fila/columna más ancha que el contenedor aunque el padre
tenga `justify-content: space-between` o ya colapse a 1 columna en el
breakpoint. `overflow-x: clip` en `html/body` evita el scroll horizontal de la
página pero no arregla el layout — el contenido se corta en vez de ajustarse.

**Landing (`src/app/(sitio)/inmath.css`):**
- `.resumen-pago` (caja de precio en /pago): ganó `flex-wrap: wrap`,
  `min-width: 0` + `overflow-wrap: anywhere` en el nombre del curso, y en
  `≤480px` pasa a columna (nombre arriba, precio abajo) en vez de apretarse
  en una fila.
- `.agenda-lado h1` / `.pagina-form h1` (encabezados de /agenda e /inscribirme):
  ganaron `overflow-wrap: anywhere; min-width: 0` — con `text-wrap: balance`
  solo, una palabra suelta muy larga (o el viewport muy angosto) podía
  desbordar; ahora corta con seguridad.
- `.agenda-rej` (grid de dos columnas foto+formulario en /agenda): sus hijos
  directos ganaron `min-width: 0` — aunque el grid ya colapsaba a 1 columna en
  móvil, sin esto el contenido interno podía seguir empujando el ancho.
- **Chat de Mathy** (`.agente-panel`): el bug real era que el panel cuelga con
  `position: absolute; right: 0` del botón flotante (que vive en la esquina
  inferior derecha) — nunca estuvo centrado, solo pegado a la derecha con
  márgenes asimétricos. En `≤560px` ahora se fija con
  `position: fixed; left: 12px; right: 12px; width: auto` — márgenes iguales
  a ambos lados, independiente de dónde está el botón.

**Panel (`src/app/(panel)/panel.css`):**
- `.us-rejilla` (tarjetas de usuarios en /panel/usuarios): la columna mínima
  de grid era `minmax(340px, 1fr)` sin breakpoint — en pantallas ≤380px de
  ancho (iPhone SE y similares, con el padding del panel) el mínimo de 340px
  no cabía y desbordaba. Se agregó `≤380px → 1fr`.
- **Tablas** (`table.lista`, usada en /panel/pagos, /panel/configuracion,
  /panel/alumnos): no tenían wrapper con scroll — con `overflow-x: clip` en
  el body, las columnas de más se recortaban y quedaban invisibles en vez de
  accesibles. Se agregó `.tarjeta:has(> table.lista) { overflow-x: auto }` +
  `min-width: 560px` en la tabla, así en móvil se puede deslizar
  horizontalmente dentro de la tarjeta para ver todas las columnas.
- Resto del panel (kanban, formularios de login/perfil, grids de galería,
  cabeceras) ya tenía overrides de mobile correctos — se revisaron todos los
  `grid-template-columns` y `display:flex` del archivo, sin más brechas.

**Limitación de verificación:** el entorno de automatización de navegador no
reproduce fielmente un viewport angosto (`resize_window` no cambia
`window.innerWidth` real), así que estos cambios se verificaron por lectura
de CSS/DOM y build exitoso local + VPS, no con captura en vivo a 375px. Pedir
confirmación visual en un celular real tras el deploy.

**Deploy:** rsync de `src/` → build en el VPS → copiar `.next/static` y
`public/` al standalone → `pm2 delete inmath-web` + start. Verificado con
`curl` 200 en `/agenda` y `/pago` tras el reinicio.

## v58.1 — Quitar el subrayado "swoosh" de "acompañamiento" en móvil (18-ago-2026)

Pedido puntual del dueño: el subrayado dibujado a mano (SVG en
`background-image`, con animación `swoosh` de entrada) bajo la palabra
"acompañamiento" del héroe (`.heroe h1 .marca`) se quita **solo en vista
móvil** (`≤640px`), dejando el texto en azul sin decoración. En escritorio
sigue igual. Cambio de una sola regla en `src/app/(sitio)/inmath.css`
(`background-image:none; animation:none; padding-bottom:0` dentro del media
query). Desplegado con el mismo pipeline de siempre.

## v59 — Causa raíz real del desfase en /agenda y /pago (18-ago-2026)

El dueño reportó con capturas reales de iPhone (navegador in-app de WhatsApp)
que el formulario de /agenda seguía viéndose cortado por la derecha después
del v58 (que solo había contenido una salpicadura decorativa, insuficiente).

**Diagnóstico correcto, esta vez verificado con viewport móvil real:** el
entorno de automatización de este proyecto no reproduce un viewport angosto
de verdad (`resize_window` no cambia `window.innerWidth`), así que se instaló
Playwright localmente (`npx playwright install chromium`, aislado en el
scratchpad) para emular un iPhone 13 real y medir con
`getBoundingClientRect()` qué elemento se salía del viewport de 390px.

**Causa raíz:** `.formulario` y `.campo` (usadas en `/agenda` e `/pago`) son
`display:grid` **sin `grid-template-columns`**. Sin esa propiedad, la única
columna implícita del grid se dimensiona según el `max-content` del hijo más
ancho — en este caso el carrusel de 7 días del calendario, que pide ~404px —
en vez de encogerse al espacio disponible (305px en un iPhone). El resultado:
`.campo` medía 444px de ancho real dentro de una tarjeta de 305px, y todo lo
de adentro (inputs, botón "Confirmar") quedaba cortado por el
`overflow:hidden` de la tarjeta. En escritorio nunca se notó porque sobra
espacio de sitio.

**Arreglo:** `grid-template-columns:minmax(0,1fr)` en ambas clases
(`src/app/(sitio)/inmath.css`), forzando la columna a ocupar el 100% del
contenedor en vez de crecer con el contenido. Sin cambios visuales en
escritorio.

**Verificación (no solo lectura de CSS, medición real con Playwright +
emulación de iPhone 13, contra el sitio ya desplegado):**
- `document.documentElement.scrollWidth` = 390 (igual al viewport, cero
  scroll horizontal de página) en `/agenda` y `/pago`.
- `.campo`/`.formulario` pasaron de 444px a 305px, exactamente el ancho del
  contenedor.
- Los únicos elementos que siguen "saliéndose" del viewport en el escaneo
  son los botones de días del carrusel de fechas (`.cal-dia`) — eso es
  scroll horizontal intencional dentro de su propia tira (con difuminado de
  borde como pista visual), no el bug reportado.

**Nota para el futuro:** cuando se reporte un desfase/corte en móvil que
persista tras un fix, usar este método (Playwright + `devices['iPhone 13']`
+ medición de `getBoundingClientRect()`) en vez de solo razonar sobre el CSS
— así se hubiera encontrado el `grid-template-columns` faltante desde el
primer intento.

**Descartado en el diagnóstico:** se revisó si Cloudflare (que sirve
`inmath.lumiaaisolutions.com`) podía estar cacheando el HTML/CSS viejo y
mostrando una versión previa al deploy. Confirmado que no: la respuesta de
`/agenda` trae `cache-control: private, no-cache, no-store, max-age=0,
must-revalidate` y `cf-cache-status: DYNAMIC`, y el hash del chunk CSS
cambia en cada build (`/_next/static/chunks/<hash>.css`). El desfase que
persistió tras el v58 era 100% el bug real de `grid-template-columns`
descrito arriba, no un problema de caché.

## v60–v62 — Rediseño del portal del alumno + Mathy sin fondo (21-ago-2026, EN LOCAL)

Construido y verificado en local (Playwright, desktop + iPhone 13); **NO
desplegado** por indicación del dueño. El dueño pidió actuar como dev senior +
diseñador UX/UI senior, con referencia a un dashboard de salud (tarjetas de
gradiente suave), estilo moderno/educativo, regla 60-30-10, colores llamativos
y jerarquía psicológica para navegación intuitiva.

**Skills de diseño usadas** (autorizadas e instaladas por el dueño en
`.agents/skills/`, gitignoradas): `ui-ux-pro-max` (nextlevelbuilder),
`frontend-design` (anthropics), skills de animación de `emilkowalski`, y
`hallmark` (Nutlope). Se consultó su guía; se descartó su sugerencia de
claymorphism + fuentes infantiles (Baloo/Comic Neue) por chocar con la marca
InMath ya establecida — la disciplina de hallmark/frontend-design manda
**conservar la identidad** (Bricolage Grotesque + Hanken Grotesk, tokens de
`inmath.css`). Se tomó de la referencia el **layout y el lenguaje de gradientes**,
no una plantilla genérica.

### v60 — Portal del alumno (`/portal`) rediseñado

Regla **60-30-10** aplicada:
- **60%** base neutra: lienzo blanco-azulado + tarjetas blancas.
- **30%** azul de marca (`#6B9FFF`) en estructura, texto y chips.
- **10%** acentos llamativos que **codifican significado** (Von Restorff /
  procesamiento preatentivo): **verde→teal = tu avance (logro)**,
  **coral→ámbar = qué sigue (acción)**. Solo en las dos tarjetas hero.

Estructura (fiel a la referencia, adaptada a lo educativo):
- Encabezado personalizado "Hola, [nombre]" + fila de **chips de métricas**
  (días contigo, reportes, asesorías, materiales) para escaneo de un vistazo.
- **Dos tarjetas hero de gradiente** con blob de color y **cifra gigante**:
  avance del curso en % (con delta vs. semana pasada, de `avance_alumnos`) y
  próxima asesoría (fecha grande + CTA a la videollamada).
- **Fila de datos clave** (duración, reportes, asesorías, material).
- **Material del curso como tarjetas** con ícono de gradiente por tipo
  (documento=verde, video=coral, enlace=azul).
- **Reportes** como lista con descarga.
- Archivos: `src/app/(portal)/portal/page.tsx` (reescrito, server component),
  `src/app/(portal)/portal.css` (reescrito), y
  `src/app/(portal)/portal/NumeroAnimado.tsx` (nuevo, cliente).

**Motion sutil** (skill emil): las cifras hero **cuentan de 0 al valor** al
entrar en viewport (refuerzo de "logro/progreso"), y las secciones hacen
**reveal escalonado** al cargar. Todo respeta `prefers-reduced-motion` (muestra
el estado final estático). Verificado: sin scroll horizontal en móvil, cifras
tabulares, contraste, foco.

### v61 — Botón de Google en el login único (ya documentado en portal-alumno-y-pagos)

CSS del botón "Continuar con Google" + separador en el split del panel.

### v62 — Mathy SIN FONDO (sitio y panel)

El dueño pidió que el asistente de IA no tenga fondo en ningún lado: **solo la
mascota** (el librito con ojos) sobre un **splash de color estilo `.eyebrow`**.

- `.agente-btn` pierde `background`, `border`, `box-shadow` y `backdrop-filter`
  (transparente), y se quita el anillo duro pulsante (`::before`).
- El `::after` pasa a ser un **wash multirradial** (teal→azul→lila) con un
  **núcleo claro** en el centro — así la mascota (líneas azules) queda legible
  aunque el fondo de página sea de color, igual que el eyebrow vive sobre
  blanco. Animación de "respiración" suave (`mathySplash`), con
  `prefers-reduced-motion` respetado.
- La mascota se agranda (protagonista) y gana halo blanco + sombra sutil.
- Aplicado en `inmath.css` (Mathy del sitio) y `panel.css` (Mathy del panel),
  con overrides `!important` que ganan sobre todas las versiones previas del
  botón. Verificado en vivo: `background:none`, `border:0`, `box-shadow:none`.

## v63 — Mathy más grande + en el portal, nav inferior, íconos eyebrow, IA EXANI-II (21-ago-2026, EN LOCAL)

Construido y verificado en local (Playwright + pruebas reales al chat). **NO
desplegado.** El dueño pidió (como dev senior + AI Engineer senior):

**1. Mathy (agente IA) más grande — resalta.** El launcher del sitio y del panel
subió a 78px (96px en desktop) con la mascota a 62–78px, conservando el diseño
sin fondo + splash eyebrow (v62).

**2. Mathy en el portal del alumno.** Se agregó el `AgenteIA` al layout del
portal con `sinBoton` + `abrirInicial={false}`: no muestra su botón flotante,
arranca cerrado y se abre desde el **botón central del nav inferior** (evento
`mathy:alternar` / `mathy:abrir`, escuchado por el componente). Reusa todo el
chat existente (chips, opciones, modo amplio).

**3. Nav inferior del portal (ref: barra flotante con botón central destacado).**
Nuevo `src/app/(portal)/NavPortal.tsx`: pastilla flotante de vidrio con
Inicio · Material · **[Mathy]** · Reportes · Cuenta. El centro es Mathy —
círculo elevado con anillo blanco (efecto notch) y splash de color estilo
eyebrow; así el asistente vive en el panel del alumno y resalta. Respeta los
colores de marca (azul + acentos). CSS en `portal.css`; el `.pt-panel` ganó
`padding-bottom` para no tapar el contenido.

**4. Íconos del portal SIN caja (firma eyebrow).** Los íconos de material
(`.pt-mat-ic`) y de la lista de reportes (`.pt-lista-ic`) dejaron de ser
cuadros de color sólido: ahora son el ícono en color de acento sobre un
**splash radial suave y difuminado** (misma firma que `.eyebrow`), por tipo
(verde=documento, coral=video, azul=enlace).

**5. IA entrenada con el examen EXANI-II (Ceneval).** Nuevo
`src/lib/conocimiento-exani.ts` (`CONOCIMIENTO_EXANI`) con: las dos áreas del
examen (transversales: comprensión lectora, redacción indirecta, pensamiento
matemático; y los 2 módulos específicos por carrera, de un conjunto de 15),
un mapeo compacto **carrera → módulos** (derivado de
`Módulos_específicos_carreras.docx`), y reglas anti-alucinación sobre
universidades (la mayoría aplica EXANI-II pero hay excepciones: UANL sí, UdeG
usa la PAA de College Board; ante la duda, confirmar en la asesoría). Se agrega
al prompt del chat del sitio (`api/agente`) y —para consistencia— debe agregarse
al prompt del bot de WhatsApp (`prompts.sistema_bot`) en producción (en la BD
local recreada aún no existe esa fila).
- **Verificado en vivo** contra Gemini: "¿UdeG aplica EXANI-II?" → responde
  correctamente que no (usa PAA); "Medicina" → Premedicina + Ciencias de la
  salud; "UANL" → sí aplica. Sin alucinar, y siempre invitando a la asesoría.
- **Nota de AI Engineering:** NO se activó el grounding de búsqueda de Gemini
  para no romper el formato de comandos (`<agendar>`, `[OPCIONES]`) del chat;
  la fiabilidad se logra con conocimiento curado + regla de "verificar en la
  asesoría". Queda como mejora futura opcional activar `google_search` para
  confirmar universidades no listadas en tiempo real.

**Skills de diseño**: se consultaron las autorizadas (ui-ux-pro-max,
frontend-design, emil, hallmark) instaladas en `.agents/`/`.claude/`
(gitignoradas), conservando la marca InMath.

**Infra local:** la MySQL de prueba desechable (socket `/tmp/exani2-test.sock`)
se había caído; se recreó una instancia limpia en el scratchpad, se cargó el
esquema con `prisma db push` y se sembraron datos de prueba (alumno con pago,
avance, cita con meet, materiales, admin) para poder ver el portal en localhost.

## v65 — Portal Fase B, Lote A (21-ago-2026, EN LOCAL)

Pulido del panel del alumno con el DNA del dashboard de referencia (Superpower)
+ mejoras funcionales. Plan modular completo en `portal-fase-b.md`. **NO
desplegado.** Verificado con Playwright (desktop + iPhone 13, sin desbordes).

- **Dashboard estilo referencia:** tarjetas hero de **gradiente suave completo**
  (verde→ámbar / coral→durazno), número de avance en **dot-matrix** (perforado,
  como los "70/25/103" de la ref), **notificación flotante** "Tu avance va
  subiendo" con sparkline, y **píldoras de estado** frosted. Componentes
  `NumeroPuntos` (renderer dot-matrix) + `AvancePuntos` (cliente, cuenta 0→valor).
- **M1 — Íconos con firma eyebrow:** material, reportes, datos de cuenta, accesos
  usan el ícono en color sobre splash difuminado (sin caja).
- **M2 — Avance animado:** el % dot-matrix cuenta de 0 al valor al recargar
  (easeOutCubic; respeta reduced-motion).
- **M3 — Scroll/parallax/hover:** `ScriptsPortal` agrega parallax suave de las
  tarjetas hero al hacer scroll + **tilt 3D** en hover (tarjetas hero/accesos/
  stats), con vars `--par/--rx/--ry`. Reveals escalonados ya existían.
- **M4 — Pantalla de carga:** faltaba en el portal; se agregó `OverlayCarga` +
  show/hide al navegar/enviar (mismo patrón que sitio/panel).
- **M5 — Datos editables + portada:** Mi cuenta ahora edita **nombre** y
  **WhatsApp** (acción con validación de unicidad; mantiene el login si el
  usuario era el WhatsApp). La **portada sin foto** ya no satura: color suave
  **transparente sin blur**.
- **M11 — Mathy:** manos corregidas — **puño (manga) hacia el libro, dedos hacia
  afuera, pulgares arriba** (se quitó el volteo vertical que los invertía). Y
  **Mathy más grande** (botón 102–124px; mascota 88–106px) en sitio y panel.

**Pendiente (Lote B, siguiente sesión):** M6 2FA opcional (código por correo),
M7 animación del login, M8 login con Google que exige completar registro, M9
registro paso a paso (wizard, pago al final), M10 gate de pago en el portal
(bloqueo suave + alerta + Mathy recuerda pagar + agendar sesión gratis). Son
interdependientes (auth + pago + wizard) y se hacen juntos. Ver `portal-fase-b.md`.

## v66 — Wizard de inscripción + gate de pago + Mathy (21-ago-2026, EN LOCAL)

- **Registro paso a paso (M9):** `/pago` dejó de ser un formulario largo; ahora
  es un **wizard** (nombre → WhatsApp → correo → contraseña → pago) con barra de
  progreso y validación por paso. Al terminar crea la **cuenta del alumno** (con
  su propia contraseña) + pago pendiente; puede pagar ahora o después.
- **Gate de pago (M10):** el login ya no exige pago; el portal bloquea a quien no
  ha pagado (dashboard "Falta completar tu pago" con CTA pagar + agendar sesión
  gratis, Material/Reportes redirigen, y **Mathy abre solo recordando el pago**).
- **Mathy (M11):** más grande y con las **manos separadas fuera del libro**
  (manga hacia el libro, dedos hacia afuera, pulgares arriba).
- **Íconos eyebrow:** accesos del dashboard y la notificación flotante pasaron a
  la firma eyebrow (ícono en color sobre splash, sin caja).
Ver plan modular completo en `portal-fase-b.md`.
