"use client";
import { useActionState, useState } from "react";
import { Icono } from "@/components/Icono";
import { enviarRetroAccion, type EstadoCuenta } from "./cuenta/actions";

type MiRetro = {
  id: number; tipo: "pregunta" | "recomendacion"; mensaje: string;
  estado: "nueva" | "atendida"; fecha: string;
  respuesta?: string | null; respondidoEl?: string | null;
};

const MAX = 800;

/** "Tu voz construye InMath" — preguntas y recomendaciones del alumno.
 *  El mensaje SIEMPRE se pinta como texto (React escapa solo): nada de
 *  HTML del usuario. El blindaje fuerte vive en enviarRetroAccion. */
export function RetroCard({ historial, abiertaSiempre = false }: { historial: MiRetro[]; abiertaSiempre?: boolean }) {
  const [tipo, setTipo] = useState<"pregunta" | "recomendacion">("pregunta");
  const [mensaje, setMensaje] = useState("");
  const [verHist, setVerHist] = useState(abiertaSiempre);
  const [estado, accion, pendiente] = useActionState<EstadoCuenta, FormData>(async (prev, fd) => {
    fd.set("tipo", tipo);
    const r = await enviarRetroAccion(prev, fd);
    if (r.ok) setMensaje("");
    return r;
  }, {});

  return (
    <section className="pt-retro pt-rev" style={{ ["--d" as string]: "260ms" }}>
      <header className="pt-retro-cab">
        <span className="pt-retro-ic"><Icono n="chat" /></span>
        <div>
          <b>Tu voz construye InMath</b>
          <span>¿Una duda del sistema o una idea para mejorarlo? El equipo la lee.</span>
        </div>
      </header>

      {estado.ok ? (
        <div className="pt-retro-gracias" role="status">
          <span className="pt-retro-check"><Icono n="check" /></span>
          <p>{estado.ok}</p>
          <button type="button" className="pt-retro-otra" onClick={() => location.reload()}>Enviar otra</button>
        </div>
      ) : (
        <form action={accion} className="pt-retro-form">
          <div className="pt-retro-tipos" role="radiogroup" aria-label="Tipo de mensaje">
            <button type="button" role="radio" aria-checked={tipo === "pregunta"}
              className={`pt-retro-tipo${tipo === "pregunta" ? " on" : ""}`} onClick={() => setTipo("pregunta")}>
              <Icono n="chat" /> Pregunta
            </button>
            <button type="button" role="radio" aria-checked={tipo === "recomendacion"}
              className={`pt-retro-tipo reco${tipo === "recomendacion" ? " on" : ""}`} onClick={() => setTipo("recomendacion")}>
              <Icono n="spark" /> Recomendación
            </button>
          </div>
          <div className="pt-retro-caja">
            <textarea name="mensaje" required minLength={5} maxLength={MAX} rows={3} value={mensaje}
              placeholder={tipo === "pregunta" ? "Ej. ¿Cómo descargo mi reporte de avance?" : "Ej. Estaría genial poder repetir un examen ya aprobado."}
              onChange={(e) => setMensaje(e.target.value)} />
            <span className={`pt-retro-cuenta${mensaje.length > MAX - 80 ? " tope" : ""}`}>{mensaje.length}/{MAX}</span>
          </div>
          {estado.error && <div className="aviso error">{estado.error}</div>}
          <div className="pt-retro-pie">
            {historial.length > 0 && (
              <button type="button" className="pt-retro-hist-btn" onClick={() => setVerHist((v) => !v)}>
                {abiertaSiempre ? `Mis mensajes (${historial.length})` : verHist ? "Ocultar mis mensajes" : `Mis mensajes (${historial.length})`}
              </button>
            )}
            <button type="submit" className="boton glow glow-halo" disabled={pendiente || mensaje.trim().length < 5}>
              {pendiente ? "Enviando…" : "Enviar"} <Icono n="arrow" />
            </button>
          </div>
        </form>
      )}

      {verHist && historial.length > 0 && (
        <ul className="pt-retro-hist">
          {historial.map((h) => (
            <li key={h.id}>
              <span className={`pt-retro-chip ${h.tipo}`}>{h.tipo === "pregunta" ? "Pregunta" : "Recomendación"}</span>
              {/* Texto plano SIEMPRE — React escapa; jamás HTML del usuario */}
              <p>{h.mensaje}</p>
              <small>{h.fecha} · {h.estado === "atendida" ? "✓ atendida" : "recibida"}</small>
              {h.respuesta && (
                <div className="pt-retro-resp">
                  <b><Icono n="check" /> Respuesta del equipo{h.respondidoEl ? ` · ${h.respondidoEl}` : ""}</b>
                  <p>{h.respuesta}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
