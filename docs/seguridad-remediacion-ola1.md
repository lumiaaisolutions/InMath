# Seguridad — Ola 1 (contención), ejecutada por fases

Sigue a `auditoria-ciberseguridad-2026-09.md`. El VPS (`2.24.123.93`) es
**multi-cliente** (LUMIA aloja ahí InMath y ~14 sitios/apps más de otros
clientes bajo `*.lumiaaisolutions.com`), así que cada cambio se verificó
contra los demás sitios antes de darlo por bueno, no solo contra InMath.

Reconocimiento previo (antes de tocar nada):
- `ufw`: inactivo.
- Ollama y n8n corren en Docker (`docker.n8n.io/n8nio/n8n`, `ollama/ollama`),
  proyecto compose en `/root/n8n-stack/docker-compose.yml`, publicados a
  `0.0.0.0:11434` y `0.0.0.0:5678`.
- n8n habla con Ollama por la red interna de Docker (`OLLAMA_HOST=ollama:11434`),
  **no** por el puerto publicado al host → cerrar ese puerto al exterior no
  rompe la integración n8n↔Ollama.
- Confirmado en nginx que TODOS los sitios (clicktodo, clicktoeat, clicktoshop,
  clicktobarber, intranet, portal, n8n, InMath, clicktotrade) ya sirven vía
  `proxy_pass http://127.0.0.1:PUERTO` — nunca necesitan el puerto expuesto a
  internet, solo loopback. Esto hizo seguro cerrar los puertos directos.
- SSH ya tenía `PermitRootLogin no` (bien) y `fail2ban` activo en el jail
  `sshd` (bien). Lo que faltaba: `PasswordAuthentication` seguía en `yes`.
- `deploy` tiene una sola llave en `authorized_keys` — confirmado el acceso
  por llave funciona (esta sesión completa se hizo sin pedir contraseña)
  antes de desactivar el login por contraseña.

## Fase 1 — `.env` de InMath sin permisos de grupo/otros (A-06, alcance InMath)

`/var/www/inmath/web/.env` estaba en `664` (`rw-rw-r--`, dueño `deploy`,
grupo `deploy`) — legible por cualquier proceso del grupo `deploy` en un VPS
donde ese es el único usuario real, pero igual innecesario. Cambiado a `600`.

**No se tocó** `/var/www/inmath/backend/.env` (640, grupo `www-data`) porque
ese árbol PHP está marcado "muerto" en la auditoría (Fase 3) pero no
confirmado como completamente inerte, y **no se tocaron los `.env` de otros
clientes** (`lumia-hq`, `clicktodo-api`, `clicktobarber-api`): dos de ellos
tienen grupo `www-data` (640), lo que sugiere que un PHP-FPM corriendo como
`www-data` los lee directamente — un `chmod 600` ahí podría romper esos
sitios. Ese barrido queda como tarea aparte que requiere confirmar antes el
usuario de ejecución de cada app (ver "Pendiente" abajo).

Verificado: `curl` a InMath (`/`, `/portal`, `/panel/login`) sigue en 200
tras el cambio (el proceso pm2 corre como `deploy`, dueño del archivo).

## Fase 2 — Ollama y n8n a loopback (C-01, C-02)

Editado `/root/n8n-stack/docker-compose.yml`:
- `"5678:5678"` → `"127.0.0.1:5678:5678"` (n8n)
- `"11434:11434"` → `"127.0.0.1:11434:11434"` (Ollama)

Recreado con `docker compose up -d` (mismo `.env` del proyecto, sin tocarlo).

Verificado:
- `ss -tlnp` ya no muestra `0.0.0.0:5678` ni `0.0.0.0:11434` — solo
  `127.0.0.1`.
- `https://n8n.lumiaaisolutions.com` sigue respondiendo (nginx en el mismo
  host llega por loopback sin problema).
- Ollama ya no es alcanzable desde fuera del VPS (antes cualquiera en
  internet podía descargar/borrar modelos o saturar la CPU: hallazgo 8.6).
- El flujo InMath → n8n (webhooks de WhatsApp/Meta) no se ve afectado: Meta
  llama a `n8n.lumiaaisolutions.com` (dominio + nginx), nunca al puerto
  directo.

## Fase 3 — Firewall UFW activado (C-01/C-02, base de todo lo demás)

Reglas permitidas ANTES de activar (para no perder el acceso SSH):
- `8080/tcp` (puerto real de SSH en este VPS)
- `80/tcp` y `443/tcp` (nginx / Let's Encrypt)

Activado con `ufw --force enable`. Verificado:
- `ufw status` → `active`, con esas 3 reglas.
- Conexión SSH NUEVA (no la ya abierta) por el puerto 8080 sigue entrando.
- `curl` externo a InMath y a otros 2 dominios de muestra
  (`n8n.lumiaaisolutions.com`, `clicktoeat.lumiaaisolutions.com`) sigue en
  200/reachable.
- Los puertos que antes eran alcanzables por IP directa (3001, 3003-3007,
  3010, 5678, 11434) ya NO responden desde fuera — solo vía su dominio +
  nginx + TLS, que es como todos ya funcionaban.

## Fase 4 — SSH solo con llave (A-03)

Confirmado ANTES: `pubkeyauthentication yes` ya activo y esta misma sesión
lo usa (sin prompt de password en ningún comando anterior).

**⚠️ Hallazgo durante la ejecución**: cambiar `PasswordAuthentication no` en
`/etc/ssh/sshd_config` y recargar sshd **no tuvo efecto** — `sshd -T`
seguía devolviendo `yes`. Causa: `Include /etc/ssh/sshd_config.d/*.conf` se
procesa cerca del INICIO del archivo principal, y en sshd_config **gana la
primera aparición** de cada directiva. Había tres drop-ins en conflicto:
- `50-cloud-init.conf` → `PasswordAuthentication yes` (lo regenera
  `cloud-init` en cada boot; es la fuente real del problema)
- `60-cloudimg-settings.conf` → `no`
- `99-lumia-hardening.conf` → `no` (bloque completo de hardening —
  `PermitRootLogin no`, `AllowUsers deploy`, `MaxAuthTries 3`, etc. — ya
  existía de un intento previo, "Phase 2C", pero quedaba **silenciosamente
  anulado** por `50-cloud-init.conf` al ser alfabéticamente anterior)

Fix robusto (sobrevive a que cloud-init reescriba su propio archivo en el
próximo reinicio): renombrado `99-lumia-hardening.conf` →
`10-lumia-hardening.conf`, para que ordene ANTES que `50-cloud-init.conf`
y gane siempre, sin tocar el archivo de cloud-init. `sshd -t` (validar
sintaxis) antes de `systemctl reload sshd` (reload, no restart, para no
tumbar sesiones activas a media operación).

Verificado con una conexión SSH **nueva** (proceso distinto, no reutiliza
la sesión ya autenticada): entra por llave sin pedir password
(`BatchMode=yes`, sin prompt). Un intento forzando
`-o PubkeyAuthentication=no -o PasswordAuthentication=yes` (simulando a
alguien sin la llave) fue rechazado por el servidor con
`Permission denied (publickey)` — confirma que el login por contraseña ya
no es una puerta de entrada, incluso si alguien tuviera la contraseña.

De paso quedó vigente el resto del bloque de `10-lumia-hardening.conf`
(ya existía, solo estaba anulado): `PermitRootLogin no`, `AllowUsers
deploy` (nadie más puede iniciar sesión por SSH aunque tenga cuenta en el
VPS), `MaxAuthTries 3`, `LoginGraceTime 30`, `ClientAliveInterval 300`.

## Verificación final consolidada

Tras las 4 fases, en una sola pasada:

| Chequeo | Resultado |
|---|---|
| `ufw status` | `active` |
| Ollama/n8n listen | solo `127.0.0.1:11434` y `127.0.0.1:5678` |
| `sshd -T passwordauthentication` | `no` |
| `sshd -T permitrootlogin` | `no` |
| `sshd -T allowusers` | `deploy` |
| `/var/www/inmath/web/.env` | `600` |
| `fail2ban` jail `sshd` | activo, 0 fallos actuales |
| inmath.lumiaaisolutions.com | 200 |
| n8n.lumiaaisolutions.com | 200 |
| clicktoeat / clicktoshop / clicktobarber .lumiaaisolutions.com | 200 |
| intranet / portal .lumiaaisolutions.com | 307 (normal, redirect a login) |

Ningún cliente del VPS quedó afectado por los cambios.

## Pendiente (fuera del alcance de hoy, requiere más info o es de otro cliente)

- **A-07** (n8n con credenciales de varios clientes, sin allowlist/2FA
  verificado): no se tocó — requiere decidir qué IPs/usuarios tienen
  legítimo acceso al editor antes de restringir, y afecta a más clientes
  que solo InMath. Pendiente de una conversación aparte.
- **`.env` de otros clientes** (`lumia-hq`, `clicktodo-api`,
  `clicktobarber-api`): no se tocaron por el riesgo de romper procesos
  PHP-FPM que corren como `www-data` y leen el `.env` directo. Antes de
  aplicar `chmod 600` ahí hay que confirmar el usuario de ejecución de cada
  app.
- **Ola 2** (M-08 monto/moneda del webhook, M-10 CSP nonces, M-11 rotación
  de sesiones, etc.) y **Ola 3** (deuda técnica: árbol PHP muerto, archivos
  sueltos en la raíz) siguen abiertas — ver
  `auditoria-ciberseguridad-2026-09.md`.
