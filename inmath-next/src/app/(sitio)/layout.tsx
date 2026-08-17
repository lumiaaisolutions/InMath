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

const PANEL_URL = process.env.PANEL_URL ?? "";
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
        <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Figtree:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet" />
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
            {PANEL_URL && <a href={PANEL_URL} className="n-login"><Icono n="user" /> Entrar</a>}
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
              {PANEL_URL && <a href={PANEL_URL}>Acceso asesores</a>}
            </nav>
            <a className="lumia-badge" href="https://lumiaaisolutions.com/" target="_blank" rel="noopener">
              <img src="/img/lumia.svg" alt="" width={18} height={18} />
              Desarrollado por <b>LUMIA</b>
            </a>
          </div>
        </footer>
        {WHATSAPP_URL && (
          <a className="wa-fab" href={WHATSAPP_URL} target="_blank" rel="noopener" aria-label="Escríbenos por WhatsApp">
            <svg viewBox="0 0 32 32" aria-hidden="true" width="30" height="30">
              <path fill="currentColor" d="M16 3C9 3 3.5 8.5 3.5 15.5c0 2.4.7 4.7 1.9 6.7L3 29l7-1.8c1.9 1 4 1.6 6 1.6 7 0 12.5-5.5 12.5-12.5S23 3 16 3zm0 22.8c-1.8 0-3.6-.5-5.1-1.4l-.4-.2-4.2 1.1 1.1-4.1-.3-.4a10.2 10.2 0 0 1-1.6-5.6C5.5 9.9 10.2 5.2 16 5.2S26.5 9.9 26.5 15.5 21.8 25.8 16 25.8zm5.8-7.7c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-2-1.8-2.3-.2-.3 0-.5.1-.6l.5-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.3 5.2 4.6.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.9-.8 2.1-1.5.3-.7.3-1.4.2-1.5-.1-.2-.3-.2-.6-.4z"/>
            </svg>
          </a>
        )}
        <AgenteIA />
        <ScriptsSitio />
      </body>
    </html>
  );
}
