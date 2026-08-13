import type { Metadata } from "next";
import Link from "next/link";
import { prisma, config } from "@/lib/db";
import { PagoForm } from "./PagoForm";

export const metadata: Metadata = { title: "Inscripción — Cursos Inmath" };
export const dynamic = "force-dynamic";

export default async function Pago() {
  const curso = await prisma.cursos.findFirst({ where: { activo: true }, orderBy: { id: "asc" } });
  const datosPago = await config("datos_pago", "");

  return (
    <div className="pagina-form">
      <Link className="volver" href="/">← Volver al inicio</Link>
      <h1>Inscripción al curso</h1>
      <p className="sub">Llena tus datos y te llevamos al pago seguro. Al confirmarse, tu acceso se activa automáticamente.</p>
      <PagoForm
        curso={curso ? { nombre: curso.nombre, precioCentavos: curso.precio_centavos, moneda: curso.moneda } : null}
        datosPago={datosPago}
      />
    </div>
  );
}
