import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requiereAdmin } from "@/lib/panel/sesion";
import { BandejaSugerencias } from "./ClienteSugerencias";
import { mediaAlumnoParaPanel } from "@/lib/portal/media";

export const metadata: Metadata = { title: "Sugerencias del portal — Inmath CRM" };
export const dynamic = "force-dynamic";

/** Retroalimentación del sistema enviada por los ALUMNOS desde su portal:
 *  preguntas y recomendaciones, con estado nueva/atendida. */
export default async function Sugerencias() {
  await requiereAdmin();
  const filas = await prisma.retroalimentaciones.findMany({
    orderBy: { creado_en: "desc" },
    take: 300,
    include: { alumnos: { select: { nombre: true, email: true } } },
  });
  const nuevas = filas.filter((f) => f.estado === "nueva").length;
  // Foto y portada del alumno (si las configuró en su portal) — identidad
  // visual en la bandeja. Un lookup por alumno único, no por mensaje.
  const idsAlumnos = [...new Set(filas.map((f) => f.alumno_id))];
  const medias = new Map(await Promise.all(idsAlumnos.map(async (id) => [id, await mediaAlumnoParaPanel(id)] as const)));

  return (
    <>
      <div className="cabecera">
        <div>
          <h1>Sugerencias del portal</h1>
          <div className="sub">
            Preguntas y recomendaciones que los alumnos envían desde su portal —
            {" "}{nuevas === 0 ? "todo atendido ✓" : `${nuevas} sin atender`}
          </div>
        </div>
      </div>
      <BandejaSugerencias
        inicial={filas.map((f) => ({
          id: f.id, tipo: f.tipo, mensaje: f.mensaje, estado: f.estado,
          alumno: f.alumnos.nombre, correo: f.alumnos.email,
          fecha: f.creado_en.toISOString(),
          respuesta: f.respuesta, respondidoEn: f.respondido_en?.toISOString() ?? null,
          foto: medias.get(f.alumno_id)?.avatar ?? null,
          banner: medias.get(f.alumno_id)?.banner ?? null,
        }))}
      />
    </>
  );
}
