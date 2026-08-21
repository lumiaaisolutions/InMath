# Operación: correos, MySQL y efectos — estado y pasos (17-ago-2026)

Resumen de las fases E1–E3 y lo que queda en manos del dueño.

## E1 — Estabilidad de MySQL (RESUELTO, 17-ago-2026)

**Síntoma:** tras cada reinicio del proceso Node, MySQL 8 fallaba de forma
intermitente con `Unknown authentication plugin 'sha256_password'` (caché frío).
Se recuperaba solo al calentarse, pero reaparecía en el siguiente reinicio,
tirando /agenda y a Mathy con 500 mientras duraba la ventana fría.

**Causa raíz:** el servidor tenía `default_authentication_plugin =
caching_sha2_password`; el motor Rust de Prisma chocaba con el flujo de "full
auth" de ese plugin en TCP sin TLS.

**Aplicado:** `/etc/mysql/mysql.conf.d/zz-native-auth.cnf` con
`default_authentication_plugin=mysql_native_password` + reinicio de MySQL.
**Rollback si algún día hiciera falta:**
`sudo rm /etc/mysql/mysql.conf.d/zz-native-auth.cnf && sudo systemctl restart mysql`.

**Verificado (18-ago-2026):** `SHOW VARIABLES LIKE 'default_authentication_plugin'`
confirma `mysql_native_password` en el servidor. Tras el redeploy de hoy
(varios reinicios de `pm2` durante la ronda de arreglos responsive) no apareció
ni una sola línea nueva de `Unknown authentication plugin` en
`~/.pm2/logs/inmath-web-error.log` — las únicas líneas de ese error en el log
son de antes del 17-ago 17:50, previas al fix. `/agenda`, `/panel/alumnos` y
el cron de vencimiento de pagos respondieron 200 en frío sin problema.

## E2 — Correos transaccionales (RESUELTO — Hostinger SMTP, no Gmail)

El código envía con `nodemailer` vía `SMTP_URL` (ver `src/lib/correo.ts`). Se
configuró con el correo corporativo de Hostinger en vez de Gmail:
`CORREO_FROM="Cursos InMath <noreply@lumiaaisolutions.com>"` vía
`smtp.hostinger.com`. Confirmado que `.env` (fuente) y
`.next/standalone/.env` (el que realmente lee el proceso pm2) coinciden.

**Cron del recordatorio semanal:** instalado en el VPS.
- Script: `/var/www/inmath/web/scripts/recordatorio-disponibilidad.sh`
- Crontab: `0 9 * * 5` (viernes 9:00) → POST a `/api/disponibilidad/recordatorio`
- Log: `~/inmath-recordatorio.log`.

A partir de la configuración de `noreply@lumiaaisolutions.com` ya se envían:
el **seguimiento del pago por correo**, la **confirmación de pago aprobado**,
los **avisos de vencimiento a 24h/3h** y el **recordatorio semanal de
disponibilidad**. No requiere más pasos del dueño.

## E3 — Más efectos de scroll/parallax (HECHO)

`inmath.css` v35: efectos scroll-driven adicionales (parallax en imágenes de
sección `.grafica-wrap`, entrada del carrusel `.pk-carrusel`), en el mismo estilo
`animation-timeline: view()` que los reveals existentes y envueltos en
`@supports (animation-timeline: view())` para que en iOS Safari (sin soporte) el
layout quede **estático y correcto**, sin desfases. Desplegado y verificado.

---

## Vencimiento de pagos a 72h (18-ago, autorizado por el usuario)

**Qué hace:** un pago pendiente se cancela solo (estado `cancelado`) si en 72h
nadie lo confirma. Antes avisa por correo al prospecto (si dejó correo): a las
24h y a las 3h antes del límite. Al aprobar un pago también se le manda
confirmación por correo.

**Cómo está hecho:**
- `pagos.estado` ganó el valor `cancelado` (ALTER TABLE aditivo, aplicado en
  producción con autorización explícita — no tocó filas existentes).
- `src/lib/pagos-vencimiento.ts` — recorre pagos pendientes, calcula horas
  desde `link_generado_en`; a 48h manda aviso "24h", a 69h manda aviso "3h"
  (guardados en `pagos.metadatos.avisos` para no repetir, sin migrar el
  esquema), a 72h cancela y avisa.
- `POST /api/pagos/vencimiento` (protegido por x-api-key) — dispara el
  proceso. **Cron instalado en el VPS: cada hora**
  (`/var/www/inmath/web/scripts/vencimiento-pagos.sh`, log en
  `~/inmath-vencimiento-pagos.log`).
- Panel `/panel/pagos`: columna "Vence en" con la cuenta regresiva; botones
  **Aprobar e inscribir** (ya no exige comprobante — el admin puede confirmar
  un pago verificado por otro medio) y **Cancelar** en cada fila; **clic en
  la fila abre una ficha completa** (portal) con todos los datos del
  prospecto, el pago, fechas y comprobante.

---

## Cierre de sesión — 18-ago-2026

Resumen de lo hecho hoy, todo desplegado y verificado en producción
(`inmath.lumiaaisolutions.com`, pm2 `inmath-web` en el VPS):

1. **Vencimiento de pagos a 72h** con avisos por correo a 24h/3h antes del
   límite (detalle arriba) — incluyó una `ALTER TABLE` aditiva autorizada
   explícitamente por el dueño.
2. **Panel de pagos rediseñado:** columna de cuenta regresiva, botón
   Aprobar/Cancelar sin exigir comprobante, ficha de detalle completa al
   dar clic en la fila (ver arriba).
3. **Auditoría y arreglo responsive** de sitio público y panel (ver
   `alertas-y-diseno-v37.md`, secciones v58, v58.1 y v59):
   - `/pago`: caja de precio ya no se aprieta con nombres largos de curso.
   - `/agenda` e `/inscribirme`: encabezados ya no se cortan a media palabra.
   - Chat de Mathy centrado en móvil (antes colgaba pegado a la derecha).
   - `/panel/usuarios`: grilla de tarjetas ya no desborda en pantallas ≤380px.
   - Tablas del panel (`/panel/pagos`, `/panel/configuracion`,
     `/panel/alumnos`) ganaron scroll horizontal propio dentro de la tarjeta.
   - Subrayado "swoosh" bajo "acompañamiento" quitado solo en vista móvil.
   - **Bug real de fondo encontrado y corregido (v59):** `.formulario` y
     `.campo` (grids sin `grid-template-columns`) se estiraban al ancho del
     contenido más grande (el carrusel de 7 días) en vez de al contenedor,
     cortando el formulario en /agenda y /pago en celulares reales. Este
     era el verdadero causante del desfase que el dueño seguía viendo
     después de los primeros dos intentos de arreglo — verificado con
     Playwright emulando un iPhone 13 real contra el sitio ya desplegado
     (no solo lectura de CSS), confirmando cero scroll horizontal de página
     y que los campos miden exactamente el ancho del contenedor.
4. **E1 (MySQL) y E2 (correos) confirmados resueltos** — no eran pendientes
   reales, solo documentación desactualizada; ambos verificados en vivo hoy
   (ver secciones arriba).

**Estado del sistema al cierre:** sin bugs conocidos abiertos. Lo único
pendiente de verdad son credenciales que dependen del cliente (WhatsApp
Business Cloud API de Meta, MercadoPago, Google Calendar OAuth para n8n) y
el módulo de práctica/reactivos (Fase 5, fuera del MVP) — ver
`fases-y-pendientes.md`. Los 3 usuarios reales del panel siguen con
contraseña temporal pendiente de cambiar en Mi perfil.

---

## Fases 3 y 4 — Portal del alumno + pago con tarjeta (19-ago-2026, EN LOCAL)

Construido y verificado en local (Playwright/iPhone 13); **NO desplegado** aún
por indicación del dueño. Detalle completo en
[`portal-alumno-y-pagos.md`](portal-alumno-y-pagos.md).

**Qué se entregó (código listo):**
- **Portal del alumno** en `/portal` con login por usuario/contraseña y con
  **Google**, dashboard (inscripción, próxima asesoría, reportes de avance con
  descarga autenticada, material del curso).
- **El pago es el validador del login:** solo entra quien tiene un pago
  confirmado. Se unificó la generación de credenciales para que el **webhook de
  tarjeta** y la **aprobación manual** den idéntico acceso (antes el webhook no
  generaba credenciales — bug corregido).
- **Pago con tarjeta (MercadoPago) LISTO** — cableado completo; solo falta el
  `MERCADOPAGO_ACCESS_TOKEN` y poner `procesador_pago_activo=mercadopago`.
- **Gestión de material del curso** en `/panel/materiales` (admin).

**Falta para activar (tareas del dueño, dependen de credenciales):**
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` en el `.env` → activa el login con
  Google del portal.
- `MERCADOPAGO_ACCESS_TOKEN` + config `procesador_pago_activo=mercadopago` →
  activa el cobro con tarjeta.
- **n8n (interactivo, no lo puede hacer Claude):** crear la credencial Google
  Calendar OAuth2 (flujo 03, rellena el `meet_link` que el portal ya muestra) y
  la credencial SMTP (flujo 08, envío de reportes) dentro de la UI de n8n. Pasos
  exactos en `portal-alumno-y-pagos.md`.

**Pendiente de despliegue:** cuando el dueño dé el OK, desplegar con el pipeline
de siempre (rsync → build en VPS → copiar static/public al standalone → pm2
delete/start). El portal no requiere migración de BD (usa columnas ya
existentes en `alumnos` y config JSON para el material).

---

## Cierre de sesión — 21-ago-2026 (login único + rediseño portal + Mathy)

Todo construido y verificado EN LOCAL (Playwright: desktop + iPhone 13);
**NADA desplegado ni comiteado**, a la espera del OK del dueño.

**Lo hecho hoy:**
1. **Login ÚNICO** para staff y alumnos en `/panel/login` (antes eran dos): el
   mismo formulario resuelve staff→/panel y alumno→/portal, validado por el
   pago. Campo "Correo o usuario". El login **aparece en la landing** ("Entrar"
   en nav + footer). `/portal/login` redirige al login único. Verificado E2E.
2. **Fix del logout del portal**: quedaba en página en blanco (usaba `APP_URL`
   ausente en local → URL relativa que `NextResponse.redirect` rechaza). Ahora
   usa el origen de la petición; robusto en local y prod. Mismo fix en las
   rutas de Google. Verificado.
3. **Rediseño del portal del alumno** (dev senior + UX/UI senior): estilo panel
   educativo moderno, regla 60-30-10, tarjetas hero de gradiente con cifra
   gigante (verde=avance, coral=próxima asesoría), chips de métricas, material
   como tarjetas, cifras animadas al entrar en viewport, reveal escalonado —
   todo con `prefers-reduced-motion`. Se usaron (autorizadas) las skills de
   diseño ui-ux-pro-max, frontend-design, emil (animación) y hallmark;
   conservando la marca InMath (no plantilla genérica). Detalle en
   `alertas-y-diseno-v37.md` §v60–v62.
4. **Mathy SIN FONDO** (sitio y panel): botón transparente, solo la mascota
   sobre un splash de color estilo `.eyebrow` (con núcleo claro para legibilidad).

**Sigue pendiente (igual que antes — nada nuevo se destrabó):**
- Cambio de contraseña del alumno en el portal + recuperación de contraseña
  para alumnos (los recomendé; el dueño aún no dio el OK para hacerlos).
- Credenciales del dueño: Google (login), MercadoPago (tarjeta), WhatsApp
  Business (Meta), y las tareas interactivas de n8n (Calendar OAuth + SMTP).
- **Desplegar a producción** todo lo de Fases 3–4 + rediseño (a la espera del OK).
- Los 3 usuarios reales del panel siguen con contraseña temporal por cambiar.
- Fase 5 (práctica/reactivos) sigue fuera del MVP.

**Nota:** las skills de diseño se instalaron en `inmath-next/.agents/skills/`
(y crearon `.claude/`, `skills-lock.json`); se agregaron al `.gitignore` para no
comitearlas. Quedan datos de prueba en la BD local (alumno `5210000000001` /
`prueba123`, admin `admin.prueba@example.com` / `admin123`) para previsualizar.
