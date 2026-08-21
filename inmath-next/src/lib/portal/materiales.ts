import { prisma, config } from "@/lib/db";

/**
 * Material del curso que ve el alumno en su portal. Se guarda como JSON (en
 * texto) en `configuraciones` (clave `materiales_curso`) para no migrar el
 * esquema — el admin lo gestiona desde /panel/materiales. Son enlaces (Drive,
 * video, documento) con título; no se suben archivos al servidor.
 */
export type Material = { id: string; titulo: string; tipo: "documento" | "video" | "enlace"; url: string; orden: number };

const CLAVE = "materiales_curso";

type MaterialCrudo = Partial<Material>;

export async function leerMateriales(): Promise<Material[]> {
  let lista: MaterialCrudo[] = [];
  try {
    const parsed = JSON.parse(await config(CLAVE, "[]"));
    if (Array.isArray(parsed)) lista = parsed;
  } catch { lista = []; }
  return lista
    .filter((m): m is MaterialCrudo => !!m && typeof m.url === "string" && typeof m.titulo === "string")
    .map((m, i): Material => ({
      id: String(m.id ?? i),
      titulo: String(m.titulo),
      tipo: m.tipo === "video" || m.tipo === "documento" ? m.tipo : "enlace",
      url: String(m.url),
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
