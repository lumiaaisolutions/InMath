import { prisma } from "./db";

/** Port fiel de ProspectoServicio::upsertPorTelefono (carrera → devuelve el ganador). */
export async function upsertPorTelefono(telefono: string, datos: { nombre?: string; fuente?: string } = {}) {
  const existente = await prisma.prospectos.findUnique({ where: { telefono_whatsapp: telefono } });
  if (existente) return { prospecto: existente, creado: false };
  try {
    const p = await prisma.prospectos.create({
      data: { telefono_whatsapp: telefono, nombre: datos.nombre ?? null, fuente: (datos.fuente as never) ?? "facebook" },
    });
    await prisma.bitacora_pipeline.create({
      data: { prospecto_id: p.id, etapa_anterior: null, etapa_nueva: "prospecto", origen: "sistema", nota: "Alta por primer contacto" },
    });
    return { prospecto: p, creado: true };
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") {
      const ganador = await prisma.prospectos.findUnique({ where: { telefono_whatsapp: telefono } });
      return { prospecto: ganador!, creado: false };
    }
    throw e;
  }
}

export function normalizaTelefono(entrada: string): string | null {
  const tel = entrada.replace(/\D+/g, "");
  if (tel.length < 10 || tel.length > 15) return null;
  return tel.length === 10 ? "521" + tel : tel;
}
