"use client";
import { useState } from "react";
import Link from "next/link";
import { Icono } from "./Icono";

type Plan = {
  clave: string;
  foto: string;
  etiqueta: string;
  precio: string;
  unidad: string;
  antes?: string;
  ahorro?: string;
  nombre: string;
  sub: string;
  cta: string;
  href: string;
  puntos: string[];
};

/** Carrusel de paquetes: cabecera con foto + ola, precio arriba, y al
 *  seleccionar una tarjeta pasa al frente sobre las demás. */
export function Planes({ precio, semanas, nombre }: { precio: string; semanas: number; nombre: string }) {
  const planes: Plan[] = [
    {
      clave: "gratis", foto: "/img/fotos/hero-2.jpg", etiqueta: "Gratis",
      precio: "$0", unidad: "/ sin costo", nombre: "Diagnóstico",
      sub: "Conoce el método antes de decidir.", cta: "Empezar gratis", href: "/agenda",
      puntos: [
        "Asesoría de diagnóstico por videollamada",
        "Acceso a la primera clase de cada módulo",
        "Plan de estudio personalizado",
      ],
    },
    {
      clave: "destacado", foto: "/img/fotos/avance-1.jpg", etiqueta: "Recomendado",
      precio, unidad: "MXN", antes: "$4,500", ahorro: "Ahorras $500 hoy",
      nombre: nombre || "Curso completo",
      sub: "Pago único · acceso completo.", cta: "Inscribirme ahora", href: "/pago",
      puntos: [
        `Acceso completo por ${semanas} semanas`,
        "Todas las clases y materiales descargables",
        "Asesorías por videollamada incluidas",
        "Reporte de avance cada semana por WhatsApp",
      ],
    },
    {
      clave: "custom", foto: "/img/fotos/acompana-2.jpg", etiqueta: "Personalizado",
      precio: "Cotización", unidad: "a tu medida", nombre: "Para equipos",
      sub: "Para equipos, grupos o un plan a tu medida.", cta: "Solicitar cotización", href: "/agenda",
      puntos: [
        "Contenido y ritmo ajustados a tu caso",
        "Más sesiones de asesoría incluidas",
        "Un asesor te cotiza por WhatsApp",
      ],
    },
  ];

  const [activo, setActivo] = useState(1);

  return (
    <div className="pk-carrusel" role="radiogroup" aria-label="Paquetes disponibles">
      {planes.map((p, i) => (
        <article
          key={p.clave}
          className={`pk pk-${p.clave}${i === activo ? " activo" : ""}`}
          role="radio"
          aria-checked={i === activo}
          tabIndex={0}
          onClick={() => setActivo(i)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActivo(i); } }}
        >
          <div className="pk-top">
            <div className="pk-foto" style={{ backgroundImage: `url(${p.foto})` }} aria-hidden="true" />
            <div className="pk-top-in">
              <span className="pk-etiqueta">{p.etiqueta}</span>
              {p.ahorro && (
                <span className="pk-descuento"><Icono n="clock" /> {p.ahorro}</span>
              )}
              <div className="pk-precio">
                {p.antes && <s>{p.antes}</s>}
                <b>{p.precio}</b> <small>{p.unidad}</small>
              </div>
            </div>
            <svg className="pk-ola" viewBox="0 0 500 44" preserveAspectRatio="none" aria-hidden="true">
              <path d="M0,44 L0,22 C120,46 190,6 290,18 C370,28 440,10 500,22 L500,44 Z" fill="#fff" />
            </svg>
          </div>
          <div className="pk-body">
            <h3 className="pk-nombre">{p.nombre}</h3>
            <p className="pk-sub">{p.sub}</p>
            <ul>
              {p.puntos.map((t) => (
                <li key={t}><Icono n="check" /> {t}</li>
              ))}
            </ul>
            <Link className="pk-cta" href={p.href} onClick={(e) => e.stopPropagation()}>{p.cta}</Link>
          </div>
        </article>
      ))}
    </div>
  );
}
