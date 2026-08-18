import type { Metadata } from "next";
import { requiereAdmin } from "@/lib/panel/sesion";
import { leerAlertas } from "@/lib/alertas";
import { ClienteAlertas } from "./ClienteAlertas";

export const metadata: Metadata = { title: "Alertas — Inmath CRM" };
export const dynamic = "force-dynamic";

export default async function AlertasPage() {
  await requiereAdmin();
  const alertas = await leerAlertas();
  return <ClienteAlertas iniciales={alertas} />;
}
