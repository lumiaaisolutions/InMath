"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requiereAdmin } from "@/lib/panel/sesion";
import { ESTILOS, type Alerta } from "@/lib/alertas";
import type { Resultado } from "../acciones";

/** Guarda el arreglo completo de alertas de la landing. */
export async function guardarAlertasAccion(_prev: Resultado, fd: FormData): Promise<Resultado> {
  const u = await requiereAdmin();
  let alertas: Alerta[];
  try {
    alertas = JSON.parse(String(fd.get("alertas") ?? "[]"));
    if (!Array.isArray(alertas)) throw new Error();
  } catch {
    return { error: "Datos de alertas inválidos" };
  }
  if (alertas.length > 6) return { error: "Máximo 6 alertas" };
  for (const a of alertas) {
    if (a.activo && !String(a.titulo ?? "").trim() && !String(a.texto ?? "").trim()) {
      return { error: "Cada alerta activa necesita al menos un título o un texto" };
    }
    if (a.estilo && !ESTILOS.includes(a.estilo)) return { error: "Estilo inválido" };
  }

  await prisma.configuraciones.upsert({
    where: { clave: "alertas_landing" },
    update: { valor: JSON.stringify(alertas), actualizado_por: u.id },
    create: { clave: "alertas_landing", valor: JSON.stringify(alertas), tipo: "json", descripcion: "Alertas personalizables de la landing", actualizado_por: u.id },
  });
  revalidatePath("/");
  revalidatePath("/panel/alertas");
  return { ok: "Alertas guardadas — ya están en la página" };
}
