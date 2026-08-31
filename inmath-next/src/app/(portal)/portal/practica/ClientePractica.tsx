"use client";
import { useActionState, useState } from "react";
import { Icono } from "@/components/Icono";
import { iniciarPracticaAccion, calificarPracticaAccion, type EstadoIniciar, type EstadoCalificar } from "./actions";

type ReactivoParaAlumno = { id: number; tema: string | null; enunciado: string; opciones: string[] };
type IntentoHistorial = {
  id: number; tema: string | null; examenTitulo: string | null; total: number; correctas: number; porcentaje: number; fecha: Date;
};
type ExamenDisponible = { id: number; titulo: string; totalPreguntas: number };
type ResultadoIntento = EstadoCalificar["resultado"];

const CANTIDADES_BASE = [5, 10, 15, 20];

/** Botones de cantidad según lo que de verdad hay disponible: los presets que
 *  quepan, más siempre un botón para verlas todas. */
function opcionesCantidad(total: number): { valor: string; nombre: string }[] {
  const presets = CANTIDADES_BASE.filter((n) => n < total).map((n) => ({ valor: String(n), nombre: String(n) }));
  return [...presets, { valor: "todas", nombre: total > 0 ? `Todas (${total})` : "Todas" }];
}

/** Desplegable propio (reemplaza <select>): botón + lista flotante. */
function PtDesplegable({ opciones, valor, onChange, placeholder }: {
  opciones: { valor: string; nombre: string }[]; valor: string; onChange: (v: string) => void; placeholder: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const actual = opciones.find((o) => o.valor === valor)?.nombre ?? placeholder;
  return (
    <div className="pt-desp" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setAbierto(false); }}>
      <button type="button" className="pt-desp-btn" onClick={() => setAbierto((a) => !a)} aria-haspopup="listbox" aria-expanded={abierto}>
        <span>{actual}</span>
        <Icono n="chevron" />
      </button>
      {abierto && (
        <div className="pt-desp-lista" role="listbox">
          <button type="button" role="option" aria-selected={valor === ""} className={`pt-desp-op${valor === "" ? " on" : ""}`}
            onClick={() => { onChange(""); setAbierto(false); }}>{placeholder}</button>
          {opciones.map((o) => (
            <button key={o.valor} type="button" role="option" aria-selected={valor === o.valor}
              className={`pt-desp-op${valor === o.valor ? " on" : ""}`}
              onClick={() => { onChange(o.valor); setAbierto(false); }}>
              {o.nombre}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function fechaCorta(d: Date): string {
  const f = new Date(d);
  return `${String(f.getUTCDate()).padStart(2, "0")}/${String(f.getUTCMonth() + 1).padStart(2, "0")}/${f.getUTCFullYear()}`;
}

/** Paso 1: elegir tema O examen, y cuántas preguntas. Tema y examen son
 *  excluyentes — elegir uno limpia el otro, porque son dos formas distintas
 *  de armar el mismo tipo de sesión de práctica. */
function PantallaElegir({ temas, examenes, conteos, onListo }: {
  temas: string[]; examenes: ExamenDisponible[]; conteos: Record<string, number>;
  onListo: (r: ReactivoParaAlumno[], tema: string | null, examenId: number | null) => void;
}) {
  const [estado, setEstado] = useState<EstadoIniciar>({});
  const [pendiente, setPendiente] = useState(false);
  const [tema, setTema] = useState("");
  const [examenId, setExamenId] = useState("");
  const [cantidad, setCantidad] = useState("10");

  const examenElegido = examenes.find((e) => String(e.id) === examenId) ?? null;
  const totalDisponible = examenElegido ? examenElegido.totalPreguntas : (conteos[tema || "__todos__"] ?? 0);
  const opciones = opcionesCantidad(totalDisponible);
  // Si el filtro cambia y la cantidad elegida ya no aparece en las opciones, vuelve al primer preset razonable.
  if (!opciones.some((o) => o.valor === cantidad) && opciones.length > 0) setCantidad(opciones[0].valor);

  return (
    <form
      action={async (fd) => {
        setPendiente(true);
        const r = await iniciarPracticaAccion({}, fd);
        setPendiente(false);
        setEstado(r);
        if (r.reactivos) onListo(r.reactivos, r.tema ?? null, r.examenId ?? null);
      }}
      className="pt-practica-elegir"
    >
      <label className="pt-practica-campo">
        <span>Tema</span>
        <PtDesplegable placeholder="Todos los temas" valor={tema} onChange={(v) => { setTema(v); if (v) setExamenId(""); }}
          opciones={temas.map((t) => ({ valor: t, nombre: t }))} />
        <input type="hidden" name="tema" value={tema} />
      </label>
      {examenes.length > 0 && (
        <label className="pt-practica-campo">
          <span>Examen <small>(en vez de un tema, resuelve un examen específico)</small></span>
          <PtDesplegable placeholder="Ninguno — usar Tema" valor={examenId} onChange={(v) => { setExamenId(v); if (v) setTema(""); }}
            opciones={examenes.map((e) => ({ valor: String(e.id), nombre: `${e.titulo} (${e.totalPreguntas})` }))} />
          <input type="hidden" name="examen_id" value={examenId} />
        </label>
      )}
      <label className="pt-practica-campo">
        <span>Número de preguntas</span>
        <div className="pt-cant-seg">
          {opciones.map((o) => (
            <button key={o.valor} type="button" className={`pt-cant-op${cantidad === o.valor ? " on" : ""}`} onClick={() => setCantidad(o.valor)}>
              {o.nombre}
            </button>
          ))}
        </div>
        <input type="hidden" name="cantidad" value={cantidad} />
      </label>
      <button className="boton glow bloque grande" type="submit" disabled={pendiente || totalDisponible === 0}>
        {pendiente ? "Preparando…" : "Comenzar práctica"} <Icono n="arrow" />
      </button>
      {estado.error && <div className="aviso error" style={{ marginTop: 10 }}>{estado.error}</div>}
    </form>
  );
}

/** Paso 2: resolver — todas las preguntas en una sola pantalla con scroll. */
function PantallaResolver({ reactivos, tema, examenId, onCalificado, onCancelar }: {
  reactivos: ReactivoParaAlumno[]; tema: string | null; examenId: number | null;
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
        fd.set("examen_id", examenId ? String(examenId) : "");
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
              <button key={oi} type="button" role="radio" aria-checked={respuestas[r.id] === oi}
                className={`pt-practica-opcion${respuestas[r.id] === oi ? " sel" : ""}`}
                onClick={() => setRespuestas((prev) => ({ ...prev, [r.id]: oi }))}>
                <span className="pt-practica-punto" aria-hidden="true" />
                {op}
              </button>
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
        {resultado.aprobado !== null && (
          <span className={`pt-practica-aprobado ${resultado.aprobado ? "si" : "no"}`}>
            {resultado.aprobado ? "Examen aprobado" : "No alcanzaste el mínimo para aprobar"}
          </span>
        )}
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
        <thead><tr><th>Fecha</th><th>Tema o examen</th><th>Preguntas</th><th>Resultado</th></tr></thead>
        <tbody>
          {historial.map((h) => (
            <tr key={h.id}>
              <td>{fechaCorta(h.fecha)}</td>
              <td>{h.examenTitulo ?? h.tema ?? "Todos"}</td>
              <td>{h.total}</td>
              <td><b className={h.porcentaje >= 70 ? "bien" : h.porcentaje >= 40 ? "regular" : "bajo"}>{h.porcentaje}%</b> ({h.correctas}/{h.total})</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ClientePractica({ temas, examenes, conteos, historialInicial }: {
  temas: string[]; examenes: ExamenDisponible[]; conteos: Record<string, number>; historialInicial: IntentoHistorial[];
}) {
  const [paso, setPaso] = useState<
    | { n: "elegir" }
    | { n: "resolver"; reactivos: ReactivoParaAlumno[]; tema: string | null; examenId: number | null }
    | { n: "resultado"; resultado: NonNullable<ResultadoIntento> }
  >({ n: "elegir" });
  const [historial, setHistorial] = useState(historialInicial);

  return (
    <div className="pt-practica pt-rev" style={{ ["--d" as string]: "80ms" }}>
      <div className="tarjeta-form">
        {paso.n === "elegir" && (
          <PantallaElegir temas={temas} examenes={examenes} conteos={conteos}
            onListo={(reactivos, tema, examenId) => setPaso({ n: "resolver", reactivos, tema, examenId })} />
        )}
        {paso.n === "resolver" && (
          <PantallaResolver
            reactivos={paso.reactivos} tema={paso.tema} examenId={paso.examenId}
            onCalificado={(resultado) => {
              if (!resultado) return;
              const examenTitulo = paso.examenId ? examenes.find((e) => e.id === paso.examenId)?.titulo ?? null : null;
              setHistorial((prev) => [{ id: resultado.intentoId, tema: paso.tema, examenTitulo, total: resultado.total, correctas: resultado.correctas, porcentaje: resultado.porcentaje, fecha: new Date() }, ...prev]);
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
