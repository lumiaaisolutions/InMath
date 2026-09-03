"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Icono } from "./Icono";
import { esVideo, varsDiseno, type Alerta } from "@/lib/alertas-tipos";
import { CuentaRegresiva } from "./CuentaRegresiva";

/** Ventana emergente a PANTALLA COMPLETA con TODO configurable desde el panel
 *  (textos, tipografías, tamaños, alineación, cuadrito del plan, marcador).
 *  Aparece al entrar (una vez por visita) y se puede cerrar. */
export function AlertaEmergente({ alerta, precio, curso }: { alerta: Alerta; precio: string; curso: string }) {
  const [visible, setVisible] = useState(false);
  const [cerrando, setCerrando] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("alertaEmergenteVista") === alerta.id) return;
    const t = setTimeout(() => setVisible(true), 900);
    return () => clearTimeout(t);
  }, [alerta.id]);

  const cerrar = () => {
    setCerrando(true);
    sessionStorage.setItem("alertaEmergenteVista", alerta.id);
    setTimeout(() => { setVisible(false); setCerrando(false); }, 320);
  };

  if (!visible) return null;
  return (
    <div className={`am-velo${cerrando ? " am-cierra" : ""}`} role="dialog" aria-modal="true" aria-label={alerta.titulo || "Aviso"}>
      <AlertaEmergenteLienzo alerta={alerta} precio={precio} curso={curso} onCerrar={cerrar} />
    </div>
  );
}

/** El LIENZO de la ventana emergente — la ÚNICA fuente de verdad de su
 *  estructura. Lo usan la landing (arriba) Y la vista previa del panel de
 *  Alertas, para que lo que el admin ve al configurar sea EXACTAMENTE lo
 *  que verá el visitante (nada duplicado ni hardcodeado en el preview).
 *  En modo `preview` los botones no navegan ni cierran nada. */
export function AlertaEmergenteLienzo({ alerta, precio, curso, onCerrar, preview = false }: {
  alerta: Alerta; precio: string; curso: string; onCerrar?: () => void; preview?: boolean;
}) {
  const d = alerta.diseno;
  return (
    <div className={`am-lienzo alerta-${alerta.estilo}`} style={varsDiseno(d) as React.CSSProperties}>
      {alerta.media && (esVideo(alerta.media)
        ? <video className="am-fondo" src={alerta.media} muted loop autoPlay playsInline />
        : <img className="am-fondo" src={alerta.media} alt="" />)}
      <div className="am-velo-int" />
      <button type="button" className="am-cerrar" aria-label="Cerrar" onClick={onCerrar} disabled={preview}><Icono n="x" /></button>
      <div className="am-contenido">
        {d.mostrar_kicker && d.kicker_texto && (
          <span className="am-kicker"><Icono n="clock" /> {d.kicker_texto}</span>
        )}
        {d.mostrar_cuenta && d.fecha_limite && <CuentaRegresiva fecha={d.fecha_limite} className="alb-cuenta" />}
        {(alerta.titulo || preview) && <h3>{alerta.titulo || "Escribe un título…"}</h3>}
        {alerta.texto && <p className="am-texto">{alerta.texto}</p>}
        {d.mostrar_plan && (
          <div className="am-plan">
            <div className="am-plan-info">
              <b>{d.plan_titulo || curso || "Curso completo"}</b>
              {d.plan_sub && <span>{d.plan_sub}</span>}
            </div>
            <div className="am-plan-precio">
              <b>{d.plan_precio || precio}</b>
              {d.plan_antes && <s>{d.plan_antes}</s>}
            </div>
          </div>
        )}
        {d.mostrar_marcador && d.marcador_texto && (
          <span className="am-marcador">{d.marcador_texto}</span>
        )}
        <div className="am-acciones">
          {preview
            ? <span className="am-cta">{alerta.enlace_texto || "Inscribirme ahora"} <Icono n="arrow" /></span>
            : <Link className="am-cta" href={alerta.enlace || "/pago"} onClick={onCerrar}>{alerta.enlace_texto || "Inscribirme ahora"} <Icono n="arrow" /></Link>}
          <button type="button" className="am-luego" onClick={onCerrar} disabled={preview}>Quizá después</button>
        </div>
      </div>
    </div>
  );
}
