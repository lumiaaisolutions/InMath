"use client";
import { useEffect, useState } from "react";
import { Icono } from "@/components/Icono";
import type { Avance } from "@/lib/avance";

type IntentoView = { id: number; etiqueta: string; fecha: string; porcentaje: number; correctas: number; total: number };
type Metricas = { diasContigo: number };

/** Avance del alumno con estética SUAVE (splash de color difuminado) y
 *  mini-gráficas sutiles tipo sparkline — inspirado en tarjetas de perfil
 *  con datos: fila de métricas arriba + mini-tarjetas con gráficas. */
export function AvanceCard({ avance, historial = [], metricas }: { avance: Avance; historial?: IntentoView[]; metricas?: Metricas }) {
  if (!avance.hayContenido) {
    return (
      <div className="av2 av2-vacio">
        <span className="av2-tit">Tu avance</span>
        <p>Aún no hay exámenes ni fases para tu modalidad. En cuanto haya contenido, tu avance aparecerá aquí conforme lo completes.</p>
      </div>
    );
  }
  const promedio = avance.examenes?.porcentaje ?? 0;
  const mejor = historial.length ? Math.max(...historial.map((h) => h.porcentaje)) : 0;
  const barras = [...historial].reverse().slice(-12); // cronológico, últimos 12

  const chips = [
    metricas ? { ic: "calendar", n: metricas.diasContigo, etq: metricas.diasContigo === 1 ? "día contigo" : "días contigo" } : null,
    avance.examenes ? { ic: "check", n: `${avance.examenes.conIntento}/${avance.examenes.total}`, etq: "exámenes" } : null,
    { ic: "trend", n: `${promedio}%`, etq: "aciertos" },
    avance.fases ? { ic: "route", n: `${avance.fases.aprobadas}/${avance.fases.total}`, etq: "fases" } : null,
  ].filter(Boolean) as { ic: string; n: string | number; etq: string }[];

  return (
    <div className="av2">
      {/* Fila de métricas rápidas */}
      <div className="av2-metricas">
        {chips.map((c, i) => (
          <div className="av2-metrica" key={i}>
            <span className="av2-metrica-ic"><Icono n={c.ic} /></span>
            <b><Contador valor={typeof c.n === "number" ? c.n : undefined} texto={typeof c.n === "string" ? c.n : undefined} /></b>
            <span>{c.etq}</span>
          </div>
        ))}
      </div>

      {/* Mini-tarjetas con gráficas suaves */}
      <div className="av2-grid">
        <div className="av2-mini av2-splash-menta">
          <span className="av2-mini-cab"><Icono n="trend" /> Tu avance</span>
          <div className="av2-mini-cuerpo">
            <Donut valor={avance.global} />
            <div className="av2-mini-tx">
              <b>{avance.global >= 80 ? "Excelente" : avance.global >= 40 ? "En curso" : "Empezando"}</b>
              <span>del curso completado</span>
            </div>
          </div>
        </div>

        <div className="av2-mini av2-splash-durazno">
          <span className="av2-mini-cab"><Icono n="check" /> Tus aciertos</span>
          <div className="av2-mini-cuerpo">
            <div className="av2-mini-tx">
              <b>{promedio}%</b>
              <span>{mejor > 0 ? `mejor intento ${mejor}%` : "aún sin exámenes"}</span>
            </div>
            {barras.length > 0 && <Sparkbars datos={barras} />}
          </div>
        </div>

        {barras.length > 1 && (
          <div className="av2-mini av2-splash-azul av2-mini-ancho">
            <span className="av2-mini-cab"><Icono n="route" /> Tu evolución</span>
            <div className="av2-mini-cuerpo">
              <div className="av2-mini-tx">
                <b>{historial.length}</b>
                <span>{historial.length === 1 ? "intento realizado" : "intentos realizados"}</span>
              </div>
              <Sparkline datos={barras} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Donut suave (SVG) con el % al centro, animado. */
function Donut({ valor }: { valor: number }) {
  const [d, setD] = useState(0);
  useEffect(() => { const t = setTimeout(() => setD(valor), 120); return () => clearTimeout(t); }, [valor]);
  const R = 30, C = 2 * Math.PI * R, off = C - (C * d) / 100;
  const col = valor >= 80 ? "#3ED9B0" : valor >= 40 ? "#F6A87A" : "#8FB8FF";
  return (
    <div className="av2-donut">
      <svg viewBox="0 0 76 76" width="76" height="76">
        <circle cx="38" cy="38" r={R} fill="none" stroke="#EEF2F8" strokeWidth="8" />
        <circle cx="38" cy="38" r={R} fill="none" stroke={col} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={off} transform="rotate(-90 38 38)"
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(.22,.7,.31,1)" }} />
      </svg>
      <span className="av2-donut-n"><Contador valor={valor} />%</span>
    </div>
  );
}

/** Sparkbars suaves (barras finas pastel) con hover. */
function Sparkbars({ datos }: { datos: IntentoView[] }) {
  const [act, setAct] = useState<number | null>(null);
  return (
    <div className="av2-spark">
      {datos.map((d) => {
        const tono = d.porcentaje >= 80 ? "alto" : d.porcentaje >= 40 ? "medio" : "bajo";
        return (
          <div key={d.id} className="av2-spark-col" onMouseEnter={() => setAct(d.id)} onMouseLeave={() => setAct(null)}>
            {act === d.id && <span className="av2-spark-tip">{d.porcentaje}% · {d.fecha}</span>}
            <i className={`av2-spark-b ${tono}`} style={{ height: `${Math.max(10, d.porcentaje)}%` }} />
          </div>
        );
      })}
    </div>
  );
}

/** Sparkline de área suave (SVG) de la evolución de %. */
function Sparkline({ datos }: { datos: IntentoView[] }) {
  const W = 220, H = 56, n = datos.length;
  const pts = datos.map((d, i) => [(i / (n - 1)) * W, H - (d.porcentaje / 100) * (H - 8) - 4] as const);
  const linea = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${linea} L${W},${H} L0,${H} Z`;
  return (
    <svg className="av2-line" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" width="100%" height="56">
      <defs>
        <linearGradient id="avArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8FB8FF" stopOpacity="0.35" />
          <stop offset="1" stopColor="#8FB8FF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#avArea)" />
      <path d={linea} fill="none" stroke="#6B9FFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="2.6" fill="#fff" stroke="#6B9FFF" strokeWidth="1.8" />)}
    </svg>
  );
}

/** Cuenta de 0 al valor (para números). Si `texto`, lo muestra tal cual. */
function Contador({ valor, texto }: { valor?: number; texto?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (valor == null || valor <= 0) { setN(valor ?? 0); return; }
    let raf = 0; const t0 = performance.now(); const dur = 850;
    const paso = (t: number) => { const p = Math.min(1, (t - t0) / dur); setN(Math.round(valor * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(paso); };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [valor]);
  if (texto != null) return <>{texto}</>;
  return <>{n}</>;
}
