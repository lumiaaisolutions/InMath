-- Limpieza de los datos de prueba creados durante la migración Next.js
-- (F1b/F2/F3, ago-2026). Correr contra la BD ANTES de apuntar producción.
-- Los teléfonos/usuarios de prueba son inequívocos; verificar con los SELECT
-- antes de ejecutar los DELETE.

SELECT id, nombre, telefono_whatsapp FROM prospectos
 WHERE telefono_whatsapp IN ('5215599887711', '5215544332211');

SET @p_ids := (SELECT GROUP_CONCAT(id) FROM prospectos
 WHERE telefono_whatsapp IN ('5215599887711', '5215544332211'));

DELETE r FROM reportes_generados r JOIN alumnos a ON a.id = r.alumno_id
 JOIN prospectos p ON p.id = a.prospecto_id
 WHERE p.telefono_whatsapp IN ('5215599887711', '5215544332211');
DELETE av FROM avance_alumnos av JOIN alumnos a ON a.id = av.alumno_id
 JOIN prospectos p ON p.id = a.prospecto_id
 WHERE p.telefono_whatsapp IN ('5215599887711', '5215544332211');
DELETE pg FROM pagos pg JOIN prospectos p ON p.id = pg.prospecto_id
 WHERE p.telefono_whatsapp IN ('5215599887711', '5215544332211');
DELETE a FROM alumnos a JOIN prospectos p ON p.id = a.prospecto_id
 WHERE p.telefono_whatsapp IN ('5215599887711', '5215544332211');
DELETE c FROM citas c JOIN prospectos p ON p.id = c.prospecto_id
 WHERE p.telefono_whatsapp IN ('5215599887711', '5215544332211');
DELETE m FROM mensajes m JOIN conversaciones cv ON cv.id = m.conversacion_id
 JOIN prospectos p ON p.id = cv.prospecto_id
 WHERE p.telefono_whatsapp IN ('5215599887711', '5215544332211');
DELETE cv FROM conversaciones cv JOIN prospectos p ON p.id = cv.prospecto_id
 WHERE p.telefono_whatsapp IN ('5215599887711', '5215544332211');
DELETE b FROM bitacora_pipeline b JOIN prospectos p ON p.id = b.prospecto_id
 WHERE p.telefono_whatsapp IN ('5215599887711', '5215544332211');
DELETE FROM prospectos
 WHERE telefono_whatsapp IN ('5215599887711', '5215544332211');

-- Usuario de pruebas del panel (participaba en el round-robin local)
DELETE FROM usuarios WHERE email = 'prueba@lumia.local';

-- Comprobantes/reportes huérfanos en storage: borrar a mano los archivos
--   comprobantes/2-*.jpg  y  reportes/reporte-*-2026-08-10.pdf de prueba.
