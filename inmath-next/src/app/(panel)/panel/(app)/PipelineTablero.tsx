"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { etiquetaEtapa } from "@/lib/panel/formato";
import { cambiarEtapaAccion } from "./acciones";
import { useToast } from "./ClientePanel";

export type TarjetaPipeline = {
  id: number; nombre: string | null; telefono: string;
  puntaje: number | null; asesor: string | null; ultimoMensaje: string | null;
};

const COLORES: Record<string, string> = {
  prospecto: "var(--etapa-1)", calificado: "var(--etapa-2)", cita_agendada: "var(--etapa-3)",
  pago_pendiente: "var(--etapa-4)", inscrito: "var(--etapa-5)",
};

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

  function soltar(etapaNueva: string) {
    const a = arrastrada.current;
    setRecibiendo(null);
    if (!a || a.etapa === etapaNueva) return;
    const tarjeta = columnas[a.etapa].find((t) => t.id === a.id)!;
    const previo = columnas;
    setColumnas({
      ...columnas,
      [a.etapa]: columnas[a.etapa].filter((t) => t.id !== a.id),
      [etapaNueva]: [tarjeta, ...columnas[etapaNueva]],
    });
    setRecienMovida(a.id);
    setTimeout(() => setRecienMovida(null), 450);
    cambiarEtapaAccion(a.id, etapaNueva)
      .then((r) => { if (r.error) throw new Error(r.error); })
      .catch(() => {
        setColumnas(previo);
        setToast({ texto: "No se pudo mover el prospecto. Revisa tu conexión.", tipo: "error" });
      });
    arrastrada.current = null;
  }

  return (
    <>
      <div className="cabecera cabecera-hero">
        <div>
          <h1>Pipeline de ventas</h1>
          <div className="sub">Del primer contacto en WhatsApp a la inscripción — arrastra las tarjetas para cambiarlas de etapa</div>
          <div className="ch-stats">
            <span className="ch-stat"><b>{total}</b> en el pipeline</span>
            <span className="ch-stat ok"><b>{inscritos}</b> inscritos</span>
            {sinAsesor > 0 && <span className="ch-stat alerta"><b>{sinAsesor}</b> sin asesor</span>}
          </div>
        </div>
        <form className="form-inline">
          <select value={filtroAsesor} onChange={(e) => router.push(e.target.value ? `/panel?asesor_id=${e.target.value}` : "/panel")}>
            <option value="">Todos los asesores</option>
            {asesores.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        </form>
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
                  <span className="tp-avatar">{(p.nombre ?? "?").charAt(0).toUpperCase()}</span>
                  <span className="tp-cuerpo">
                    <b>{p.nombre ?? "Sin nombre"}</b>
                    <span className="tel">{p.telefono}</span>
                    <span className="meta">
                      {p.puntaje !== null && <span className="gaje grad">◆ {p.puntaje}</span>}
                      {p.asesor ? <span className="gaje neutro">{p.asesor}</span> : <span className="gaje alerta">Sin asesor</span>}
                      {p.ultimoMensaje && <span className="gaje neutro" title="Último mensaje">{p.ultimoMensaje}</span>}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
