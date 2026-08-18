import Link from "next/link";
import { alertasActivas, type Alerta } from "@/lib/alertas";

/** Alertas configuradas desde el panel: frames de vidrio sin bordes con
 *  manchas de color difuminadas (estilo mesh) en los colores del sitio. */
export async function AlertasLanding({ posicion }: { posicion: Alerta["posicion"] }) {
  const alertas = await alertasActivas(posicion);
  if (!alertas.length) return null;
  return (
    <section className="alertas-zona" aria-label="Avisos">
      <div className="centrado">
        {alertas.map((a) => (
          <div key={a.id} className={`alerta-frame alerta-${a.estilo} reveal`}>
            <div className="alerta-cuerpo">
              {a.titulo && <b>{a.titulo}</b>}
              {a.texto && <p>{a.texto}</p>}
            </div>
            {a.enlace && a.enlace_texto && (
              <Link className="alerta-cta" href={a.enlace}>{a.enlace_texto}</Link>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
