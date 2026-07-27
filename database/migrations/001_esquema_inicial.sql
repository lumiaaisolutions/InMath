-- 001 — Esquema inicial Cursos Inmath (sistema de ventas)
-- Convenciones: InnoDB, utf8mb4, dinero en centavos (INT), fechas en zona local
-- (America/Mexico_City, ver APP_TZ).

CREATE TABLE usuarios (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol ENUM('admin','asesor') NOT NULL DEFAULT 'asesor',
  telefono VARCHAR(20) NULL,
  google_calendar_id VARCHAR(190) NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cursos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(190) NOT NULL,
  descripcion TEXT NULL,
  precio_centavos INT UNSIGNED NOT NULL,
  moneda CHAR(3) NOT NULL DEFAULT 'MXN',
  duracion_semanas SMALLINT UNSIGNED NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Etapas del pipeline (contrato de producto):
-- prospecto -> calificado -> cita_agendada -> pago_pendiente -> inscrito (+ descartado)
CREATE TABLE prospectos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  telefono_whatsapp VARCHAR(20) NOT NULL UNIQUE,
  nombre VARCHAR(120) NULL,
  fuente ENUM('facebook','instagram','organico','otro') NOT NULL DEFAULT 'facebook',
  etapa ENUM('prospecto','calificado','cita_agendada','pago_pendiente','inscrito','descartado')
        NOT NULL DEFAULT 'prospecto',
  puntaje_calificacion TINYINT UNSIGNED NULL,
  datos_calificacion JSON NULL,
  curso_interes_id INT UNSIGNED NULL,
  asesor_id INT UNSIGNED NULL,
  asignado_en DATETIME NULL,
  motivo_descarte VARCHAR(255) NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_prospectos_curso FOREIGN KEY (curso_interes_id) REFERENCES cursos(id) ON DELETE SET NULL,
  CONSTRAINT fk_prospectos_asesor FOREIGN KEY (asesor_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_prospectos_etapa (etapa),
  INDEX idx_prospectos_asesor (asesor_id, etapa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- prospecto_id UNIQUE: un webhook de pago duplicado no puede inscribir dos veces.
CREATE TABLE alumnos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  prospecto_id INT UNSIGNED NOT NULL UNIQUE,
  curso_id INT UNSIGNED NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  telefono VARCHAR(20) NOT NULL,
  email VARCHAR(190) NULL,
  canal_reporte ENUM('whatsapp','email') NOT NULL DEFAULT 'whatsapp',
  estado ENUM('activo','pausado','completado','baja') NOT NULL DEFAULT 'activo',
  inscrito_en DATETIME NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_alumnos_prospecto FOREIGN KEY (prospecto_id) REFERENCES prospectos(id),
  CONSTRAINT fk_alumnos_curso FOREIGN KEY (curso_id) REFERENCES cursos(id),
  INDEX idx_alumnos_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE conversaciones (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  prospecto_id INT UNSIGNED NOT NULL,
  canal ENUM('whatsapp') NOT NULL DEFAULT 'whatsapp',
  estado ENUM('bot','asesor','cerrada') NOT NULL DEFAULT 'bot',
  asesor_id INT UNSIGNED NULL,
  ultima_actividad_en DATETIME NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_conv_prospecto FOREIGN KEY (prospecto_id) REFERENCES prospectos(id) ON DELETE CASCADE,
  CONSTRAINT fk_conv_asesor FOREIGN KEY (asesor_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  UNIQUE KEY uq_conv_prospecto_canal (prospecto_id, canal)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- wa_message_id UNIQUE: Meta reintenta webhooks; la ingesta es idempotente.
CREATE TABLE mensajes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  conversacion_id INT UNSIGNED NOT NULL,
  direccion ENUM('entrante','saliente') NOT NULL,
  emisor ENUM('prospecto','bot','asesor','sistema') NOT NULL,
  tipo ENUM('texto','imagen','audio','video','documento','plantilla','interactivo')
       NOT NULL DEFAULT 'texto',
  contenido TEXT NOT NULL,
  wa_message_id VARCHAR(128) NULL UNIQUE,
  estado_entrega ENUM('enviado','entregado','leido','fallido') NULL,
  metadatos JSON NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mensajes_conversacion FOREIGN KEY (conversacion_id) REFERENCES conversaciones(id) ON DELETE CASCADE,
  INDEX idx_mensajes_conv_fecha (conversacion_id, creado_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- UNIQUE (asesor_id, inicio) es la última defensa contra doble reserva; el traslape
-- completo se valida en la API dentro de una transacción con SELECT ... FOR UPDATE.
CREATE TABLE citas (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  prospecto_id INT UNSIGNED NOT NULL,
  asesor_id INT UNSIGNED NOT NULL,
  inicio DATETIME NOT NULL,
  fin DATETIME NOT NULL,
  google_event_id VARCHAR(190) NULL,
  meet_link VARCHAR(255) NULL,
  estado ENUM('agendada','confirmada','completada','cancelada','no_asistio')
         NOT NULL DEFAULT 'agendada',
  recordatorio_enviado_en DATETIME NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_citas_prospecto FOREIGN KEY (prospecto_id) REFERENCES prospectos(id) ON DELETE CASCADE,
  CONSTRAINT fk_citas_asesor FOREIGN KEY (asesor_id) REFERENCES usuarios(id),
  UNIQUE KEY uq_citas_asesor_inicio (asesor_id, inicio),
  INDEX idx_citas_asesor_rango (asesor_id, inicio, fin),
  INDEX idx_citas_prospecto (prospecto_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- procesador es VARCHAR (no ENUM): el procesador se decide en Fase 4 y es
-- configurable (configuraciones.procesador_pago_activo).
CREATE TABLE pagos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  prospecto_id INT UNSIGNED NOT NULL,
  alumno_id INT UNSIGNED NULL,
  curso_id INT UNSIGNED NOT NULL,
  procesador VARCHAR(30) NULL,
  monto_centavos INT UNSIGNED NOT NULL,
  moneda CHAR(3) NOT NULL DEFAULT 'MXN',
  link_pago VARCHAR(500) NULL,
  referencia_externa VARCHAR(190) NULL UNIQUE,
  estado ENUM('pendiente','pagado','expirado','fallido','reembolsado')
         NOT NULL DEFAULT 'pendiente',
  link_generado_en DATETIME NULL,
  expira_en DATETIME NULL,
  pagado_en DATETIME NULL,
  recordatorio_enviado_en DATETIME NULL,
  metadatos JSON NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pagos_prospecto FOREIGN KEY (prospecto_id) REFERENCES prospectos(id),
  CONSTRAINT fk_pagos_alumno FOREIGN KEY (alumno_id) REFERENCES alumnos(id) ON DELETE SET NULL,
  CONSTRAINT fk_pagos_curso FOREIGN KEY (curso_id) REFERENCES cursos(id),
  INDEX idx_pagos_recuperacion (estado, link_generado_en, recordatorio_enviado_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE bitacora_pipeline (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  prospecto_id INT UNSIGNED NOT NULL,
  etapa_anterior VARCHAR(30) NULL,
  etapa_nueva VARCHAR(30) NOT NULL,
  origen ENUM('bot','asesor','sistema') NOT NULL DEFAULT 'sistema',
  usuario_id INT UNSIGNED NULL,
  nota VARCHAR(255) NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bitacora_prospecto FOREIGN KEY (prospecto_id) REFERENCES prospectos(id) ON DELETE CASCADE,
  INDEX idx_bitacora_prospecto (prospecto_id, creado_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE configuraciones (
  clave VARCHAR(80) PRIMARY KEY,
  valor TEXT NOT NULL,
  tipo ENUM('texto','numero','json','booleano') NOT NULL DEFAULT 'texto',
  descripcion VARCHAR(255) NULL,
  actualizado_por INT UNSIGNED NULL,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_config_usuario FOREIGN KEY (actualizado_por) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Prompts del bot versionados: editar crea una versión nueva; revertir = reactivar
-- la anterior. La Fase 2 los expone en el panel.
CREATE TABLE prompts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  clave VARCHAR(80) NOT NULL,
  contenido MEDIUMTEXT NOT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  notas VARCHAR(255) NULL,
  actualizado_por INT UNSIGNED NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_prompts_usuario FOREIGN KEY (actualizado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
  UNIQUE KEY uq_prompts_clave_version (clave, version),
  INDEX idx_prompts_activos (clave, activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
