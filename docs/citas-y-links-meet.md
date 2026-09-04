# Citas y links de Meet — arquitectura completa (03/04-sep-2026)

Documento único del subsistema que garantiza que **toda cita agendada tenga su
evento en Google Calendar, su link de Meet y sus correos** — construido y
endurecido en la sesión maratónica del 03-sep-2026 (commits v65–v73).

## La cadena de creación del link (al agendar en /agenda o /panel/citas)

1. **Robot n8n (titular)** — `crearEventoCalendar()` en `src/lib/agenda.ts`
   llama al webhook `cita-creada` del workflow *03 - Cita creada → evento
   Google Calendar + Meet + confirmación copy* (timeout 20 s). El workflow
   crea el evento en el calendario de `cursosinmath@gmail.com` y guarda
   `google_event_id` + `meet_link` con `PATCH /api/citas/{id}`.
2. **Re-chequeo anti-lentitud** — si n8n "falló", puede ser solo lentitud:
   el sitio espera ~8 s re-leyendo la cita; si el link del robot aterriza
   tarde, se usa ese y NO se crea otro evento.
3. **Respaldo directo (sin n8n)** — `src/lib/google-calendar.ts` crea el
   evento él mismo con la cuenta de Google conectada en /panel/configuracion
   (OAuth con el MISMO cliente del login, scope `calendar.events`, refresh
   token en `configuraciones.google_calendar_refresh`).
4. **Guardado atómico "el primero gana"** — `updateMany` con
   `meet_link IS NULL`; el perdedor de la carrera **borra su propio evento**
   del calendario (`borrarEventoDirecto`). El PATCH del robot tampoco
   sobreescribe un link existente (y borra su evento si llegó tarde,
   respondiendo 200 idempotente). **Nunca pueden quedar dos eventos.**

## La red de seguridad (si TODO lo anterior falla)

- **Correo al cliente**: "tu asesoría quedó agendada… en unos minutos te
  llega el enlace" (nunca promete algo que no pase).
- **⚠️ Correo URGENTE al staff** al agendar sin link, y otro único a los
  ~9-12 min si sigue sin resolverse.
- **Banner ROJO en todo el panel** con NOMBRE, fecha y hora de cada cita sin
  link; el botón lleva directo a la ficha del prospecto. En el calendario de
  /panel/citas, la cita sin link lleva gaje "⚠ SIN LINK".
- **Reintento automático cada 3 minutos** (`POST /api/citas/reparar-links`,
  cron `*/3` → `scripts/reparar-links-citas.sh`): reintenta la cadena,
  guarda el link, **se lo envía solo al cliente** ("El enlace de tu
  asesoría") y manda **"✅ Resuelto"** al staff con el botón del Meet — el
  urgente y su resolución cierran el ciclo en la misma bandeja. Ignora citas
  con <2 min de creadas (no compite con el agendado en curso).
- **Botones en la ficha del prospecto** (cita activa sin link): "Generar
  link" (reintenta la cadena) y "Pegar link" (Meet hecho a mano) — en ambos
  casos los correos al cliente y al staff salen automáticos al guardar.

## Permisos

- Módulo **"Respaldo de Google Calendar"** (`calendario_respaldo`) en los
  interruptores de /panel/usuarios: controla quién ve la tarjeta de
  conectar/reconectar en /panel/configuracion. Es un permiso EXPLÍCITO — ni
  los administradores lo tienen sin el interruptor (candado: nadie puede
  editarse sus propios módulos).
- Desde v68 TODOS los interruptores de módulos aplican también a admins.

## Historia de los bugs (para no repetirlos)

- **n8n 2.x exige PUBLICAR** los flujos (modelo borrador/publicación desde
  el upgrade de ~01-sep). Un flujo "activo" sin versión publicada muere al
  instante con "Error in workflow" SIN registrar ejecución. Editar la BD de
  n8n a mano deja el flujo en ese estado — siempre publicar desde el editor.
- **Duplicados con 2 links**: carrera robot-lento vs respaldo (resuelta con
  las capas 2-4 de arriba). No eran los permisos de usuarios.
- **Errores nocturnos "aleatorios"**: TODOS coincidieron con ventanas de
  reinicio de deploys (Cloudflare 522 al PATCH). Regla operativa: **no
  probar agendados en los ~2 min posteriores a un deploy**; si pasa, el
  reintento de 3 min lo repara solo.
- El nodo vestigial "Obtener calendario del asesor" del workflow duplicaba
  eventos (uno por asesor) — eliminado del flujo publicado.

## Pendientes vivos (04-sep-2026, madrugada)

1. **ACTIVAR la Google Calendar API** en el proyecto de Google Cloud del
   login (error `SERVICE_DISABLED`, proyecto 746722705015):
   <https://console.developers.google.com/apis/api/calendar-json.googleapis.com/overview?project=746722705015>
   Sin esto el respaldo directo NO puede crear ni borrar eventos (la
   conexión OAuth del panel ya está hecha con cursosinmath@gmail.com).
2. **Limpieza manual** en el calendario de cursosinmath: borrar eventos de
   prueba ("Prueba…", "Diagnostico…") y huérfanos de las carreras de la
   noche (conservar solo los links que aparecen en las fichas del panel).
3. Sugerido: activar "Retry on fail" en el nodo *Guardar event_id y
   meet_link* del workflow de n8n (3 intentos, 5 s) para blindar los 522 de
   ventanas de deploy también del lado del robot.
