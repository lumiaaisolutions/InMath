"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { etiquetaEtapa } from "@/lib/panel/formato";
import { cambiarEtapaAccion } from "./acciones";
import { useToast, SelectorDesplegable } from "./ClientePanel";
import { IconoPanel } from "@/components/IconoPanel";

export type TarjetaPipeline = {
  id: number; nombre: string | null; telefono: string;
  puntaje: number | null; asesor: string | null; ultimoMensaje: string | null;
  foto?: string | null;
};

const COLORES: Record<string, string> = {
  prospecto: "var(--etapa-1)", calificado: "var(--etapa-2)", cita_agendada: "var(--etapa-3)",
  pago_pendiente: "var(--etapa-4)", inscrito: "var(--etapa-5)",
};
const ETAPAS_ORDEN = ["prospecto", "calificado", "cita_agendada", "pago_pendiente", "inscrito"];
const HEX: Record<string, string> = {
  prospecto: "#7C9AD8", calificado: "#57B0C4", cita_agendada: "#5FC0A0", pago_pendiente: "#EBA23C", inscrito: "#6B9FFF",
};

/** Botón "Mover a…" — alternativa al drag&drop para pantallas chicas donde arrastrar es incómodo. */
function MoverBoton({ etapaActual, onMover }: { etapaActual: string; onMover: (destino: string) => void }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="tp-mover" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setAbierto(false); }}>
      <button type="button" className="icono-burbuja tp-mover-btn" aria-label="Mover a otra etapa" aria-haspopup="listbox" aria-expanded={abierto}
        onClick={() => setAbierto((a) => !a)}>
        <IconoPanel n="abajo" cls="ic-sm" />
      </button>
      {abierto && (
        <div className="desp-lista tp-mover-lista" role="listbox">
          {ETAPAS_ORDEN.filter((et) => et !== etapaActual).map((et) => (
            <button key={et} type="button" role="option" className="desp-op"
              onClick={() => { onMover(et); setAbierto(false); }}>
              <span className="tp-mover-punto" style={{ background: HEX[et] }} /> Mover a {etiquetaEtapa(et)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Anillo de dona interactivo: pasar el cursor por un segmento o la leyenda resalta
 *  ambos a la vez y muestra su detalle al centro — reparto del embudo por etapa. */
function DonaEtapas({ columnas, total }: { columnas: Record<string, { id: number }[]>; total: number }) {
  const [activa, setActiva] = useState<string | null>(null);
  const r = 54;
  const c = 2 * Math.PI * r;
  const segmentos = ETAPAS_ORDEN.reduce<{ etapa: string; n: number; frac: number; dash: string; offset: number }[]>((acc, et) => {
    const n = columnas[et]?.length ?? 0;
    const frac = total > 0 ? n / total : 0;
    const acumulado = acc.reduce((s, seg) => s + seg.frac, 0);
    acc.push({ etapa: et, n, frac, dash: `${frac * c} ${c}`, offset: -acumulado * c });
    return acc;
  }, []);
  const enFoco = segmentos.find((s) => s.etapa === activa) ?? null;

  return (
    <div className="dona-cuerpo">
      <div className="dona-envoltura">
        <svg viewBox="0 0 140 140" className="dona-svg" role="img" aria-label="Reparto del pipeline por etapa">
          <circle cx="70" cy="70" r={r} fill="none" stroke="var(--linea)" strokeWidth="16" />
          {segmentos.filter((s) => s.n > 0).map((s) => (
            <circle key={s.etapa} cx="70" cy="70" r={r} fill="none" stroke={HEX[s.etapa]}
              strokeWidth={activa === s.etapa ? 20 : activa ? 12 : 16}
              opacity={activa && activa !== s.etapa ? 0.35 : 1}
              strokeDasharray={s.dash} strokeDashoffset={s.offset} strokeLinecap="round" transform="rotate(-90 70 70)"
              className="dona-seg"
              onMouseEnter={() => setActiva(s.etapa)} onMouseLeave={() => setActiva(null)}
              style={{ cursor: "pointer", color: HEX[s.etapa] }}
            />
          ))}
        </svg>
        <div className="dona-centro">
          {enFoco ? (
            <>
              <b style={{ color: HEX[enFoco.etapa] }}>{enFoco.n}</b>
              <span>{etiquetaEtapa(enFoco.etapa)}</span>
            </>
          ) : (
            <><b>{total}</b><span>en total</span></>
          )}
        </div>
      </div>
      <ul className="dona-leyenda">
        {segmentos.map((s) => (
          <li key={s.etapa} className={activa === s.etapa ? "activa" : ""}
            onMouseEnter={() => setActiva(s.etapa)} onMouseLeave={() => setActiva(null)}>
            <i style={{ background: HEX[s.etapa] }} />
            <span className="dona-leyenda-nombre">{etiquetaEtapa(s.etapa)}</span>
            <b>{s.n}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Racimo de avatares de asesores (estilo "top clients"). */
function RacimoAsesores({ asesores }: { asesores: { id: number; nombre: string }[] }) {
  const visibles = asesores.slice(0, 5);
  const resto = asesores.length - visibles.length;
  return (
    <div className="racimo">
      {visibles.map((a, i) => (
        <span key={a.id} className="racimo-av" style={{ "--i": i } as React.CSSProperties} title={a.nombre}>
          {a.nombre.charAt(0).toUpperCase()}
        </span>
      ))}
      {resto > 0 && <span className="racimo-av racimo-mas" style={{ "--i": visibles.length } as React.CSSProperties}>+{resto}</span>}
    </div>
  );
}

/** Port 1:1 de vistas/pipeline.php: columnas + drag&drop optimista. */
export function PipelineTablero({ columnas: inicial, asesores, filtroAsesor }: {
  columnas: Record<string, TarjetaPipeline[]>;
  asesores: { id: number; nombre: string }[];
  filtroAsesor: string;
}) {
  const [columnas, setColumnas] = useState(inicial);
  const arrastrada = useRef<{ id: number; etapa: string } | null>(null);
  const [recibiendo, setRecibiendo] = useState<string | null>(null);
  const [recienMovida, setRecienMovida] = useState<number | null>(null);
  const setToast = useToast();
  const router = useRouter();

  const total = Object.values(columnas).reduce((n, c) => n + c.length, 0);
  const inscritos = columnas.inscrito?.length ?? 0;
  const sinAsesor = Object.values(columnas).flat().filter((p) => !p.asesor).length;

  function mover(id: number, etapaOrigen: string, etapaNueva: string) {
    if (etapaOrigen === etapaNueva) return;
    const tarjeta = columnas[etapaOrigen].find((t) => t.id === id)!;
    const previo = columnas;
    setColumnas({
      ...columnas,
      [etapaOrigen]: columnas[etapaOrigen].filter((t) => t.id !== id),
      [etapaNueva]: [tarjeta, ...columnas[etapaNueva]],
    });
    setRecienMovida(id);
    setTimeout(() => setRecienMovida(null), 450);
    cambiarEtapaAccion(id, etapaNueva)
      .then((r) => { if (r.error) throw new Error(r.error); })
      .catch(() => {
        setColumnas(previo);
        setToast({ texto: "No se pudo mover el prospecto. Revisa tu conexión.", tipo: "error" });
      });
  }

  function soltar(etapaNueva: string) {
    const a = arrastrada.current;
    setRecibiendo(null);
    if (!a) return;
    mover(a.id, a.etapa, etapaNueva);
    arrastrada.current = null;
  }

  return (
    <>
      <div className="cabecera cabecera-hero">
        <div>
          <h1>Pipeline de ventas</h1>
          <div className="sub">Del primer contacto en WhatsApp a la inscripción — arrastra las tarjetas para cambiarlas de etapa</div>
        </div>
        <SelectorDesplegable
          placeholder="Todos los asesores"
          valor={filtroAsesor}
          opciones={asesores.map((a) => ({ valor: String(a.id), nombre: a.nombre }))}
          onChange={(v) => router.push(v ? `/panel?asesor_id=${v}` : "/panel")}
        />
      </div>

      <div className="resumen-fila">
        <div className="tarjeta-heroe">
          <div className="th-blob" aria-hidden="true" />
          <span className="th-etq">Inscritos este ciclo</span>
          <b className="th-num">{inscritos}</b>
          <span className="th-pie">de {total} en el pipeline</span>
        </div>
        <div className="tarjeta dona-tarjeta">
          <span className="dona-tit">Reparto por etapa</span>
          <DonaEtapas columnas={columnas} total={total} />
        </div>
        <div className="tarjeta asesores-tarjeta">
          <span className="dona-tit">Asesores activos</span>
          <RacimoAsesores asesores={asesores} />
          {sinAsesor > 0
            ? <span className="gaje-punto alerta" style={{ marginTop: 12 }}>{sinAsesor} prospecto{sinAsesor === 1 ? "" : "s"} sin asignar</span>
            : <span className="gaje-punto ok" style={{ marginTop: 12 }}>Todos asignados</span>}
        </div>
      </div>

      <div className="pipeline" id="pipeline">
        {Object.entries(columnas).map(([etapa, tarjetas]) => (
          <section key={etapa} className="columna" style={{ "--col": COLORES[etapa] } as React.CSSProperties} data-etapa={etapa}>
            <header className="columna-cab">
              <span className="nodo" />
              <h2>{etiquetaEtapa(etapa)}</h2>
              <span className="cuenta">{tarjetas.length}</span>
            </header>
            <div
              className={`pila${recibiendo === etapa ? " recibiendo" : ""}`}
              onDragOver={(e) => { if (arrastrada.current) { e.preventDefault(); setRecibiendo(etapa); } }}
              onDragLeave={(e) => { if (e.target === e.currentTarget) setRecibiendo(null); }}
              onDrop={(e) => { e.preventDefault(); soltar(etapa); }}
            >
              <div className="vacio" hidden={tarjetas.length > 0}>Suelta un prospecto aquí</div>
              {tarjetas.map((p) => (
                <Link
                  key={p.id}
                  className={`tarjeta-prospecto${recienMovida === p.id ? " recien-movida" : ""}`}
                  draggable
                  href={`/panel/prospectos/${p.id}`}
                  onDragStart={(e) => {
                    arrastrada.current = { id: p.id, etapa };
                    e.dataTransfer.effectAllowed = "move";
                    (e.target as HTMLElement).classList.add("arrastrando");
                  }}
                  onDragEnd={(e) => {
                    (e.target as HTMLElement).classList.remove("arrastrando");
                    arrastrada.current = null; setRecibiendo(null);
                  }}
                >
                  <span className="tp-avatar">{p.foto ? <img src={p.foto} alt="" /> : (p.nombre ?? "?").charAt(0).toUpperCase()}</span>
                  <span className="tp-cuerpo">
                    <b>{p.nombre ?? "Sin nombre"}</b>
                    <span className="tel">{p.telefono}</span>
                    <span className="meta">
                      {p.puntaje !== null && <span className="gaje grad">{p.puntaje}</span>}
                      {p.asesor ? <span className="gaje neutro">{p.asesor}</span> : <span className="gaje alerta">Sin asesor</span>}
                      {p.ultimoMensaje && <span className="gaje neutro" title="Último mensaje">{p.ultimoMensaje}</span>}
                    </span>
                  </span>
                  <MoverBoton etapaActual={etapa} onMover={(destino) => mover(p.id, etapa, destino)} />
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
