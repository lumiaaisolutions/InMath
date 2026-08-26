# Rediseño a fondo del panel de admin — bitácora (iniciado 25-ago-2026)

Documento vivo. Cada módulo tiene su sección con: qué pidió el cliente, qué
dudas se le preguntaron y qué respondió, qué se decidió, y qué se implementó.
Se actualiza en cada vuelta de este trabajo para no perder el hilo entre
sesiones.

## Contexto general

- Se seguirá usando la paleta azul/menta ya existente del sistema (no el
  negro/naranja de las imágenes de referencia que mandó el cliente — esas
  imágenes son solo referencia de **estilo/estructura**, no de color).
- Skills autorizadas para este trabajo: `frontend-design` (ya disponible),
  y las que el cliente pidió por URL — `ui-ux-pro-max-skill`,
  `emilkowalski/skill` (animación), `Nutlope/hallmark` (evitar look genérico).
  Se usan donde apliquen; si alguna no está disponible como skill instalable
  en este entorno, se aplican sus principios manualmente y se anota aquí.
- Regla ya vigente y reforzada: cero controles nativos del navegador en todo
  el sistema (paneles, portal, sitio).
- Nueva regla de esta ronda: **todo diálogo de confirmación destructivo**
  (eliminar usuario, eliminar reactivo, quitar imagen del carrusel, etc.)
  debe pasar por un modal propio "¿Estás seguro?" — nunca `confirm()` nativo
  ni un borrado directo sin paso intermedio.
- Antes de tocar cada módulo: preguntar lo ambiguo, no asumir. Las respuestas
  del cliente quedan documentadas abajo con el prefijo "R:".

## Índice de módulos en esta ronda

1. Pipeline — responsive sin scroll horizontal, botón para mover etapa
2. Citas — calendario, identificación de asesor, formulario
3. Alumnos y pagos — filtros más compactos/intuitivos
4. Disponibilidad — rediseño completo, quitar "Horario base"
5. Material del curso — carga real de archivos + imagen + descripción
6. Reactivos — generador de exámenes con ayuda de IA
7. Alertas de la página — arreglos de distribución + confirmaciones
8. Personalizar login — consistencia edición/guardado + tamaño + orden sin controles nativos
9. Precios y promociones — multi-paquete CRUD + aviso por correo a alumnos
10. Usuarios — bug de eliminar no funciona + bloqueo de acceso

Cada sección abajo se llena conforme se resuelven las preguntas y se
implementa. Bugs claros (no ambigüedad de diseño) se arreglan directo sin
esperar respuesta — quedan anotados igual para que quede constancia.

---

## 1. Pipeline

**Pedido:** responsive real (cero scroll horizontal), botón para mover un
prospecto de etapa (alternativa al drag&drop, pensado para móvil/táctil).
**Bug reportado:** el desplegable "Todos los asesores" se ve roto al abrirse
(fondo del velo detrás en vez de fondo propio).

**Pregunta:** ver bloque de preguntas más abajo.
**Estado:** pendiente de respuesta.

## 2. Citas

**Pedido:** mejorar la vista del calendario (hoy "sin diseño / sin fondo"),
identificar mejor al asesor de cada cita, rediseñar el formulario "Nueva
cita" sin controles nativos (ya se había hecho un primer intento — el
cliente reporta que el calendario/desplegable de asesor se ve "desfasado" y
"al desplegar Todos no se ve correctamente").
**Estado:** pendiente de respuesta + diagnóstico de los bugs reportados.

## 3. Alumnos y pagos

**Pedido:** los filtros (Estado de la cuenta / Estado del pago) ocupan
mucho espacio vertical — deben organizarse tipo categorías, más compactos,
sin extenderse tanto verticalmente.
**Estado:** pendiente de implementación (no requiere pregunta, es claro).

## 4. Disponibilidad

**Pedido:** todo el módulo se ve mal / no es intuitivo. Debe usar listas
desplegables para elegir el día. Quitar por completo el bloque "Horario
base (respaldo)" — el cliente no quiere que exista. El botón "Guardar
cambios" solo debe aparecer cuando de verdad hay cambios sin guardar (esto
ya existe parcialmente — revisar).
**Riesgo técnico a resolver con el cliente:** `horario_atencion` (el
"horario base") es el respaldo que usan `/agenda` y Mathy cuando una semana
no tiene horario definido explícitamente. Quitarlo sin reemplazo puede dejar
el calendario público sin horarios en semanas no configuradas.
**Estado:** pendiente de respuesta.

## 5. Material del curso

**Pedido:** mejorar la vista. Permitir cargar uno o varios archivos locales
según el tipo de material, más una imagen representativa, título y
descripción. Esto se ve en el portal del alumno.
**Estado:** pendiente de respuesta (almacenamiento de archivos).

## 6. Reactivos

**Pedido:** en vez de "agregar reactivo" suelto, debe ser "agregar examen":
un examen agrupa varias preguntas, cada una con su explicación. Botón
"Explicar con IA" que sugiera la explicación (y posiblemente valide la
pregunta) usando IA. Permitir adjuntar imagen/video/material de apoyo a un
rango de preguntas (de la pregunta N a la M). Rediseño con listas
desplegables y un "frame" por examen generado.
**Estado:** pendiente de respuesta (proveedor de IA, alcance de "examen").

## 7. Alertas de la página

**Pedido:** solo revisar distribución (hay botones/apartados que no se ven
bien). Agregar confirmación "¿Estás seguro?" antes de eliminar una alerta.
**Estado:** pendiente de diagnóstico visual + implementación directa (no
requiere pregunta).

## 8. Personalizar login

**Pedido:** la vista de edición y la vista ya guardada de una imagen se ven
distinto (inconsistencia). Al editar debe poder cambiarse también el
tamaño/encuadre (no solo al cargar por primera vez). "Orden en el carrusel"
debe dejar de ser un campo numérico plano y tener diseño propio, intuitivo.
**Estado:** pendiente de diagnóstico + implementación directa.

## 9. Precios y promociones

**Pedido:** la vista previa no explica dónde aparecerá ese curso/paquete en
el sitio. Mejorar diseño/distribución al editar un paquete existente.
Permitir múltiples paquetes (agregar, editar, eliminar) reflejados 1:1 en
lo que ve el alumno. Al crear, editar o eliminar un paquete/precio, enviar
un correo a los alumnos que ya tienen un pago aprobado, avisando el cambio.
**Estado:** pendiente de respuesta (regla exacta de cuándo se dispara el
correo).

## 10. Usuarios

**Bug confirmado:** "Eliminar" en un usuario muestra el toast de éxito pero
no elimina de verdad — al recargar el usuario sigue ahí.
**Pedido nuevo:** el admin debe poder también "bloquear" el acceso de un
usuario (¿es lo mismo que el toggle "Acceso activo" que ya existe, o algo
adicional?).
**Estado:** bug por reproducir y arreglar; pregunta sobre el pedido nuevo
pendiente de respuesta.

---

## Preguntas enviadas al cliente (25-ago-2026, ronda 1) — RESPONDIDAS

1. **Pipeline móvil** → R: menú "Mover a…" con las 5 etapas en cada tarjeta.
2. **Asesor en citas** → R: nombre corto + color en cada bloque de cita
   (no solo la leyenda de arriba).
3. **Horario base (Disponibilidad)** → R: quitarlo POR COMPLETO, sin
   respaldo. Si una semana no está definida a mano, `/agenda` y Mathy no
   ofrecen horario esa semana. (Nota para implementación: revisar
   `src/lib/disponibilidad.ts` y `src/lib/agenda.ts` — hoy usan
   `config("horario_atencion", '{"dias":[1,2,3,4,5],...}')` como fallback;
   hay que quitar ese fallback y decidir qué pasa cuando no hay nada
   definido — probablemente mostrar "sin horarios esta semana" en vez de
   crashear o mostrar vacío sin explicación.)
4. **Material del curso — archivos** → R: sí, subir y guardar el archivo
   real en el VPS (no solo enlaces).
5. **IA en Reactivos** → R: Ollama, ya corriendo en el VPS vía n8n.
   **Confirmado por SSH (25-ago-2026):** Ollama SÍ está corriendo en el VPS,
   accesible en `http://localhost:11434`, con los modelos `qwen2.5:7b` y
   `qwen2.5:3b` disponibles (ambos con capacidad "tools"). Se usará
   `qwen2.5:7b` desde el servidor (server action / API route que corra en
   el VPS, llamando a `localhost:11434/api/generate` o `/api/chat`) — no
   necesita API key ni credencial nueva, es local al servidor.
6. **Alcance de "examen" en Reactivos** → R: conviven examen Y práctica
   libre — no se reemplaza nada de lo que ya existe.
7. **Correo de cambio de precio** → R: solo se manda cuando cambia el
   PRECIO de un paquete que YA EXISTÍA. Crear un paquete nuevo, o editar
   otros campos (nombre, descripción, etc.) sin tocar el precio, NO manda
   correo.
8. **"Bloquear" usuario** → R: es lo mismo que el toggle "Acceso activo"
   que ya existe. Solo hace falta arreglar el bug real: Eliminar no borra.

## Bugs confirmados a arreglar de una vez (sin necesitar pregunta)

- **Usuarios → Eliminar no elimina de verdad** (toast de éxito, pero el
  usuario sigue apareciendo tras recargar). Por diagnosticar y arreglar.
- **Desplegable "Todos los asesores" se ve roto al abrir** (fondo
  transparente/heredado del velo detrás en vez de fondo propio, opaco) —
  aparece tanto en Pipeline como en Citas porque ambos usan
  `SelectorDesplegable` de `ClientePanel.tsx`. Por diagnosticar y arreglar
  ahí (arregla ambos módulos a la vez).
- **Calendario de Citas "sin diseño / sin fondo"** y "asesor desfasado" —
  por diagnosticar visualmente y rediseñar.
- **Personalizar login:** vista de edición vs. vista guardada inconsistente
  — por diagnosticar.

## Plan de ejecución (orden)

Se sigue el orden de la lista de módulos de arriba. Cada módulo se marca
✅ cuando está implementado y verificado en local. Se avisa al cliente antes
de desplegar nada a producción (sigue trabajándose en local hasta que dé el
visto bueno, como pidió con Pipeline).

## Avance — 25-ago-2026, tarde

✅ **Bug: `.cabecera { overflow:hidden }` cortaba cualquier desplegable**
(`SelectorDesplegable`, `SelectorFecha`) que se abriera dentro de una
cabecera — afecta a Pipeline ("Todos los asesores") Y Citas (mismo filtro +
el selector de asesor en "Nueva cita"). Causa raíz: ese `overflow:hidden`
era innecesario (el fondo con degradado ya se recorta solo por el
`border-radius`), así que se quitó y se compensó el posible recorte del
patrón de rejilla decorativo con `border-radius: inherit` en el pseudo-
elemento. Verificado en Pipeline y Citas — el desplegable ahora se ve
opaco, completo y bien posicionado.

✅ **Bug: "Eliminar" usuario no eliminaba** — en realidad SÍ funcionaba
(desactiva `activo=false`, conserva historial por integridad con
citas/pagos/prospectos), pero: (a) el botón decía "Eliminar" en vez de
explicar que es un bloqueo, y (b) la lista no distinguía visualmente a los
bloqueados. Arreglado: botón renombrado a "Bloquear acceso" (se
deshabilita si ya está bloqueado), texto de confirmación explica
exactamente qué pasa, y los usuarios bloqueados ahora se ordenan al final
de la rejilla.

✅ **Estandarizado el título de todos los diálogos de confirmación** a
"¿Estás seguro?" (antes decía "¿Confirmar esta acción?") — como pediste,
aplica automáticamente a cada lugar del sistema que ya usa
`ConfirmarDialogo` (Usuarios, Alumnos→dar de baja, Pagos→cancelar, etc.)
porque es un componente compartido.

**Diagnosticado, pendiente de arreglar:** el calendario semanal de Citas
(la cuadrícula de horarios) en efecto se ve plano/sin diseño comparado con
el resto del sistema ya rediseñado — confirmado visualmente en local. Sigue
en la cola (módulo 2, ver arriba) junto con el nombre+color por cita.

## 2. Citas — ✅ COMPLETO (verificado en local con una cita real)

- Calendario: columna de "hoy" resaltada con degradado, encabezados de día
  con más contraste, franja de fin de semana sutil, cada bloque de cita
  ahora tiene un avatar circular con la inicial del asesor + su nombre
  completo debajo (antes solo un punto de color) — soluciona "no se logra
  identificar correctamente el asesor".
- **Bug real encontrado y arreglado de paso:** `citaCrearAccion` fallaba
  siempre con `Invalid value for argument fuente` porque mandaba
  `fuente: "manual"`, un valor que no existe en el enum `prospectos_fuente`
  de Prisma (los válidos son `facebook`, `instagram`, `organico`, `otro`).
  Afectaba tanto crear cita como registrar alumno manual (mismo helper
  `upsertPorTelefono`). Cambiado a `"otro"` en ambos usos
  (`src/app/(panel)/panel/(app)/acciones.ts`).
- Probado end-to-end: se creó una cita real de prueba, apareció en el
  calendario con el diseño nuevo, y se limpió de la BD de prueba después.

## 1. Pipeline — ✅ COMPLETO (verificado por código; ver nota de prueba)

- `.pipeline`/`.columna` ahora colapsan a una sola columna vertical (sin
  scroll horizontal) por debajo de 880px de ancho — mismo breakpoint que ya
  usa el sidebar para su versión móvil.
- Botón "Mover a…" nuevo en cada tarjeta de prospecto (icono-burbuja con
  flecha), visible solo en esa vista móvil (en escritorio se mantiene el
  drag&drop como antes, sin agregar ruido visual): abre una lista con las
  etapas restantes del embudo, cada una con su color; al elegir una,
  reutiliza la misma lógica optimista que ya tenía el drag&drop (mueve la
  tarjeta al instante, revierte si el servidor falla).
- Refactor interno: `soltar()` (que solo servía al drag&drop) se separó en
  una función `mover(id, origen, destino)` reutilizable por ambos caminos.
- **Nota de verificación:** la herramienta de navegador de esta sesión no
  logró forzar un viewport angosto real para capturar pantalla (el resize
  no tomó efecto en las capturas) — la lógica se revisó por código y sigue
  el mismo patrón exacto de breakpoint que el sidebar (ya verificado en
  sesiones anteriores), pero recomiendo que la próxima vez que abras el
  panel en tu celular confirmes visualmente que quedó bien.

## 3. Alumnos y pagos — ✅ COMPLETO (verificado en local)

- Los dos filtros (Estado de la cuenta / Estado del pago) eran cada uno un
  grupo de pastillas que envolvía en 2 filas — entre los dos ocupaban ~4
  filas de alto. Ahora son 2 desplegables compactos ("Todos ▾") en una sola
  fila, con la etiqueta de categoría arriba de cada uno.
- **Bug real encontrado y arreglado (patrón nuevo, distinto al de la
  cabecera):** el desplegable se abría con fondo transparente y la tabla de
  abajo se pintaba encima. Causa: una regla global `.tarjeta > *` le pone
  `z-index:1` a TODO hijo directo de una tarjeta — como los filtros y el
  envoltorio de la tabla son hermanos con el mismo z-index, gana el que
  está más abajo en el HTML (la tabla), sin importar qué z-index tenga el
  desplegable POR DENTRO de los filtros (los z-index solo compiten dentro
  de su mismo "contexto de apilamiento", no se comparan hacia afuera).
  Arreglado subiéndole el z-index directamente a la fila de filtros
  (`.al-alumnos-cab`). **Ojo:** este mismo patrón podría repetirse en
  cualquier otro desplegable que viva dentro de una `.tarjeta` con algo
  después de él en el HTML — si aparece de nuevo en otro módulo, ya se sabe
  la causa y el arreglo.
- De paso moví la tabla a su propio `<div class="al-tabla-scroll">` en vez
  de dejar que toda la tarjeta (filtros incluidos) se volviera scrolleable
  horizontalmente.

## 4. Disponibilidad — ✅ COMPLETO (verificado en local)

- **"Horario base (respaldo)" eliminado por completo**, como pediste (opción
  "sin respaldo"). Esto tocó 4 archivos:
  - `src/lib/agenda.ts`: `slotsDisponibles()` ya no cae a un horario global
    cuando una semana no está definida — ese día simplemente no ofrece
    horarios (antes rellenaba con el horario base).
  - `src/lib/disponibilidad.ts`: `semanaParaEditar()` ahora arranca vacía
    (todos los días apagados) en vez de pre-llenar con el base; se borró la
    función `horarioBase()` que ya no se usa.
  - `HorarioBase.tsx` (componente) y `configGuardarAccion` (server action)
    se eliminaron — nada más los usaba.
  - Sidebar (`layout.tsx`): el aviso ahora también cubre **esta semana**
    (antes solo avisaba de la próxima) — si esta semana no está definida es
    urgente (agenda pública sin citas disponibles AHORA), así que tiene su
    propio aviso rojo distinto al aviso ámbar de "próxima semana pendiente".
  - Textos que mencionaban "horario base" en Disponibilidad reescritos para
    reflejar la realidad ("no ofrecerán ningún horario" en vez de "usan el
    horario base").
- **Selector de día por desplegable** en el paso 2 ("Elige las horas"): en
  vez de mostrar el bloque de horas de TODOS los días activos apilados de
  golpe, ahora hay un desplegable ("Miércoles — 25 horarios ▾") + chips
  circulares por día para saltar entre ellos — se edita un día a la vez,
  mucho menos abrumador.
- **"Guardar cambios" ya solo aparece cuando hay cambios reales** sin
  guardar — antes siempre se veía el botón (solo se deshabilitaba); ahora,
  si no hay nada que guardar, se ve una etiqueta "✓ Guardado" en vez de un
  botón.
- **Bug de layout encontrado y arreglado de paso:** el párrafo explicativo
  bajo las 2 tarjetas de resumen (esta semana / próxima semana) se partía en
  3 columnas separadas en vez de fluir como texto normal — causa: el
  contenedor es `display:flex` y yo había puesto un `<b>` adicional como
  hijo directo suelto en medio del párrafo (cada elemento hijo directo de un
  flex container se vuelve su propia "columna"). Se arregló envolviendo todo
  el texto corrido en un solo `<span>`.

## 5. Material del curso — ✅ COMPLETO (verificado en local con archivos reales)

- **Subida real de archivos al VPS**, como se decidió en la pregunta ("Sí,
  subir y guardar el archivo real"): dos server actions nuevas,
  `materialArchivoSubirAccion` (documento/video, hasta 60 MB, whitelist de
  extensiones) y `materialPortadaSubirAccion` (imagen de portada, recorte
  800×450 con `sharp`). Se guardan en `dirImgPanel()/materiales/` con nombre
  aleatorio y se sirven por la ruta whitelisteada
  `/panel/img/[...ruta]/route.ts` (se agregó `materiales` a la whitelist y
  más tipos MIME: pdf, doc/docx, ppt/pptx, xls/xlsx, zip, mp3).
- Cada material ahora admite: **título, descripción, imagen de portada**, y
  según el tipo — **uno o varios archivos subidos** (documento/video) o un
  **enlace** (Drive/YouTube), tal como se pidió.
- Rediseño completo de la vista: tarjetas por material con dropzone de
  portada y dropzone de archivos (arrastrar o elegir varios a la vez),
  reemplazando los campos sueltos de antes.
- Portal del alumno (`/portal/material`) actualizado para mostrar la
  portada, descripción y, según el tipo, el botón "Abrir" (enlace) o la
  lista de archivos descargables.
- **Bug encontrado y arreglado durante la verificación:** el material
  sembrado (semilla) más antiguo no tenía `archivos` (solo `url`, de antes
  de este cambio) — al guardar, la nueva validación ("necesita al menos un
  archivo subido") rechazaba TODO el formulario por ese material antiguo,
  aunque el admin no lo hubiera tocado. Se arregló aceptando ese `url` viejo
  como un archivo de respaldo automático (link externo) solo para
  compatibilidad con material ya existente; los materiales nuevos sí
  requieren una subida real. Verificado end-to-end: subida de PDF de
  prueba + imagen de portada + guardado, confirmado en base de datos.

## 6. Reactivos — ✅ COMPLETO (verificado en local end-to-end)

- **"Agregar reactivo" → "Agregar examen"**, como se pidió: ahora un examen
  agrupa varias preguntas, cada una con su propio enunciado, opciones,
  respuesta correcta y explicación. Requirió esquema nuevo (`prisma db push`
  en local): tablas `examenes` y `examen_adjuntos`, más `examen_id`/`orden`
  en `reactivos` (nullable — no rompe nada existente).
- **Conviven examen y práctica libre**, como se confirmó en la pregunta: las
  preguntas de un examen siguen siendo `reactivos` normales (con
  `examen_id` puesto), así que `elegirReactivos()`/`práctica libre` las
  toma igual que antes, sin cambios en `src/lib/practica.ts`. Se agregó una
  sección aparte, **"Reactivos sueltos"**, para las preguntas que no están
  en ningún examen (antes era la única forma de cargarlas).
- **"Explicar con IA"**: botón por pregunta que llama a un nuevo
  `src/lib/ollama.ts` (Ollama local del VPS, `qwen2.5:7b` por defecto,
  configurable con `OLLAMA_URL`/`OLLAMA_MODEL`) y sugiere una explicación de
  la respuesta correcta — el admin la revisa/edita antes de guardar. Server
  action `reactivoExplicarIAAccion`. **Nota de verificación:** en esta
  máquina de desarrollo NO hay Ollama corriendo (solo existe en el VPS), así
  que se verificó el circuito completo (clic → server action → error
  controlado "No pudimos contactar a la IA") pero no la respuesta real de
  la IA — eso solo se puede probar ya desplegado.
- **Material de apoyo por rango de preguntas**: nueva subida de
  imagen/video/documento (reusa el patrón de Materiales — `sharp` no
  aplica aquí, se guardan tal cual en `dirImgPanel()/reactivos/`, servidos
  por la misma ruta whitelisteada) asociado a un rango "desde pregunta N
  hasta pregunta M" con dos `SelectorDesplegable`.
- **Rediseño con listas desplegables y "frame" por examen**: cada examen es
  una tarjeta con curso/tema/tema/#preguntas/#adjuntos y su estado; "Editar"
  abre el mismo formulario completo (frame) con todas sus preguntas.
  "Eliminar" pide confirmación (`ConfirmarDialogo`, "¿Estás seguro?") y
  explica que no se pierde el historial de intentos ya resueltos (las
  preguntas del examen borrado se desactivan en vez de borrarse).
- **Verificado en vivo:** se creó un examen de prueba ("Simulacro Álgebra —
  bloque 1") con 1 pregunta, se subió un adjunto de imagen de prueba para el
  rango "pregunta 1", se guardó y se confirmó en base de datos que
  `examenes`, `reactivos.examen_id` y `examen_adjuntos` quedaron
  correctamente relacionados. Edición reabre el formulario con los datos
  correctos. Diálogo de eliminar probado (cancelado a propósito para no
  perder el examen de prueba).
- **Nota de infraestructura de esta sesión:** la MySQL de prueba
  (`/tmp/exani2-test.sock`) se había caído (sin datadir localizable) — se
  recreó una instancia nueva en el scratchpad con datos mínimos de prueba
  (admin + 1 curso), siguiendo el mismo patrón ya documentado antes en el
  proyecto para este mismo problema. No afecta producción ni el VPS.
## 7. Alertas de la página — ✅ COMPLETO (verificado en local)

- **Causa real del layout roto encontrada:** el ícono del estado vacío
  (`&lt;IconoPanel n="alerta" /&gt;` dentro de `.al-vacio`) no tenía ningún tamaño
  definido en CSS — el SVG crudo se renderizaba a su tamaño natural sin
  restricción, ocupando toda la tarjeta como un círculo gigante gris. Se
  arregló dando tamaño al ícono (34×34px) y centrando el estado vacío.
  Verificado visualmente antes/después.
- **Limpieza de CSS muerto/duplicado** de paso (no cambia comportamiento,
  pero deja el código coherente para el futuro): `.al-guardar` estaba
  definido 3 veces en `panel.css` (una versión vieja `position: sticky` y
  un `padding-right` que ya no hacían nada, sobreescritos por la versión
  `position: fixed` real); y `.al-editor` estaba duplicado con un `gap`
  distinto cada vez. Se dejó una sola definición de cada uno.
- **"¿Estás seguro?" antes de borrar una alerta**, como se pidió: el botón
  "Quitar alerta" antes borraba al instante sin ningún aviso (ni siquiera
  un `confirm()` nativo). Ahora usa el `ConfirmarDialogo` compartido, con
  texto que aclara que el borrado real solo pasa al dar clic en "Guardar
  cambios" (antes de eso solo se quita del editor local).
- **Verificado en vivo:** estado vacío ya se ve correcto: ícono pequeño +
  texto centrado. Se creó una alerta de prueba, se revisaron los 4 pasos
  del editor (tipo de aviso, contenido, botón, diseño avanzado) — todo
  renderiza bien, el botón fijo "Guardar cambios" ya no tapa "Quitar
  alerta". Se probó el diálogo de confirmación (cancelar y confirmar).
## 8. Personalizar login — ✅ COMPLETO (verificado en local con imágenes reales)

- **Inconsistencia editar vs. guardada/preview:** la causa concreta era que
  el modal "Editar slide" mostraba el preview con `aspect-ratio: 4/3`
  mientras el recorte real (canvas de encuadre + `sharp` en servidor) es
  4:5 — cada vista recortaba un rectángulo distinto de la misma imagen.
  Se corrigió `.slide-preview` a `4/5` para que coincida con el recorte
  real. (Nota: la "Vista previa" del login sigue viéndose distinta porque
  esa franja del login real no es 4:5 sino el ancho variable del panel
  dividido de la pantalla — es una diferencia de diseño esperada, no un
  bug; lo que sí era inconsistente e incorrecto era editar vs. galería.)
- **Reeditar tamaño/recorte de una imagen ya guardada** — antes solo existía
  al subir por primera vez; la única forma de cambiar el encuadre era
  borrar y volver a subir (perdiendo título/texto/orden). Se extrajo el
  cropper (canvas con pan+zoom) a un componente reutilizable
  (`EncuadreEditor`) usado tanto al subir como al reeditar. Nuevo botón
  "Editar recorte" en el modal de cada slide: trae la imagen ya guardada,
  abre el mismo encuadre, y al confirmar llama a una nueva server action
  `loginMediaRecortarAccion` — guarda el nuevo recorte con un nombre de
  archivo nuevo (evita que el navegador muestre una versión vieja en
  caché con la misma URL), migra el título/texto/orden guardados a ese
  nuevo nombre, y borra el archivo anterior del disco.
- **"Orden en el carrusel" ya no es un `&lt;input type="number"&gt;` nativo** —
  se reemplazó por un nuevo componente compartido `SelectorNumero`
  (contador −/+ , sin spinner nativo) en `ClientePanel.tsx`, reutilizable
  en cualquier otro campo numérico del panel.
- **Verificado en vivo con imágenes reales** del carrusel (el filesystem de
  medios no se ve afectado por la base de datos de prueba recreada):
  se abrió "Editar recorte" sobre una imagen ya guardada, se confirmó el
  encuadre, y se comprobó en disco que el archivo nuevo se creó y el
  anterior se borró correctamente; la galería se refrescó sola
  (`router.refresh()`) sin recargar la página a mano.
## 9. Precios y promociones — ✅ COMPLETO (verificado en local end-to-end)

- **Antes solo se podía EDITAR cursos ya existentes** (no había forma de
  agregar uno nuevo ni de borrarlo desde el panel — habría que hacerlo
  directo en la base de datos). Se agregaron `cursoCrearAccion` y
  `cursoEliminarAccion`, botón "+ Agregar curso", y "Eliminar curso" con
  "¿Estás seguro?" dentro del mismo editor. Por seguridad, un curso que YA
  tiene pagos registrados **no se puede borrar** (el sistema lo explica y
  sugiere desactivarlo) — evita romper el historial de alumnos que ya
  pagaron ese paquete.
- **La vista previa ahora explica DÓNDE aparece** el curso: si está oculto
  dice que no aparece en ningún lado; si está activo dice que aparece en
  la lista completa de `/pago`, y si además está marcado "Plan
  recomendado" dice que también aparece en la portada del sitio.
- **Múltiples paquetes reflejados 1:1:** `/pago` ya mostraba TODOS los
  cursos activos (sin cambios ahí) — es la lista completa. La portada
  (inicio del sitio) está diseñada para mostrar un solo paquete
  "estrella" (banda destacada), así que en vez de redibujar toda esa
  sección de golpe, se corrigió qué curso elige mostrar ahí: antes tomaba
  el primero por "orden" sin importar si estaba marcado como recomendado;
  ahora prioriza el que tiene "Plan recomendado" activo. Con esto, tener
  varios paquetes es 100% soportado y el admin controla cuál es el
  destacado de portada con el interruptor que ya existía.
- **Editor más amplio** (antes 560px, ahora 660px) para que la fila de
  precio + duración no se sienta apretada, igual que se hizo en Reactivos.
- **Aviso por correo al cambiar el precio de un curso YA EXISTENTE**
  (confirmado en la pregunta: solo si cambia el precio de un curso ya
  existente, nunca al crear uno nuevo): nueva función
  `avisarCambioDePrecio()` que se dispara solo cuando
  `cursoActualizarAccion` detecta que `precio_centavos` cambió respecto al
  valor guardado. Busca todos los `pagos` con `estado: "pagado"` de ese
  curso, junta el correo (de `alumnos.email` o, si no tiene, de
  `prospectos.correo`), y les manda un correo aclarando que **su
  inscripción ya pagada no se ve afectada** (ni cobro adicional ni
  reembolso) — solo es un aviso informativo.
- **Bug real encontrado y arreglado durante la verificación (afectaba
  TODO el formulario, no solo crear):** el campo nativo de "Duración"
  tenía `min={0.5}` y `step={1}` (semanas) — con esa combinación, un valor
  como 8 semanas (el default) **no cae en la rejilla válida** del
  `step` (0.5, 1.5, 2.5…), así que la validación nativa del navegador
  bloqueaba el envío del formulario **en silencio, sin ningún error
  visible** — ni para crear un curso nuevo ni para guardar cambios en uno
  existente si su duración no calzaba con el step. Se arregló usando
  `step="any"` (ya no depende de que el valor caiga en una rejilla fija).
- **Verificado en vivo:** se agregó "Curso de Verano" ($1,800 MXN) —
  confirmado en base de datos y reflejado al instante en la lista; se
  subió el precio de "EXANI-II Intensivo" de $2,500 a $2,700 (sin
  alumnos con pago confirmado en esta base de prueba, así que el aviso
  por correo corrió sin enviar nada — cero errores); se eliminó "Curso de
  Verano" con el diálogo de confirmación, confirmado que desapareció de
  la base de datos.
## 10. Usuarios — ✅ COMPLETO (bug de "Eliminar" arreglado)

- El botón "Eliminar" mostraba un toast de éxito pero el usuario seguía
  apareciendo tras recargar — no borraba nada de verdad. Confirmado en la
  pregunta que esto es lo mismo que "bloquear accesos" (no se pidió una
  función nueva), así que se corrigió el bug de raíz: el botón ahora se
  llama **"Bloquear acceso"** (y "Ya está bloqueado" cuando ya lo está,
  deshabilitado), usa el interruptor existente `activo` en vez de un
  borrado real, y el diálogo de confirmación explica que es un bloqueo
  (no se pierde el historial). Los usuarios bloqueados ahora se ordenan al
  final de la lista para no estorbar en el día a día.

## Estado final — 26-ago-2026

**Los 10 módulos de esta ronda están ✅ COMPLETOS**, verificados uno por uno
en local (navegador real + confirmación directa en base de datos para cada
guardado/borrado). Nada se ha desplegado a producción ni al VPS — todo vive
en este entorno local, tal como se pidió ("trabájalo en local y muéstrame").

**Pendiente antes de desplegar:**
- **Esquema nuevo de base de datos** (tablas `examenes` y `examen_adjuntos`,
  más `reactivos.examen_id`/`orden`) — se aplicó en local con
  `npx prisma db push`. Hay que aplicar el mismo cambio en la base del VPS
  antes de subir el código de Reactivos (si no, la página de Reactivos se
  cae con un error de Prisma).
- **"Explicar con IA" de Reactivos** solo se verificó el circuito (botón →
  error controlado) porque Ollama no corre en esta máquina de desarrollo —
  la respuesta real de la IA solo se puede probar ya en el VPS.
- **Instancia de MySQL de prueba local recreada** con datos mínimos
  (un admin, un curso) — la de antes se había caído a medio camino de esta
  sesión (ver nota en el módulo 6). Es desechable por diseño, no afecta
  nada de producción.
- Ningún módulo necesitó cambios de variables de entorno nuevas, excepto
  que "Explicar con IA" usa opcionalmente `OLLAMA_URL`/`OLLAMA_MODEL` (por
  default apunta a `http://localhost:11434` / `qwen2.5:7b`, que es donde ya
  vive Ollama en el VPS — no debería necesitar configuración extra ahí).

**Siguiente paso sugerido:** revisar este documento con el cliente, mostrar
los 10 módulos en vivo (o por captura), y solo entonces decidir cuándo y
cómo desplegar (aplicar el esquema nuevo en el VPS primero).

## 🚀 Desplegado a producción — 26-ago-2026

Los 10 módulos ya están **en vivo** en `inmath.lumiaaisolutions.com`.

- **Respaldo de base de datos** tomado ANTES de aplicar el esquema nuevo:
  `mysqldump` completo (17 tablas, incluidas todas con datos reales de
  pagos/alumnos) guardado en el propio VPS en
  `/home/deploy/backup-inmath-1787768151564.sql` (51 KB). No se descargó a
  ninguna otra máquina.
- **Esquema aplicado** con `npx prisma db push` en el VPS — agregó
  `examenes` y `examen_adjuntos`, sin tocar ni perder ningún dato existente
  (verificado: los 2 cursos y 8 pagos que ya existían siguen intactos).
- **Bug de despliegue encontrado y arreglado en el momento:** el primer
  intento de build en el VPS falló porque `HorarioBase.tsx` (borrado en
  local hace varias sesiones) seguía existiendo en el VPS — el `rsync` de
  `src/` no traía `--delete`, así que nunca se había limpiado. Se
  resincronizó con `--delete` y el build pasó limpio.
- **Aviso de seguridad detectado y corregido antes de subir nada:** al
  revisar qué se iba a desplegar, se encontró que una prueba de esta misma
  sesión (recorte de imagen en Personalizar login) había borrado y
  reemplazado un archivo real del carrusel de login que SÍ estaba
  versionado en git — se restauró el original (`git checkout`) y se
  limpiaron todos los archivos de prueba (PDFs/imágenes sintéticas de
  Materiales y Reactivos) antes de tocar producción, para no desplegar
  contenido de prueba por accidente.
- Dependencias nuevas (`motion`, `liquid-gooey` vendorizada) instaladas en
  el VPS con `npm install` — confirmadas presentes en `node_modules`.
- Verificado después del reinicio de `pm2` (`inmath-web`): portada, login
  del panel y `/pago` responden 200 con contenido real; sin errores nuevos
  en los logs (el único error visto en el log es de hace 3 días, previo a
  este despliegue).
- **No se hizo commit a git** de estos cambios — el despliegue al VPS es
  por `rsync` directo, independiente de git en este proyecto. Los archivos
  siguen como cambios sin commitear en el working tree local, tal como
  estaban el resto de módulos de sesiones anteriores.

(Nota: ese primer lote de cambios sí se comprometió a git poco después —
commit `837b067` — antes de empezar la ronda de correcciones de abajo.)

## 🔧 Ronda de correcciones post-lanzamiento — 26-ago-2026 (tarde)

El cliente probó el sistema ya en producción y reportó una serie de bugs y
pulido pendiente en 8 módulos, con capturas de pantalla y de consola. Se
corrigió todo, se verificó en local y se volvió a desplegar. Detalle por
módulo:

### Pipeline

- **Bug real:** el desplegable "Todos los asesores" se pintaba DETRÁS de las
  tarjetas "Reparto por etapa"/"Asesores activos". Causa: el mismo patrón ya
  documentado antes (`.cabecera > *` le da `z-index:1` a su hijo directo —
  el desplegable — pero `.cabecera` en sí no tenía z-index propio, así que
  perdía contra `.resumen-fila`, que viene después en el DOM). Se le puso
  `z-index:2` a `.cabecera` — mismo arreglo que ya había funcionado en
  Alumnos.
- **"Reparto por etapa" rediseñado para ser interactivo:** ahora al pasar el
  cursor por un segmento del anillo O por su renglón en la leyenda, ambos se
  resaltan a la vez (el otro segmento se atenúa) y el número al centro
  cambia de "total" a la cifra y nombre de esa etapa específica, con su
  color. Antes era un donut estático sin ninguna interacción.

### Disponibilidad

- **Mismo bug de z-index**, esta vez entre el desplegable de "elige el día"
  (paso 2) y el bloque de horarios que aparece justo debajo, dentro de la
  MISMA tarjeta — arreglado con el mismo patrón (`z-index:2` en
  `.disp-dia-selector`).

### Citas

- Los "gaje neutro" (nombre del asesor + punto de color, arriba del
  calendario) eran una etiqueta genérica sin ninguna personalidad. Se
  rediseñaron como chips propios (`.citas-leyenda-item`) que toman el color
  real de cada asesor como fondo tenue y borde, con hover (se levantan
  ligeramente y el punto de color crece) — mucho más claros e
  interactivos.

### Material del curso

- **Bug real de subida múltiple:** al elegir varios archivos a la vez, solo
  se subía el primero y el resto se quedaba en "Subiendo…" para siempre —
  en consola se veía un 403 y un "Unhandled Promise Rejection". Causa: el
  ciclo `for` que sube archivo por archivo no tenía `try/catch`, así que si
  UNA subida fallaba (ej. por una referencia de acción vieja justo después
  de un reinicio del servidor), el ciclo se rompía a media función y
  `setSubiendo(false)` nunca se ejecutaba — el spinner se quedaba pegado
  para siempre sin importar la causa real del fallo. Se envolvió cada
  subida en su propio `try/catch` con `finally`, así que un archivo que
  falla no traba a los demás y siempre se libera el estado de "subiendo".
  Se aplicó el mismo arreglo defensivo en la portada y en los adjuntos de
  Reactivos.
- Botón "Quitar" (de cada archivo y de cada material completo) rediseñado:
  círculo/píldora con fondo rojo tenue siempre visible (antes era
  transparente, solo aparecía al pasar el cursor) — más fácil de encontrar.

### Reactivos

- **Distribución muy pegada a los bordes:** la causa real era que
  `.pl-form` (la clase base del formulario) trae `max-width:480px` de
  fábrica — al usarla dentro del modal ancho nuevo (760px) del examen, el
  contenido editable quedaba encogido en una columna angosta con poco
  padding, aunque el modal alrededor fuera ancho. Se le quitó ese límite
  específicamente al formulario de examen y se aumentó el padding del
  modal y de cada tarjeta de pregunta.
- **"Explicar con IA" se quedaba en "Pensando…" para siempre + error "no se
  puede conectar":** tres causas combinadas, las tres corregidas:
  1. El mismo bug de falta de `try/catch` que en Materiales — si la
     llamada fallaba, el botón se quedaba pegado en "Pensando…" sin fin.
  2. **Ollama en el VPS tarda ~20-30 segundos en cargar el modelo desde
     disco** cuando lleva rato sin usarse (medido en vivo: 21-27s solo de
     carga, antes de generar una sola palabra) — el tiempo de espera del
     código (45s) a veces no alcanzaba. Se subió a 90s y se agregó
     `keep_alive: "30m"` a la petición para que el modelo no se descargue
     de memoria entre usos seguidos.
  3. **nginx del VPS cortaba la conexión a los 60 segundos**
     (`proxy_read_timeout`), sin importar que la app ya esperara 90 — así
     que aunque Ollama sí iba a responder, nginx tronaba la conexión
     antes. Se subió a 120s, solo en el bloque de servidor de
     `inmath.lumiaaisolutions.com` (autorizado explícitamente, con
     respaldo del archivo de configuración antes de tocarlo).
  4. Las alertas (toasts) se quedaban visualmente DETRÁS del fondo
     borroso de cualquier modal abierto — `.toast` tenía `z-index:300` y
     `.us-velo` (el fondo borroso) tenía `z-index:380`. Se subió el toast
     a `z-index:400` para que siempre gane.
- **Ahora se puede elegir más de un archivo a la vez** para el material de
  apoyo de un rango de preguntas (antes el selector de archivo solo
  aceptaba uno; había que repetir la acción una por una).

### Alertas de la página

- **Bug real de texto cortado:** el botón "Agendar asesoría gratis" (en
  "El botón lleva a") se veía como "gendar asesoría grati" — sin puntos
  suspensivos, cortado de ambos lados. Causa: `text-align:center` combinado
  con `white-space:nowrap + text-overflow:ellipsis` no muestra el "…"
  cuando el texto está centrado y no cabe — simplemente lo recorta por
  ambos lados en silencio. Se cambió para que las etiquetas largas se
  envuelvan a 2 líneas en vez de recortarse — nunca más se pierde texto.

### Personalizar login

- **Bug real de fondo (no solo visual):** la vista previa, el recorte y el
  login real usaban 3 proporciones distintas para la misma imagen:
  - Herramienta de recorte y archivo guardado: 4:5 (1080×1350).
  - Panel "Vista previa" del admin: la celda de la imagen mide ~0.93:1
    (calculado desde su propio CSS: `grid 1.1fr/.9fr` + `aspect-ratio
    16/9.5`).
  - Login real (`.login-media`): ~0.86-0.96:1 en pantallas de escritorio
    típicas (mide 54% del ancho de la ventana × 100% del alto).
  
  El recorte (4:5 = 0.8) era más angosto/alto que las otras dos (~0.9), así
  que el login real y la vista previa SIEMPRE recortaban los lados de la
  imagen de forma distinta a como se veía en el editor. Se unificaron las
  3 a 9:10 (0.9, la proporción real del panel de vista previa, la más
  cercana a como se ve en el login real): el lienzo de recorte, el archivo
  que se guarda en el servidor (`sharp.resize`), la miniatura de la
  galería y el preview del modal de edición.

### Sistema — inputs nativos

- Se reemplazaron los 3 `<input type="datetime-local">` que quedaban
  (fecha límite de Alertas, vencimiento de promoción y de cupón en
  Precios) por un componente nuevo compartido `SelectorFechaHora`
  (combina el `SelectorFecha` y `SelectorHora` que ya existían) — cero
  controles nativos del navegador en esos 3 formularios.

## Segundo despliegue a producción — 26-ago-2026 (tarde)

- Sin cambios de esquema esta vez (no se tocó `prisma/schema.prisma` ni
  `package.json`) — despliegue más simple: solo `rsync` de `src/`, build
  en el VPS, reinicio de `pm2`.
- Se encontró y limpió, antes de sincronizar, un archivo de prueba
  (`guia-prueba-...pdf`) que había quedado en `panel/public/img/materiales/`
  de pruebas anteriores en esta misma sesión — no se sube contenido de
  prueba a producción.
- Cambio de infraestructura autorizado explícitamente por el cliente:
  `proxy_read_timeout` de nginx subido de 60s a 120s, solo para
  `inmath.lumiaaisolutions.com`, con respaldo del archivo antes de
  tocarlo y `nginx -t` antes de recargar.

## 🔧 Segunda ronda de correcciones — 26-ago-2026 (misma tarde)

El cliente volvió a probar en producción y encontró que algunos arreglos de
la ronda anterior no habían quedado del todo bien, más pulido adicional.

### Pipeline — "Reparto por etapa" (arreglo real, no solo visual)

- El centro del donut (número + "en total") se veía encimado, sobre todo al
  pasar el cursor por una etapa con nombre largo ("Pago pendiente"). Causa:
  el círculo central para el texto era muy chico (~46px de diámetro
  efectivo) para caber un número grande + una etiqueta. Se agrandó el
  donut completo (108px → 138px) y se le puso un círculo blanco de fondo
  con borde propio al centro, separándolo visualmente del anillo de
  colores — ya no se ve apretado ni se encima nada.

### Citas / Disponibilidad — espaciado

- Aumentado el espacio entre los chips de asesores en Citas y entre los
  botones (días, horas, presets) en Disponibilidad — se veían pegados
  entre sí.

### Material del curso — bug real de fondo en la subida múltiple

- **Encontrado el verdadero motivo por el que solo se subía un archivo de
  varios elegidos a la vez** (el arreglo de la ronda anterior solo evitaba
  que se quedara pegado en "Subiendo…", pero no arreglaba por qué se
  perdían archivos): un bug de "closure viejo" de React. Cada archivo
  subido llamaba a `set(m.id, "archivos", [...m.archivos, nuevoArchivo])`,
  pero `m.archivos` venía de una fotografía vieja del estado (capturada
  antes de que empezara la subida) — al subir el segundo archivo en la
  misma tanda, se usaba esa misma fotografía vieja (sin el primer
  archivo) y lo pisaba en vez de agregarlo. Se corrigió leyendo el estado
  más reciente DENTRO de la función que actualiza la lista, no desde
  afuera — ahora se pueden subir varios archivos de un jalón sin perder
  ninguno. Verificado en local subiendo 3 archivos a la vez.
- **También se encontró y arregló la causa real de "no pudimos subir la
  imagen" (403) en la portada:** el límite de tamaño de las Server Actions
  de Next.js (`next.config.ts`) estaba en 9 MB — pensado solo para el
  comprobante de pago de 8 MB — pero el código de Materiales ya permite
  archivos de hasta 60 MB. Cualquier foto o documento de más de 9 MB
  (una foto de celular normal fácilmente pesa eso) se rechazaba ANTES de
  llegar al código de la app, como un error genérico sin explicación. Se
  subió el límite a 65 MB para que coincida con lo que la app ya promete.
  **Pendiente de autorización:** el nginx del VPS también tiene su propio
  límite (`client_max_body_size 25M`) que hay que subir a la par, si no,
  seguiría rechazando archivos grandes antes de llegar a Next.js.
- Se agregó un botón "Ver" junto a cada archivo ya subido, para abrirlo y
  confirmar visualmente que se subió correctamente.
- El botón "Quitar" de cada material (el de arriba de la tarjeta) tenía
  DOS clases CSS con estilos que competían entre sí (`.mat-quitar` —
  pensada para un botón circular solo-ícono — y `.mat-item-borrar` —
  pensada para una píldora con ícono y texto). Como ambas estaban en el
  mismo botón, el ícono "×" y la palabra "Quitar" se apretujaban dentro de
  un círculo de 28px. Se dejó solo la clase que ya tenía el diseño
  completo. El mismo bug exacto estaba también en el botón "Quitar" de
  cada pregunta en el examen de Reactivos — mismo arreglo ahí también.

### Reactivos — la tarjeta raíz no tenía padding

- La causa real de "todo pegado a los bordes": la tarjeta blanca que
  envuelve toda la sección de "Exámenes" y toda la de "Reactivos sueltos"
  no tenía NINGUNA clase de padding (`.tarjeta` sola, sin padding propio)
  — todo el contenido de adentro quedaba pegado literalmente al borde de
  la tarjeta. Se agregó una clase `.rx-panel` (mismo padding que ya usan
  Precios y otras secciones) a ambas tarjetas raíz.

## 🎨 Pasada de interactividad/diseño en todo el panel — 26-ago-2026

Pedido del cliente: que todo el panel y cada apartado sea interactivo,
llamativo y visualmente atractivo, agregando complementos donde haga falta.
Se hizo un inventario primero (con un agente de exploración) para encontrar
qué módulos se habían quedado planos frente a los que ya se rediseñaron
antes (Pipeline, Citas, Disponibilidad, Materiales, Reactivos, Alertas,
Precios, Personalizar login). Resultado: **Alumnos y pagos** era el más
plano (sin fila de estadísticas, nombres sin avatar, tabla de texto puro) y
**Usuarios** le faltaba la fila de estadísticas que ya tienen los demás.

- **Alumnos y pagos**: se agregó una fila de 4 tarjetas de estadística
  (alumnos activos, cuentas totales, pagos por confirmar, monto pendiente
  total) igual que en Citas/Reactivos/Disponibilidad; cada alumno en la
  tabla ahora tiene un círculo con su inicial (mismo estilo que los
  avatares de Usuarios, en versión chica); la columna de Monto se colorea
  según el estado del pago (verde si ya pagó, ámbar si está pendiente); las
  tarjetas de información dentro de la ficha de detalle (Contacto, Cuenta,
  Pago, Fechas, Comprobante) ahora tienen una animación sutil al pasar el
  cursor.
- **Usuarios**: se agregó la misma fila de estadísticas (usuarios totales,
  administradores, asesores, bloqueados) que ya tienen los demás módulos.
- **Todo el panel**: las tarjetas de estadística (`.stat-tarjeta`) — que ya
  se usan en Pipeline, Citas, Disponibilidad, Reactivos y ahora también
  Alumnos y Usuarios — ganaron una animación de elevación al pasar el
  cursor (con su color de acento propio en la sombra), dando el mismo
  toque interactivo en TODOS los módulos que las usan de un solo cambio.
- Se revisó que las tarjetas verdaderamente clicables (Precios, Alertas,
  Usuarios, Pipeline) ya tuvieran su propio hover de elevación (sí lo
  tenían, de rondas anteriores) y que las tarjetas puramente informativas
  (calendario, formularios) NO lo tuvieran — un hover en un contenedor que
  no hace nada al hacer clic se ve como un bug, no como pulido.

Verificado en local con datos de prueba (un alumno con pago pendiente
sembrado a mano). Build de producción limpio.
