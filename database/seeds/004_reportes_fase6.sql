-- Fase 6: branding del reporte, adaptable a cualquier marca sin tocar código.

INSERT INTO configuraciones (clave, valor, tipo, descripcion) VALUES
('reporte_branding', '{"marca": "Cursos Inmath", "producto": "Cursos Inmath", "color_primario": "3B6FF5", "color_acento_a": "F4A62A", "color_acento_b": "8B6FF0", "pie": "Reporte generado automaticamente por Cursos Inmath"}', 'json', 'Branding del reporte PDF semanal (base Cursos Inmath, adaptable sin tocar código).')
ON DUPLICATE KEY UPDATE clave = clave;
