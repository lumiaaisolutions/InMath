"use client";
import { useMemo, useState, useTransition } from "react";
import { IconoPanel } from "@/components/IconoPanel";
import { useToastResultado } from "../ClientePanel";
import { retroEstadoAccion, retroEliminarAccion } from "../acciones";

type Retro = {
  id: number; tipo: "pregunta" | "recomendacion"; mensaje: string;
  estado: "nueva" | "atendida"; alumno: string; correo: string | null; fecha: string;
};

const fechaCorta = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/** Bandeja de retroalimentación de alumnos. El mensaje se pinta SIEMPRE como
 *  texto React (escape automático) — jamás como HTML. */
export function BandejaSugerencias({ inicial }: { inicial: Retro[] }) {
  const [tipo, setTipo] = useState<"todas" | "pregunta" | "recomendacion">("todas");
  const [estado, setEstado] = useState<"todas" | "nueva" | "atendida">("todas");
  const [ocupado, startTransition] = useTransition();
  const toast = useToastResultado();

  const filas = useMemo(() => inicial.filter((f) =>
    (tipo === "todas" || f.tipo === tipo) && (estado === "todas" || f.estado === estado)
  ), [inicial, tipo, estado]);

  return (
    <div className="tarjeta">
      <div className="sg-filtros">
        <div className="us-filtros" role="tablist" aria-label="Filtrar por tipo">
          {(["todas", "pregunta", "recomendacion"] as const).map((t) => (
            <button key={t} type="button" className={`us-filtro${tipo === t ? " activo" : ""}`} onClick={() => setTipo(t)}>
              {t === "todas" ? "Todas" : t === "pregunta" ? "Preguntas" : "Recomendaciones"}
            </button>
          ))}
        </div>
        <div className="us-filtros" role="tablist" aria-label="Filtrar por estado">
          {(["todas", "nueva", "atendida"] as const).map((e) => (
            <button key={e} type="button" className={`us-filtro${estado === e ? " activo" : ""}`} onClick={() => setEstado(e)}>
              {e === "todas" ? "Todo estado" : e === "nueva" ? "Sin atender" : "Atendidas"}
            </button>
          ))}
        </div>
      </div>

      {filas.length === 0 ? (
        <div className="vacio">Nada por aquí con esos filtros — cuando un alumno escriba, lo verás al instante.</div>
      ) : (
        <div className="sg-lista">
          {filas.map((f) => (
            <article key={f.id} className={`sg-item${f.estado === "nueva" ? " nueva" : ""}`}>
              <header>
                <span className={`sg-tipo ${f.tipo}`}>
                  <IconoPanel n={f.tipo === "pregunta" ? "chat" : "chispa"} cls="ic-sm" />
                  {f.tipo === "pregunta" ? "Pregunta" : "Recomendación"}
                </span>
                <span className="sg-quien">{f.alumno}{f.correo ? ` · ${f.correo}` : ""}</span>
                <span className="sg-fecha">{fechaCorta(f.fecha)}</span>
              </header>
              <p className="sg-msg">{f.mensaje}</p>
              <footer>
                <span className={`gaje ${f.estado === "nueva" ? "neutro" : "ok"}`}>{f.estado === "nueva" ? "sin atender" : "atendida"}</span>
                <button type="button" className="boton mini fantasma" disabled={ocupado}
                  onClick={() => startTransition(async () => toast(await retroEstadoAccion(f.id, f.estado === "nueva" ? "atendida" : "nueva")))}>
                  {f.estado === "nueva" ? "✓ Marcar atendida" : "Reabrir"}
                </button>
                <button type="button" className="boton mini fantasma rx-borrar" disabled={ocupado}
                  onClick={() => startTransition(async () => toast(await retroEliminarAccion(f.id)))}>
                  Eliminar
                </button>
              </footer>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
