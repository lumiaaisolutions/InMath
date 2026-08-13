import type { Metadata } from "next";
import "./inmath.css";
import Link from "next/link";
import { Icono } from "@/components/Icono";
import { ScriptsSitio, AgenteIA } from "@/components/ClienteSitio";

export const metadata: Metadata = {
  title: "Cursos InMath — Aprende en línea a tu ritmo",
  description: "Cursos InMath: cursos en línea con asesoría 1 a 1 por WhatsApp y reporte de tu avance cada semana.",
  icons: { icon: "/img/inmath.svg" },
};

const PANEL_URL = process.env.PANEL_URL ?? "";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Figtree:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div id="cargaOverlay" className="carga-overlay oculta" aria-hidden="true" />
        <header className="barra">
          <Link className="logo" href="/"><img src="/img/inmath.svg" alt="" width={46} height={46} /><b>Cursos <span>Inmath</span></b></Link>
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
        <AgenteIA />
        <ScriptsSitio />
      </body>
    </html>
  );
}
