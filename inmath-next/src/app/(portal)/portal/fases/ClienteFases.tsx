"use client";
import { useActionState, useState } from "react";
import { Icono } from "@/components/Icono";
import { iniciarExamenFaseAccion, calificarExamenFaseAccion, type EstadoCalificarFase } from "./actions";

type FaseRecurso = { id: number; tipo: string; titulo: string; url: string };
type FaseExamenEstado = { examenId: number; titulo: string; aprobado: boolean; mejorPorcentaje: number | null };
type FaseConEstado = {
  id: number; titulo: string; descripcion: string | null; porcentajeMinimo: number;
  desbloqueada: boolean; aprobada: boolean; recursos: FaseRecurso[]; examenes: FaseExamenEstado[];
};
type LecturaAdjunto = { id: number; tipo: string; nombre: string; url: string };
type ReactivoParaAlumno = {
  id: number; tema: string | null; enunciado: string; opciones: string[];
  adjuntoUrl: string | null; adjuntoTipo: string | null; lectura: LecturaAdjunto | null;
};
type ResultadoIntento = EstadoCalificarFase["resultado"];

/** Material de lectura (imagen/video/documento) compartido por un rango de
 *  preguntas — se muestra una sola vez, antes de la primera pregunta que lo usa. */
function BloqueLectura({ lectura }: { lectura: LecturaAdjunto }) {
  return (
    <div className="pt-practica-lectura">
      {lectura.tipo === "imagen" && <img src={lectura.url} alt="" />}
      {lectura.tipo === "video" && <video controls src={lectura.url} />}
      {lectura.tipo === "documento" && (
        <a href={lectura.url} target="_blank" rel="noopener"><Icono n="file" /> {lectura.nombre}</a>
      )}
    </div>
  );
}

/** Adjunto propio de una pregunta (p. ej. un diagrama), distinto de la lectura compartida. */
function AdjuntoPregunta({ url, tipo }: { url: string; tipo: string | null }) {
  if (tipo === "imagen" || /\.(png|jpe?g|webp|gif)$/i.test(url)) {
    return <img className="pt-practica-pregunta-img" src={url} alt="" />;
  }
  if (tipo === "video" || /\.mp4$/i.test(url)) {
    return <video className="pt-practica-pregunta-img" controls src={url} />;
  }
  return <a className="pt-practica-pregunta-archivo" href={url} target="_blank" rel="noopener"><Icono n="file" /> Ver material</a>;
}

function urlEmbebible(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

function RecursoTarjeta({ recurso }: { recurso: FaseRecurso }) {
  if (recurso.tipo === "documento") {
    return (
      <a className="pt-mat-archivo" href={recurso.url} target="_blank" rel="noopener">
        <Icono n="download" /> {recurso.titulo}
      </a>
    );
  }
  if (recurso.tipo === "video_archivo") {
    return (
      <div className="fase-video">
        <b className="fase-video-titulo">{recurso.titulo}</b>
        <video controls src={recurso.url} style={{ width: "100%", borderRadius: 12 }} />
      </div>
    );
  }
  const embed = urlEmbebible(recurso.url);
  return (
    <div className="fase-video">
      <b className="fase-video-titulo">{recurso.titulo}</b>
      {embed ? (
        <div className="fase-video-embed">
          <iframe src={embed} title={recurso.titulo} allowFullScreen style={{ width: "100%", aspectRatio: "16/9", border: 0, borderRadius: 12 }} />
        </div>
      ) : (
        <a className="pt-mat-archivo" href={recurso.url} target="_blank" rel="noopener"><Icono n="video" /> Ver video</a>
      )}
    </div>
  );
}

/** Resuelve el examen de una fase, en orden — mismo estilo visual que /portal/practica. */
function PantallaResolverExamen({ faseId, examenId, reactivos, onCalificado, onCancelar }: {
  faseId: number; examenId: number; reactivos: ReactivoParaAlumno[];
  onCalificado: (r: NonNullable<ResultadoIntento>, fases: FaseConEstado[]) => void; onCancelar: () => void;
}) {
  const [respuestas, setRespuestas] = useState<Record<number, number>>({});
  const [, accion, pendiente] = useActionState<EstadoCalificarFase, FormData>(async (prev, fd) => {
    const r = await calificarExamenFaseAccion(prev, fd);
    if (r.resultado && r.fases) onCalificado(r.resultado, r.fases);
    return r;
  }, {});
  const contestadas = Object.keys(respuestas).length;

  return (
    <form
      action={(fd) => {
        fd.set("fase_id", String(faseId));
        fd.set("examen_id", String(examenId));
        fd.set("respuestas", JSON.stringify(reactivos.map((r) => ({ reactivo_id: r.id, respuesta_dada: respuestas[r.id] ?? null }))));
        accion(fd);
      }}
      className="pt-practica-resolver"
    >
      <div className="pt-practica-progreso">{contestadas} de {reactivos.length} contestadas</div>
      {reactivos.map((r, i) => (
        <div key={r.id}>
          {r.lectura && r.lectura.id !== (reactivos[i - 1]?.lectura?.id ?? null) && <BloqueLectura lectura={r.lectura} />}
          <div className="pt-practica-pregunta">
            <b>{i + 1}. {r.enunciado}</b>
            {r.adjuntoUrl && <AdjuntoPregunta url={r.adjuntoUrl} tipo={r.adjuntoTipo} />}
            <div className="pt-practica-opciones">
              {r.opciones.map((op, oi) => (
                <button key={oi} type="button" role="radio" aria-checked={respuestas[r.id] === oi}
                  className={`pt-practica-opcion${respuestas[r.id] === oi ? " sel" : ""}`}
                  onClick={() => setRespuestas((prev) => ({ ...prev, [r.id]: oi }))}>
                  <span className="pt-practica-punto" aria-hidden="true" />
                  {op}
                </button>
              ))}
            </div>
          </div>
        </div>
      ))}
      <div className="pt-practica-acciones">
        <button type="button" className="boton fantasma" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="boton glow grande" disabled={pendiente}>
          {pendiente ? "Calificando…" : "Calificar"} <Icono n="check" />
        </button>
      </div>
    </form>
  );
}

function PantallaResultadoExamen({ resultado, porcentajeMinimo, onVolver }: {
  resultado: NonNullable<ResultadoIntento>; porcentajeMinimo: number; onVolver: () => void;
}) {
  const aprobo = resultado.porcentaje >= porcentajeMinimo;
  return (
    <div className="pt-practica-resultado">
      <div className={`pt-practica-score ${aprobo ? "bien" : resultado.porcentaje >= 40 ? "regular" : "bajo"}`}>
        <b>{resultado.porcentaje}%</b>
        <span>{resultado.correctas} de {resultado.total} correctas</span>
      </div>
      <div className={`aviso ${aprobo ? "ok" : "error"}`}>
        {aprobo
          ? "¡Aprobado! Si esta fase no necesita más exámenes, ya se desbloqueó la siguiente."
          : `Necesitas al menos ${porcentajeMinimo}% para aprobar esta fase. Puedes intentarlo de nuevo.`}
      </div>
      <div className="pt-practica-revision">
        {resultado.detalle.map((d, i) => (
          <div key={d.reactivo_id}>
            {d.lectura && d.lectura.id !== (resultado.detalle[i - 1]?.lectura?.id ?? null) && <BloqueLectura lectura={d.lectura} />}
            <div className={`pt-practica-pregunta rev ${d.correcta ? "ok" : "mal"}`}>
              <b>{i + 1}. {d.enunciado}</b>
              {d.adjuntoUrl && <AdjuntoPregunta url={d.adjuntoUrl} tipo={d.adjuntoTipo} />}
              <div className="pt-practica-opciones">
                {d.opciones.map((op, oi) => (
                  <div key={oi} className={`pt-practica-opcion estatica${oi === d.respuesta_correcta ? " correcta" : ""}${oi === d.respuesta_dada && oi !== d.respuesta_correcta ? " incorrecta" : ""}`}>
                    {op}
                  </div>
                ))}
              </div>
              {d.explicacion && <p className="pt-practica-explicacion">{d.explicacion}</p>}
            </div>
          </div>
        ))}
      </div>
      <button className="boton glow bloque grande" onClick={onVolver}>Volver a la fase <Icono n="arrow" /></button>
    </div>
  );
}

export function ClienteFases({ fasesIniciales }: { fasesIniciales: FaseConEstado[] }) {
  const [fases, setFases] = useState(fasesIniciales);
  const [vista, setVista] = useState<
    | { n: "lista" }
    | { n: "resolver"; faseId: number; examenId: number; reactivos: ReactivoParaAlumno[]; porcentajeMinimo: number }
    | { n: "resultado"; resultado: NonNullable<ResultadoIntento>; porcentajeMinimo: number }
  >({ n: "lista" });

  if (vista.n === "resolver") {
    return (
      <div className="pt-practica pt-rev" style={{ ["--d" as string]: "80ms" }}>
        <div className="tarjeta-form">
          <PantallaResolverExamen
            faseId={vista.faseId} examenId={vista.examenId} reactivos={vista.reactivos}
            onCalificado={(resultado, fasesNuevas) => { setFases(fasesNuevas); setVista({ n: "resultado", resultado, porcentajeMinimo: vista.porcentajeMinimo }); }}
            onCancelar={() => setVista({ n: "lista" })}
          />
        </div>
      </div>
    );
  }
  if (vista.n === "resultado") {
    return (
      <div className="pt-practica pt-rev" style={{ ["--d" as string]: "80ms" }}>
        <div className="tarjeta-form">
          <PantallaResultadoExamen resultado={vista.resultado} porcentajeMinimo={vista.porcentajeMinimo} onVolver={() => setVista({ n: "lista" })} />
        </div>
      </div>
    );
  }

  return (
    <div className="fase-lista pt-rev" style={{ ["--d" as string]: "80ms" }}>
      {fases.map((f) => (
        <FaseTarjetaConectada key={f.id} fase={f} setVista={setVista} />
      ))}
    </div>
  );
}

function FaseTarjetaConectada({ fase, setVista }: {
  fase: FaseConEstado;
  setVista: (v: { n: "resolver"; faseId: number; examenId: number; reactivos: ReactivoParaAlumno[]; porcentajeMinimo: number }) => void;
}) {
  const [abierta, setAbierta] = useState(fase.desbloqueada && !fase.aprobada);

  if (!fase.desbloqueada) {
    return (
      <div className="fase-tarjeta fase-bloqueada">
        <Icono n="lock" />
        <div>
          <b>{fase.titulo}</b>
          <span>Aprueba la fase anterior para desbloquear esta.</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`fase-tarjeta${fase.aprobada ? " fase-aprobada" : ""}`}>
      <button type="button" className="fase-tarjeta-cab" onClick={() => setAbierta((a) => !a)}>
        <div>
          <b>{fase.titulo}</b>
          {fase.descripcion && <span>{fase.descripcion}</span>}
        </div>
        {fase.aprobada && <span className="fase-chip-ok"><Icono n="check" /> Aprobada</span>}
        <Icono n="chevron" cls={abierta ? "fase-chevron abierto" : "fase-chevron"} />
      </button>
      {abierta && (
        <div className="fase-tarjeta-cuerpo">
          {fase.recursos.length > 0 && (
            <div className="fase-recursos">
              {fase.recursos.map((r) => <RecursoTarjeta key={r.id} recurso={r} />)}
            </div>
          )}
          {fase.examenes.length > 0 && (
            <div className="fase-examenes">
              <h3>Examen para pasar de fase</h3>
              {fase.examenes.map((examen) => (
                <FilaExamenReal key={examen.examenId} fase={fase} examen={examen} setVista={setVista} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FilaExamenReal({ fase, examen, setVista }: {
  fase: FaseConEstado; examen: FaseExamenEstado;
  setVista: (v: { n: "resolver"; faseId: number; examenId: number; reactivos: ReactivoParaAlumno[]; porcentajeMinimo: number }) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pendiente, setPendiente] = useState(false);
  return (
    <div className="fase-examen-fila">
      <div>
        <b>{examen.titulo}</b>
        <span className="fase-examen-estado">
          {examen.aprobado ? `Aprobado — ${examen.mejorPorcentaje}%` : examen.mejorPorcentaje !== null ? `Tu mejor intento: ${examen.mejorPorcentaje}% (necesitas ${fase.porcentajeMinimo}%)` : `Necesitas ${fase.porcentajeMinimo}% para aprobar`}
        </span>
      </div>
      <button type="button" className={`boton mini ${examen.aprobado ? "fantasma" : "glow"}`} disabled={pendiente}
        onClick={async () => {
          setPendiente(true); setError(null);
          const fd = new FormData();
          fd.set("fase_id", String(fase.id));
          fd.set("examen_id", String(examen.examenId));
          const r = await iniciarExamenFaseAccion({}, fd);
          setPendiente(false);
          if (r.error) setError(r.error);
          else if (r.reactivos) setVista({ n: "resolver", faseId: fase.id, examenId: examen.examenId, reactivos: r.reactivos, porcentajeMinimo: fase.porcentajeMinimo });
        }}>
        {pendiente ? "Preparando…" : examen.aprobado ? "Presentar de nuevo" : "Presentar examen"}
      </button>
      {error && <div className="aviso error" style={{ marginTop: 8, width: "100%" }}>{error}</div>}
    </div>
  );
}
