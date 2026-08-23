import Link from "next/link";
import { alertasActivas, leerAlertas, type Alerta } from "@/lib/alertas";
import { varsDiseno, esVideo } from "@/lib/alertas-tipos";
import { AlertaEmergente } from "./AlertaEmergente";
import { CuentaRegresiva } from "./CuentaRegresiva";
import { Icono } from "./Icono";

/** Primera alerta activa en formato emergente (ventana sobre la página). */
export async function AlertaEmergenteLanding({ precio, curso }: { precio: string; curso: string }) {
  const alerta = (await leerAlertas()).find((a) => a.activo && a.formato === "emergente" && (a.titulo || a.texto));
  if (!alerta) return null;
  return <AlertaEmergente alerta={alerta} precio={precio} curso={curso} />;
}

/** Alertas configuradas desde el panel — banner RICO (kicker, cuenta regresiva,
 *  cuadrito de plan, marcador de ahorro y CTA), con todo el diseño ajustable. */
export async function AlertasLanding({ posicion, precio, curso }: { posicion: Alerta["posicion"]; precio?: string; curso?: string }) {
  const alertas = (await alertasActivas(posicion)).filter((a) => a.formato === "banner");
  if (!alertas.length) return null;
  return (
    <section className="alertas-zona" aria-label="Avisos">
      <div className="centrado">
        {alertas.map((a) => {
          const d = a.diseno;
          return (
            <div key={a.id} className={`alb alerta-${a.estilo} reveal`} style={varsDiseno(d) as React.CSSProperties}>
              {a.media && (
                <div className="alb-media">
                  {esVideo(a.media)
                    ? <video src={a.media} muted loop autoPlay playsInline />
                    : <img src={a.media} alt="" />}
                </div>
              )}
              {d.mostrar_kicker && d.kicker_texto && <span className="alb-kicker"><Icono n="clock" /> {d.kicker_texto}</span>}
              {d.mostrar_cuenta && d.fecha_limite && <CuentaRegresiva fecha={d.fecha_limite} className="alb-cuenta" />}
              {a.titulo && <h2 className="alb-titulo">{a.titulo}</h2>}
              {a.texto && <p className="alb-texto">{a.texto}</p>}
              {d.mostrar_plan && (
                <div className="alb-plan">
                  <div className="alb-plan-info">
                    <b>{d.plan_titulo || curso || "Curso Inmath"}</b>
                    {d.plan_sub && <span>{d.plan_sub}</span>}
                  </div>
                  <div className="alb-plan-precio">
                    <b>{d.plan_precio || precio || ""}</b>
                    {d.plan_antes && <s>{d.plan_antes}</s>}
                  </div>
                </div>
              )}
              {d.mostrar_marcador && d.marcador_texto && <span className="alb-marcador">{d.marcador_texto}</span>}
              {a.enlace && a.enlace_texto && (
                <Link className="alb-cta" href={a.enlace}>{a.enlace_texto} <Icono n="arrow" /></Link>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
