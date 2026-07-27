# Panel de control (CRM) — Fase 5

Panel web multiusuario servido por PHP (mismo hosting que el backend; comparte
`backend/.env` y las clases de `backend/src/` — no duplica lógica).

## Funciones

- **Autenticación por sesión** con roles: `admin` (todo) y `asesor` (operación).
  Protección CSRF en todas las acciones. Usuarios seed: `admin@inmath.mx` y
  `asesor1..3@inmath.mx` (contraseña `Cambiar.123` — cambiarla en producción).
- **Pipeline visual** con las 5 etapas del embudo unidas por el hilo de nodos del
  motivo de la curva de avance Inmath (riel del embudo en degradado pino→sol). Filtro por asesor,
  puntaje de calificación y último mensaje en cada tarjeta.
- **Detalle de prospecto**: bitácora completa de la conversación del bot (burbujas),
  tomar/devolver la conversación al bot, mover etapa, asignar/reasignar asesor,
  generar link de pago, historial del pipeline como línea de tiempo.
- **Calendario semanal** de citas, consolidado y por asesor (un color por asesor).
- **Alumnos** y **Pagos** (estado de links, recordatorios de carrito).
- **Prompts del bot** (solo admin): editor con versionado — guardar crea versión
  nueva y cualquier versión anterior puede reactivarse. Es el mecanismo de ajuste
  del bot sin tocar código.
- **Configuración** (solo admin): criterios de calificación, horarios, tiempos de
  recuperación de carrito, procesador de pago, modelo de Claude.

## Pantallas de estado

`public/estado/` contiene las 3 pantallas con la identidad animada Inmath (la curva
de avance dibujándose, desdibujándose o rota según el estado):
carga (`loading-normal.html`), mantenimiento (`loading-maintenance.html`) y 503
(`loading-server-down.html`), más un `index.html` de previsualización. Para usarlas
en producción: `ErrorDocument 503 /estado/loading-server-down.html` en Apache o
`error_page 502 503 504 /estado/loading-server-down.html;` en Nginx.

## Desarrollo local

```bash
php -S localhost:8124 -t panel/public panel/public/index.php
```

## Despliegue

Subir `panel/` junto a `backend/` (el panel resuelve `../backend`). Document root
del subdominio (p. ej. `panel.dominio.com`) → `panel/public/`. El `.htaccess`
incluido enruta a `index.php`.
