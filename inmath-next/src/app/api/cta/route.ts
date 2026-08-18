import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { upsertPorTelefono, normalizaTelefono } from "@/lib/prospectos";
import { enviarCorreo, CORREO_CONTACTO } from "@/lib/correo";

export async function POST(req: NextRequest) {
  const fd = await req.formData();
  const nombre = String(fd.get("nombre") ?? "").trim();
  const telefono = normalizaTelefono(String(fd.get("telefono") ?? ""));
  const correo = String(fd.get("correo") ?? "").trim().toLowerCase();
  const mensaje = String(fd.get("mensaje") ?? "").trim().slice(0, 600);
  if (!nombre || !telefono) {
    return NextResponse.json({ error: "Escribe tu nombre y un WhatsApp válido (10 dígitos)." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) {
    return NextResponse.json({ error: "Escribe un correo válido." }, { status: 400 });
  }
  const { prospecto } = await upsertPorTelefono(telefono, { nombre, fuente: "organico" });
  const datos: { nombre?: string; correo?: string } = {};
  if (!prospecto.nombre && nombre) datos.nombre = nombre;
  if (correo && prospecto.correo !== correo) datos.correo = correo;
  if (Object.keys(datos).length) await prisma.prospectos.update({ where: { id: prospecto.id }, data: datos });

  // La duda del formulario llega al buzón de contacto (best-effort: si el
  // correo falla, el prospecto ya quedó guardado igual).
  await enviarCorreo({
    para: [CORREO_CONTACTO],
    asunto: `Nueva duda desde la página — ${nombre}`,
    texto: `Nombre: ${nombre}\nWhatsApp: ${telefono}\nCorreo: ${correo}\n\nMensaje:\n${mensaje || "(sin mensaje, solo pide contacto)"}`,
  });
  return NextResponse.json({ nombre });
}
