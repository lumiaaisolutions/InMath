import type { Metadata } from "next";
import { requiereAdmin } from "@/lib/panel/sesion";
import { lunesDe, semanaParaEditar } from "@/lib/disponibilidad";
import { ahoraPared, isoDia } from "@/lib/fechas";
import { ClienteDisponibilidad } from "./ClienteDisponibilidad";

export const metadata: Metadata = { title: "Disponibilidad — Inmath CRM" };
export const dynamic = "force-dynamic";

export default async function DisponibilidadPage({ searchParams }: { searchParams: Promise<{ semana?: string }> }) {
  await requiereAdmin();
  const { semana } = await searchParams;
  const lunesActual = isoDia(lunesDe(ahoraPared()));

  let lunes = semana && /^\d{4}-\d{2}-\d{2}$/.test(semana) ? semana : lunesActual;
  if (lunes < lunesActual) lunes = lunesActual; // no editar semanas ya pasadas

  const { dias, definida } = await semanaParaEditar(lunes);
  return <ClienteDisponibilidad lunes={lunes} lunesActual={lunesActual} dias={dias} definida={definida} />;
}
