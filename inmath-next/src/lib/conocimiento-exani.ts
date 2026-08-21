/**
 * Conocimiento del examen EXANI-II (Ceneval) para Mathy. Se agrega al prompt del
 * chat del sitio (api/agente) y del bot de WhatsApp (prompts.sistema_bot).
 *
 * Fuente: información oficial del negocio + tabla "Módulos_específicos_carreras"
 * (módulos específicos por carrera). Regla anti-alucinación: Mathy NO inventa
 * qué universidad aplica el examen ni los módulos exactos de una carrera fuera
 * de esta lista; ante la duda, lo confirma en la asesoría gratuita.
 */
export const CONOCIMIENTO_EXANI = [
  "SOBRE EL EXAMEN (a esto preparamos a los estudiantes):",
  "- Preparamos para el EXANI-II del Ceneval, el examen de admisión a licenciatura más usado en México.",
  "- Se divide en DOS grandes bloques:",
  "  1) Áreas transversales (todos las presentan): Comprensión lectora, Redacción indirecta y Pensamiento matemático. Algunas universidades añaden un diagnóstico de Inglés.",
  "  2) Módulos de conocimientos específicos: son 2 módulos que CAMBIAN según la carrera, tomados de este conjunto: Aritmética, Biología, Cálculo diferencial e integral, Ciencias de la salud, Derecho, Economía, Filosofía, Física, Historia, Literatura, Matemáticas financieras, Premedicina, Probabilidad y estadística, Psicología y Química.",
  "",
  "MÓDULOS ESPECÍFICOS POR CARRERA (referencia general; una universidad puede cambiarlos):",
  "- Medicina / Médico Cirujano: Premedicina + Ciencias de la salud.",
  "- Enfermería, Nutrición: Biología + Ciencias de la salud (Nutrición suele ser Ciencias de la salud + Química).",
  "- Cirujano Dentista, Químico Farmacéutico Biólogo, Gastronomía: Química + Biología.",
  "- Derecho: Derecho + Historia. Ciencias Políticas / Seguridad Ciudadana: Derecho + Historia.",
  "- Psicología: Probabilidad y estadística + Filosofía.",
  "- Administración, Contaduría, Mercadotecnia: Administración + Economía.",
  "- Negocios / Comercio Internacional: Administración/Cálculo + Economía o Matemáticas financieras.",
  "- Economía, Actuaría, Relaciones Económicas: Cálculo diferencial e integral + Economía/Probabilidad.",
  "- Ingenierías (Civil, Mecánica, Computación, Software, Química, Industrial): Cálculo diferencial e integral + Física (o Química/Aritmética/Probabilidad según la rama).",
  "- Arquitectura: Física + Historia.",
  "- Biología, Biotecnología, Ciencias Ambientales, agronomías: Biología + Química (o Física).",
  "- Historia, Filosofía, Letras, Comunicación, Educación, carreras de artes/humanidades: combinación de Historia, Filosofía y Literatura.",
  "Si la carrera del estudiante no está aquí o no estás seguro, NO inventes los módulos: dile que en InMath tenemos la tabla completa por carrera y que lo confirmamos en la asesoría gratuita.",
  "",
  "SOBRE LAS UNIVERSIDADES (importante, evita afirmar de más):",
  "- La MAYORÍA de las universidades del país aplican el EXANI-II, pero NO todas, y no existe un listado oficial completo.",
  "- Casos conocidos: la UANL (Nuevo León) SÍ usa el EXANI-II. La Universidad de Guadalajara (UdeG) NO usa EXANI-II: aplica la Prueba de Aptitud Académica (PAA) de College Board.",
  "- Si el estudiante te dice su universidad y NO es un caso que conozcas con certeza, no afirmes ni niegues a la ligera: explícale que la mayoría sí lo aplica pero hay excepciones, y ofrécele confirmarlo — junto con los módulos exactos de su carrera — en la asesoría gratuita, donde lo revisamos personalmente. El curso lo prepara igualmente en las áreas transversales (matemáticas, comprensión lectora y redacción), que son la base de casi cualquier examen de admisión.",
].join("\n");
