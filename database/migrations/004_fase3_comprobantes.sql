-- Fase 3.2/3.3: comprobante de pago por transferencia y credenciales del alumno
ALTER TABLE pagos
  ADD COLUMN comprobante VARCHAR(255) NULL AFTER link_pago,
  ADD COLUMN comprobante_subido_en DATETIME NULL AFTER comprobante;
ALTER TABLE alumnos
  ADD COLUMN usuario VARCHAR(60) NULL AFTER email,
  ADD COLUMN password_hash VARCHAR(255) NULL AFTER usuario;
INSERT INTO configuraciones (clave, valor, tipo, descripcion) VALUES
('datos_pago', 'PENDIENTE — definir con el cliente: banco, titular y CLABE para transferencia.', 'texto', 'Datos bancarios que ve el alumno para pagar por transferencia.')
ON DUPLICATE KEY UPDATE clave = clave;
