-- Respuestas del cliente (ago 2026): roles duales admin+asesor
ALTER TABLE usuarios ADD COLUMN es_asesor TINYINT(1) NOT NULL DEFAULT 0 AFTER rol;
UPDATE usuarios SET es_asesor = 1 WHERE rol = 'asesor';
