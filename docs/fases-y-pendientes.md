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
- **Credenciales de MercadoPago** (`MERCADOPAGO_ACCESS_TOKEN`,
  `MERCADOPAGO_WEBHOOK_SECRET`) — el driver ya está implementado y verificado
  contra la documentación oficial, solo falta que el cliente genere las
  credenciales de producción en su cuenta de MercadoPago. Ver [`pagos.md`](pagos.md).
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

### Pendientes tras respuestas del cliente (13-ago-2026)
- Credenciales de Mercado Pago + referencia OXXO (activar pago en línea).
- Fotos reales de la sesión (landing + carrusel del login).
- Confirmar con cliente: fecha de inicio del curso y política de asesorías
  extra (el bot hoy los deriva a la asesoría gratuita).
- UI de es_asesor en Panel→Usuarios (hoy se ajusta por soporte en BD).

### Lote de mejoras del panel solicitado el 13-ago (EN CURSO)
1. ✅ Logo protagonista en sitio, panel, login, carga y agente (v30 CSS).
2. ⬜ Alumnos: alta manual (form nombre/tel/curso → crea prospecto+alumno).
3. ⬜ Citas: alta manual (prospecto + asesor + fecha/hora, valida traslape).
4. ⬜ Usuarios: filtros por rol, tarjetas compactas (foto/nombre/correo/rol),
   clic abre frame con datos completos + Editar/Eliminar/Cerrar; "Agregar
   usuario" abre frame de creación (no tarjeta inline).
5. ⬜ Personalizar login: texto y ORDEN por imagen (requiere tabla o JSON
   `login_media` con archivo/titulo/texto/orden), galería clicable con frame
   de edición y preview como en el login; el login lee texto por slide.

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
