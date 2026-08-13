import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requiereModulo } from "@/lib/panel/sesion";
import { fechaCorta } from "@/lib/panel/formato";
import { PipelineTablero, type TarjetaPipeline } from "./PipelineTablero";

export const metadata: Metadata = { title: "Pipeline — Inmath CRM" };
export const dynamic = "force-dynamic";

const ETAPAS = ["prospecto", "calificado", "cita_agendada", "pago_pendiente", "inscrito"] as const;

export default async function Pipeline({ searchParams }: { searchParams: Promise<{ asesor_id?: string }> }) {
  await requiereModulo("pipeline");
  const { asesor_id } = await searchParams;
  const asesorId = asesor_id ? parseInt(asesor_id, 10) : null;

  const asesores = await prisma.usuarios.findMany({
    where: { es_asesor: true, activo: true }, select: { id: true, nombre: true }, orderBy: { id: "asc" },
  });

  const columnas: Record<string, TarjetaPipeline[]> = {};
  for (const etapa of ETAPAS) {
    const filas = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT p.id, p.nombre, p.telefono_whatsapp, p.puntaje_calificacion, u.nombre AS asesor_nombre,
              (SELECT MAX(m.creado_en) FROM mensajes m
               JOIN conversaciones c ON c.id = m.conversacion_id
               WHERE c.prospecto_id = p.id) AS ultimo_mensaje_en
       FROM prospectos p
       LEFT JOIN usuarios u ON u.id = p.asesor_id
       WHERE p.etapa = ?${asesorId ? " AND p.asesor_id = ?" : ""}
       ORDER BY p.actualizado_en DESC LIMIT 60`,
      ...(asesorId ? [etapa, asesorId] : [etapa]),
    );
    columnas[etapa] = filas.map((f) => ({
      id: Number(f.id),
      nombre: (f.nombre as string) ?? null,
      telefono: f.telefono_whatsapp as string,
      puntaje: f.puntaje_calificacion === null ? null : Number(f.puntaje_calificacion),
      asesor: (f.asesor_nombre as string) ?? null,
      ultimoMensaje: f.ultimo_mensaje_en ? fechaCorta(f.ultimo_mensaje_en as Date) : null,
    }));
  }

  return <PipelineTablero columnas={columnas} asesores={asesores} filtroAsesor={asesor_id ?? ""} />;
}
