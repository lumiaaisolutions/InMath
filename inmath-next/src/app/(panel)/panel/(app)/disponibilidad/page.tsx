import type { Metadata } from "next";
import { requiereAdmin } from "@/lib/panel/sesion";
import { lunesDe, semanaParaEditar, leerSemana } from "@/lib/disponibilidad";
import { ahoraPared, isoDia } from "@/lib/fechas";
import { ClienteDisponibilidad } from "./ClienteDisponibilidad";

export const metadata: Metadata = { title: "Disponibilidad — Inmath CRM" };
export const dynamic = "force-dynamic";

export default async function DisponibilidadPage({ searchParams }: { searchParams: Promise<{ semana?: string }> }) {
  await requiereAdmin();
  const { semana } = await searchParams;
  const lunesActual = isoDia(lunesDe(ahoraPared()));
  const lunesProximo = isoDia(new Date(lunesDe(ahoraPared()).getTime() + 7 * 86400_000));

  let lunes = semana && /^\d{4}-\d{2}-\d{2}$/.test(semana) ? semana : lunesActual;
  if (lunes < lunesActual) lunes = lunesActual; // no editar semanas ya pasadas

  const [{ dias, definida }, actualDefinida, proximaDefinida] = await Promise.all([
    semanaParaEditar(lunes),
    leerSemana(lunesActual).then((s) => !!s),
    leerSemana(lunesProximo).then((s) => !!s),
  ]);

  return (
    <ClienteDisponibilidad
      lunes={lunes}
      lunesActual={lunesActual}
      lunesProximo={lunesProximo}
      actualDefinida={actualDefinida}
      proximaDefinida={proximaDefinida}
      dias={dias}
      definida={definida}
    />
  );
}
