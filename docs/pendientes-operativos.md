# Operación: correos, MySQL y efectos — estado y pasos (17-ago-2026)

Resumen de las fases E1–E3 y lo que queda en manos del dueño.

## E1 — Estabilidad de MySQL (pendiente: aprobación de reinicio)

**Síntoma:** tras cada reinicio del proceso Node, MySQL 8 falla de forma
intermitente con `Unknown authentication plugin 'sha256_password'` (caché frío).
Se recupera solo al calentarse, pero reaparece en el siguiente reinicio, tirando
/agenda y a Mathy con 500 mientras dura la ventana fría.

**Causa raíz:** el servidor tiene `default_authentication_plugin =
caching_sha2_password`; el motor Rust de Prisma choca con el flujo de "full auth"
de ese plugin en TCP sin TLS. Las cuentas `inmath` ya son `mysql_native_password`,
así que el arreglo definitivo es cambiar el **default del servidor** a native.

**No borra datos.** Solo cambia un plugin de auth por defecto + reinicia el
servicio MySQL (segundos de corte). Reversible (borrar el archivo + reiniciar).

**Comando (ejecutar con OK explícito del dueño — reinicia MySQL en prod):**
```bash
ssh -p 8080 deploy@2.24.123.93
echo -e '[mysqld]\ndefault_authentication_plugin=mysql_native_password' | \
  sudo tee /etc/mysql/mysql.conf.d/zz-native-auth.cnf
sudo systemctl restart mysql
sudo mysql -N -e "SHOW VARIABLES LIKE 'default_authentication_plugin'"   # debe decir mysql_native_password
```
**Rollback:** `sudo rm /etc/mysql/mysql.conf.d/zz-native-auth.cnf && sudo systemctl restart mysql`.
**Verificación:** reiniciar la app (`pm2 delete inmath-web` + start) y golpear
`/agenda` y `/api/agente` varias veces en frío; no debe reaparecer el error.

## E2 — Correos por Gmail (SMTP)

El código ya envía con `nodemailer` vía `SMTP_URL` (ver `src/lib/correo.ts`).
Si `SMTP_URL` no está, el envío se omite con log (no rompe nada). Falta solo la
credencial de Gmail.

**Cron del recordatorio semanal: YA INSTALADO** en el VPS.
- Script: `/var/www/inmath/web/scripts/recordatorio-disponibilidad.sh`
- Crontab: `0 9 * * 5` (viernes 9:00) → POST a `/api/disponibilidad/recordatorio`
- Log: `~/inmath-recordatorio.log`. Hoy responde
  `{"enviado":false,"motivo":"correo no configurado (falta SMTP_URL)"}` — correcto
  hasta que se configure SMTP.

**Pasos para activar Gmail (los hace el dueño; la contraseña no la maneja Claude):**
1. En la cuenta de Google, activar **Verificación en 2 pasos**
   (myaccount.google.com/security).
2. Crear una **Contraseña de aplicación** en myaccount.google.com/apppasswords
   → copiar el código de 16 caracteres (sin espacios).
3. En el VPS, agregar al `.env` (fuente y standalone) y reiniciar:
```bash
ssh -p 8080 deploy@2.24.123.93
cd /var/www/inmath/web
# OJO: en SMTP_URL el "@" del correo va como %40, y la app password SIN espacios.
cat >> .env <<'ENV'
SMTP_URL="smtps://TUCORREO%40gmail.com:APPPASSWORD16@smtp.gmail.com:465"
CORREO_FROM="Cursos InMath <TUCORREO@gmail.com>"
ENV
cp .env .next/standalone/.env
pm2 delete inmath-web; cd .next/standalone && PORT=3010 pm2 start server.js --name inmath-web --update-env && pm2 save
```
4. Probar: `curl -s -X POST http://127.0.0.1:3010/api/disponibilidad/recordatorio -H "x-api-key: $(grep ^API_KEY /var/www/inmath/web/.env | cut -d= -f2-)"`
   → debe decir `"enviado":true` (y llegar el correo a los admins).

A partir de ahí se envían: el **seguimiento del pago por correo** y el
**recordatorio semanal de disponibilidad**.

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
