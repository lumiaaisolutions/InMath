-- Fase 6: avance de alumnos y registro de reportes generados.
-- Supuesto declarado: la plataforma de videos no está integrada todavía, por lo que
-- el avance se alimenta vía API (panel, o la plataforma cuando se conecte).

CREATE TABLE avance_alumnos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  alumno_id INT UNSIGNED NOT NULL,
  fecha DATE NOT NULL,
  porcentaje TINYINT UNSIGNED NOT NULL,
  detalle JSON NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_avance_alumno FOREIGN KEY (alumno_id) REFERENCES alumnos(id) ON DELETE CASCADE,
  UNIQUE KEY uq_avance_alumno_fecha (alumno_id, fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- UNIQUE (alumno_id, periodo_inicio): el cron semanal es idempotente — regenerar
-- la misma semana no duplica reportes.
CREATE TABLE reportes_generados (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  alumno_id INT UNSIGNED NOT NULL,
  periodo_inicio DATE NOT NULL,
  periodo_fin DATE NOT NULL,
  archivo VARCHAR(255) NOT NULL,
  canal ENUM('whatsapp','email') NOT NULL,
  enviado_en DATETIME NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reportes_alumno FOREIGN KEY (alumno_id) REFERENCES alumnos(id) ON DELETE CASCADE,
  UNIQUE KEY uq_reporte_alumno_periodo (alumno_id, periodo_inicio),
  INDEX idx_reportes_envio (enviado_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
