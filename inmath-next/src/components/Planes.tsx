"use client";
import { useState } from "react";
import Link from "next/link";
import { Icono } from "./Icono";

type Plan = {
  clave: string;
  etiqueta: string;
  nombre: string;
  sub: string;
  precio: string;
  unidad: string;
  antes?: string;
  ahorro?: string;
  cta: string;
  href: string;
  puntos: string[];
};

/** Paquetes v37: tarjetas limpias (no saturadas) con la central destacada en
 *  tinta de marca; precio con tachado inline y chip de ahorro sutil. */
export function Planes({ precio, semanas, nombre }: { precio: string; semanas: number; nombre: string }) {
  const planes: Plan[] = [
    {
      clave: "gratis", etiqueta: "Gratis", nombre: "Diagnóstico",
      sub: "Conoce el método antes de decidir.",
      precio: "$0", unidad: "sin costo",
      cta: "Empezar gratis", href: "/agenda",
      puntos: [
        "Asesoría de diagnóstico por videollamada",
        "Acceso a la primera clase de cada módulo",
        "Plan de estudio personalizado",
      ],
    },
    {
      clave: "destacado", etiqueta: "Recomendado", nombre: nombre || "Curso completo",
      sub: "Pago único · acceso completo desde hoy.",
      precio, unidad: "MXN", antes: "$4,500", ahorro: "Ahorras $500 por tiempo limitado",
      cta: "Inscribirme ahora", href: "/pago",
      puntos: [
        `Acceso completo por ${semanas} semanas`,
        "Todas las clases y materiales descargables",
        "Asesorías por videollamada incluidas",
        "Reporte de avance cada semana por WhatsApp",
      ],
    },
    {
      clave: "custom", etiqueta: "Personalizado", nombre: "Para equipos",
      sub: "Grupos o un plan hecho a tu medida.",
      precio: "Cotización", unidad: "a tu medida",
      cta: "Solicitar cotización", href: "/agenda",
      puntos: [
        "Contenido y ritmo ajustados a tu caso",
        "Más sesiones de asesoría incluidas",
        "Un asesor te cotiza por WhatsApp",
      ],
    },
  ];

  const [activo, setActivo] = useState(1);

  return (
    <div className="pk2-zona">
      <div className="pk2-confianza" aria-label="Garantías">
        <span><Icono n="card" /> Pago único, sin mensualidades</span>
        <span><Icono n="clock" /> Acceso inmediato al inscribirte</span>
        <span><Icono n="user" /> Asesoría 1 a 1 incluida</span>
      </div>
      <div className="pk2-grid" role="radiogroup" aria-label="Paquetes disponibles">
        {planes.map((p, i) => (
          <article
            key={p.clave}
            className={`pk2 pk2-${p.clave}${i === activo ? " activo" : ""}`}
            role="radio" aria-checked={i === activo} tabIndex={0}
            onClick={() => setActivo(i)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActivo(i); } }}
          >
            {p.clave === "destacado" && <span className="pk2-badge">{p.etiqueta}</span>}
            <div className="pk2-cab">
              <h3>{p.nombre}</h3>
              <p>{p.sub}</p>
            </div>
            <div className="pk2-precio">
              <b>{p.precio}</b>
              {p.antes && <s>{p.antes}</s>}
              <small>{p.unidad}</small>
            </div>
            {p.ahorro && <span className="pk2-ahorro"><Icono n="clock" /> {p.ahorro}</span>}
            <Link className="pk2-cta" href={p.href} onClick={(e) => e.stopPropagation()}>{p.cta}</Link>
            <ul>
              {p.puntos.map((t) => (
                <li key={t}><Icono n="check" /> {t}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <p className="pk2-nota">Si tienes dudas, agenda una asesoría gratis y un asesor te ayuda a elegir.</p>
    </div>
  );
}
