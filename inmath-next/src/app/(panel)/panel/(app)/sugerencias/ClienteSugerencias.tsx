"use client";
import { useActionState, useMemo, useState, useTransition } from "react";
import { IconoPanel } from "@/components/IconoPanel";
import { useToastResultado } from "../ClientePanel";
import { retroEstadoAccion, retroEliminarAccion, retroResponderAccion, type Resultado } from "../acciones";

type Retro = {
  id: number; tipo: "pregunta" | "recomendacion"; mensaje: string;
  estado: "nueva" | "atendida"; alumno: string; correo: string | null; fecha: string;
  respuesta: string | null; respondidoEn: string | null;
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
              {f.respuesta && (
                <div className="sg-resp">
                  <b>Respuesta enviada{f.respondidoEn ? ` · ${fechaCorta(f.respondidoEn)}` : ""}</b>
                  <p>{f.respuesta}</p>
                </div>
              )}
              <footer>
                <span className={`gaje ${f.estado === "nueva" ? "neutro" : "ok"}`}>{f.estado === "nueva" ? "sin atender" : "atendida"}</span>
                <RespuestaBoton retro={f} />
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


/** Responder al alumno: textarea inline; al enviar se guarda, se marca
 *  atendida y le llega el correo con la respuesta. */
function RespuestaBoton({ retro }: { retro: Retro }) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState(retro.respuesta ?? "");
  const toast = useToastResultado();
  const [, accion, pendiente] = useActionState<Resultado, FormData>(async (prev, fd) => {
    fd.set("retro_id", String(retro.id));
    fd.set("respuesta", texto);
    const r = await retroResponderAccion(prev, fd);
    toast(r);
    if (r.ok) setAbierto(false);
    return r;
  }, {});

  if (!abierto) {
    return (
      <button type="button" className="boton mini primario" onClick={() => setAbierto(true)}>
        {retro.respuesta ? "Editar respuesta" : "Responder"}
      </button>
    );
  }
  return (
    <form action={accion} className="sg-resp-form">
      <textarea rows={3} maxLength={1200} value={texto} autoFocus
        placeholder={`Respuesta para ${retro.alumno} — le llegará por correo y la verá en su portal`}
        onChange={(e) => setTexto(e.target.value)} />
      <div className="sg-resp-acciones">
        <button type="button" className="boton mini fantasma" onClick={() => setAbierto(false)}>Cancelar</button>
        <button type="submit" className="boton mini primario" disabled={pendiente || texto.trim().length < 2}>
          {pendiente ? "Enviando…" : "Enviar respuesta"}
        </button>
      </div>
    </form>
  );
}
