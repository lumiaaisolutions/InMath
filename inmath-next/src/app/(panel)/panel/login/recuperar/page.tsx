import type { Metadata } from "next";
import { ClienteRecuperar } from "./ClienteRecuperar";

export const metadata: Metadata = { title: "Recuperar contraseña — Inmath CRM" };
// Forzado a dynamic rendering: con el CSP de src/proxy.ts (nonce por
// request, M-10) una página estática no recibe nonce en build time y sus
// <script> de hidratación quedarían bloqueados.
export const dynamic = "force-dynamic";

export default function RecuperarPage() {
  return <ClienteRecuperar />;
}
