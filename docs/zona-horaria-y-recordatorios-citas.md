# Zona horaria en /agenda + recordatorios de asesoría por correo (12-sep-2026)

Origen: un cliente reportó que una asesoría se agendó con 1 hora de desfase
("era de Sonora y van una hora menos"). Investigación + implementación en la
misma sesión — ver también [`citas-y-links-meet.md`](citas-y-links-meet.md)
para la cadena de creación del evento de Calendar/Meet, que este documento
complementa.

## Diagnóstico

El sistema entero maneja UNA sola zona de negocio hardcodeada
(`America/Mexico_City`, en `src/lib/fechas.ts`) y **nunca la declaraba** en
ningún lugar visible: ni en `/agenda`, ni en el correo de confirmación, ni en
el evento de Calendar. Confirmado con el usuario: los asesores están todos en
CDMX (fue un caso aislado del lado del prospecto/alumno) — por eso la
solución NO fue agregar zona horaria por asesor, sino **etiquetar siempre la
zona y convertir la hora para quien agenda desde otra zona**.

De paso, se encontró y corrigió un bug real y separado (no la causa de este
caso, pero sí un riesgo latente):

- **`src/lib/google-calendar.ts`** (ruta de RESPALDO de Calendar, solo se usa
  si n8n falla): la función `iso()` leía la hora con getters LOCALES
  (`getHours()`, `getMonth()`...) sobre un `Date` que sigue la convención
  "pared-UTC" del proyecto (ver cabecera de `fechas.ts`). Como el proceso
  Node en el VPS corre con `TZ=America/Mexico_City` (confirmado con
  `timedatectl` y `Intl.DateTimeFormat().resolvedOptions().timeZone` — no es
  UTC), esto desfasaba el evento **6 horas** cada vez que se activaba el
  respaldo. Corregido: ahora usa `isoMinuto()` de `fechas.ts` (getters UTC),
  igual que el resto del sistema.
- Se verificó también la ruta PRIMARIA (n8n, activa desde el 31-ago-2026):
  su nodo de Calendar no declara `timeZone` en el JSON del workflow, pero se
  confirmó por SSH que la instancia real de n8n en el VPS
  (`/root/n8n-stack/docker-compose.yml`) sí tiene `GENERIC_TIMEZONE=America/
  Mexico_City` — hoy funciona bien, aunque de forma implícita/frágil (no es
  parte de este cambio, queda como nota para quien toque el workflow n8n).

## Diseño (decisiones confirmadas con el usuario antes de implementar)

1. **Quién estaba en otra zona**: el prospecto, no el asesor.
2. **¿Asesores multi-zona?** No — todos en CDMX, caso aislado. No se agregó
   campo de zona horaria a `usuarios`/asesores.
3. **¿Detectar la zona del visitante en `/agenda`?** Sí, mostrar ambas horas
   (como Calendly), sin pedirle nada al prospecto.
4. **¿A quién van los recordatorios?** A prospecto Y asesor.

## Implementación — zona horaria

- **`src/lib/fechas.ts`**: nuevas exportaciones —
  `TZ_NEGOCIO` ("America/Mexico_City"), `TZ_NEGOCIO_ETIQUETA` ("Hora del
  Centro de México"), `zonaValida(zona)` (valida un string de zona IANA
  contra `Intl`, protege contra basura de un `<input hidden>`),
  `horaEnZona(d, zona)` (convierte una hora "pared-UTC" a la hora real en
  `zona`, usando el offset fijo `-06:00` de CDMX — México abolió el horario
  de verano en la zona Centro desde 2022, así que es un offset constante) y
  `cuandoProspecto(d)` (la etiqueta de fecha SIEMPRE con "(Hora del Centro
  de México)" al final, para todo texto que lee el prospecto).
- **`/agenda` (`AgendaForm.tsx`)**: detecta
  `Intl.DateTimeFormat().resolvedOptions().timeZone` en el navegador (en un
  `useEffect`, nunca en el primer render, para no romper la hidratación).
  Un `<input type="hidden" name="zona_horaria">` la manda al servidor.
  Bajo "Fechas disponibles" siempre se lee "Horarios en Hora del Centro de
  México (CDMX)"; si la zona detectada es distinta, cada horario muestra
  además su conversión ("9:00 AM tu hora").
- **`agenda.ts`**: `agendar()` y `crearCita()` reciben la zona detectada
  (opcional, `null` en los otros 2 lugares que llaman `agendar()` sin
  contexto de navegador: el chat de Mathy y el alta manual desde el panel),
  la validan con `zonaValida()` y la guardan en el nuevo campo
  `citas.zona_horaria_prospecto`. El correo de confirmación
  (`confirmarCitaPorCorreo`) y los correos de link tardío
  (`correoLinkProspecto`, usado también por `repararLinkCita` y
  `guardarLinkManual`) leen ese campo y agregan un bloque `destacado` con la
  conversión cuando aplica — MISMA plantilla de correo de siempre
  (`enviarCorreo`/`plantillaHtml`), solo cambia el contenido.

## Implementación — recordatorios de asesoría por correo

Nuevo `src/lib/citas-recordatorios.ts`, clon del patrón ya probado en
`pagos-vencimiento.ts` (avisos de vencimiento de pago): sin tabla nueva, los
avisos ya enviados se guardan en `citas.metadatos.avisos` (JSON) para no
repetirlos.

- **4 ventanas**: 1 día, 3 horas, 1 hora y 10 minutos antes de `inicio`.
- **A quién**: correo al prospecto (si tiene correo) Y al asesor
  (`usuarios.email`), contenido distinto por audiencia pero MISMA plantilla
  de marca. Incluye el link de Meet como botón cuando ya existe; si aún no
  existe (caso raro, cadena de Calendar sin resolver), el correo queda sin
  botón con una nota de que llegará antes de la sesión.
- **Anti-reminder retroactivo**: `ventanasVencidasAlCrear(inicio, ahora)` se
  llama AL CREAR la cita — si se agenda con poca anticipación (ej. 30 min),
  las ventanas que ya pasaron (1d, 3h, 1h en ese ejemplo) se marcan como
  "enviadas" sin mandar nada, para que nadie reciba un falso "es mañana"
  cuando la cita ya es en breve.
- **Endpoint**: `POST /api/citas/recordatorios` (protegido con
  `x-api-key`, mismo patrón que `/api/pagos/vencimiento`).
- **Cron**: `scripts/recordatorios-citas.sh`, cada 5 minutos
  (`*/5 * * * *`) — más frecuente que el de pagos (cada hora) porque la
  ventana de "10 minutos antes" no perdona un cron más espaciado.
- **Cancelación implícita**: si una cita pasa a `cancelada`/`no_asistio`,
  simplemente deja de aparecer en el `where: estado IN (agendada,
  confirmada)` del cron — no hace falta cancelar nada a mano.

## Esquema (migración aplicada en producción el 12-sep-2026)

```prisma
model citas {
  ...
  zona_horaria_prospecto String? @db.VarChar(60)
  metadatos               Json?
  ...
}
```
Ambos campos nullable/aditivos — aplicados con `npx prisma db push` en el
VPS (sin tabla de migraciones en este proyecto; mismo criterio que el resto
del esquema).

## Verificado en producción (12-sep-2026)

- `/agenda`: label de zona visible, layout intacto, sin romper el flujo
  existente (confirmado con captura de pantalla real).
- Correo de recordatorio (`10m`, tono coral): renderizado con la plantilla
  real, logo, botón CTA y el bloque de conversión de hora — confirmado
  visualmente antes de desplegar.
- Cron corriendo cada 5 min sin tocar los crons de otros clientes del VPS
  (que comparte el mismo servidor con ~14 sitios más de LUMIA).
- **Primera corrida real (14:00, 12-sep-2026)**: `{"revisadas":1,
  "enviadosProspecto":2,"enviadosAsesor":2}` — una cita YA EXISTENTE (creada
  antes de este cambio, sin historial en `metadatos.avisos` porque el campo
  no existía) disparó 2 ventanas de golpe (probablemente 3h y 1h, ya
  vencidas ambas al momento de la primera revisión). Es un evento de
  transición ÚNICO para citas preexistentes, no un bug recurrente.
- **Segunda corrida (14:05)**: `{"revisadas":1,"enviadosProspecto":0,
  "enviadosAsesor":0}` — la MISMA cita, cero correos nuevos. Confirma que el
  anti-duplicado por `metadatos.avisos` funciona correctamente; de aquí en
  adelante (y para toda cita nueva) las ventanas disparan una a la vez como
  se diseñó.

## Pendiente / notas para más adelante

- El nodo de Calendar del workflow n8n (`03-cita-google-calendar.json`) no
  declara `timeZone` explícito — hoy funciona porque la instancia real del
  VPS tiene `GENERIC_TIMEZONE=America/Mexico_City`, pero sería más robusto
  agregarlo explícito en el nodo (defensa en profundidad). No se tocó en
  esta sesión por ser edición del editor n8n compartido con otros clientes
  del VPS — requiere republicar el flujo con cuidado, en una sesión aparte.
