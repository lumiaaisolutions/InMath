-- Permisos por usuario: lista JSON de módulos permitidos para asesores
-- (NULL = todos los del rol). Los administradores siempre ven todo.
ALTER TABLE usuarios ADD COLUMN modulos JSON NULL AFTER rol;
