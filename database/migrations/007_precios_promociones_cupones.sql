-- Módulo de precios/paquetes, promociones y cupones (a petición del dueño,
-- 24-ago-2026). Extiende `cursos` (precios y promoción quedan a nivel curso —
-- cada curso YA es un paquete vendible independiente) y agrega `cupones`.
ALTER TABLE cursos
  ADD COLUMN precio_original_centavos INT UNSIGNED NULL AFTER precio_centavos,
  ADD COLUMN modalidad ENUM('asesorias','video','ambos') NOT NULL DEFAULT 'asesorias' AFTER duracion_semanas,
  ADD COLUMN promocion_activa TINYINT(1) NOT NULL DEFAULT 0 AFTER modalidad,
  ADD COLUMN promocion_texto VARCHAR(160) NULL AFTER promocion_activa,
  ADD COLUMN promocion_expira_en DATETIME NULL AFTER promocion_texto,
  ADD COLUMN destacado TINYINT(1) NOT NULL DEFAULT 0 AFTER promocion_expira_en,
  ADD COLUMN orden SMALLINT UNSIGNED NOT NULL DEFAULT 0 AFTER destacado;

CREATE TABLE cupones (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(40) NOT NULL,
  tipo ENUM('porcentaje','monto_fijo') NOT NULL,
  valor INT UNSIGNED NOT NULL,
  curso_id INT UNSIGNED NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  usos_maximos INT UNSIGNED NULL,
  expira_en DATETIME NULL,
  creado_por INT UNSIGNED NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY codigo (codigo),
  CONSTRAINT fk_cupones_curso FOREIGN KEY (curso_id) REFERENCES cursos(id),
  CONSTRAINT fk_cupones_usuario FOREIGN KEY (creado_por) REFERENCES usuarios(id),
  INDEX idx_cupones_curso (curso_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE pagos
  ADD COLUMN descuento_centavos INT UNSIGNED NULL AFTER monto_centavos,
  ADD COLUMN cupon_id INT UNSIGNED NULL AFTER descuento_centavos,
  ADD CONSTRAINT fk_pagos_cupon FOREIGN KEY (cupon_id) REFERENCES cupones(id),
  ADD INDEX idx_pagos_cupon (cupon_id);
