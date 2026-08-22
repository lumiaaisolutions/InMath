"use client";
import "./(sitio)/inmath.css";

/** Error global (fallo inesperado del sistema) con identidad de marca. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
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
            <span className="eyebrow">Algo salió mal</span>
            <div className="err-num">Ups</div>
            <h1>Tuvimos un problema al cargar esto.</h1>
            <p>No te preocupes, no es tu culpa. Vuelve a intentarlo o regresa al inicio.</p>
            <div className="err-acciones">
              <button className="boton glow glow-halo grande" onClick={() => reset()}>Reintentar</button>
              <a className="boton pastel grande" href="/">Ir al inicio</a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
