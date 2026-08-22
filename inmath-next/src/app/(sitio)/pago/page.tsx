import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma, config } from "@/lib/db";
import { InscripcionWizard } from "./InscripcionWizard";
import { PantallaPago } from "./PantallaPago";
import { alumnoActual } from "@/lib/portal/sesion";
import { tienePagoConfirmado } from "@/lib/portal/auth";
import { tokenPago } from "@/lib/pagos";

export const metadata: Metadata = { title: "Inscripción — Cursos Inmath" };
export const dynamic = "force-dynamic";

export default async function Pago({ searchParams }: { searchParams: Promise<{ correo?: string; nombre?: string; google?: string }> }) {
  const cursosRaw = await prisma.cursos.findMany({ where: { activo: true }, orderBy: { id: "asc" } });
  const cursos = cursosRaw.map((c) => ({ id: c.id, nombre: c.nombre, precioCentavos: c.precio_centavos, moneda: c.moneda }));
  const curso = cursos[0] ?? null;
  const datosPago = await config("datos_pago", "");
  const sp = await searchParams;

  // Alumno YA registrado que viene a "Completar mi pago" desde su portal:
  // NO repetir el registro — llevarlo directo a ELEGIR CÓMO PAGAR.
  const alumno = await alumnoActual();
  if (alumno) {
    if (await tienePagoConfirmado(alumno.prospecto_id)) redirect("/portal");
    const pendiente = await prisma.pagos.findFirst({
      where: { prospecto_id: alumno.prospecto_id, estado: "pendiente" },
      orderBy: { id: "desc" },
      include: { cursos: { select: { nombre: true } } },
    });
    if (pendiente) {
      return (
        <div className="pagina-form">
          <Link className="volver" href="/portal">← Volver a mi portal</Link>
          <h1>Completa tu pago</h1>
          <p className="sub">Elige cómo pagar. Al confirmarse, se desbloquea todo tu portal.</p>
          <PantallaPago
            pago={{ pagoId: pendiente.id, token: tokenPago(pendiente.id), montoCentavos: pendiente.monto_centavos, moneda: pendiente.moneda, link: pendiente.link_pago }}
            cursoNombre={pendiente.cursos.nombre}
            nombre={alumno.nombre}
            datosPago={datosPago}
            saludoInicial
          />
        </div>
      );
    }
  }

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
