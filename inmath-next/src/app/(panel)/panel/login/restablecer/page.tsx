import type { Metadata } from "next";
import { usuarioDeToken } from "@/lib/panel/reset";
import { ClienteRestablecer } from "./ClienteRestablecer";

export const metadata: Metadata = { title: "Nueva contraseña — Inmath CRM" };
export const dynamic = "force-dynamic";

export default async function RestablecerPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const valido = token ? (await usuarioDeToken(token)) !== null : false;
  return <ClienteRestablecer token={token ?? ""} valido={valido} />;
}
