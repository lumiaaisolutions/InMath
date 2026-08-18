import type { Metadata } from "next";
import { ClienteRecuperar } from "./ClienteRecuperar";

export const metadata: Metadata = { title: "Recuperar contraseña — Inmath CRM" };

export default function RecuperarPage() {
  return <ClienteRecuperar />;
}
