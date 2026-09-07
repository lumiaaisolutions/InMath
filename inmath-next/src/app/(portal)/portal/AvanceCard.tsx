"use client";
import { useEffect, useState } from "react";
import type { Avance } from "@/lib/avance";

type IntentoView = { id: number; etiqueta: string; fecha: string; porcentaje: number; correctas: number; total: number };

/** Tarjeta de avance INTERACTIVA: anillo de progreso animado con el % global,
 *  desglose de exámenes/fases con contadores que cuentan hacia arriba, y una
 *  gráfica de barras del historial de intentos (hover = detalle). */
export function AvanceCard({ avance, historial = [] }: { avance: Avance; historial?: IntentoView[] }) {
  if (!avance.hayContenido) {
    return (
      <div className="av-card av-vacio">
        <span className="av-card-tit">Tu avance</span>
        <p>Aún no hay exámenes ni fases para tu modalidad. En cuanto haya contenido, tu avance aparecerá aquí conforme lo completes.</p>
      </div>
    );
  }
  const nivel = avance.global >= 80 ? "alto" : avance.global >= 40 ? "medio" : "bajo";
  return (
    <div className="av-card">
      <div className="av-card-hero">
        <Anillo valor={avance.global} nivel={nivel} />
        <div className="av-card-hero-tx">
          <span className="av-card-tit">Tu avance del curso</span>
          <p>{avance.global >= 80 ? "¡Vas increíble! Ya casi dominas tu curso."
            : avance.global >= 40 ? "Buen ritmo — sigue resolviendo para subir."
            : "Apenas empiezas. Cada examen que resuelvas suma."}</p>
          <div className="av-desglose">
            {avance.examenes && (
              <button type="button" className="av-item">
                <span className="av-item-n"><Contador a={avance.examenes.conIntento} />/<i>{avance.examenes.total}</i></span>
                <span className="av-item-etq">exámenes resueltos</span>
                <span className="av-item-sub">{avance.examenes.porcentaje}% de aciertos</span>
              </button>
            )}
            {avance.fases && (
              <button type="button" className="av-item">
                <span className="av-item-n"><Contador a={avance.fases.aprobadas} />/<i>{avance.fases.total}</i></span>
                <span className="av-item-etq">fases aprobadas</span>
                <span className="av-item-sub">{avance.fases.porcentaje}% completado</span>
              </button>
            )}
          </div>
        </div>
      </div>
      {historial.length > 0 && <HistorialBarras datos={historial} />}
    </div>
  );
}

/** Anillo SVG animado (0 → valor) con el porcentaje al centro. */
function Anillo({ valor, nivel }: { valor: number; nivel: string }) {
  const [dibujado, setDibujado] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setDibujado(valor), 120);
    return () => clearTimeout(t);
  }, [valor]);
  const R = 52, C = 2 * Math.PI * R;
  const off = C - (C * dibujado) / 100;
  const col = nivel === "alto" ? "#12855C" : nivel === "medio" ? "#F6A62A" : "#4D7FF0";
  return (
    <div className="av-anillo">
      <svg viewBox="0 0 128 128" width="128" height="128">
        <circle cx="64" cy="64" r={R} fill="none" stroke="#E6ECF7" strokeWidth="12" />
        <circle cx="64" cy="64" r={R} fill="none" stroke={col} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={off} transform="rotate(-90 64 64)"
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(.22,.7,.31,1)" }} />
      </svg>
      <div className="av-anillo-tx"><b><Contador a={valor} />%</b><span>avance</span></div>
    </div>
  );
}

/** Cuenta de 0 al valor (efecto de "sube el número"). */
function Contador({ a }: { a: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (a <= 0) { setN(0); return; }
    let raf = 0; const t0 = performance.now(); const dur = 900;
    const paso = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      setN(Math.round(a * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [a]);
  return <>{n}</>;
}

/** Gráfica de barras del historial: cada intento una barra, hover = detalle. */
function HistorialBarras({ datos }: { datos: IntentoView[] }) {
  const [activo, setActivo] = useState<number | null>(null);
  const orden = [...datos].reverse(); // del más antiguo al más nuevo (izq→der)
  return (
    <div className="av-hist">
      <div className="av-hist-cab">
        <span className="av-hist-tit">Tus intentos de práctica</span>
        <span className="av-hist-leyenda"><i className="alto" /> ≥80 <i className="medio" /> 40–79 <i className="bajo" /> &lt;40</span>
      </div>
      <div className="av-hist-barras" role="img" aria-label="Evolución de tus intentos">
        {orden.map((d) => {
          const nivel = d.porcentaje >= 80 ? "alto" : d.porcentaje >= 40 ? "medio" : "bajo";
          return (
            <div key={d.id} className="av-hist-col" onMouseEnter={() => setActivo(d.id)} onMouseLeave={() => setActivo(null)} onFocus={() => setActivo(d.id)} tabIndex={0}>
              {activo === d.id && (
                <div className="av-hist-tip">
                  <b>{d.porcentaje}%</b> · {d.correctas}/{d.total}
                  <span>{d.etiqueta}</span>
                  <small>{d.fecha}</small>
                </div>
              )}
              <div className="av-hist-barra-caja">
                <i className={`av-hist-barra ${nivel}`} style={{ height: `${Math.max(6, d.porcentaje)}%` }} />
              </div>
              <span className="av-hist-pct">{d.porcentaje}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
