import Link from "next/link";
import "./(sitio)/inmath.css";

export const metadata = { title: "Página no encontrada — Cursos InMath" };

/** 404 global con la identidad de marca (eyebrow + número en degradado). */
export default function NotFound() {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Figtree:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <main className="err-page">
          <div className="err-caja">
            <span className="eyebrow">Error 404</span>
            <div className="err-num">404</div>
            <h1>No encontramos esta página.</h1>
            <p>El enlace puede estar roto o la página se movió. Volvamos a un lugar seguro.</p>
            <div className="err-acciones">
              <Link className="boton glow glow-halo grande" href="/">Ir al inicio</Link>
              <Link className="boton pastel grande" href="/pago">Inscribirme</Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
