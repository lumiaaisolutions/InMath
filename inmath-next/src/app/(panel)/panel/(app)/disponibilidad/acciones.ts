"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requiereAdmin } from "@/lib/panel/sesion";
import { claveSemana, DOW, type DiaFranja } from "@/lib/disponibilidad";
import type { Resultado } from "../acciones";

/** Guarda (o crea) la disponibilidad de una semana concreta. */
export async function guardarDisponibilidadAccion(_prev: Resultado, fd: FormData): Promise<Resultado> {
  const u = await requiereAdmin();
  const lunes = String(fd.get("lunes") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(lunes)) return { error: "Semana inválida" };

  const dias: Record<string, DiaFranja> = {};
  for (const k of DOW) {
    dias[k] = {
      on: fd.get(`on_${k}`) === "1",
      inicio: String(fd.get(`inicio_${k}`) ?? "09:00"),
      fin: String(fd.get(`fin_${k}`) ?? "19:00"),
    };
    if (dias[k].on && dias[k].inicio >= dias[k].fin) {
      return { error: "En cada día activo, la hora de inicio debe ser menor que la de fin." };
    }
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
