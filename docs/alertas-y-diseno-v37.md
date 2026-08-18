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
