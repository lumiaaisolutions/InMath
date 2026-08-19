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
