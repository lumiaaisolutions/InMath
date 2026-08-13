"use server";
import { prisma } from "@/lib/db";
import { agendar, etiqueta } from "@/lib/agenda";
import { upsertPorTelefono, normalizaTelefono } from "@/lib/prospectos";

export type EstadoAgenda = { ok?: string; error?: string };

/** Port del POST de agenda.php (honeypot incluido; el CSRF lo cubre Next). */
export async function agendarAccion(_prev: EstadoAgenda, fd: FormData): Promise<EstadoAgenda> {
  if (String(fd.get("sitio_web") ?? "") !== "") return { error: "No pudimos procesar tu solicitud." };
  const nombre = String(fd.get("nombre") ?? "").trim();
  const telefono = normalizaTelefono(String(fd.get("telefono") ?? ""));
  const inicio = String(fd.get("slot") ?? "");
  if (!nombre || !telefono) return { error: "Escribe tu nombre y un teléfono de WhatsApp válido (10 dígitos)." };
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(inicio)) return { error: "Elige uno de los horarios disponibles." };

  const { prospecto } = await upsertPorTelefono(telefono, { nombre, fuente: "organico" });
  if (!prospecto.nombre && nombre) {
    await prisma.prospectos.update({ where: { id: prospecto.id }, data: { nombre } });
  }
  const r = await agendar(prospecto.id, inicio);
  if ("error" in r) return { error: "Ese horario acaba de ocuparse. Elige otro, por favor." };
  return { ok: etiqueta(r.cita.inicio) };
}
