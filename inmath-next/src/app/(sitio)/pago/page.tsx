import type { Metadata } from "next";
import Link from "next/link";
import { prisma, config } from "@/lib/db";
import { InscripcionWizard } from "./InscripcionWizard";

export const metadata: Metadata = { title: "Inscripción — Cursos Inmath" };
export const dynamic = "force-dynamic";

export default async function Pago({ searchParams }: { searchParams: Promise<{ correo?: string; nombre?: string; google?: string }> }) {
  const cursosRaw = await prisma.cursos.findMany({ where: { activo: true }, orderBy: { id: "asc" } });
  const cursos = cursosRaw.map((c) => ({ id: c.id, nombre: c.nombre, precioCentavos: c.precio_centavos, moneda: c.moneda }));
  const curso = cursos[0] ?? null;
  const datosPago = await config("datos_pago", "");
  const sp = await searchParams;
  const prefill = { nombre: sp.nombre ?? "", correo: sp.correo ?? "", google: sp.google === "1" };

  return (
    <div className="pagina-form">
      <Link className="volver" href="/">← Volver al inicio</Link>
      <h1>{prefill.google ? "Completa tu registro" : "Inscríbete paso a paso"}</h1>
      <p className="sub">{prefill.google
        ? "Entraste con Google. Solo faltan unos datos para crear tu cuenta y continuar."
        : "Te guiamos con unos datos y al final eliges cómo pagar. Puedes entrar a tu portal de una vez."}</p>
      <InscripcionWizard curso={curso} cursos={cursos} datosPago={datosPago} prefill={prefill} />
    </div>
  );
}
