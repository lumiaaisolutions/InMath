# Mathy se recoge en el borde, sidebar con secciones desplegables, verificación agenda↔disponibilidad (22-ago-2026, v84-v86)

## 1) Mathy se "esconde" en el borde cerca del final de la página

**Bug reportado:** el botón flotante de Mathy (fijo en la esquina inferior
derecha) tapaba botones/enlaces cuando el usuario llegaba al final de una
página corta (ej. "Desarrollado por LUMIA" y los enlaces del footer en
`/pago`, tanto en desktop como en móvil).

**Fix:** cuando el scroll está a menos de 130px del final de la página (y el
chat está cerrado), el botón se desplaza con `translateX` hacia el borde
derecho (queda mayormente fuera de pantalla, con opacidad reducida) — el
mismo efecto de "recogerse" que se pidió. Al pasar el cursor (o con foco)
vuelve a su posición normal al instante. Aplicado tanto en el sitio público
como en el panel. Verificado en producción real: tras el fix, el botón queda
recogido y el badge "Desarrollado por LUMIA" es clicable de nuevo.

## 2) Sidebar del panel: secciones desplegables (sin scroll)

Los 10 ítems del sidebar (antes en lista plana) causaban que, en viewports
cortos, el sidebar necesitara scroll interno y el widget de perfil quedara
apretado/cortado. Se agruparon los ítems de administración en dos secciones
**desplegables** ("Contenido y sitio", "Administración"), dejando solo los 4
más frecuentes (Pipeline, Citas, Alumnos, Pagos) siempre visibles. El grupo
que contiene la ruta activa se expande automáticamente. El sidebar ya no
necesita scroll en la mayoría de los casos; si un grupo abierto no cupiera
igual, sigue teniendo `overflow-y:auto` como red de seguridad (tal como se
pidió: "si se despliega y sale de la pantalla, ahora sí debe tener scroll").
Verificado en un viewport de 760px de alto: sin scroll, todos los ítems
alcanzables.

## 3) Verificación agenda ↔ disponibilidad: NO había bug de sincronización

Se reportó que las horas de `/agenda` no coincidían con lo definido en
`/panel/disponibilidad`. Verificado 1:1 contra los datos reales de
producción: el domingo (dentro de la semana YA guardada) mostraba
**exactamente** las horas configuradas (12:00, 12:30, 13:00). Los días que
sí se veían "distintos" pertenecían a la **semana siguiente**, que aún no se
había definido — por diseño, esos días usan el horario base hasta que
también se ajuste esa semana (justo lo que la tarjeta "⚠ Pendiente" indica).

Para que esto no vuelva a confundir:
- El botón "Guardar" ahora se convierte en un indicador **"✓ Guardado"**
  (deshabilitado) cuando no hay cambios sin guardar respecto a lo ya
  persistido, en vez de seguir mostrando "Guardar" de forma genérica.
- Se agregó una nota explicando que `/agenda` muestra 7 días **rotativos**
  desde hoy, que pueden cruzar el límite entre "esta semana" y "la próxima"
  del panel — por eso conviene definir ambas.

---

# Fix agenda/disponibilidad, sidebar fijo, y rediseño de alertas (22-ago-2026, v80-v83)

## 1) Fix crítico: /agenda ocultaba el resto de la semana

**Síntoma reportado:** el admin definía horarios en `/panel/disponibilidad` pero
no aparecían en `/agenda`, y el banner "Aún no defines la próxima semana"
seguía apareciendo después de guardar.

**Causa raíz real (verificada contra datos de producción):** `slotsDisponibles`
se llamaba con un tope GLOBAL de slots (`max=12`) sin tope por día. Al definir
horarios densos (cada hora de 8am a 8pm), el primer día (hoy) ya agotaba el
`max` completo, y **el resto de la semana —incluida la semana próxima— nunca
llegaba a evaluarse**, aunque sí estaba guardada correctamente en la BD.
Confirmado con curl contra prod: con `max=12` solo aparecían slots de hoy y
mañana; tras el fix, los 8 días del rango completo.

**Fix (`src/lib/agenda.ts`, `src/app/(sitio)/agenda/page.tsx`):**
`slotsDisponibles` ganó un tope **por día** (`maxPorDia=12`, independiente del
`max` global) para que ningún día "se coma" el presupuesto de los siguientes.
`/agenda` sube su `max` a 90 para cubrir la semana completa con el nuevo tope.

**La segunda parte del reporte** (guardar "esta semana" y seguir viendo el
banner de "próxima semana") **no era un bug** — el banner del dashboard es
intencionalmente sobre la semana SIGUIENTE (para el recordatorio semanal), y el
panel por defecto mostraba la semana ACTUAL. Confusión real de UX, resuelta en
el punto 3.

## 2) Fix: sidebar del panel se desplazaba con la página

**Causa:** en `panel.css`, el bloque `.sidebar` declaraba `position: sticky`
y, **más abajo en el mismo bloque**, `position: relative` lo anulaba (la
última declaración gana). Se eliminó la duplicada. Auditado el resto de
`panel.css`/`portal.css`/`inmath.css`: el patrón no se repite en otro lado.
Los breakpoints móviles (v36, la regla vigente) ya usaban `sticky`
explícitamente y no se vieron afectados por el bug (que era solo desktop).

## 3) Rediseño paso a paso de /panel/disponibilidad

- **Resumen "Esta semana" / "Próxima semana"** con estado (✓ Ajustada / ⚠
  Pendiente) y navegación directa con un clic — resuelve la confusión del
  punto 1: ahora se ve de inmediato cuál semana falta.
- Aviso inline con enlace directo a definir la próxima semana si falta.
- Flujo numerado: Paso 1 (días) → Paso 2 (horas) → Paso 3 (guardar).
- El selector de horas dejó de ser un `<select>` con una hora a la vez: ahora
  es un **grid de chips** (toggle) + **presets rápidos** (Mañana/Tarde/Todo el
  día/Copiar a todos los días) — así se define un horario denso en 2 clics en
  vez de ~20 selecciones manuales (la causa original del bug del punto 1).
- Verificado E2E: definir la próxima semana hace desaparecer el banner del
  dashboard; sin overflow horizontal en móvil.

## 4) Rediseño de /panel/alertas: banner rico + controles custom + pasos

- **Banner ("formato: banner") con diseño rico tipo countdown** (referencia
  TripleTen): fondo en degradado oscuro por color, kicker, **cuenta regresiva
  en vivo** (días/horas/min/seg hasta una fecha límite, nuevo campo
  `mostrar_cuenta`/`fecha_limite`), cuadrito de plan con precio, marcador de
  ahorro y CTA — el mismo lenguaje visual que ya tenía el formato "emergente",
  ahora también en banner. Nuevas clases `.alb-*` (panel.css e inmath.css) y
  componente `CuentaRegresiva.tsx`.
- **Cero `<select>` y `<checkbox>` nativos** en el editor: nuevo componente
  `Segmentado` (pastillas, reemplaza `<select>`) e `Interruptor` (switch
  custom, reemplaza checkbox), usados en TODOS los campos.
- **Flujo por pasos numerados**: 1) Tipo y dónde aparece (tarjetas visuales
  banner vs. emergente), 2) Contenido, 3) Botón, 4) Diseño avanzado
  (colapsable, oculto por defecto para no amontonar la vista).
- **Tarjetas de anuncios creados** con mini-preview (gradiente del color +
  líneas simuladas + botón) en vez de solo un punto de color.
- Retrocompatible: `normalizaDiseno` autocompleta los campos nuevos en
  alertas ya guardadas — verificado contra el dato real de producción
  (alerta "emergente" existente siguió renderizando igual, sin cambios).
- Verificado E2E en producción real: guardar → recargar → persiste; visible
  en la landing pública (Playwright contra `inmath.lumiaaisolutions.com`,
  sin errores de JS); sin overflow en móvil.

---

# Rediseño de la landing: hero cinematográfico, mega-menú, bento, comunidad, errores de marca (22-ago-2026, v71-v75)

- **Header full-width sticky** (v71): la barra dejó de ser píldora flotante; ahora
  es full-width pegada arriba, transparente sobre el hero y sólida con sombra al
  hacer scroll (`body:has(.heroe-cine) .barra`). Sombra vía clase `.scrolled`
  (ScriptsSitio).
- **Hero cinematográfico** (v72): fondo full-bleed con **image-sequence scrubbing**
  + parallax + Ken Burns + glows de marca + velo; texto centrado blanco con
  titular en degradado menta→azul; **entrada escalonada** (primeros segundos);
  CTA con pulso; indicador de scroll. Respeta `prefers-reduced-motion`.
  Eyebrow con clase estándar `.eyebrow`.
- **Imágenes de sección FIJAS** (v72): el motor `.scrub` de las secciones ya NO
  aplica Ken Burns; las imágenes quedan estáticas y solo cambian con el
  crossfade al hacer scroll (a diferencia del fondo del hero).
- **Mega-menú** (v75): "Qué incluye" abre un panel de 2 columnas (El curso /
  Acompañamiento) + tarjeta CTA. CSS hover/focus, se aplana en el menú móvil.
- **Sección BENTO** (v74): "Todo en un solo lugar" — grid con tarjeta oscura,
  soft y blancas, íconos, chips y mini-stat.
- **Sección COMUNIDAD** (v74): tarjetas flotantes de testimonios con avatares +
  textura binaria de fondo; se apilan en móvil.
- **Formulario CTA** más compacto (v73): menos padding, textarea de 2 filas.
- **Footer + páginas legales** (v73): fila de enlaces (Términos de uso, Código de
  conducta, Información regulatoria, Programa de referidos, Política de
  privacidad, Gestionar cookies). Nuevas rutas `/codigo-conducta`,
  `/informacion-regulatoria`, `/referidos`, `/cookies` (con preferencia real en
  localStorage), reutilizando el estilo `.legal`.
- **Errores de marca** (v73): `not-found.tsx` (404) y `global-error.tsx` con la
  clase `.eyebrow`, número en degradado y CTAs.

---

# Correcciones post-Google: usuario=correo, redirect a pago, móvil y Mathy (21-ago-2026, v69)

- **Usuario de acceso = CORREO** (antes era el WhatsApp). El WhatsApp queda solo
  como dato de contacto para el admin. Cambiado en `registrarAlumnoAccion`,
  `provisionarAccesoAlumno` (inscripcion.ts), textos de correos y del wizard;
  cambiar el WhatsApp en Mi cuenta ya no toca el usuario. El login (`auth-unificado`)
  ya aceptaba entrar por correo, así que es retrocompatible.
- **Fix "Completar mi pago":** desde el portal llevaba al **wizard desde el paso 1**
  (pedía el nombre otra vez). Ahora `/pago` detecta al **alumno logueado con pago
  pendiente** y muestra directo la pantalla de **elegir cómo pagar** (nuevo
  componente `PantallaPago`, reutilizado también por el wizard tras crear la
  cuenta). Para que `/pago` (público) lea la sesión del alumno, la cookie
  `inmath_alumno` pasó de `path:/portal` a **`path:/`**.
- **Login móvil:** la caja se desbordaba a la izquierda (el `92vw` no descontaba
  el padding lateral del contenedor grid `place-items:center`). Ahora usa ancho
  explícito `min(400px, calc(100vw - 40px))` y queda **centrada**. Etiqueta
  simplificada a "Correo".
- **Mathy — encabezado:** las manos flotantes se salían de su caja (viewBox 48,
  mano derecha a x≈52) y **pisaban el texto** "Mathy / La IA…". Se añadió la
  opción `sinManos` a `MascotaMathy`; el avatar del encabezado (sitio y panel)
  la usa (libro centrado sin manos). El botón lanzador conserva las manos.

---

# Correos rediseñados + registro seguro + fix login Google (21-ago-2026, v67-v68)

Ajustes tras poner Google en producción y probar el flujo real:

- **Fix login con Google (crítico):** el callback redirigía a `0.0.0.0:3010`
  (el bind interno detrás de nginx) en vez del dominio. Ahora las
  redirecciones de `api/portal/google/{callback,inicio}` y `portal/logout` se
  arman con **`APP_URL`** como base, no con `req.url`. (Regla general: en Route
  Handlers detrás de nginx, redirigir con APP_URL.)
- **Login:** nuevo CTA **"¿Aún no tienes cuenta? Regístrate"** → manda al wizard
  de `/pago` (`.login-registro` en panel.css).
- **Registro (wizard) — contraseña segura:** el paso de contraseña ahora tiene
  **checklist de requisitos en vivo** (8+ caracteres, mayúscula, minúscula,
  número), **barra de fuerza**, **campo de confirmación** y **ojo para ver** lo
  que se escribe. Reglas centralizadas en `src/lib/password.ts` (mismas en
  cliente y servidor: `registrarAlumnoAccion` valida con `passwordSegura`).
  Estilos `.wz-pass/.wz-fuerza/.wz-reqs/.wz-match` (inmath.css v67).
- **Correos rediseñados (v68, `src/lib/correo.ts`):** plantilla de marca
  renovada (cabecera con degradado + logo, tipografía clara, fondo azul suave)
  y **componentes reutilizables opcionales**: `cta` (botón), `codigo` (caja OTP),
  `destacado` (callout), `pasos` (lista numerada con círculos), `nota`,
  `preheader` y `tono` (azul/verde/ámbar/coral). La versión de texto plano
  también quedó completa (incluye código, pasos y enlace del CTA).
  **Todos los envíos se enriquecieron** para que queden completos y con
  instrucciones: 2FA (código en caja + vigencia), reset de contraseña (botón +
  vigencia), registro/apartado/comprobante de pago (pasos + botón de pago),
  inscripción activa (verde + credenciales + botón al portal), avisos de
  vencimiento 24h/3h/cancelado (ámbar/coral + botón pagar), reporte semanal
  (botón al portal) y recordatorio de disponibilidad (botón al panel).

---

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

## v67 — Pantalla de pago con 3 métodos + recibo/ticket en PDF (23-ago-2026, EN VIVO)

- **`/pago` con métodos separados:** "Pagar con tarjeta u OXXO" se dividió en
  **dos tarjetas independientes** (Pagar con tarjeta / Pagar en efectivo OXXO),
  cada una con su ícono propio y una **insignia "Mercado Pago"** (y "OXXO" en el
  método de efectivo) — wordmarks propios dibujados en SVG, sin usar los
  logotipos oficiales. Ambas usan el mismo `link` de Checkout Pro (MercadoPago
  resuelve tarjeta vs. OXXO en su propia pantalla). Se agregó una línea de
  confianza ("Pago seguro y encriptado…") al final. Cuando el link aún no existe
  (MercadoPago inactivo), cada método cae a un estado deshabilitado con
  "Disponible muy pronto" sin romper el layout.
- **Recibo/ticket en PDF (`src/lib/recibo.ts`):** al confirmarse un pago (webhook
  de MercadoPago o aprobación manual del panel, ambos vía `inscribirPorPago`) se
  genera un recibo tipo ticket (folio, fecha, monto, alumno, curso, método,
  código de barras decorativo) reutilizando el escritor de PDF sin dependencias
  (`PdfLienzo`, mismo patrón que los reportes). Se cachea a disco
  (`storage/recibos/recibo-{id}.pdf`) — se genera una sola vez.
- **Distribución del recibo:**
  - **Correo:** se adjunta al correo de bienvenida/confirmación (`enviarCorreo`
    ahora acepta `adjuntos`).
  - **Portal del alumno:** tarjeta "Tu comprobante de pago" en el dashboard →
    `GET /portal/recibo/{id}` (verifica que el pago sea del alumno logueado).
  - **Panel (staff):** link "Descargar recibo (PDF)" en la ficha de pago →
    `GET /panel/recibo/{id}` (requiere el módulo "pagos").
- **Fix de paso:** se encontraron y corrigieron dos usos de un ícono inexistente
  (`Icono n="imagen"`, no está en el set de `Icono.tsx`) que dejaban una caja
  vacía — en el método de transferencia de `/pago` y en el botón de foto de
  perfil de `/portal/cuenta`. Ambos ahora usan `n="file"`.
- **Verificado:** PDF generado y revisado visualmente (sin traslapes, línea
  punteada y código de barras bien posicionados); pantalla de pago probada de
  punta a punta con el wizard en local (3 métodos con link forzado para ver el
  estado activo); build local y en VPS sin errores; rutas de recibo responden
  401/403 sin sesión en producción.

## v68 — Logos reales en /pago + fix real de logout del portal (23-ago-2026, EN VIVO)

- **Logos reales de marca:** las insignias "Mercado Pago" y "OXXO" en `/pago`
  dejaron de ser wordmarks dibujados a mano y ahora usan los **logotipos
  oficiales** — Mercado Pago vía simple-icons (librería open-source de iconos
  de marca) y OXXO vía Wikimedia Commons (`File:Oxxo_Logo.svg`, dominio
  público), ambos guardados como SVG propio en `public/img/pago/` y coloreados
  con sus colores de marca. Verificado visualmente en el wizard local.
- **Bug real de logout en el portal (encontrado y corregido):** el botón
  "Salir" del portal del alumno regresaba al mismo lugar en vez de cerrar
  sesión. Causa raíz: `res.cookies.delete({name, path})` en Next.js guarda por
  **nombre** de cookie — dos llamadas al mismo nombre con distinto `path` se
  **sobrescriben** entre sí en vez de sumarse, así que solo salía un
  `Set-Cookie` (el del path de compatibilidad viejo, `/portal`) y nunca el del
  path real de la cookie activa (`/`). El navegador nunca recibía la orden de
  borrar la sesión real, y el login único (`/panel/login`) la seguía viendo
  válida y rebotaba de regreso. Se corrigió el orden en
  `src/lib/portal/sesion.ts` y `src/app/(portal)/portal/logout/route.ts` (la
  llamada al path real va al final). Reproducido y verificado en local con
  inspección directa de las peticiones de red — antes: `POST /portal/logout →
  GET /panel/login 307 → GET /portal`; después: `POST /portal/logout → GET
  /panel/login 200` (queda en el login, sesión cerrada de verdad).
- **Correo con recibo PDF adjunto — verificado con envío real:** se disparó un
  correo real de prueba (no simulado) a través del SMTP de producción con el
  recibo/ticket en PDF adjunto — llegó correctamente.
- **Precio de prueba temporal:** el curso "Curso Propedéutico InMath (Premium ·
  8 meses)" (id 1, el que muestra `/pago` por defecto) se bajó a **$10 MXN** en
  producción para que el dueño pueda hacer una compra real de bajo costo y
  validar el flujo completo de Mercado Pago de punta a punta (pago → webhook →
  inscripción → recibo). **Pendiente: regresar el precio a $4,000 MXN una vez
  terminadas las pruebas** (`UPDATE cursos SET precio_centavos = 400000 WHERE
  id = 1;`).
