"use client";
import { useActionState, useState } from "react";
import { Icono } from "@/components/Icono";
import { iniciarPracticaAccion, calificarPracticaAccion, type EstadoIniciar, type EstadoCalificar } from "./actions";

type ReactivoParaAlumno = { id: number; tema: string | null; enunciado: string; opciones: string[] };
type IntentoHistorial = { id: number; tema: string | null; total: number; correctas: number; porcentaje: number; fecha: Date };
type ResultadoIntento = EstadoCalificar["resultado"];

const CANTIDADES = [5, 10, 15, 20];

function fechaCorta(d: Date): string {
  const f = new Date(d);
  return `${String(f.getUTCDate()).padStart(2, "0")}/${String(f.getUTCMonth() + 1).padStart(2, "0")}/${f.getUTCFullYear()}`;
}

/** Paso 1: elegir tema y cantidad de preguntas. */
function PantallaElegir({ temas, onListo }: { temas: string[]; onListo: (r: ReactivoParaAlumno[], tema: string | null) => void }) {
  const [estado, setEstado] = useState<EstadoIniciar>({});
  const [pendiente, setPendiente] = useState(false);

  return (
    <form
      action={async (fd) => {
        setPendiente(true);
        const r = await iniciarPracticaAccion({}, fd);
        setPendiente(false);
        setEstado(r);
        if (r.reactivos) onListo(r.reactivos, r.tema ?? null);
      }}
      className="pt-practica-elegir"
    >
      <label className="pt-practica-campo">
        <span>Tema</span>
        <select name="tema" defaultValue="">
          <option value="">Todos los temas</option>
          {temas.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>
      <label className="pt-practica-campo">
        <span>Número de preguntas</span>
        <select name="cantidad" defaultValue={10}>
          {CANTIDADES.map((n) => <option key={n} value={n}>{n} preguntas</option>)}
        </select>
      </label>
      <button className="boton glow bloque grande" type="submit" disabled={pendiente}>
        {pendiente ? "Preparando…" : "Comenzar práctica"} <Icono n="arrow" />
      </button>
      {estado.error && <div className="aviso error" style={{ marginTop: 10 }}>{estado.error}</div>}
    </form>
  );
}

/** Paso 2: resolver — todas las preguntas en una sola pantalla con scroll. */
function PantallaResolver({ reactivos, tema, onCalificado, onCancelar }: {
  reactivos: ReactivoParaAlumno[]; tema: string | null;
  onCalificado: (r: ResultadoIntento) => void; onCancelar: () => void;
}) {
  const [respuestas, setRespuestas] = useState<Record<number, number>>({});
  const [, accion, pendiente] = useActionState<EstadoCalificar, FormData>(async (prev, fd) => {
    const r = await calificarPracticaAccion(prev, fd);
    if (r.resultado) onCalificado(r.resultado);
    return r;
  }, {});
  const contestadas = Object.keys(respuestas).length;

  return (
    <form
      action={(fd) => {
        fd.set("tema", tema ?? "");
        fd.set("respuestas", JSON.stringify(reactivos.map((r) => ({ reactivo_id: r.id, respuesta_dada: respuestas[r.id] ?? null }))));
        accion(fd);
      }}
      className="pt-practica-resolver"
    >
      <div className="pt-practica-progreso">{contestadas} de {reactivos.length} contestadas</div>
      {reactivos.map((r, i) => (
        <div className="pt-practica-pregunta" key={r.id}>
          <b>{i + 1}. {r.enunciado}</b>
          <div className="pt-practica-opciones">
            {r.opciones.map((op, oi) => (
              <label key={oi} className={`pt-practica-opcion${respuestas[r.id] === oi ? " sel" : ""}`}>
                <input type="radio" name={`r-${r.id}`} checked={respuestas[r.id] === oi}
                  onChange={() => setRespuestas((prev) => ({ ...prev, [r.id]: oi }))} />
                {op}
              </label>
            ))}
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

/** Paso 3: resultado — puntaje + revisión de cada pregunta. */
function PantallaResultado({ resultado, onOtraVez }: { resultado: NonNullable<ResultadoIntento>; onOtraVez: () => void }) {
  return (
    <div className="pt-practica-resultado">
      <div className={`pt-practica-score ${resultado.porcentaje >= 70 ? "bien" : resultado.porcentaje >= 40 ? "regular" : "bajo"}`}>
        <b>{resultado.porcentaje}%</b>
        <span>{resultado.correctas} de {resultado.total} correctas</span>
      </div>
      <div className="pt-practica-revision">
        {resultado.detalle.map((d, i) => (
          <div key={d.reactivo_id} className={`pt-practica-pregunta rev ${d.correcta ? "ok" : "mal"}`}>
            <b>{i + 1}. {d.enunciado}</b>
            <div className="pt-practica-opciones">
              {d.opciones.map((op, oi) => (
                <div key={oi} className={`pt-practica-opcion estatica${oi === d.respuesta_correcta ? " correcta" : ""}${oi === d.respuesta_dada && oi !== d.respuesta_correcta ? " incorrecta" : ""}`}>
                  {op}
                </div>
              ))}
            </div>
            {d.explicacion && <p className="pt-practica-explicacion">{d.explicacion}</p>}
          </div>
        ))}
      </div>
      <button className="boton glow bloque grande" onClick={onOtraVez}>Practicar de nuevo <Icono n="arrow" /></button>
    </div>
  );
}

function Historial({ historial }: { historial: IntentoHistorial[] }) {
  if (historial.length === 0) return null;
  return (
    <div className="pt-practica-historial">
      <h2>Tu historial</h2>
      <table className="pt-practica-tabla">
        <thead><tr><th>Fecha</th><th>Tema</th><th>Preguntas</th><th>Resultado</th></tr></thead>
        <tbody>
          {historial.map((h) => (
            <tr key={h.id}>
              <td>{fechaCorta(h.fecha)}</td>
              <td>{h.tema ?? "Todos"}</td>
              <td>{h.total}</td>
              <td><b className={h.porcentaje >= 70 ? "bien" : h.porcentaje >= 40 ? "regular" : "bajo"}>{h.porcentaje}%</b> ({h.correctas}/{h.total})</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ClientePractica({ temas, historialInicial }: { temas: string[]; historialInicial: IntentoHistorial[] }) {
  const [paso, setPaso] = useState<
    | { n: "elegir" }
    | { n: "resolver"; reactivos: ReactivoParaAlumno[]; tema: string | null }
    | { n: "resultado"; resultado: NonNullable<ResultadoIntento> }
  >({ n: "elegir" });
  const [historial, setHistorial] = useState(historialInicial);

  return (
    <div className="pt-practica pt-rev" style={{ ["--d" as string]: "80ms" }}>
      <div className="tarjeta-form">
        {paso.n === "elegir" && (
          <PantallaElegir temas={temas} onListo={(reactivos, tema) => setPaso({ n: "resolver", reactivos, tema })} />
        )}
        {paso.n === "resolver" && (
          <PantallaResolver
            reactivos={paso.reactivos} tema={paso.tema}
            onCalificado={(resultado) => {
              if (!resultado) return;
              setHistorial((prev) => [{ id: resultado.intentoId, tema: paso.tema, total: resultado.total, correctas: resultado.correctas, porcentaje: resultado.porcentaje, fecha: new Date() }, ...prev]);
              setPaso({ n: "resultado", resultado });
            }}
            onCancelar={() => setPaso({ n: "elegir" })}
          />
        )}
        {paso.n === "resultado" && (
          <PantallaResultado resultado={paso.resultado} onOtraVez={() => setPaso({ n: "elegir" })} />
        )}
      </div>
      {paso.n === "elegir" && <Historial historial={historial} />}
    </div>
  );
}
