"use client";
import Link from "next/link";
import { Icono } from "./Icono";

/** Paquetes v39 (referencia "partnership"): dos tarjetas claras arriba y el
 *  plan recomendado como banda OSCURA de ancho completo con disponibilidad
 *  limitada y el descuento resaltado tipo marcador. */
export function Planes({ precio, semanas, nombre }: { precio: string; semanas: number; nombre: string }) {
  return (
    <div className="pk3-zona">
      <div className="pk3-confianza" aria-label="Garantías">
        <span><Icono n="card" /> Pago único, sin mensualidades</span>
        <span><Icono n="clock" /> Acceso inmediato al inscribirte</span>
        <span><Icono n="user" /> Asesoría 1 a 1 incluida</span>
      </div>

      <div className="pk3-fila">
        <article className="pk3-card">
          <h3>Diagnóstico</h3>
          <p className="pk3-sub">Conoce el método antes de decidir, sin compromiso.</p>
          <div className="pk3-precio"><b>$0</b><small>/ sin costo</small></div>
          <Link className="pk3-cta" href="/agenda">Agendar asesoría gratis</Link>
          <ul className="pk3-puntos">
            <li>Asesoría de diagnóstico por videollamada</li>
            <li>Primera clase de cada módulo</li>
            <li>Plan de estudio personalizado</li>
            <li>Sin tarjeta, sin compromiso</li>
          </ul>
        </article>

        <article className="pk3-card pk3-tinte">
          <h3>Para equipos</h3>
          <p className="pk3-sub">Grupos, escuelas o un plan hecho a tu medida.</p>
          <div className="pk3-precio"><b>Cotización</b><small>/ a tu medida</small></div>
          <Link className="pk3-cta" href="/agenda">Solicitar cotización</Link>
          <ul className="pk3-puntos">
            <li>Contenido y ritmo ajustados a tu caso</li>
            <li>Más sesiones de asesoría incluidas</li>
            <li>Un asesor te cotiza por WhatsApp</li>
            <li>Facturación disponible</li>
          </ul>
        </article>
      </div>

      <article className="pk3-banda">
        <span className="pk3-limitado"><i /> Oferta por tiempo limitado</span>
        <div className="pk3-banda-izq">
          <h3>{nombre || "Curso completo"}</h3>
          <p className="pk3-sub">Todo el curso con acompañamiento real, en un solo pago.</p>
          <div className="pk3-precio-banda">
            <b>{precio}</b>
            <span className="pk3-viejo"><s>$4,500</s> MXN</span>
          </div>
          <span className="pk3-marcador">Ahorras $500 inscribiéndote hoy</span>
          <Link className="pk3-cta-banda" href="/pago">Inscribirme ahora <Icono n="arrow" /></Link>
        </div>
        <ul className="pk3-banda-puntos">
          <li>Acceso completo por {semanas} semanas</li>
          <li>Todas las clases grabadas 24/7</li>
          <li>Materiales descargables incluidos</li>
          <li>Asesorías 1 a 1 por videollamada</li>
          <li>Reporte de avance semanal por WhatsApp</li>
          <li>Acceso inmediato al confirmar tu pago</li>
        </ul>
      </article>

      <p className="pk3-nota">Si tienes dudas, agenda una asesoría gratis y un asesor te ayuda a elegir.</p>
    </div>
  );
}
