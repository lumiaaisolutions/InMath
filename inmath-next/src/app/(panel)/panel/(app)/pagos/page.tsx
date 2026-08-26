import { redirect } from "next/navigation";

/** Pagos se unificó con Alumnos (25-ago-2026) — un solo lugar para ver la
 *  cuenta y su pago más reciente juntos, en vez de dos módulos separados. */
export default function Pagos() {
  redirect("/panel/alumnos");
}
