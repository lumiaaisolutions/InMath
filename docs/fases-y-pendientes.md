# Estado de fases y pendientes

Sistema construido en 7 fases secuenciales y probado end-to-end en local (MySQL
temporal + `php -S`; bot en modo simulado `BOT_SIMULADO=1`).

## Fases

| Fase | Qué cubre | Estado |
|---|---|---|
| 1 — Fundamentos | Esquema BD, backend PHP, contrato de API para n8n | ✅ Completa |
| 2 — Chatbot IA | WhatsApp Cloud API + motor conversacional (Gemini, antes Claude), calificación configurable, prompts editables | ✅ Construida y conectada a Gemini (`BOT_SIMULADO=0`) · falta WhatsApp Business Cloud API de Meta |
| 3 — Agenda | Disponibilidad por asesor, Google Calendar + Meet, recordatorios | ✅ Construida · falta conectar Google en n8n |
| 4 — Pagos | Capa de procesador configurable, link en el chat, webhook → inscripción, recuperación de carrito | ✅ Construida · MercadoPago elegido y con driver real listo, falta credenciales del cliente (ver [`pagos.md`](pagos.md)) |
| 5 — Panel CRM | Multiusuario, pipeline visual, bitácora, calendario, editor de prompts | ✅ Completa |
| 6 — Reportes | Job semanal, PDF de avance, envío por WhatsApp/correo, branding configurable | ✅ Construida · el flujo de correo en n8n ya tiene el nodo y el contrato de datos listos, solo falta la credencial SMTP |
| 7 — Sitio web | Landing + página de pago + agenda embebida | ✅ Construida · falta auditoría del sitio actual del cliente |

## Pendientes que dependen del usuario/cliente

- **App de WhatsApp Business Cloud API (Meta)** — token, phone id, verify token.
  Sin esto el motor del bot (ya conectado a Gemini) no recibe ni envía mensajes
  reales — queda pendiente explícitamente a petición del cliente.
- **Google Calendar OAuth** en n8n (Fase 3). Pendiente explícitamente.
- ✅ ~~Credenciales de MercadoPago~~ — RESUELTO: en producción desde
  agosto 2026 (webhook verificado con pago real). Ver [`pagos.md`](pagos.md).
- **Plantillas de WhatsApp** por aprobar en Meta: `recordatorio_cita`,
  `recordatorio_pago`, `reporte_semanal`.
- **SMTP** para el envío de reportes por correo (en n8n) — pendiente
  explícitamente; el flujo `08-reportes-semanales.json` ya tiene el nodo
  `emailSend` con un slot de credencial marcado `"CONFIGURAR"`, listo para que
  se le asigne una cuenta SMTP real desde la UI de n8n.
- **URL del sitio actual** del cliente para la auditoría/migración (Fase 7).

## Decisiones de producto por validar (van marcadas como *placeholder* en el código)

- **Criterios de calificación** del bot (pesos y umbral) — config `criterios_calificacion`.
- **Prompt del bot** (tabla `prompts`, editable desde el panel).
- **Contenido del reporte** de avance.
- **Precio y datos del curso** (tabla `cursos`; hoy "Curso en línea Inmath", $2,500 MXN, 12 semanas).

Estos se ajustan sin tocar código (desde el panel / configuración).

## Fuera de alcance (requiere confirmación explícita)

- Facturación fiscal (CFDI).
- Cualquier módulo no listado en las 7 fases.

## Nota sobre los flujos de n8n

Los JSON en `automatizaciones-n8n/flujos/` son estructuralmente válidos pero **no se
han importado a una instancia real de n8n** (no hubo Docker en el entorno de
desarrollo). Al desplegar, verificar que las versiones de nodos coincidan con la
versión de n8n instalada.

## Corte agosto 2026 — Fases 1–3 COMPLETAS (plan comercial por fases)

- **Fase 1 (Presencia y captación):** landing rediseñada, formulario de
  contacto que crea prospecto, enlace directo wa.me (sin API de WhatsApp por
  decisión del cliente). Falta solo el número real (`WHATSAPP_NUMERO`).
- **Fase 2 (Asistente de ventas):** Mathy en el sitio conversa y **agenda
  citas reales** (slots de AgendaServicio inyectados al prompt + comando
  <agendar> ejecutado en servidor; verificado E2E). Prompt fijo, no editable
  por el cliente.
- **Fase 3 (Pago y alta):** pago en línea (MercadoPago listo, sin credenciales)
  + pago por transferencia con subida de comprobante; aprobación en panel →
  inscripción + usuario/contraseña del alumno. Ver `pagos.md`.
- **Fase 4 (Portal del alumno):** portal `/portal` con login validado por el
  pago (usuario/contraseña + Google), dashboard con inscripción, próxima
  asesoría, reportes de avance (descarga autenticada) y material del curso
  gestionable desde `/panel/materiales`. Construido y verificado EN LOCAL el
  19-ago-2026; pendiente de desplegar. Ver `portal-alumno-y-pagos.md`.
- **Faltante del MVP:** Fase 5 (módulo de práctica/reactivos del alumno).
  Fase 6 ya está cubierta por el panel y la agenda actuales.
- **Preguntas abiertas al cliente:** ver `preguntas-cliente.md`.

### Pendientes tras respuestas del cliente (13-ago-2026 — actualizado 03-sep-2026)
- ✅ Credenciales de Mercado Pago — EN PRODUCCIÓN (webhook verificado con
  pago real end-to-end el 23-ago-2026).
- ✅ UI de es_asesor en Panel→Usuarios (interruptor en el asistente de edición).
- ⬜ Fotos reales de la sesión (landing + carrusel del login) — sigue en
  manos del cliente.
- ⬜ Confirmar con cliente: fecha de inicio del curso y política de asesorías
  extra (el bot hoy los deriva a la asesoría gratuita).

### Lote de mejoras del panel solicitado el 13-ago (COMPLETADO — auditado 03-sep-2026)
1. ✅ Logo protagonista en sitio, panel, login, carga y agente (v30 CSS).
2. ✅ Alumnos: alta manual (ClienteAlumnos.tsx, "Registrar alumno").
3. ✅ Citas: alta manual con asistente por pasos (ClienteCitas.tsx, PASOS_CITA).
4. ✅ Usuarios: filtros por rol, tarjetas, frames de edición/creación por pasos
   e interruptor de es_asesor en la UI (ya no se toca por BD).
5. ✅ Personalizar login: galería con texto/orden por slide, asistente y preview.

### Lote del panel — COMPLETADO (13-ago)
1. ✅ Logo protagonista. 2. ✅ Alumnos: alta manual (frame, crea prospecto
inscrito + alumno, valida duplicado). 3. ✅ Citas: alta manual (frame con
fecha/hora/asesor opcional; usa AgendaServicio::agendar con validación de
traslape; grid 8–20h). 4. ✅ Usuarios: filtros por rol, tarjetas compactas,
frame detalle (guardar/eliminar-lógico/cerrar), frame de creación, checkbox
"atiende citas" (es_asesor). 5. ✅ Personalizar login: texto/orden POR imagen
(config login_media_meta JSON), galería clicable con frame de edición y
preview vivo; el login rota el texto con cada slide y respeta el orden.

### Lote de Reactivos/Práctica — COMPLETADO (31-ago-2026)
1. ✅ **Scroll en el asistente de examen**: `.us-frame-asistente` (base de
   los 7 formularios tipo asistente del panel) se convirtió en columna flex
   con cabecera fija y cuerpo con `overflow-y: auto` — antes `overflow:
   hidden` bloqueaba todo scroll y con muchas preguntas era imposible llegar
   a "+ Agregar pregunta". Verificado en navegador: se pudo agregar y
   scrollear a una 2ª pregunta sin problema.
2. ✅ **X de cerrar pegada al borde**: bug estructural — un hijo con
   posición absoluta se alinea al borde de *padding* del ancestro
   posicionado, ignorando el padding pensado para el flujo normal. Fix
   puntual en `.us-frame-asistente .us-frame-cab .us-cerrar` corrige los 7
   formularios de una sola vez (todos comparten esa base).
3. ✅ **"Explicar con IA" más rápido + con ejemplos**: se reemplazó la
   Server Action (no puede hacer streaming) por una Route Handler
   (`/api/reactivos/explicar-ia`) que transmite la respuesta de Ollama
   token a token en vivo. El retraso de ~20s reportado es el cold-start del
   modelo en el VPS (CPU-only, se descarga de RAM tras 30 min sin uso) — no
   la generación en sí (~17 tok/s en caliente). Prompt del sistema mejorado
   para pedir explicación de 4–6 líneas con un ejemplo concreto.
4. ✅ **Imagen como opción de respuesta + material por pregunta**: cada
   opción se puede alternar entre texto e imagen; cada pregunta admite un
   adjunto propio (imagen/archivo) además del material por rango que ya
   existía a nivel examen.
5. ✅ **Botón "Modalidad(es)" en la tarjeta de examen**: popover con chips
   de curso para reasignar en qué modalidad(es) aparece un examen sin abrir
   el asistente completo (mismo examen, sin duplicar preguntas).
6. ✅ **% mínimo para aprobar en exámenes** (ya existía en fases): nuevo
   campo en el paso 1 del asistente, guardado en `examenes.porcentaje_minimo`.
7. ✅ **Orden aleatorio vs. fijo por examen**: switch "Preguntas al azar en
   Práctica" (`examenes.orden_aleatorio`) — si está apagado, `/portal/practica`
   respeta el orden que definió el admin en vez de barajar.
8. ✅ **Selector de examen en Práctica del alumno**: además de "Tema", el
   alumno puede elegir un examen específico (mutuamente excluyente con
   Tema). Los botones de cantidad son dinámicos: solo se muestran los
   presets (5/10/15/20) que caben en el total real disponible, y siempre
   aparece la opción "Todas (N)". La cantidad elegida por el alumno es
   independiente del switch de orden aleatorio/fijo del admin.

Migraciones aplicadas en producción: `examenes.porcentaje_minimo`,
`examenes.orden_aleatorio`, `reactivos.opciones_tipo`, `reactivos.adjunto_url`,
`reactivos.adjunto_tipo`. Pendiente (requiere autorización aparte, toca
infraestructura compartida del VPS): cron de keep-warm de Ollama para
eliminar el cold-start de "Explicar con IA".

### Corte 01-sep-2026 — Fixes de scroll/modalidades + logo real + Cerebrito + rendimiento

Bugs reales encontrados y corregidos (no solo cosméticos):
1. ✅ **Scroll muerto en TODOS los formularios tipo asistente** (Fases,
   Reactivos, Usuarios, Citas, Precios, Personalizar login): el `<form>` que
   envuelve `<Asistente>` es hijo directo de `.us-frame-asistente` pero no
   tenía flex propio (`display:block` por defecto, `min-height:auto`), así
   que nunca se encogía — crecía al alto de TODO su contenido y el
   `overflow-y:auto` del cuerpo nunca tenía overflow real que resolver. El
   scroll "funcionaba" solo por `scrollIntoView()` programático, nunca con
   la rueda del mouse — por eso con pocas preguntas parecía funcionar (todo
   cabía) y con un examen real de 9-20 preguntas no se podía bajar. Un solo
   fix CSS (`.us-frame-asistente > form { display:flex; flex-direction:column;
   flex:1 1 auto; min-height:0; }`) lo arregla en los 7 formularios a la vez.
   Verificado con 11 preguntas reales: antes `clientHeight === scrollHeight`
   (nada que hacer scroll), después `clientHeight` topado y overflow real.
2. ✅ Los botones Atrás/Siguiente ahora son `position:sticky` al fondo del
   cuerpo con scroll, para que no se pierdan debajo de listas largas.
3. ✅ **"Modalidad(es)" en Reactivos** rediseñado: de un popover
   `position:absolute` dentro del grid de tarjetas (se recortaba/aparecía
   detrás de la tarjeta siguiente por cómo pinta el navegador un elemento
   posicionado que no está portado fuera del grid) a un modal centrado
   (`Velo`, ya portado con `createPortal`) con un switch por modalidad que
   guarda solo al cambiarlo — sin botón "Guardar" aparte — y bloquea dejar
   el examen sin ninguna modalidad.

**Logo real de marca en todo el sistema** (antes: ícono de libro dibujado a
mano en CSS/SVG, no el logo real del cliente):
- `public/img/inmath.svg` — usado en el header del sitio, sidebar del
  panel, pantalla de login/bloqueo, portal y "Personalizar login" — ahora es
  la imagen real del cliente (cerebro + circuito + birrete), procesada con
  Python/PIL: fondo blanco removido con máscara de alpha por distancia de
  color + apertura morfológica (erosión→dilatación) para quitar motas
  sueltas de compresión, recortada al contenido y reescalada con LANCZOS.
  Como es un solo archivo compartido, el cambio se ve en todos lados a la
  vez con solo reemplazar ese archivo.
- `public/img/correo-logo.png` — mismo logo, mismo proceso, en PNG
  cuadrado 256×256 con transparencia, para el `cid:logoinmath` que se
  adjunta a **todos** los correos del sistema (`src/lib/correo.ts`).
- Pantalla de carga del sistema (`src/components/OverlayCarga.tsx`): el
  "libro que se dibuja" (animación de `stroke-dashoffset` con
  `pathLength={1}`) pasa a dibujar los dos hemisferios del cerebro + el
  birrete al centro, mismo mecanismo de auto-dibujado de antes.

**Mathy — el agente de IA, evolucionado a "Cerebrito"** (antes: libro de
líneas con guantes; iteración intermedia con birrete que se descartó):
- Cerebro con textura real de circunvoluciones (silueta con dos
  hemisferios + fisura central + pliegues), sin birrete, solo ojos (sin
  boca ni mejillas).
- Manos-guante flotantes (separadas del cuerpo, con su propia sombra):
  palma blanca + pulgar y 3 dedos planos con contorno azul — mismo
  lenguaje visual que la mascota anterior del libro — que saludan cada una
  por su cuenta con una animación de rotación suave.
- Un solo componente (`src/components/MascotaMathy.tsx`) reutilizado en
  sitio, panel y portal — el cambio se ve en todos lados a la vez.

**Rendimiento — causa real de "se enlentece toda la computadora" (reporte
del cliente)**: investigado a fondo. El botón flotante de Mathy tenía un
brillo de fondo (`.agente-btn::after`, 4 `radial-gradient` con
`filter: blur(6px)` sobre un elemento de hasta 144px) animado con
`animation: mathySplash ... infinite` (`transform: scale`) — blur + scale
animados juntos, para siempre, en el layout persistente del panel/sitio
(visible en TODA página mientras el sistema está abierto), es el patrón
más costoso de mantener para el compositor de GPU del navegador: fuerza
re-rasterizar esa capa en cada frame indefinidamente. Se quitó la
animación (el brillo queda fijo, se ve igual de bien) en `panel.css` e
`inmath.css` — elimina el uso sostenido de GPU/CPU mientras el sistema
está abierto, que es exactamente el síntoma reportado ("se alenta la
computadora para abrir otras aplicaciones o pestañas"). Las animaciones de
Cerebrito (parpadeo, saludo, flotar) NO se tocaron porque usan solo
`transform`/`opacity` — baratas para el compositor, no la causa.

**Correo de admin cuando se agenda una asesoría** (antes: solo el prospecto
recibía confirmación; el staff no se enteraba salvo revisando el panel):
`src/lib/agenda.ts` — `confirmarCitaPorCorreo()` ahora, además del correo
al prospecto, manda uno a `CORREO_CONTACTO` ("Nueva asesoría agendada —
{nombre}") con el mismo enlace de Meet como botón (o una nota si n8n aún
no lo generaba), el nombre del asesor asignado, y los datos de contacto
del prospecto (WhatsApp, correo). Aplica a los 4 caminos que agendan una
cita (sitio público, bot de WhatsApp, agente de IA del sitio, y alta
manual desde el panel) porque todos pasan por `agendar()`/`crearCita()`.

### Corte 01-sep-2026 (2) — Menú del portal invisible en móvil

**Bug real, no cosmético**: en el portal del alumno, en cualquier pantalla
≤900px de ancho, el menú del header (Inicio/Fases/Material/Práctica/
Reportes/Mi cuenta/Salir) desaparecía por completo — invisible y sin poder
darle clic. Causa: `inmath.css` (compartido entre sitio público y portal)
tiene reglas para el menú hamburguesa MÓVIL del sitio con el selector
genérico `.barra nav { max-height:0; opacity:0; pointer-events:none; }`,
que solo se revela agregando la clase `.abierto` — cosa que hace el botón
`#navToggle` + el JS de `ScriptsSitio`. El portal usa su propio header
(`NavPortalHeader`, una píldora de íconos que YA estaba pensada para caber
sin colapsar) y su propio script (`ScriptsPortal`), que nunca agrega ese
botón ni esa clase — así que el `<nav>` del portal heredaba el colapso del
sitio para siempre, sin nada que lo volviera a abrir. Corregido escopando
esas reglas a `.barra:not(.barra-portal) nav` en los dos breakpoints
(720px y 900px) donde existían. De paso, en el portal el wordmark "Portal
Inmath" también se reduce a solo el ícono en ≤620px (antes se comía casi
todo el ancho del header) y el menú gana `overflow-x:auto` como red de
seguridad para pantallas muy angostas (320-360px) donde aun icon-only no
caben los 7 accesos completos sin un pequeño scroll horizontal.
Verificado forzando el ancho a 390px con un alumno de prueba real
logueado: antes nada del menú se veía; después se ven 4-5 accesos de
entrada y el resto con un scroll corto dentro de la misma píldora.

### Corte 01-sep-2026 (3) — Menús móviles rediseñados + manos de Mathy intercambiadas

**Sitio público — menú hamburguesa "se veía muy junto"**: se rediseñó el
menú desplegable de `inmath.css` (bloque v82, antes v79) con más aire real
entre grupos en vez de todo pegado en una sola columna:
- Se quitó una entrada duplicada ("Cómo funciona" aparecía dos veces: como
  ítem plano arriba y otra vez dentro del grupo "El curso").
- Más separación entre "El curso" y "Acompañamiento" (`.np-tit` con más
  margen), y una línea punteada separa visualmente el bloque del mega-menú
  del bloque final (Asesoría gratis / Entrar / Inscribirme).
- Más padding en cada fila (13-14px en vez de 9-10px) para que no se
  sientan amontonadas.

**Portal del alumno — de píldora de íconos a menú de hamburguesa real**:
en vez de forzar los 6 accesos + Salir en una fila horizontal con scroll
oculto (el fix de la sesión anterior, que ya los hacía visibles pero
seguían apretados), en ≤620px el menú del portal (`NavPortalHeader.tsx`)
ahora es un botón de hamburguesa que despliega una lista vertical con
texto completo — mismo patrón que el sitio, pero resuelto en React (estado
local `abierto`, no JS/CSS vainilla aparte) ya que el componente ya era
"use client". El menú se cierra solo al cambiar de página. En escritorio
(>620px) no cambia nada — sigue la píldora horizontal con la burbuja
animada.

**Mathy se esconde mientras cualquiera de los dos menús está abierto**:
antes se quedaba flotando encima del menú desplegado, tapando los últimos
accesos (visible en la captura que mandó el cliente). Ahora, con
`body:has(#navPrincipal.abierto) .agente-ia` (sitio) y
`body:has(#navPortal.abierto) .agente-ia` (portal), el agente completo
(botón + panel si estaba abierto) desaparece mientras el menú esté
desplegado — sin JS adicional, un solo selector CSS por cada menú.
Verificado con un alumno real: `getComputedStyle(agente).display === "none"`
justo después de abrir el menú del portal.

**Manos de Mathy intercambiadas**: en `MascotaMathy.tsx`, la mano
izquierda y la derecha (el guante espejado vs. el normal) se
intercambiaron de posición — afecta al único componente compartido, así
que se ve en sitio, panel y portal a la vez sin tocar nada más.

### Corte 01-sep-2026 (4) — Portal "liquid glass" desaturado + logo completo en login

**Rediseño del dashboard del portal (ref. Superpower)** — los colores
estaban saturados (tarjetas verde/coral de borde a borde con texto
blanco); ahora es "liquid glass sin blur":
- `pt-hero-*` (v83 en `portal.css`): base blanca pulida con un wash de
  color difuso ADENTRO que se desvanece antes de los bordes (dos
  radial-gradient suaves sobre blanco), borde blanco translúcido, brillo
  interior con `inset box-shadow` — cero `backdrop-filter` (lección de
  rendimiento de esta misma sesión). Texto en tinta oscura; el acento por
  tarjeta vive en variables (`--wash-a/--wash-b/--tinta-acc/--pill-bg`).
- `.pt-pill` pasa de "frosted glass" (blur) a estilo `.eyebrow`: fondo de
  tinte suave + texto uppercase en la tinta de acento.
- `NumeroPuntos` (los números dot-matrix): `color` por defecto pasa de
  `#fff` (invisible sobre el fondo claro nuevo) a `currentColor` — hereda
  la tinta de acento de cada tarjeta.
- `pt-stat`/`pt-acceso`: mismo lenguaje glass (gradiente blanco + inset
  highlight) en vez de blanco plano.

**Práctica (paneles de examen/preguntas, ref. learning-plan)**:
- Barra de progreso REAL (`.pt-practica-barra`) debajo de "X de Y
  contestadas", con el gradiente del `.pt-kicker` (teal→azul→coral), que
  se llena animada conforme el alumno contesta.
- Tarjetas de pregunta con el mismo glass blanco (radio 20, sombra suave,
  inset highlight); opciones con micro-interacción (translateX al hover).
- Tarjeta de calificación con wash suave interior según resultado
  (verde/ámbar/coral) en vez de fondo plano tintado.
Sin animaciones infinitas nuevas — solo transiciones de interacción y el
stagger de entrada que ya existía (`pt-rev`).

**Logo completo en el login**: `public/img/inmath-logo-completo.png`
(cerebro + IN·MATH + CURSOS + lema, fondo removido con el mismo proceso
PIL del isotipo, 2x LANCZOS) aparece grande y centrado arriba de "¡Hola
de nuevo!"; se eliminó la fila "Cursos Inmath" con isotipo chico. El
saludo y subtítulo quedan centrados. La miniatura de vista previa de
`/panel/personalizar-login` (`.plp-logo-completo`) refleja exactamente el
mismo layout para que no haya discrepancia.

**Drift local reparado (solo entorno de desarrollo)**:
`intentos_practica` local no tenía `examen_id`/`fase_id` (existen en
producción desde el corte de fases) — recreada localmente con el esquema
completo. Verificado el flujo completo de práctica end-to-end en local
con el alumno de prueba (elegir → resolver con barra → calificar 100% →
revisión), lo que también cierra la verificación pendiente del selector
de examen/cantidades dinámicas. Credenciales de prueba locales: alumno
`5210000001` / `prueba123`, admin `admin@inmath.test` / `prueba123`.

**Skills de diseño instaladas** (autorizadas por el cliente):
`anthropics/skills#frontend-design`, `emilkowalski/skill` (animate) y
`nextlevelbuilder/ui-ux-pro-max-skill` — en `.agents/skills/` (ya
ignoradas por git).

### Corte 01-sep-2026 (5) — Alumno sin pagar veía el portal completo

**Reporte del cliente**: "Fotos FHT" (pago PENDIENTE de $4,000) veía el
dashboard completo del portal en vez del candado de pago.

**Causa raíz (datos, no lógica)**: ese prospecto tenía un pago de **$10.00
MXN marcado como "pagado"** — el cobro real que se usó para verificar el
webhook de MercadoPago end-to-end el 23-ago — y el candado
(`tienePagoConfirmado`) cuenta CUALQUIER pago con estado `pagado`, sin
importar monto. El pago de prueba desbloqueaba el portal aunque el pago
real del curso siguiera pendiente.

**Arreglos**:
1. **Datos (producción, autorizado por el cliente)**: el pago de prueba
   (id 8, $10) se marcó `reembolsado` — queda en el historial como lo que
   fue, y el portal de ese alumno quedó bloqueado de inmediato (verificado:
   ya no tiene ningún pago `pagado`; su pago real de $4,000 sigue
   `pendiente` intacto).
2. **Candado del webhook (`pagos-drivers.ts`)**: `aplicarEventoPago` ahora
   compara lo que el procesador reporta como REALMENTE cobrado
   (`transaction_amount` re-consultado a la API de MercadoPago) contra el
   `monto_centavos` del pago — si lo cobrado es menor, NO se confirma el
   pago y se registra en el log. Cierra el vector de un cobro
   parcial/manipulado marcando "pagado" un monto mayor.
3. **Menú del portal con pago pendiente**: `NavPortalHeader` recibe
   `bloqueado` desde el layout — con pago pendiente solo se muestran
   Inicio y Mi cuenta (los demás apartados de todos modos redirigían al
   candado, pero mostrarlos invitaba a clicks muertos). La pantalla de
   candado ya solo ofrece "Completar mi pago" y "Agendar mi sesión
   gratis", como pidió el cliente. Verificado en local con el alumno de
   prueba puesto temporalmente en `pendiente`.

Todas las páginas y acciones del portal ya estaban protegidas
individualmente (`redirect("/portal")` o error si no hay pago) — el
problema era exclusivamente el dato de prueba residual.

### Corte 02-sep-2026 — Eventos duplicados en Calendar, acciones en Alumnos, HTML en "Explicar con IA", mascota con silueta del logo

1. ✅ **Eventos duplicados en Google Calendar** (misma cita, 2 eventos con
   2 links de Meet distintos): el workflow 03 de n8n tenía un nodo
   "Obtener calendario del asesor" que consultaba `/api/asesores` — n8n
   ejecuta los nodos siguientes UNA VEZ POR ITEM, así que con 2 asesores
   en la BD el nodo de Calendar creaba 2 eventos por cita. El nodo era
   vestigial (el calendario está fijo a cursosinmath@gmail.com y ningún
   dato suyo se usaba). Fix: se quitó el nodo y se conectó el webhook
   directo al nodo de Calendar (editado en la BD SQLite de n8n con el
   contenedor detenido; reiniciado y verificado que el webhook re-registra
   y ambos workflows re-activan). Los eventos duplicados YA creados los
   borra el cliente a mano en su Google Calendar. Nota: el JSON del repo
   (`automatizaciones-n8n/flujos/03*.json`) sigue reflejando el diseño
   viejo por-asesor; la versión de producción vive en n8n.
2. ✅ **Acciones por fila en /panel/alumnos**: botones "Ver" (abre la
   ficha completa — antes solo se descubría clicando la fila), "Editar"
   (frame nuevo para nombre/WhatsApp/correo, con `alumnoEditarAccion` que
   actualiza prospecto y refleja en la cuenta de alumno; valida WhatsApp
   duplicado) y "Dar de baja" (el botón existente, ahora visible en la
   fila cuando el alumno es elegible — antes solo un gaje informativo).
3. ✅ **"Explicar con IA" mostraba HTML en código**: `requiereModulo()`
   usa `redirect()`, que en un Route Handler se vuelve un 307… que `fetch`
   SIGUE hasta una página HTML con status 200 — y el cliente streameaba
   ese HTML directo al textarea (pasaba cuando la sesión del admin
   expiraba). Fix doble: el endpoint responde 401 de texto (sin redirect)
   con `usuarioActual()`/`moduloPermitido()`, y el cliente además rechaza
   cualquier respuesta que no sea `text/plain` sin redirect (defensa en
   profundidad).
4. ✅ **Mascota con la silueta del logo/pantalla de carga**: la cabeza de
   Cerebrito ahora usa EXACTAMENTE el mismo trazo de dos hemisferios que
   dibuja la pantalla de carga (`OverlayCarga`), cerrado y relleno con el
   gradiente, escalado del viewBox 48 al 120 — mascota, logo y pantalla
   de carga comparten una sola forma reconocible. Fisura central como el
   "lomo" de la carga, solo ojos, manos-guante asomando a los lados.

### Corte 02-sep-2026 (2) — 549 explicaciones generadas + fix definitivo de "Explicar con IA"

**Explicaciones masivas**: las 549 preguntas activas no tenían explicación.
Se generaron con Claude (12 lotes en paralelo, ~453 caracteres promedio,
tono profesor InMath, reglas gramaticales citadas y apoyo en el texto de
lectura) y se cargaron con UPDATE idempotente (solo donde seguía vacía).
Respaldo previo de la tabla en
`/var/www/inmath/backup-reactivos-pre-explicaciones-20260902.sql`.
Resultado: 0 preguntas activas sin explicación.

**Contenido defectuoso detectado en el proceso** (autorizado por el
cliente): 28 "preguntas" eran texto de hoja de respuestas importado por
error ("Respuesta correcta del ejercicio 98: A…") y 6 de ortografía c/s/z
no tenían ninguna opción totalmente correcta — los 33 se DESACTIVARON
(siguen en el panel para reescribirse, quedan 516 activos). El id 521 sí
tenía opción correcta clara (conferencia-muchos-ocasión = c-ch-s) y solo
tenía mal la clave: se corrigió a la opción A.

**Fix definitivo de "Explicar con IA" (401 / HTML en el textarea)**: la
cookie de sesión del panel se emite con `path:"/panel"`, así que el
endpoint en `/api/reactivos/explicar-ia` JAMÁS la recibía — con
`requiereModulo` eso terminaba en redirect→HTML streameado, y con el fix
anterior en 401 "sesión expirada" aunque la sesión fuera válida. El
endpoint se movió a `/panel/api/reactivos/explicar-ia` (la cookie ya lo
alcanza) y el cliente apunta a la nueva ruta.

### Corte 03-sep-2026 — Auditoría responsive móvil del panel (v85)

Reporte del cliente con capturas desde iPhone; seis problemas, todos de
CSS, corregidos en `panel.css`:

1. **Pipeline — menú "Mover a…" quedaba DEBAJO de las tarjetas
   siguientes**: cada `.tarjeta-prospecto` forma su propio contexto de
   apilamiento (transition/transform), así que el z-index 999 del menú
   solo competía DENTRO de su tarjeta. Fix: la tarjeta con el menú
   abierto se eleva (`.tarjeta-prospecto:has(.tp-mover-lista)
   { z-index: 80 }`).
2. **Fases — "+ Agregar fase" se salía del borde derecho**: el header
   `.rx-cab-espaciada` (filtro de curso min-width 260 + botón) no
   envolvía. En ≤560px el filtro toma su fila completa y el botón baja a
   la siguiente, ancho completo.
3. **Asistentes — Cancelar/Siguiente encimados sobre los campos** (visto
   en "Agregar curso"): el nav sticky tenía el ancho del contenido, así
   que al flotar dejaba ver el formulario entre y alrededor de los
   botones. Ahora es una franja OPACA de borde a borde del cuerpo
   (márgenes negativos que sangran sobre el padding), con border-top y
   z-index — el contenido pasa por debajo sin transparentarse, en
   escritorio y móvil.
4. **Alertas — "Guardar cambios" flotante tapaba la vista previa en
   móvil**: en ≤640px pasa a barra fija de borde a borde abajo (ancho
   completo), el marco de la vista previa emergente cambia a 4:3 con el
   contenido reescalado (.5) para que el título quepa, y `.al-frame`
   gana margen inferior para que nada quede tapado.
5. **Usuarios — filtros amontonados**: `.us-filtros` envuelve con gap
   real y los botones ganan padding táctil en móvil.
6. **Respiro general en móvil (≤700px)**: más padding del contenido a los
   bordes de pantalla (16px), dentro de `.cabecera`, `.pp-panel`,
   `.rx-panel`, tarjetas de stats y pasos del editor de alertas — ataca
   el "texto muy pegado a los bordes" reportado en todas las páginas.

Nota de verificación: el entorno de pruebas no permite reducir el
viewport real del navegador, así que las reglas de media query se
validaron simulando el ancho (390px) con las mismas declaraciones
inyectadas + verificación programática del z-index del menú del
pipeline; el nav de asistentes sí se verificó en vivo (aplica también en
escritorio).

### Corte 03-sep-2026 (2) — Eliminar registros/citas con motivo por correo + ficha de prospecto completa

**F1 — Eliminar registro (Alumnos y pagos + ficha del prospecto)**:
`registroEliminarAccion` borra POR COMPLETO un registro (prospecto + cuenta
de alumno + pagos + citas + bitácora + conversaciones, en transacción y en
el orden que exigen las FKs). Candados: solo si el prospecto NO tiene
ningún pago completado (si pagó, el botón ni aparece y el servidor lo
revalida), y el MOTIVO es obligatorio — se envía por correo al prospecto
ANTES de borrar (después ya no queda el dato). Botón "Eliminar" en cada
fila de /panel/alumnos y "Eliminar registro" en la ficha del prospecto
(accesible desde el pipeline con un clic — se decidió ahí y no en la
tarjeta del kanban para no facilitar borrados accidentales al arrastrar).

**F2 — Citas**: `citaCancelarAccion` cancela con motivo obligatorio que se
informa por correo (con botón para reagendar); candado: las citas del DÍA
EN CURSO no se pueden cancelar desde el panel (se coordinan directo).
`citaEliminarAccion` borra del historial citas YA PASADAS — decisión de
producto tomada: el histórico es limpiable, PERO solo si el prospecto no
tiene pago completado; si ya pagó, sus asesorías se conservan como
evidencia del servicio. Ambas acciones viven en la sección Citas de la
ficha del prospecto (a un clic desde el calendario de /panel/citas).

**F3 — Ficha del prospecto (/panel/prospectos/[id]) rediseñada**:
- Se ELIMINÓ el bloque "Conversación de WhatsApp": el canal de WhatsApp
  Business está deshabilitado por decisión del cliente (el sitio usa
  wa.me directo), así que siempre salía vacío. El componente
  `ChatConversacion` sigue en `ClienteProspecto.tsx` por si el canal se
  activa en el futuro — solo se desconectó de la página. [DOCUMENTADO
  también como comentario en el propio page.tsx para no perder el hilo.]
- "Ficha completa": ahora muestra nombre, WhatsApp, correo (el de la
  cuenta de alumno si existe, si no el del prospecto), etapa, fuente,
  puntaje, asesor, curso de interés, alta, y estado/fecha de la cuenta de
  alumno.
- Cada cita lista su LINK DE MEET clicable, además del estado y las
  acciones Cancelar/Eliminar según las reglas de F2.
- Layout a una columna centrada (el grid de dos columnas existía por el
  chat que ya no está).

Verificado end-to-end en local: eliminación completa de un prospecto de
prueba (transacción + cascadas), cancelación de cita futura (estado →
cancelada) y eliminación de cita pasada (fila borrada), con los candados
comprobados (botón oculto con pago pagado, "Cancelar" solo en futuras no
del día, "Eliminar" solo en pasadas sin pago).

### Corte 03-sep-2026 (3) — Botón "Ocultar/Mostrar Mathy" + vista previa fiel del emergente

**F1 — Mathy con botón de visibilidad (sitio, panel y portal)**: en móvil
la mascota flotante quedaba encimada sobre botones de acción (p. ej.
"Eliminar" en /panel/alumnos) y bloqueaba sus clics; el auto-ocultado por
scroll ("recogido", v98) no lo resolvía. Se RETIRÓ ese comportamiento por
completo y se reemplazó por un botón en el encabezado de cada zona:

- `src/components/MathyVisibilidad.tsx` (nuevo): hook `useMathyVisible` +
  botón `MathyToggleBoton` ("Ocultar Mathy" / "Mostrar Mathy"). Estado en
  `localStorage` (clave `mathy_visible`, default VISIBLE) sincronizado
  entre componentes con un CustomEvent (`mathy:visibilidad`) y entre
  pestañas con el evento `storage`.
- SOLO en el panel de admin y en el portal del alumno, en ambos casos
  JUNTO AL LOGO. Diseño final (03-sep-2026, tras feedback de que un ícono
  de ojo no comunicaba que era para la IA): MINI-CARITA de Mathy — la misma
  cara del asistente flotante (círculo blanco, anillo azul, dos ojos).
  Despierta = visible; dormida (ojos cerrados + "z", tonos apagados) =
  oculta. En el panel es solo la carita (texto en tooltip/aria-label); en
  el portal la píldora incluye la acción escrita ("Ocultar/Mostrar a
  Mathy"). Antes estuvo en el widget de perfil (panel) y en el menú
  (portal). En la LANDING el botón NO
  existe (corrección de producto del mismo día): al visitante no se le da
  ese control y Mathy siempre se muestra ahí — la landing tampoco LEE el
  estado guardado, porque el localStorage se comparte entre zonas y ocultar
  a Mathy en el panel no debe quitarlo de la página pública.
- Al ocultarse, el componente devuelve `null` (no `display:none`): no
  queda NINGÚN área clickeable encima de los botones de abajo.
- CSS muerto de "recogido" retirado de inmath.css y panel.css (con nota
  en su lugar apuntando a MathyVisibilidad.tsx).

**F2 — Vista previa del emergente = MISMO componente que la landing**: la
vista previa en /panel/alertas no se parecía al popup real (faltaban el
marcador, el CTA "Inscribirme", "Quizá después" y el botón de cerrar; el
escalado 16:10 + scale(.62) recortaba contenido). Regla pedida por el
cliente: NADA hardcodeado, la estructura es configurable.

- `AlertaEmergente.tsx` ahora exporta `AlertaEmergenteLienzo`, la ÚNICA
  fuente de verdad de la estructura del popup (fondo, velo, cerrar,
  kicker, cuenta regresiva, título, texto, plan, marcador, CTA y "Quizá
  después"). La landing Y el preview del panel renderizan ESTE componente;
  el prop `preview` solo desactiva navegación/cierre y muestra
  placeholder de título.
- panel.css: el bloque de estilos del preview se reescribió como ESPEJO
  del CSS real del sitio, scoped a `.al-em-marco`, con ALTO SEGÚN
  CONTENIDO (sin aspect-ratio ni transform: scale): ningún elemento puede
  quedar recortado, se configure lo que se configure. Si cambia el diseño
  del emergente en inmath.css hay que reflejarlo ahí (nota en el propio
  CSS).

**F3 — Los asistentes por pasos se "guardaban solos" al llegar al último
paso** (reportado en Usuarios, aplicaba a TODOS los asistentes del panel):
el botón "Siguiente" (type="button") y el de guardar (type="submit")
comparten posición en el JSX; al hacer clic en "Siguiente" del penúltimo
paso, React MUTABA ese mismo nodo del DOM a type="submit" ANTES de que el
navegador procesara la acción por defecto del clic → el formulario se
enviaba solo. Arreglo: `key="paso-siguiente"` en el botón "Siguiente" para
que React REEMPLACE el nodo en vez de mutarlo (9 asistentes: Usuarios
editar/crear, Precios curso/cupón, Reactivos examen/reactivo, Citas,
Fases, Personalizar login). Comentario explicativo en ClienteUsuarios.tsx.

**F4 — Texto pegado a los bordes en el modal de Precios** (reportado con
captura): `.us-frame-asistente` tiene `padding: 0` porque cada región
interna se rellena sola — pero la vista previa "Así se ve para el alumno"
(`.pp-preview`) y el botón "Eliminar curso" (`.us-eliminar-form`) viven
FUERA de esas regiones y quedaban al ras del borde. Se les dio relleno
propio (16/12px vertical, 26px lateral, igual que la cabecera) y al
"Eliminar…" un border-top separador. Auditados los 6 apartados con modal
asistente: los únicos bloques sueltos eran estos dos de Precios y el
"Eliminar del carrusel" de Personalizar login (mismo arreglo, misma clase).

**F5 — Badge "1 Issue" del dev overlay en local**: era nuestra propia CSP
de hardening (next.config.ts) bloqueando el `eval()` que React usa SOLO en
modo desarrollo para reconstruir callstacks. Arreglo: `'unsafe-eval'` se
agrega a script-src ÚNICAMENTE cuando NODE_ENV ≠ production — el build de
producción emite la CSP exactamente igual que antes (verificado con curl:
prod no incluye unsafe-eval). Barrido de consola sin errores en local
(/, /agenda, /pago, /panel, /panel/citas, /panel/alumnos, /panel/precios)
y en producción (/, /pago) tras el deploy v60.

### Corte 03-sep-2026 (4) — Píxel de Meta en el sitio público

Instalado el píxel de Meta (ID 1777137036800940, proporcionado por el
cliente) SOLO en el sitio público — landing, /agenda, /pago y demás páginas
del grupo (sitio); nunca en el panel ni en el portal.

- `src/components/MetaPixel.tsx` (nuevo): snippet base con next/script
  (afterInteractive) + fallback <noscript>. Como Next navega sin recargar,
  un efecto sobre usePathname dispara un PageView extra en cada cambio de
  ruta (sin él Meta solo contaría la primera página de cada visita).
- CSP (next.config.ts): se autorizaron los dominios del píxel —
  connect.facebook.net en script-src/connect-src y www.facebook.com en
  img-src/connect-src. Todo lo demás sigue bloqueado.
- Verificado en local por red: fbevents.js 200, beacon PageView 200 con el
  ID correcto, y segundo PageView al navegar / → /agenda sin recarga.
  Verificado en producción: el HTML sirve el píxel y responde 200.
- Siguiente paso DEL CLIENTE: volver al asistente de Meta Events Manager y
  confirmar la instalación (paso 3), o probar con la extensión Meta Pixel
  Helper sobre inmath.lumiaaisolutions.com.

### Corte 03-sep-2026 (5) — Cierre del día: iteraciones de Mathy, kit de identidad y limpieza

**F6 — Iteraciones del toggle de Mathy tras feedback del cliente** (v61→v64,
todo en producción):
- v61: el botón se RETIRÓ de la landing (decisión de producto: al visitante
  no se le da ese control; Mathy siempre visible ahí). Como el localStorage
  se comparte entre zonas, la landing tampoco LEE el estado — ocultarla en
  el panel no la quita de la página pública.
- v62: el botón se movió JUNTO AL LOGO en panel y portal (antes: widget de
  perfil / menú del header).
- v64: rediseño final como MINI-CARITA de Mathy (despierta = visible;
  dormida con "z" = oculta; texto de acción en el portal). Detalle completo
  en sistema-de-diseno.md.

**F7 — Píxel de Meta (v63)**: ver corte (4) arriba. En producción y
verificado por red; falta solo que el cliente confirme en Events Manager.

**F8 — Kit de identidad gráfica**: carpeta `~/Desktop/Identidad InMath/`
con guía HTML de marca, logos, mascota en SVG/PNG y OG de redes — detalle
en sistema-de-diseno.md. Pensado para que marketing/diseño produzca piezas
sin tocar código.

**F9 — Limpieza e infraestructura**:
- Eliminado `src/app(panel)_tmp` (archivo vacío colado por el typo de una
  tarea de shell) del repo y del VPS.
- Documentada en despliegue-vps.md la lección del deploy con 500: `npx
  prisma generate` en el VPS es obligatorio en CADA deploy (el cliente
  Prisma de la Mac no sirve en Linux).
- CSP: `unsafe-eval` solo en desarrollo + dominios del píxel de Meta
  (detalle en auditoria-seguridad.md).

**Estado al cierre**: producción estable (v64 + píxel), consola limpia en
sitio/panel/portal local y en producción, árbol de git limpio. PENDIENTES
VIVOS: (a) verificación visual del toggle en /portal con sesión de alumno
— el agente no teclea contraseñas, queda en manos del usuario; (b) cliente:
confirmar píxel en Meta Events Manager, fotos reales de la sesión, fecha de
inicio del curso y política de asesorías extra; (c) solo si se retoman:
WhatsApp Business API y Google Calendar OAuth en n8n.

### Corte 03-sep-2026 (6) — Links de Meet que no llegaban: cadena de respaldo completa

**Reporte del cliente**: cita agendada desde /agenda sin evento en Calendar y
sin link de Meet para nadie; el correo de confirmación decía "en breve te
compartimos el enlace" y ese enlace nunca llegó.

**Diagnóstico (verificado con pruebas reales)**: el workflow 03 de n8n (el
"robot" que crea el evento de Calendar + Meet) está ROTO desde el 02-sep —
responde "Error in workflow" (HTTP 500) sin siquiera registrar ejecución;
la última exitosa fue el 02-sep 02:54. La estructura del workflow, el
webhook y la credencial de Google están íntegros en su BD; el fallo es al
instanciar. Pendiente: reiniciar el contenedor n8n (bloqueado por permisos
del agente — lo aprueba el usuario). HALLAZGO ADICIONAL: la carpeta
`scripts/` del VPS (crons de vencimiento de pagos y recordatorio de
disponibilidad) había sido BORRADA por el `rsync --delete` de algún deploy
porque no vivía en el repo — esos crons llevaban tiempo fallando en
silencio. Recreados DENTRO del repo (inmath-next/scripts/) para que viajen
con cada deploy.

**Solución implementada (decisión del cliente: robot titular + respaldo +
red de seguridad)** — TODO desplegado y el cron activo:

1. **Cadena del link** (`conseguirLinkCita` en src/lib/agenda.ts): 1º el
   robot n8n; si falla, 2º el sitio crea el evento DIRECTO en Google
   Calendar con Meet (`src/lib/google-calendar.ts`, cuenta conectada por
   OAuth; reutiliza el cliente de Google del login con scope
   calendar.events y refresh token en `configuraciones`).
2. **Conectar el respaldo**: tarjeta "Enlace de Meet de las asesorías" en
   /panel/configuracion (solo admin) con botón "Conectar Google Calendar"
   → OAuth por /panel/api/google-calendar/conectar → rama `gcal_` del
   callback de Google. PENDIENTE DEL CLIENTE: pulsarlo una vez con
   cursosinmath@gmail.com (puede salir la advertencia de "app no
   verificada" de Google por el scope sensible — Avanzado → continuar).
3. **Red de seguridad**: (a) banner ROJO en todo el panel cuando hay citas
   activas futuras sin link; (b) en la ficha del prospecto, la cita sin
   link muestra gaje "sin link" + botones "Generar link" (reintenta la
   cadena) y "Pegar link" (Meet hecho a mano) — en AMBOS casos el correo
   al prospecto sale AUTOMÁTICO al guardar (`citaLinkGenerarAccion` /
   `citaLinkGuardarAccion`); (c) reintento automático cada 10 min
   (`POST /api/citas/reparar-links` + scripts/reparar-links-citas.sh en
   crontab): repara, envía el correo al prospecto solo, y si una cita
   cumple 10-20 min sin link manda UN correo urgente al staff; (d) los
   correos de "cita sin link" al staff ahora son ⚠️ URGENTES y explican
   qué hacer; el correo al prospecto sin link promete el enlace "en unos
   minutos" (respaldado por el reintento).

**Estado**: cita #11 (Jorge, 03-sep 22:00) resuelta a mano por el staff;
cita #10 (Danna, 03-sep 20:00) ya pasó sin link — contactarla aparte.
Pendientes: aprobar reinicio de n8n + clic del cliente en "Conectar Google
Calendar".

**RESOLUCIÓN (misma noche, 03-sep)**: causa raíz del robot encontrada y
corregida EN EL EDITOR de n8n (sesión del usuario): la actualización de n8n
a la serie 2.x (~01-sep) introdujo el modelo de borrador/publicación — el
flujo 03 quedó "activo" pero SIN VERSIÓN PUBLICADA (la cirugía del 02-sep
editó la BD directo y nunca publicó), por eso cada llamada moría al
instante con "Error in workflow" sin registrar ejecución. Fix: botón
Publish sobre el borrador bueno (3 nodos, sin el nodo duplicador).
Verificado end-to-end con la cita real #10 (Danna): HTTP 200, evento en
Calendar y meet_link guardado en BD. El cliente además conectó el RESPALDO
directo (cursosinmath@gmail.com) en /panel/configuracion. Cadena completa
operativa: robot ✓ → respaldo directo ✓ → red de seguridad ✓.
PENDIENTES MENORES: borrar del calendario de cursosinmath@gmail.com los
eventos de prueba ("Asesoría Cursos Inmath — Prueba…"), y contactar a
Danna (su cita de las 20:00 ya había pasado cuando se generó el link) para
reagendar o compensar. LECCIÓN (para el .md de n8n): en n8n 2.x todo
cambio de flujo requiere PUBLISH; editar la BD a mano deja el flujo activo
pero muerto.

**F10 — Respaldo de Calendar por PERMISO, no por rol** (pedido del usuario,
misma noche): la tarjeta "Enlace de Meet de las asesorías" de
/panel/configuracion (y su ruta de conexión OAuth) ahora se controla con el
módulo nuevo **"Respaldo de Google Calendar"** (`calendario_respaldo`) en
los interruptores de "Módulos permitidos" de /panel/usuarios. Los
administradores lo tienen siempre (regla general de módulos); a los
asesores se les otorga usuario por usuario. Los asesores existentes con
lista explícita de módulos NO lo ven hasta que se les active.

**F10 (ajuste) — El permiso del respaldo aplica TAMBIÉN a administradores**:
al probar, el cliente no podía apagar interruptores de un admin (regla
"los administradores ven todo" + la lista blanca del servidor no incluía
el módulo nuevo, así que ni en asesores persistía). Arreglo doble:
`calendario_respaldo` es ahora un permiso EXPLÍCITO (`moduloExplicito` en
sesion.ts, sin pase automático por rol) — su interruptor se puede
prender/apagar aun en admins (el resto de módulos sigue fijo para admins)
— y la lista blanca de usuarioGuardarAccion ya lo acepta. Usuarios legado
con módulos NULL ("todos") sí lo tienen hasta que se les edite.

**F11 — Borrar usuarios definitivamente** (/panel/usuarios): botón "Borrar
usuario definitivamente" en la ficha, visible SOLO cuando la cuenta ya
está bloqueada. Candados del servidor (usuarioBorrarAccion): no borrarte a
ti mismo, cuenta bloqueada primero, y CERO registros vinculados (citas,
prospectos asignados, conversaciones, reactivos/exámenes/fases/cupones/
prompts/configs creados) — si tiene historial, el sistema lo explica y la
cuenta se conserva bloqueada como histórico. "Bloquear acceso" sigue
siendo el camino normal.

**F10 (ajuste 2) — Los interruptores de módulos aplican a TODOS los roles**:
el cliente quería restringir módulos también a administradores (solo el de
Calendar se dejaba). Cambio de modelo: `moduloPermitido` ya NO da pase
automático a admins — los interruptores de /panel/usuarios mandan para
todos (modulos NULL de usuarios legado sigue siendo "todos"). El sidebar
de admins oculta Reactivos y Precios si se les apagan; los apartados sin
interruptor (Disponibilidad, Materiales, Fases, Alertas, Personalizar
login, Usuarios) siguen siendo de admins siempre. CANDADO ANTI-BLOQUEO:
nadie puede editarse sus propios módulos — en tu propia ficha los chips se
ven fijos y el servidor los ignora (te los ajusta otro administrador), así
ningún admin se deja fuera por accidente.

**F12 — Duplicados de eventos con links distintos (carrera robot vs
respaldo)**: al probar, una cita generó DOS eventos con DOS Meets. Causa:
n8n tardó más del timeout de 20s → el sitio lo dio por caído y creó el
evento del respaldo → n8n terminó el suyo después. (No eran los permisos
de usuarios, como se sospechó.) Blindaje en TRES capas, desplegado:
1. Tras el timeout de n8n, el sitio espera ~8s re-leyendo la cita — si el
   link del robot aterriza tarde, se usa ese y no se crea otro evento.
2. Guardado ATÓMICO "el primero gana" (updateMany con meet_link IS NULL):
   si el respaldo pierde la carrera, su evento recién creado se BORRA del
   calendario vía API y se usa el del robot.
3. El PATCH /api/citas/{id} (por donde guarda n8n) tampoco sobreescribe un
   link existente: si llega tarde, borra el evento del robot y conserva el
   del respaldo. Nunca pueden quedar dos eventos.
Nota de la 2ª prueba (22:00): el agendado cayó en la ventana del deploy
v68 → correo URGENTE a las 22:34 y el reintento automático lo reparó solo
a las 22:40 con UN evento — la red de seguridad operando según diseño
(cadencia 10 min). Limpieza manual: de los eventos 5:00-5:30pm del 04-sep
en cursosinmath, conservar el de meet.google.com/oes-ewkm-ujo (es el del
sistema/correo) y borrar el otro (hbx-zqho-jfo).
