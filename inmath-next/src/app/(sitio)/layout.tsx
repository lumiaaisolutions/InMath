import type { Metadata } from "next";
import "./inmath.css";
import Link from "next/link";
import { Icono } from "@/components/Icono";
import { OverlayCarga } from "@/components/OverlayCarga";
import { ScriptsSitio, AgenteIA } from "@/components/ClienteSitio";

const SITE = "https://inmath.lumiaaisolutions.com";
export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "Cursos InMath — Aprende en línea a tu ritmo",
  description: "Curso Propedéutico InMath: 100% en línea con asesorías 1 a 1 por videollamada, material incluido y reporte de tu avance cada semana. Oferta de inscripción por tiempo limitado.",
  openGraph: {
    type: "website",
    url: SITE,
    siteName: "Cursos InMath",
    title: "Cursos InMath — Aprende en línea a tu ritmo",
    description: "Curso Propedéutico InMath: 100% en línea con asesorías 1 a 1, material incluido y seguimiento de tu avance. Oferta de inscripción por tiempo limitado.",
    images: [{ url: "/og-v2.jpg", width: 1200, height: 630, alt: "Cursos InMath" }],
    locale: "es_MX",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cursos InMath — Aprende en línea a tu ritmo",
    description: "Curso Propedéutico InMath 100% en línea con asesorías 1 a 1. Oferta por tiempo limitado.",
    images: ["/og-v2.jpg"],
  },
};

const WHATSAPP = (process.env.WHATSAPP_NUMERO ?? "").replace(/\D+/g, "");
const WHATSAPP_URL = WHATSAPP
  ? `https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Hola, me interesa el Curso Propedéutico InMath. ¿Me dan más información?")}`
  : "";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Figtree:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <OverlayCarga marca="sitio" />
        <header className="barra">
          <Link className="logo" href="/"><img src="/img/inmath.svg" alt="" width={58} height={58} /><b>Cursos <span>Inmath</span></b></Link>
          <button type="button" className="nav-toggle" id="navToggle" aria-expanded="false" aria-controls="navPrincipal" aria-label="Abrir menú">
            <Icono n="list" />
          </button>
          <nav id="navPrincipal">
            <a href="/#como" className="n-como"><Icono n="route" /> Cómo funciona</a>
            <a href="/#incluye" className="n-incl"><Icono n="list" /> Qué incluye</a>
            <Link href="/agenda" className="n-ases"><Icono n="calendar" /> Asesoría gratis</Link>
            <Link href="/panel/login" className="n-login"><Icono n="user" /> Entrar</Link>
            <Link href="/pago" className="cta">Inscribirme</Link>
          </nav>
        </header>
        {children}
        <footer className="pie">
          <div className="centrado">
            <div className="marca-pie">
              <img src="/img/inmath.svg" alt="" width={42} height={42} />
              <p><b>Cursos Inmath</b><br />Cursos en línea con asesoría · {new Date().getFullYear()}</p>
            </div>
            <nav>
              <a href="/#como">Cómo funciona</a>
              <a href="/#incluye">Qué incluye</a>
              <Link href="/agenda">Agendar asesoría</Link>
              <Link href="/pago">Inscribirme</Link>
              <Link href="/panel/login">Entrar / Portal del alumno</Link>
            </nav>
            <a className="lumia-badge" href="https://lumiaaisolutions.com/" target="_blank" rel="noopener">
              <img src="/img/lumia.svg" alt="" width={18} height={18} />
              Desarrollado por <b>LUMIA</b>
            </a>
          </div>
        </footer>
                <AgenteIA whatsappUrl={WHATSAPP_URL} />
        <ScriptsSitio />
      </body>
    </html>
  );
}
