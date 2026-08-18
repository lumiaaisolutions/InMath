"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Icono } from "./Icono";
import { esVideo, type Alerta } from "@/lib/alertas-tipos";

/** Ventana emergente a PANTALLA COMPLETA: el aviso configurado + el plan con
 *  su descuento, con imagen/video de fondo si la alerta tiene media.
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
      <div className={`am-lienzo alerta-${alerta.estilo}`}>
        {alerta.media && (esVideo(alerta.media)
          ? <video className="am-fondo" src={alerta.media} muted loop autoPlay playsInline />
          : <img className="am-fondo" src={alerta.media} alt="" />)}
        <div className="am-velo-int" />
        <button type="button" className="am-cerrar" aria-label="Cerrar" onClick={cerrar}><Icono n="x" /></button>
        <div className="am-contenido">
          <span className="am-kicker"><Icono n="clock" /> Oferta por tiempo limitado</span>
          {alerta.titulo && <h3>{alerta.titulo}</h3>}
          {alerta.texto && <p className="am-texto">{alerta.texto}</p>}
          <div className="am-plan">
            <div className="am-plan-info">
              <b>{curso || "Curso completo"}</b>
              <span>Pago único · acceso inmediato · asesoría 1 a 1</span>
            </div>
            <div className="am-plan-precio">
              <b>{precio}</b>
              <s>$4,500</s>
            </div>
          </div>
          <span className="am-marcador">Ahorras $500 inscribiéndote hoy</span>
          <div className="am-acciones">
            <Link className="am-cta" href={alerta.enlace || "/pago"} onClick={cerrar}>{alerta.enlace_texto || "Inscribirme ahora"} <Icono n="arrow" /></Link>
            <button type="button" className="am-luego" onClick={cerrar}>Quizá después</button>
          </div>
        </div>
      </div>
    </div>
  );
}
