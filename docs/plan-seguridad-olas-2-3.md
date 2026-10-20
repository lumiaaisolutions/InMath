# Plan de implementación — Ola 1 restante (A-04, A-05) + Ola 2 + Ola 3

Sigue a `auditoria-ciberseguridad-2026-09.md` y `seguridad-remediacion-ola1.md`
(que ya resolvió C-01, C-02, A-03, A-06-InMath y parcialmente A-07). Este plan
cubre lo que quedó fuera: **investigado línea por línea el 12-sep-2026** (no
son descripciones genéricas — cada punto tiene el código real detrás).

> **✅ Ejecutados el 12-sep-2026** (los 4 marcados de menor riesgo del orden
> sugerido): B-15, A-05, A-04 (acotado a `materiales`/`reactivos`) y B-16.
> Verificados en producción con datos reales. Detalle de cada uno abajo, en
> su propia sección, junto al plan original. Se paró ANTES de M-08 (fail-open
> del webhook de pagos) porque implica un cambio de comportamiento de negocio
> (un pago legítimo raro podría quedar pendiente de revisión manual en vez de
> confirmarse solo) que requiere tu confirmación antes de tocarlo.
>
> **✅ Ola 2 completa + Ola 3 (parte de código) ejecutadas el 19/20-oct-2026**
> (commits `fe72c4b`, `cd432b0` y uno aparte para nodemailer — ver
> `auditoria-ciberseguridad-2026-09.md`, secciones Fase 1/2/3/4, para el
> detalle fino de cada hallazgo). Resumen: M-08, M-09 (parcial), M-10, M-11
> (con una desviación de diseño sobre el re-login general — pendiente de que
> Fernando la confirme), M-12, B-14, B-17, B-18, el cifrado del refresh
> token de Google (M-13 parte 1) y el 2FA del staff (ítem 16) quedaron
> resueltos y desplegados, revisados a mano antes de cada deploy. De
> regalo, revisando dependencias, se encontró y corrigió una vulnerabilidad
> CRÍTICA de Next.js (RCE no autenticado) que no estaba en este plan
> original. **Lo que SIGUE pendiente**: M-13 parte 2 (cifrar PII de
> alumnos/prospectos — requiere decisión explícita, hay plan documentado
> pero nada implementado), A-07 (allowlist+2FA del editor n8n — es
> cross-cliente, no solo de Inmath), y toda la parte de infraestructura de
> Ola 3 (usuario de sistema por app, rotación de secretos, CI con
> semgrep/Renovate — también cross-cliente, quedan como proyecto aparte de
> LUMIA, no se improvisaron a medias dentro de esta sesión de Inmath).

Formato por punto: **qué es** → **riesgo si no se hace** → **qué pasa si SÍ
se hace (impacto/quién se ve afectado)** → **cómo lo haría** → **esfuerzo**.

---

## Grupo A — Exposición de contenido de pago (A-04, B-15, B-16)

Los tres viven en el mismo archivo/flujo (`/panel/img` y sus uploads), así
que conviene atacarlos juntos.

### A-04 — `/panel/img` sirve materiales de pago sin sesión ✅ EJECUTADO 12-sep-2026

**Qué es**: `src/app/(panel)/panel/img/[...ruta]/route.ts` no tiene NINGÚN
guard de sesión — solo valida que la carpeta esté en una whitelist
(`avatars|login|alertas|materiales|reactivos`) y la extensión. Cualquiera
con la URL exacta descarga el archivo, pagado o no.

**Hallazgo colateral real durante la investigación**: la página
`/portal/material` SÍ exige `requiereAlumno()` + `tienePagoConfirmado()` —
pero los enlaces de descarga que muestra apuntan directo a
`/panel/img/materiales/...`, **sin pasar por ese gate**. Es decir, el gate
existe pero un link compartido lo evade por completo. Esta es la instancia
concreta y explotable del hallazgo, no algo teórico.

**Riesgo si no se hace**: material del curso (pagado) re-compartible con un
link; cualquiera con el link lo descarga sin haber pagado nunca.

**Impacto si SÍ se hace (cuidado aquí — no es un fix de una línea)**:
- La carpeta `login/` **debe seguir pública sin excepción** — la usa el
  carrusel de fondo de `/panel/login` (pantalla ANTES de autenticarse). Si
  se exige sesión a todo el route, el login del panel se rompe.
- `avatars/` se puede exigir sesión (panel O portal, la que aplique) sin
  romper nada — ya se usa solo dentro de contextos ya autenticados.
- `alertas/` hay que confirmar si esos banners se muestran en páginas
  públicas del sitio antes de gatear (si sí, debe quedar pública).
- `materiales/` es el caso real: necesita el MISMO gate que ya tiene
  `/portal/material` (alumno con pago confirmado), replicado a nivel de
  archivo, no de página.
- `reactivos/` se usa tanto en preview de staff (`/panel/reactivos`) como
  en la práctica del alumno — el gate debe aceptar sesión de panel O de
  portal.
- Efecto secundario detectado: `fases/acciones.ts` y `precios/acciones.ts`
  ya generan URLs `/panel/img/fases/...` y `/panel/img/cursos/...` que HOY
  devuelven 404 porque esas carpetas no están en la whitelist — al tocar
  este archivo hay que decidir explícitamente qué hacer con ellas (dejarlas
  rotas como están, o agregarlas con su propio gate) en vez de arrastrar el
  bug en silencio.

**Cómo lo haría**: diferenciar por carpeta dentro del mismo route (no un
guard global):
```ts
if (segmentos[0] === "materiales") {
  const alumno = await alumnoActual();
  if (!alumno || !(await tienePagoConfirmado(alumno.prospecto_id))) return 404;
} else if (segmentos[0] === "reactivos" || segmentos[0] === "avatars") {
  const [panel, alumno] = await Promise.all([usuarioActual(), alumnoActual()]);
  if (!panel && !alumno) return 404;
}
// "login" y "alertas" quedan como hoy, sin gate (confirmar alertas primero)
```
Replicar exactamente el patrón que ya existe y funciona en
`portal/img/[...ruta]/route.ts` (gate por sesión + 404 si no aplica, mismo
estilo de código).

**Esfuerzo**: ~2h (incluye probar login del panel, práctica de alumno y
preview de staff no se rompan).

**Quedó así**: se implementó exactamente el gate de `materiales` y
`reactivos` (staff O alumno con pago confirmado). **`avatars` y `alertas` se
dejaron SIN TOCAR** (ni siquiera el cambio de bajo riesgo sugerido en
`avatars`) — la incertidumbre sobre `alertas` (¿se ve en páginas públicas?)
y la falta de certeza sobre si `avatars` mezcla fotos de staff y de alumnos
en el mismo directorio hacían que tocarlas sin confirmar antes fuera
innecesariamente arriesgado para el beneficio marginal. `login` sigue
pública, sin cambios, como debía ser. Verificado en producción:
`/panel/img/materiales/*` → 404 sin sesión; `/panel/img/avatars/*` y
`/panel/img/login/*` sin cambio de comportamiento (código no tocado en esas
ramas).

### B-15 — SVG servible como documento ejecutable ✅ EJECUTADO 12-sep-2026

**Qué es**: el mismo route sirve `.svg` con `Content-Type: image/svg+xml`.
Un SVG puede llevar `<script>` embebido que se ejecuta si se abre/incrusta
directo (no como `<img>` simple).

**Riesgo si no se hace**: XSS si algún día un `.svg` llega a esas carpetas
(hoy no hay upload que lo permita en este repo, pero el directorio es
COMPARTIDO con el panel PHP legado, fuera de esta auditoría).

**Impacto si SÍ se hace**: **ninguno** — confirmé que ninguna de las 5
whitelists de extensión de subida actuales (`reactivos`, `fases`,
`materiales`, `alertas`, `precios`) permite `.svg`. Quitarlo del mapa MIME
del route no rompe nada existente.

**Cómo lo haría**: quitar `.svg` del objeto `MIME` en el route. Una línea,
cero riesgo. Si en el futuro se necesita SVG de verdad, servirlo con
`Content-Disposition: attachment` (fuerza descarga en vez de ejecución) en
vez de `inline`.

**Esfuerzo**: 5 minutos.

**Quedó así**: exactamente como se planeó — una línea quitada del mapa
`MIME`, sin `Content-Disposition` adicional (no hizo falta, no hay ningún
`.svg` real en las carpetas hoy).

### B-16 — uploads validados solo por extensión, no por contenido real ✅ EJECUTADO 12-sep-2026

**Qué es**: `materiales/acciones.ts`, `reactivos/acciones.ts` y
`fases/acciones.ts` validan el tipo de archivo con `path.extname(nombre)`
— el nombre lo controla quien sube. Renombrar cualquier archivo a `.pdf`
pasa el check.

**Riesgo si no se hace**: un admin del panel (o su sesión comprometida) sube
algo malicioso disfrazado de PDF/imagen; se sirve después vía A-04 con el
`Content-Type` que dicta la extensión falsa.

**Impacto si SÍ se hace**: bajo — es agregar una validación extra antes de
`writeFile`, no cambia el contrato de la función ni las URLs generadas. El
único riesgo es que un archivo LEGÍTIMO con firma de bytes atípica (raro en
PDF/Office/imágenes estándar) sea rechazado por error — mitigable probando
con archivos reales de cada tipo antes de desplegar.

**Cómo lo haría**: ya existe el validador exacto que hace falta, en
`src/lib/pagos.ts` (`TIPOS_OK`, usado para comprobantes de pago) — extraerlo
a un helper compartido (`src/lib/magic-bytes.ts`), agregar las firmas que
faltan (`.zip`/`.docx`/`.pptx`/`.xlsx` son ZIP → firma `PK\x03\x04`;
`.doc`/`.xls`/`.ppt` legado son OLE2 → firma `D0 CF 11 E0`), y llamarlo
desde las 3 acciones de upload antes de `writeFile`.

**Esfuerzo**: ~2h (incluye probar cada tipo de archivo real).

**Quedó así**: nuevo `src/lib/magic-bytes.ts` (extraído de `pagos.ts`, sin
cambiar su comportamiento) con firmas para `jpg/jpeg/png/webp/pdf` (las que
ya existían) + `mp4/mov` (`ftyp` en el byte 4), `webm` (EBML), `mp3`
(`ID3` o frame MPEG), `doc/xls/ppt` (OLE2) y `docx/xlsx/pptx/zip` (ZIP).
Probado con 10 casos positivos (firma real de cada formato) y 2 casos que
DEBEN fallar (un `.pdf` con contenido HTML, un `.jpg` con cabecera de
ejecutable) — los 12 se comportaron como se esperaba. Aplicado en las 3
acciones de upload del panel (`materiales`, `reactivos`, `fases` ×2) antes
de `writeFile`, y en `guardarComprobante` de `pagos.ts` (mismo
comportamiento de antes, ahora vía el helper compartido).

---

## Grupo B — Abuso y spam (A-05)

### A-05 — rate-limit del chat burlable + `/api/cta` sin límite ✅ EJECUTADO 12-sep-2026

**Qué es**: dos problemas separados en el mismo hallazgo:
1. `src/app/api/agente/route.ts` limita 20 msj/10min con un `Map` en
   memoria, **por el PRIMER valor de `X-Forwarded-For`** — un header que el
   VISITANTE controla en su propia petición. Confirmé que nginx no tiene
   configurado `real_ip`/`set_real_ip_from` para las IPs de Cloudflare (que
   sí está delante del sitio), así que el valor confiable real es
   `CF-Connecting-IP` (Cloudflare lo sobrescribe siempre, no falsificable),
   no el primer salto de `X-Forwarded-For`.
2. `src/app/api/cta/route.ts` **no tiene ningún límite**, cero.

**Riesgo si no se hace**: spam ilimitado a la bandeja de contacto, creación
masiva de prospectos falsos, agotamiento de la cuota de la API de Gemini vía
mensajes automatizados al chat.

**Impacto si SÍ se hace**: bajo — es un cambio de lectura de IP + agregar
una llamada a un limitador ya existente. Riesgo real único: si algún
visitante legítimo llega SIN pasar por Cloudflare (ej. acceso directo por
IP en desarrollo/pruebas), `CF-Connecting-IP` no existiría — hay que dejar
un fallback a `X-Forwarded-For`/`X-Real-IP` para esos casos, no romper el
chat en local.

**Cómo lo haría**:
- Cambiar `req.headers.get("x-forwarded-for")?.split(",")[0]` por
  `req.headers.get("cf-connecting-ip") ?? req.headers.get("x-real-ip") ?? "local"`
  en `api/agente/route.ts`.
- Reemplazar el `Map` en memoria por el limitador YA EXISTENTE y persistente
  en BD: `src/lib/rate-limit.ts` (contadores en `configuraciones`,
  sobrevive reinicios de pm2 y se comparte entre procesos) — ya se usa en
  otro lado del sistema, solo hay que aplicarlo aquí también.
- Agregar la misma llamada al inicio de `api/cta/route.ts` (que hoy no
  tiene nada).

**Esfuerzo**: ~1.5h.

**Quedó así**: el limitador de login (`loginBloqueado`/`registrarFalloLogin`)
resultó tener semántica distinta (bloqueo progresivo tras FALLOS, pensado
para intentos de contraseña) — no encajaba para "N mensajes por ventana".
Se agregó una función genérica nueva al mismo archivo,
`limiteExcedido(clave, max, ventanaMs)`, con el mismo mecanismo de
persistencia (JSON en `configuraciones`, clave separada
`rate_limit_ventanas` para no mezclar datos) y `ipConfiable(req)` con la
cadena `cf-connecting-ip → x-real-ip → x-forwarded-for → "local"`. Aplicado
en `api/agente/route.ts` (20/10min, igual que antes) y `api/cta/route.ts`
(nuevo, 5/10min). Probado en aislado contra la BD local (4 intentos con
límite 3: los primeros 3 pasan, el 4° se bloquea) y en producción con
requests inválidos reales contra `/api/cta` (5 pasan a validación, el 6°
recibe 429) — sin disparar ningún correo real.

---

## Grupo C — Integridad de pagos (M-08, B-14)

### M-08 — fail-open de monto/moneda en el webhook de pagos

**Qué es**: `aplicarEventoPago` (`src/lib/pagos-drivers.ts`) solo compara
montos SI `evento.monto_centavos` viene definido:
```ts
if (evento.monto_centavos != null && evento.monto_centavos < pago.monto_centavos) {
  return { ok: false, mensaje: "Monto cobrado menor al monto del pago — no se confirma" };
}
```
Si MercadoPago responde sin `transaction_amount` válido (campo ausente,
`null`, `0`), el driver omite la clave completa del objeto → llega
`undefined` → el `if` se salta → se confirma el pago sin comparar nada. Y no
hay NINGÚN campo de moneda en `EventoPago` — jamás se compara moneda.

**Riesgo si no se hace**: un webhook malformado, un bug de MercadoPago, o un
webhook forjado con firma válida pero payload manipulado podría inscribir a
un alumno sin verificar que pagó lo correcto.

**Impacto si SÍ se hace**: **hay que decidir qué pasa cuando el monto
realmente no viene** — hoy eso resulta en confirmación automática (fail
open); el fix correcto es fail-CLOSED (no confirmar y avisar a staff), pero
eso significa que un pago legítimo de MercadoPago que por algún bug de su
API no reporte el monto **quedaría atorado sin confirmar** hasta revisión
manual. Es el trade-off correcto (mejor revisar a mano un caso raro que
inscribir sin verificar), pero hay que avisar al staff cuando pase (correo
tipo el de "SIN LINK" que ya existe para citas).

**Cómo lo haría**:
```ts
if (evento.monto_centavos == null) {
  // antes: se colaba. ahora: no se confirma, se avisa a staff.
  await enviarCorreo({ para: [CORREO_CONTACTO], asunto: "⚠️ Webhook de pago sin monto — revisar a mano", ... });
  return { ok: false, mensaje: "El procesador no reportó el monto — revisión manual requerida" };
}
if (evento.monto_centavos < pago.monto_centavos) { /* igual que hoy */ }
```
Para moneda: agregar `moneda?: string` a `EventoPago`, que
`driverMercadoPago.verificarWebhook` lea `pago.currency_id` de la respuesta
real de MercadoPago, y comparar contra `pago.moneda` de la BD antes de
confirmar.

**Esfuerzo**: ~2h (incluye el correo de aviso a staff y probar contra la
respuesta real de la API de MercadoPago en sandbox).

### B-14 — `tokenPago` sin expiración

**Qué es**: `src/lib/pagos.ts` firma el token solo con `pago:${pagoId}` —
sin timestamp. El mismo token es válido para siempre mientras no cambie
`APP_SECRET`. Se usa para aplicar cupones y subir comprobantes de pago.

**Riesgo si no se hace**: un token filtrado una vez (URL compartida,
captura de pantalla) queda utilizable indefinidamente para ese pago.

**Impacto si SÍ se hace**: bajo, pero **rompe cualquier link de pago ya
enviado** a un prospecto antes del cambio (su token viejo, sin expiración
embebida, dejaría de tener el mismo formato) — hay que decidir si se
invalidan los pagos pendientes existentes o se acepta el formato viejo como
fallback temporal durante una ventana de transición.

**Cómo lo haría**: agregar expiración embebida en la firma (ej. 7 días,
igual que la vigencia de vencimiento de pagos que ya existe en
`pagos-vencimiento.ts`):
```ts
export function tokenPago(pagoId: number, exp: number): string {
  return createHmac("sha256", secreto()).update(`pago:${pagoId}:${exp}`).digest("hex");
}
```
Y guardar `exp` junto al link generado (mismo campo `link_pago` ya
existente, como query param), validando `exp` antes de comparar el HMAC.

**Esfuerzo**: ~2h (incluye migrar los links de pago activos).

---

## Grupo D — Sesiones y credenciales (M-11, M-12/B-17)

### M-11 — sesiones sin revocación

**Qué es**: la cookie de sesión (panel: 7 días, portal: 30 días) es
`uid.exp.hmac` — sin identificador de sesión. Cambiar la contraseña NO
invalida sesiones ya emitidas (confirmé que ni `restablecerConToken` ni
`cambiarPasswordAlumnoAccion` tocan nada relacionado a sesiones). Solo
desactivar la cuenta completa revoca acceso.

**Riesgo si no se hace**: una cookie robada sigue funcionando aunque la
víctima cambie su contraseña pensando que ya está a salvo.

**Impacto si SÍ se hace**: **fuerza un re-login general de TODOS los
usuarios activos al desplegar** (staff y alumnos) — la firma de sesión
cambia de forma, así que las cookies ya emitidas dejan de validar. Hay que
avisar al staff antes de desplegar esto (no es silencioso).

**Cómo lo haría**: agregar `session_version` (Int, default 0) a `usuarios`
y `alumnos`; incluirlo en el HMAC (`sesion:${uid}:${exp}:${sessionVersion}`)
y compararlo contra el valor actual en BD al verificar. Cambiar contraseña
incrementa `session_version` → todas las cookies viejas de ese usuario dejan
de firmar correctamente al instante, sin tocar las de los demás usuarios.
De paso, bajar la duración del portal de 30 a 14 días (nota ya sugerida en
la auditoría original).

**Esfuerzo**: ~4h (migración de esquema + cambio en 2 módulos de sesión +
aviso al staff antes del deploy).

### M-12 / B-17 — throttles en memoria, sin límite en cambio de password

**Qué es**: dos casos distintos en el mismo hallazgo:
1. El freno de "solicitar reset de contraseña" (60s por correo) vive en un
   `Map` en memoria — se pierde en cada restart de pm2.
2. Cambiar contraseña YA LOGUEADO (portal, con password actual) no tiene
   NINGÚN límite de intentos — solo un `setTimeout(600ms)` en el error, sin
   contar intentos acumulados.

**Riesgo si no se hace**: (1) es menor (el reset ya está protegido por
token de un solo uso en BD, esto solo frena spam de correos); (2) es más
serio — con una cookie de sesión robada, se puede automatizar la
adivinación de la contraseña actual del alumno sin freno.

**Impacto si SÍ se hace**: ninguno para usuarios legítimos — un límite
razonable (ej. 5 intentos/15min) no afecta a alguien escribiendo mal su
contraseña una o dos veces.

**Cómo lo haría**: mismo patrón ya usado y persistente en BD para los
códigos 2FA (`src/lib/portal/dosfactores.ts`, `MAX_INTENTOS_2FA = 5`,
contador en `configuraciones`) — replicarlo para (1) el throttle de reset y
(2) agregar un contador de intentos fallidos a
`cambiarPasswordAlumnoAccion` con bloqueo temporal tras 5 fallos.

**Esfuerzo**: ~2h.

---

## Grupo E — Endurecimiento de plataforma (M-09, M-10, B-18)

### M-09 — CVE alto en `deepmerge-ts` (vía Prisma CLI)

**Qué es**: `deepmerge-ts@7.1.5` (vulnerable, CVE de agotamiento de stack)
llega transitoriamente por `@prisma/config`, dependencia de la CLI de
Prisma (`prisma generate`/`migrate`), no de `@prisma/client` (lo que corre
en producción).

**Riesgo real verificado**: **bajo pese a la severidad "high" del
advisory** — confirmé que la única forma de disparar la vulnerabilidad es
llamar a `deepmerge()` con un objeto anidado controlado por atacante, y eso
solo pasa al ejecutar la CLI localmente/en build, nunca en una request HTTP
real del sitio (no hay ruta de código en `src/` que use `prisma`/
`@prisma/config` en runtime).

**Impacto si SÍ se hace algo**: el único "fix" real disponible hoy es
bajar Prisma de `6.19.3` a `6.12.0` — un downgrade de ~7 versiones menores,
con riesgo de perder features/fixes usados en el código actual (no
evaluado). Sería cambiar una amenaza teórica de bajo riesgo real por una
regresión de superficie desconocida.

**Recomendación**: NO tocar por ahora. Dejarlo en observación (revisar cada
mes si Prisma publica una versión que reemplace `deepmerge-ts` sin bajar de
versión) en vez de forzar un downgrade mayor por un CVE sin superficie de
ataque real en esta app.

**Esfuerzo si se decide monitorear**: 0h ahora, revisar en cada actualización de Prisma.

### M-10 — CSP con `unsafe-inline`

**Qué es**: `next.config.ts` declara `script-src 'self' 'unsafe-inline'` y
`style-src 'self' 'unsafe-inline'` para TODO el sitio — esto anula buena
parte de la protección contra XSS que una CSP debería dar, aunque hoy no
hay una vulnerabilidad XSS conocida que lo explote (B-15 ya se cierra en el
Grupo A).

**Impacto si SÍ se hace**: es el cambio de MAYOR esfuerzo/riesgo de toda
esta lista. Next.js necesita un nonce distinto por request para sus propios
scripts de hidratación — implica: middleware que genere el nonce, pasarlo
al `<Script>`/`<html>` de cada layout, y probar que TODO (panel, portal,
sitio, cada componente con estilos inline dinámicos) siga funcionando. Un
error aquí puede romper visualmente o funcionalmente cualquier página del
sitio en producción sin previo aviso obvio (solo se nota si algo deja de
ejecutarse).

**Cómo lo haría**: usar el patrón oficial de Next.js para CSP con nonce
(middleware que genera el nonce por request, lo inyecta en un header, y
Next lo propaga automáticamente a sus scripts) — requiere Next 13.4+
(el proyecto ya usa Next 16.3, así que es compatible). Desplegar primero a
un entorno de prueba/staging visible, no directo a producción.

**Esfuerzo**: ~1-2 días completos, con QA visual de las 3 áreas (sitio,
panel, portal) antes de dar por bueno.

### B-18 — higiene de logs de APIs externas

**Qué es**: hallazgo general de la auditoría original — revisar que los
`console.error`/`console.log` que capturan respuestas de APIs externas
(MercadoPago, Gemini, Google) no vuelquen tokens/secretos completos al log.
**No se investigó línea por línea en esta sesión** (a diferencia de los
demás puntos de este documento) — falta ese barrido específico antes de
poder dar un plan preciso.

**Cómo lo haría**: grep de `console.error`/`console.log` en `src/lib/*-drivers.ts`,
`google-calendar.ts`, `correo.ts` y los clientes de IA, revisando cada uno
por si imprime objetos de respuesta completos (que podrían incluir headers
de auth) en vez de solo el mensaje de error.

**Esfuerzo**: ~2h de barrido + tiempo de fix según lo que aparezca.

---

## Ola 3 — deuda de sostenimiento (nivel de detalle menor, son tareas de infraestructura/proceso más que de código específico)

- **Limpieza del árbol PHP legacy**: mover a `storage-dev/`/rama aparte,
  definir fecha de retiro del rollback en el VPS. Bajo riesgo técnico, es
  principalmente una decisión de "¿ya podemos confiar 100% en el Next.js?"
  — recomendaría esperar unas semanas más de estabilidad en producción
  antes de retirarlo.
- **2FA para STAFF del panel**: hoy el 2FA por correo ya existe para
  alumnos (portal); extenderlo a `usuarios` (panel) es replicar el mismo
  patrón (`dosfactores.ts`) al login de staff. ~3-4h.
- **Cifrado de PII en reposo + refresh token de Google en claro** (M-13):
  requiere decidir qué campos cifrar (teléfono, correo de alumnos menores
  de edad) y con qué esquema (cifrado a nivel de aplicación antes de
  guardar) — es un cambio de esquema + migración de datos existentes, más
  involucrado que los anteriores. Requiere decisión de producto sobre
  alcance antes de estimar con precisión.
- **Backups cifrados fuera del servidor**: sacar los `.sql` que hoy viven
  en `/var/www/inmath` del propio VPS (si el VPS se compromete, se pierden
  backups y datos a la vez). Tarea de infraestructura, no de código.
- **SAST en CI + Dependabot/Renovate + rotación de API keys por
  consumidor**: controles preventivos, no arreglan un hallazgo puntual sino
  que evitan que vuelvan a aparecer. Se puede activar por partes (empezar
  con Dependabot, que es gratis y de un clic en GitHub).

---

## Orden sugerido si se decide avanzar

1. ✅ **B-15 (quitar .svg)** — 5 minutos, cero riesgo, hazlo ya. HECHO.
2. ✅ **A-05 (rate-limit real)** — bajo riesgo, cierra un abuso activo hoy. HECHO.
3. ✅ **A-04 (gate de materiales)** — el de mayor impacto de negocio (contenido
   de pago protegido), cuidado con no romper el login del panel. HECHO
   (acotado a materiales/reactivos).
4. ✅ **B-16 (magic bytes)** — reusa código que ya existe, bajo esfuerzo. HECHO.
5. ⏸️ **M-08 (fail-closed en webhook)** — protege dinero, pero definir bien el
   aviso a staff antes de desplegar. **AQUÍ SE PARÓ** (12-sep-2026): cambia
   comportamiento de negocio, requiere confirmación antes de continuar.
6. **M-12/B-17 (throttles persistentes)** — bajo riesgo, reusa patrón 2FA.
7. **B-14 (expirar tokenPago)** — bajo riesgo, cuidado con links ya enviados.
8. **M-11 (revocación de sesión)** — el más disruptivo de esta lista (fuerza
   re-login general), avisar antes de desplegar.
9. **M-10 (CSP con nonces)** y **Ola 3** — dejarlos para una sesión dedicada
   aparte, con más tiempo de QA.
10. **M-09** — no tocar, solo monitorear.
