-- Seeds iniciales. Contraseña de todos los usuarios seed: Cambiar.123
-- (obligatorio cambiarla en producción).

INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES
('Administrador', 'admin@inmath.mx', '$2y$12$H.UiXBF1laUVF3EyEfS6g.6Dba2ZnWhMhHzlkgJ2mKJXXjCPKfnxy', 'admin'),
('Asesor 1', 'asesor1@inmath.mx', '$2y$12$H.UiXBF1laUVF3EyEfS6g.6Dba2ZnWhMhHzlkgJ2mKJXXjCPKfnxy', 'asesor'),
('Asesor 2', 'asesor2@inmath.mx', '$2y$12$H.UiXBF1laUVF3EyEfS6g.6Dba2ZnWhMhHzlkgJ2mKJXXjCPKfnxy', 'asesor'),
('Asesor 3', 'asesor3@inmath.mx', '$2y$12$H.UiXBF1laUVF3EyEfS6g.6Dba2ZnWhMhHzlkgJ2mKJXXjCPKfnxy', 'asesor');

INSERT INTO cursos (nombre, descripcion, precio_centavos, moneda, duracion_semanas) VALUES
('Curso en línea Inmath', 'Curso en video pregrabado con asesoría. Contenido, precio y duración configurables por el cliente.', 250000, 'MXN', 12);

INSERT INTO configuraciones (clave, valor, tipo, descripcion) VALUES
('procesador_pago_activo', '', 'texto', 'Procesador de pago: stripe | conekta | mercadopago. Se define en Fase 4.'),
('recuperacion_carrito_horas', '24', 'numero', 'Horas tras generar el link de pago sin completar antes de enviar recordatorio.'),
('recordatorio_cita_horas', '2', 'numero', 'Horas antes de la cita para enviar recordatorio por WhatsApp.'),
('criterios_calificacion', '{"pendiente_definir_con_cliente": true, "candidatos": ["urgencia", "fecha_examen", "presupuesto"]}', 'json', 'Criterios de calificación de prospectos. Se definen con el cliente en Fase 2.'),
('duracion_cita_minutos', '30', 'numero', 'Duración por defecto de las citas de asesoría.');

INSERT INTO prompts (clave, contenido, version, activo, notas) VALUES
('sistema_bot', 'PLACEHOLDER — el prompt de sistema del bot se diseña en la Fase 2 (tono natural, cálido, formal sin sentirse robot). Editable desde el panel en Fase 5.', 1, 1, 'Placeholder de Fase 1');
