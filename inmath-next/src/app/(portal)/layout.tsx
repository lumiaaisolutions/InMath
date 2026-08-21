import type { Metadata } from "next";
import "../(sitio)/inmath.css";
import "./portal.css";
import Link from "next/link";
import { AgenteIA } from "@/components/ClienteSitio";
import { OverlayCarga } from "@/components/OverlayCarga";
import { NavPortalHeader } from "./NavPortalHeader";
import { ScriptsPortal } from "./ScriptsPortal";
import { alumnoActual } from "@/lib/portal/sesion";
import { tienePagoConfirmado } from "@/lib/portal/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Portal del alumno — Cursos InMath",
  robots: { index: false, follow: false },
};

const SALUDO_PAGO =
  "¡Hola! Soy Mathy. Vi que tu pago aún está pendiente — al completarlo se desbloquea todo tu portal. Mientras, puedes tomar tu asesoría de orientación gratis. ¿Te ayudo? [OPCIONES: Quiero completar mi pago | Agendar mi asesoría gratis | ¿Cuánto cuesta?]";

const WHATSAPP = (process.env.WHATSAPP_NUMERO ?? "").replace(/\D+/g, "");
const WHATSAPP_URL = WHATSAPP
  ? `https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Hola, soy alumno de InMath y tengo una duda.")}`
  : "";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const alumno = await alumnoActual();
  const pendientePago = alumno ? !(await tienePagoConfirmado(alumno.prospecto_id)) : false;
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Figtree:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <OverlayCarga marca="sitio" />
        <header className="barra barra-portal">
          <Link className="logo" href="/portal"><img src="/img/inmath.svg" alt="" width={58} height={58} /><b>Portal <span>Inmath</span></b></Link>
          <NavPortalHeader />
        </header>
        {children}
        {/* Mathy en el portal: recuerda pagar si está pendiente. */}
        <AgenteIA whatsappUrl={WHATSAPP_URL} abrirInicial={pendientePago} saludo={pendientePago ? SALUDO_PAGO : undefined} />
        <ScriptsPortal />
      </body>
    </html>
  );
}
