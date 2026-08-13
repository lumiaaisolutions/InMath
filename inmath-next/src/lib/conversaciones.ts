import { prisma } from "./db";

/** Port de ConversacionServicio::obtenerOCrear (carrera → devuelve la existente). */
export async function obtenerOCrearConversacion(prospectoId: number) {
  const existente = await prisma.conversaciones.findFirst({ where: { prospecto_id: prospectoId, canal: "whatsapp" } });
  if (existente) return existente;
  try {
    return await prisma.conversaciones.create({ data: { prospecto_id: prospectoId } });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") {
      return (await prisma.conversaciones.findFirst({ where: { prospecto_id: prospectoId, canal: "whatsapp" } }))!;
    }
    throw e;
  }
}

export type DatosMensaje = {
  direccion: "entrante" | "saliente";
  emisor: "prospecto" | "bot" | "asesor" | "sistema";
  contenido: string;
  tipo?: string;
  wa_message_id?: string | null;
  metadatos?: unknown;
};

/** Port de ConversacionServicio::registrarMensaje — idempotente por wa_message_id. */
export async function registrarMensaje(conversacionId: number, datos: DatosMensaje) {
  try {
    const mensaje = await prisma.mensajes.create({
      data: {
        conversacion_id: conversacionId,
        direccion: datos.direccion,
        emisor: datos.emisor,
        tipo: (datos.tipo ?? "texto") as never,
        contenido: datos.contenido,
        wa_message_id: datos.wa_message_id ?? null,
        metadatos: datos.metadatos === undefined ? undefined : (datos.metadatos as never),
      },
    });
    return { mensaje, duplicado: false };
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002" && datos.wa_message_id) {
      const mensaje = await prisma.mensajes.findUnique({ where: { wa_message_id: datos.wa_message_id } });
      return { mensaje: mensaje!, duplicado: true };
    }
    throw e;
  }
}
