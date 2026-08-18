"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Icono } from "./Icono";
import type { Alerta } from "@/lib/alertas-tipos";

/** Ventana emergente sobre toda la página: el aviso configurado + el plan con
 *  su descuento. Aparece al entrar (una vez por visita) y se puede cerrar. */
export function AlertaEmergente({ alerta, precio, curso }: { alerta: Alerta; precio: string; curso: string }) {
  const [visible, setVisible] = useState(false);
  const [cerrando, setCerrando] = useState(false);

  useEffect(() => {
    // Una vez por sesión de navegación para no ser molesto.
    if (sessionStorage.getItem("alertaEmergenteVista") === alerta.id) return;
    const t = setTimeout(() => setVisible(true), 900);
    return () => clearTimeout(t);
  }, [alerta.id]);

  const cerrar = () => {
    setCerrando(true);
    sessionStorage.setItem("alertaEmergenteVista", alerta.id);
    setTimeout(() => { setVisible(false); setCerrando(false); }, 300);
  };

  if (!visible) return null;
  return (
    <div className={`am-velo${cerrando ? " am-cierra" : ""}`} role="dialog" aria-modal="true" aria-label={alerta.titulo || "Aviso"} onClick={cerrar}>
      <div className={`am-caja alerta-${alerta.estilo}`} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="am-cerrar" aria-label="Cerrar" onClick={cerrar}><Icono n="x" /></button>
        <span className="am-kicker"><i /> Oferta por tiempo limitado</span>
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
  );
}
