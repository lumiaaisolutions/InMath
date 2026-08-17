# Preguntas para Cursos Inmath (para cerrar Fases 1–3)

Redactadas sin tecnicismos, listas para copiar/pegar al cliente. Ver detalle
de dónde se aplica cada respuesta en los demás documentos de esta carpeta.

1. **Precio y nombre del curso.** ¿Cuál es el precio real de inscripción y el
   nombre oficial del curso? ¿Cuántas semanas dura el acceso? (Hoy la página
   muestra "$2,500 MXN — Curso en línea Inmath, 12 semanas" como ejemplo.)
2. **Cuenta para transferencias.** ¿A qué cuenta deposita un alumno? Banco,
   nombre del titular y CLABE (y si aceptan también depósito en OXXO u otro).
3. **Pago con tarjeta.** ¿Quieren activar pagos con tarjeta vía MercadoPago?
   Si sí, necesitamos que abran su cuenta de MercadoPago y nos compartan los
   accesos de cobro que la plataforma les da.
4. **WhatsApp del negocio.** ¿A qué número de WhatsApp deben llegar los
   interesados desde la página? (a 10 dígitos).
5. **Respuestas del asistente.** ¿Qué preguntas frecuentes reales hacen sus
   alumnos y cómo quieren que se respondan? ¿El tono actual (cálido, de tú)
   les gusta o lo ajustamos?
6. **Horarios de asesoría.** ¿Qué días y horas atienden citas y cuánto dura
   cada una? (Hoy: lunes a sábado de 9:00 a 19:00, citas de 30 minutos.)
7. **Fotos y videos.** ¿Nos comparten fotos o videos reales del equipo/clases
   para la página y la pantalla de entrada del panel? (Hoy usamos fotos de
   archivo.)
8. **Su equipo.** ¿Quiénes usarán el panel? Nombre y correo de cada asesor y
   del administrador, para crear sus accesos definitivos.

## Respuestas del cliente (13-ago-2026) — APLICADAS

1. **Precio:** $4,500 de lista con $500 de descuento por inscripción inmediata
   → $4,000. Curso oficial: **Curso Propedéutico InMath**. Dos modalidades al
   mismo precio: **Premium 8 meses** e **Intensivo 3 meses** (para examen en
   noviembre). Aplicado en tabla `cursos` (2 filas), landing (tachado $4,500)
   y prompt de Mathy.
2. **Pagos:** Mercado Pago + depósito OXXO. PENDIENTE del cliente: credenciales
   de Mercado Pago y referencia OXXO (texto provisional en `datos_pago`).
3. **WhatsApp:** 7224709235 → `WHATSAPP_NUMERO=5217224709235` en backend/.env.
4. **Bot:** FAQs oficiales integradas al prompt (costo, duración, virtual,
   material incluido, asesorías 1h); lo que no está confirmado (fecha de
   inicio, escuelas/carreras, costo de asesorías extra) el bot NO lo inventa —
   invita a la asesoría o a WhatsApp. Tono: cálido, algo formal, de tú.
5. **Horario de citas:** todos los días 8:00–21:00, citas de 30 min (aplicado
   en `horario_atencion`). Asesoría personalizada de alumnos: 1 hora (nota
   para Fase 5).
6. **Fotos:** harán sesión y las compartirán (placeholders siguen).
7. **Usuarios reales creados** (seeds asesor1-3 desactivados):
   - Magnolia Nayeli Galindo — magnayeli1234@gmail.com — admin + asesor — `InMath.Mag2026`
   - Jorge Emanuel Capula — jorcap25@gmail.com — admin + asesor — `InMath.Jor2026`
   - José Domingo Carbajal — domingoanaya1112@gmail.com — admin — `InMath.Dom2026`
   ⚠️ Contraseñas temporales: pedirles cambiarlas en Mi perfil al primer acceso.


## Verificación (17-ago-2026)
- **Login de los 3 usuarios reales probado en producción**: Magnolia entró al panel como Administrador (cadena completa bcrypt→sesión→redirect); Jorge y José Domingo verificados por hash (misma cadena). Recordar que deben cambiar la contraseña temporal en Mi perfil.
- **Prompt del bot actualizado a v4 en la BD** (clave `sistema_bot`, activo): renombrado a **Mathy**, tono cálido pero un poco formal de tú, con la info oficial (100% en línea, Premium 8m / Intensivo 3m al mismo precio, material incluido, asesorías de 1h, aplica a todas las escuelas/carreras, oferta de $500) y la regla de no inventar fecha de inicio ni costo de asesorías extra. Las versiones v1–v3 quedan en el historial (revertibles desde Panel → Prompts del bot).
