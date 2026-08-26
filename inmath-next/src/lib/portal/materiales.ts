import { prisma, config } from "@/lib/db";

/**
 * Material del curso que ve el alumno en su portal. Se guarda como JSON (en
 * texto) en `configuraciones` (clave `materiales_curso`) para no migrar el
 * esquema — el admin lo gestiona desde /panel/materiales. Cada material
 * puede ser un enlace externo (Drive, YouTube) O uno o varios archivos
 * subidos y guardados en el servidor (dirImgPanel()/materiales).
 */
export type ArchivoMaterial = { nombre: string; url: string; tamanoBytes: number };
export type Material = {
  id: string; titulo: string; descripcion: string; tipo: "documento" | "video" | "enlace";
  portada: string | null;
  url: string; // solo aplica si tipo === "enlace"
  archivos: ArchivoMaterial[]; // solo aplica si tipo !== "enlace"
  orden: number;
};

const CLAVE = "materiales_curso";

type MaterialCrudo = Partial<Material>;

export async function leerMateriales(): Promise<Material[]> {
  let lista: MaterialCrudo[] = [];
  try {
    const parsed = JSON.parse(await config(CLAVE, "[]"));
    if (Array.isArray(parsed)) lista = parsed;
  } catch { lista = []; }
  return lista
    .filter((m): m is MaterialCrudo => !!m && typeof m.titulo === "string")
    .map((m, i): Material => ({
      id: String(m.id ?? i),
      titulo: String(m.titulo),
      descripcion: typeof m.descripcion === "string" ? m.descripcion : "",
      tipo: m.tipo === "video" || m.tipo === "documento" ? m.tipo : "enlace",
      portada: typeof m.portada === "string" && m.portada ? m.portada : null,
      url: typeof m.url === "string" ? m.url : "",
      archivos: Array.isArray(m.archivos)
        ? m.archivos.filter((a): a is ArchivoMaterial => !!a && typeof a.url === "string" && typeof a.nombre === "string")
        : [],
      orden: Number.isFinite(m.orden) ? Number(m.orden) : i,
    }))
    .sort((a, b) => a.orden - b.orden);
}

export async function guardarMateriales(lista: Material[], usuarioId: number): Promise<void> {
  const normalizada = lista.map((m, i) => ({ ...m, orden: i }));
  const valor = JSON.stringify(normalizada);
  await prisma.configuraciones.upsert({
    where: { clave: CLAVE },
    update: { valor, actualizado_por: usuarioId },
    create: { clave: CLAVE, valor, tipo: "json", descripcion: "Material del curso para el portal del alumno", actualizado_por: usuarioId },
  });
}
