"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requiereAdmin } from "@/lib/panel/sesion";
import { claveSemana, DOW, type DiaDisp } from "@/lib/disponibilidad";
import type { Resultado } from "../acciones";

/** Guarda (o crea) la disponibilidad de una semana concreta. */
export async function guardarDisponibilidadAccion(_prev: Resultado, fd: FormData): Promise<Resultado> {
  const u = await requiereAdmin();
  const lunes = String(fd.get("lunes") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(lunes)) return { error: "Semana inválida" };

  const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
  const dias: Record<string, DiaDisp> = {};
  for (const k of DOW) {
    const on = fd.get(`on_${k}`) === "1";
    const horas = [...new Set(
      String(fd.get(`horas_${k}`) ?? "").split(",").map((h) => h.trim()).filter((h) => HORA_RE.test(h))
    )].sort();
    if (on && !horas.length) {
      return { error: "En cada día activo elige al menos una hora (o desactiva el día)." };
    }
    dias[k] = { on, horas };
  }

  const clave = claveSemana(lunes);
  const valor = JSON.stringify({ dias });
  await prisma.configuraciones.upsert({
    where: { clave },
    update: { valor, actualizado_por: u.id },
    create: { clave, valor, tipo: "json", descripcion: `Disponibilidad de la semana ${lunes}`, actualizado_por: u.id },
  });
  revalidatePath("/panel/disponibilidad");
  return { ok: "Disponibilidad de la semana guardada" };
}
