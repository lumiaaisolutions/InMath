import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { upsertPorTelefono, normalizaTelefono } from "@/lib/prospectos";

export async function POST(req: NextRequest) {
  const fd = await req.formData();
  const nombre = String(fd.get("nombre") ?? "").trim();
  const telefono = normalizaTelefono(String(fd.get("telefono") ?? ""));
  if (!nombre || !telefono) {
    return NextResponse.json({ error: "Escribe tu nombre y un WhatsApp válido (10 dígitos)." }, { status: 400 });
  }
  const { prospecto } = await upsertPorTelefono(telefono, { nombre, fuente: "organico" });
  if (!prospecto.nombre && nombre) await prisma.prospectos.update({ where: { id: prospecto.id }, data: { nombre } });
  return NextResponse.json({ nombre });
}
