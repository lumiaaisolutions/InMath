# Portal del alumno — Fase B (mejoras grandes) — plan modular

Documento vivo para no perder el hilo. Todo se hace y verifica EN LOCAL antes de
desplegar. Marcar cada módulo al completarlo.

## Módulos

- **M1 — Íconos del portal con firma `eyebrow`.** Todos los íconos del panel del
  alumno sin caja, con splash de color (como `.eyebrow`). Auditar y unificar.
  Estado: **HECHO** (material, reportes, datos de cuenta, accesos). Falta rematar
  íconos sueltos si aparecen.

- **M2 — Avance % con animación de conteo al recargar.** El número dot-matrix
  del avance cuenta de 0 al valor al cargar/entrar en viewport.
  Estado: **HECHO** (NumeroPuntos ahora es cliente y anima; respeta
  reduced-motion).

- **M3 — Scroll/parallax/scrubbing + hover en todo el panel.** Reveals
  escalonados (ya había), parallax suave en tarjetas hero, scrubbing de la
  secuencia (reutilizar motor del sitio), micro-interacciones hover.
  Estado: **HECHO (base)** — reveals + parallax hero + hover; el scrubbing de
  imágenes queda para cuando haya secuencia de imágenes real.

- **M4 — Pantalla de carga al recargar el portal.** Faltaba el overlay de carga
  (el sitio/panel sí lo tienen). Agregado al layout del portal + scripts
  show/hide en nav y submit.
  Estado: **HECHO**.

- **M5 — Personalizar datos de cuenta.** Editar foto (ya), **nombre** y
  **WhatsApp**. Portada: si no hay, NO saturar — color transparente sin blur.
  Estado: **HECHO**.

- **M6 — Autenticación de 2 factores (2FA) opcional.** ✅ **HECHO.** El alumno la
  habilita con un interruptor en Mi cuenta → Seguridad (requiere correo). Al
  iniciar sesión, si está activa, se emite un **código OTP de 6 dígitos por
  correo** (guardado con hash en config `alumno_2fa_codes`, 10 min de vigencia) y
  el login pide el código en un segundo paso animado antes de crear la sesión.
  Librería `src/lib/portal/dosfactores.ts` (flags en config `alumno_2fa`, reto
  firmado HMAC con prefijo `2fa:` y 600 s). `verificar2faAccion` en
  `panel/login/actions.ts`; paso de código en `LoginClient` (`.login-2fa`).

- **M7 — Animación del login.** ✅ **HECHO.** Entrada escalonada del formulario
  (`.lc-e e1..e6`) ya existente + **entrada animada del paso 2FA**
  (`login2faEntra`) y aviso de error con sacudida (`aviso-sacudida`). Respeta
  `prefers-reduced-motion`.

- **M8 — Login con Google que exige registro completo.** ✅ **HECHO.** Si el
  correo de Google no tiene cuenta, el callback
  (`api/portal/google/callback`) redirige a `/pago?google=1&correo=…&nombre=…`
  → el wizard arranca en "Paso 1 de 3" (sin pedir contraseña, marca `google`) y
  no deja continuar al portal hasta completar el registro. El login por
  usuario/contraseña ya permite entrar sin pagar y el portal aplica el gate.

- **M9 — Registro paso a paso (inscribirme).** ✅ **HECHO.** `/pago` ahora es un
  **wizard** (`InscripcionWizard`): nombre → WhatsApp → correo → contraseña →
  pago, con barra de progreso y validación por paso. Al terminar crea la CUENTA
  del alumno (con su contraseña) + pago pendiente, y ofrece pagar ahora o
  después. `registrarAlumnoAccion` en `pago/actions.ts`.

- **M10 — Gate de pago en el panel.** ✅ **HECHO.** Si el alumno no tiene pago
  confirmado: el dashboard muestra "Falta completar tu pago" (CTA pagar +
  agendar sesión gratis), Material/Reportes **redirigen** a /portal, **Mathy
  abre solo y recuerda pagar** (saludo especial + opciones), y sí puede ir a Mi
  cuenta y agendar. El login (`auth-unificado`) ya no exige pago para entrar; el
  gate vive en el portal (`tienePagoConfirmado`).

- **M11 — Mathy: manos y tamaño.** Manos: **puño (manga) hacia el libro, dedos
  hacia afuera, pulgares arriba**, y **separadas del libro** (se encogió el libro
  a scale .58 y se alejaron las manos, scale .88). **Mathy más grande** (botón
  120–148px sitio, 116–144px panel; mascota 116–140px). Íconos de accesos y
  notificación pasados a firma eyebrow (sin caja).
  Estado: **HECHO**.

## Orden de trabajo

- **Lote A (UX del panel):** M1, M2, M3, M4, M5. ✅ completado.
- **Lote B (auth + pago + wizard):** M6, M7, M8, M9, M10. ✅ completado. Canal de
  2FA: **correo** (OTP 6 dígitos, 10 min). Datos del wizard: nombre → WhatsApp →
  (correo → contraseña, salteados con Google) → pago al final.
- **M11 (Mathy manos/tamaño):** ✅ completado.

**Estado global Fase B: TODOS los módulos HECHOS y verificados en local.**

## Notas técnicas

- Overlay de carga: componente `OverlayCarga` + scripts que quitan la clase
  `oculta` en nav/submit (mismo patrón que sitio/panel).
- Gate de pago (M10): la sesión del alumno ya sabe si tiene pago confirmado
  (`tienePagoConfirmado`). El gate se aplicaría en el layout del portal
  redirigiendo/bloqueando si no hay pago (excepto Mi cuenta y agendar).
