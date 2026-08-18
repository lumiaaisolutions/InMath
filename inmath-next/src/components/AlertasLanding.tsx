import Link from "next/link";
import { alertasActivas, leerAlertas, type Alerta } from "@/lib/alertas";
import { AlertaEmergente } from "./AlertaEmergente";

/** Primera alerta activa en formato emergente (ventana sobre la página). */
export async function AlertaEmergenteLanding({ precio, curso }: { precio: string; curso: string }) {
  const alerta = (await leerAlertas()).find((a) => a.activo && a.formato === "emergente" && (a.titulo || a.texto));
  if (!alerta) return null;
  return <AlertaEmergente alerta={alerta} precio={precio} curso={curso} />;
}

/** Alertas configuradas desde el panel: frames de vidrio sin bordes con
 *  manchas de color difuminadas (estilo mesh) en los colores del sitio. */
export async function AlertasLanding({ posicion }: { posicion: Alerta["posicion"] }) {
  const alertas = (await alertasActivas(posicion)).filter((a) => a.formato === "banner");
  if (!alertas.length) return null;
  return (
    <section className="alertas-zona" aria-label="Avisos">
      <div className="centrado">
        {alertas.map((a) => (
          <div key={a.id} className={`alerta-frame alerta-${a.estilo} reveal`}>
            {a.media && (a.media.endsWith(".mp4")
              ? <video className="alerta-media" src={a.media} muted loop autoPlay playsInline />
              : <img className="alerta-media" src={a.media} alt="" />)}
            <div className="alerta-cuerpo">
              {a.titulo && <b>{a.titulo}</b>}
              {a.texto && <p>{a.texto}</p>}
            </div>
            {a.enlace && a.enlace_texto && (
              <Link className="alerta-cta" href={a.enlace}>{a.enlace_texto}</Link>
            )}
            <span className="alerta-brillo" aria-hidden="true" />
          </div>
        ))}
      </div>
    </section>
  );
}
