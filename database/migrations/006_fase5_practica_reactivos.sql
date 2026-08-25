-- Fase 5 (propuesta): módulo de práctica (reactivos) — banco de preguntas por
-- curso/tema, motor de calificación automática e historial de intentos por alumno.
CREATE TABLE reactivos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  curso_id INT UNSIGNED NOT NULL,
  tema VARCHAR(120) NULL,
  enunciado TEXT NOT NULL,
  opciones JSON NOT NULL,
  respuesta_correcta TINYINT UNSIGNED NOT NULL,
  explicacion TEXT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_por INT UNSIGNED NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_reactivos_curso FOREIGN KEY (curso_id) REFERENCES cursos(id),
  CONSTRAINT fk_reactivos_usuario FOREIGN KEY (creado_por) REFERENCES usuarios(id),
  INDEX idx_reactivos_curso (curso_id, activo),
  INDEX idx_reactivos_tema (curso_id, tema)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE intentos_practica (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  alumno_id INT UNSIGNED NOT NULL,
  curso_id INT UNSIGNED NOT NULL,
  tema VARCHAR(120) NULL,
  total_preguntas SMALLINT UNSIGNED NOT NULL,
  correctas SMALLINT UNSIGNED NOT NULL,
  porcentaje TINYINT UNSIGNED NOT NULL,
  respuestas JSON NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_intentos_alumno FOREIGN KEY (alumno_id) REFERENCES alumnos(id) ON DELETE CASCADE,
  CONSTRAINT fk_intentos_curso FOREIGN KEY (curso_id) REFERENCES cursos(id),
  INDEX idx_intentos_alumno (alumno_id, creado_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
