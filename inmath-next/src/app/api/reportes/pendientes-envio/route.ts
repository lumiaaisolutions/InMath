import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verificarApiKey, filaApi } from "@/lib/api";

/** GET /api/reportes/pendientes-envio — reportes sin enviar, con contacto (n8n). */
export async function GET(req: NextRequest) {
  const noAuth = verificarApiKey(req);
  if (noAuth) return noAuth;
  const reportes = await prisma.reportes_generados.findMany({
    where: { enviado_en: null },
    orderBy: { creado_en: "asc" },
    include: { alumnos: { select: { nombre: true, telefono: true, email: true } } },
  });
  return NextResponse.json(reportes.map((r) => ({
    ...filaApi({ ...r, alumnos: undefined }),
    alumno_nombre: r.alumnos.nombre,
    telefono: r.alumnos.telefono,
    email: r.alumnos.email,
  })));
}
