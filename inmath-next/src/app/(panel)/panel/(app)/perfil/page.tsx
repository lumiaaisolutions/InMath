import { redirect } from "next/navigation";

/** "Mi perfil" se unió a Configuración (25-ago-2026) — un solo lugar para
 *  tu cuenta y los ajustes del sistema, en vez de dos pantallas separadas. */
export default function Perfil() {
  redirect("/panel/configuracion");
}
