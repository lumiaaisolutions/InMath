"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { IconoPanel } from "@/components/IconoPanel";
import { Velo, ConfirmarDialogo, useToastResultado, SelectorDesplegable, BotonMagnetico, Asistente, AsistentePaso } from "../ClientePanel";
import {
  reactivoCrearAccion, reactivoActualizarAccion, reactivoActivoAccion,
  examenGuardarAccion, examenActivoAccion, examenBorrarAccion, examenModalidadesAccion,
  reactivoAdjuntoSubirAccion, type Resultado,
} from "./acciones";

type PreguntaFicha = {
  id: number; enunciado: string; opciones: string[]; opcionesTipo: ("texto" | "imagen")[]; correcta: number;
  explicacion: string; adjuntoUrl: string | null; adjuntoTipo: string | null;
};
type AdjuntoFicha = { id: number; desde: number; hasta: number; tipo: string; nombre: string; url: string };
type Examen = {
  id: number; cursoIds: number[]; cursoNombres: string[]; titulo: string; tema: string | null; activo: boolean;
  porcentajeMinimo: number; ordenAleatorio: boolean;
  preguntas: PreguntaFicha[]; adjuntos: AdjuntoFicha[];
};
type Reactivo = {
  id: number; curso_id: number; curso_nombre: string; tema: string | null;
  enunciado: string; opciones: string[]; respuesta_correcta: number;
  explicacion: string | null; activo: boolean;
};
type Curso = { id: number; nombre: string };

let contador = 0;
const nuevoId = () => `n${Date.now()}${contador++}`;

function Interruptor({ activo, onChange, etiqueta, detalle }: { activo: boolean; onChange: (v: boolean) => void; etiqueta: string; detalle?: string }) {
  return (
    <button type="button" className={`interr${activo ? " on" : ""}`} role="switch" aria-checked={activo} onClick={() => onChange(!activo)}>
      <span className="interr-sw" aria-hidden="true" />
      <span className="interr-tx"><b>{etiqueta}</b>{detalle && <i>{detalle}</i>}</span>
    </button>
  );
}

const MIN_OPCIONES = 2;
const MAX_OPCIONES = 6;

// ---------------------------------------------------------------------------
// Exámenes
// ---------------------------------------------------------------------------

type PreguntaEditable = {
  cid: string; dbId?: number; enunciado: string; opciones: string[]; opcionesTipo: ("texto" | "imagen")[]; correcta: number;
  explicacion: string; adjuntoUrl: string | null; adjuntoTipo: string | null;
};
type AdjuntoEditable = { cid: string; dbId?: number; desde: number; hasta: number; tipo: "imagen" | "video" | "documento"; nombre: string; url: string };

const preguntaVacia = (): PreguntaEditable => ({
  cid: nuevoId(), enunciado: "", opciones: ["", "", "", ""], opcionesTipo: ["texto", "texto", "texto", "texto"],
  correcta: 0, explicacion: "", adjuntoUrl: null, adjuntoTipo: null,
});

/** Una pregunta dentro del "frame" del examen — enunciado, opciones, explicación y ayuda de IA. */
function PreguntaFrame({ n, pregunta, onCambiar, onQuitar, permiteQuitar }: {
  n: number; pregunta: PreguntaEditable; onCambiar: (p: PreguntaEditable) => void; onQuitar: () => void; permiteQuitar: boolean;
}) {
  const toast = useToastResultado();
  const [explicando, setExplicando] = useState(false);
  const [subiendoOpcion, setSubiendoOpcion] = useState<number | null>(null);
  const [subiendoAdjunto, setSubiendoAdjunto] = useState(false);

  const agregarOpcion = () => {
    if (pregunta.opciones.length < MAX_OPCIONES) {
      onCambiar({ ...pregunta, opciones: [...pregunta.opciones, ""], opcionesTipo: [...pregunta.opcionesTipo, "texto"] });
    }
  };
  const quitarOpcion = (i: number) => {
    if (pregunta.opciones.length <= MIN_OPCIONES) return;
    const opciones = pregunta.opciones.filter((_, idx) => idx !== i);
    const opcionesTipo = pregunta.opcionesTipo.filter((_, idx) => idx !== i);
    let correcta = pregunta.correcta;
    if (correcta === i) correcta = 0; else if (correcta > i) correcta -= 1;
    onCambiar({ ...pregunta, opciones, opcionesTipo, correcta });
  };
  const alternarTipoOpcion = (i: number) => {
    const opcionesTipo = pregunta.opcionesTipo.map((t, idx) => (idx === i ? (t === "imagen" ? "texto" : "imagen") : t));
    const opciones = pregunta.opciones.map((o, idx) => (idx === i ? "" : o));
    onCambiar({ ...pregunta, opciones, opcionesTipo });
  };
  const subirImagenOpcion = async (i: number, archivo: File) => {
    setSubiendoOpcion(i);
    try {
      const fd = new FormData();
      fd.set("archivo", archivo);
      const r = await reactivoAdjuntoSubirAccion(fd);
      if (r.error) toast({ error: r.error });
      else if (r.ok) onCambiar({ ...pregunta, opciones: pregunta.opciones.map((o, idx) => (idx === i ? r.ok!.url : o)) });
    } catch {
      toast({ error: "No pudimos subir la imagen — intenta de nuevo" });
    } finally {
      setSubiendoOpcion(null);
    }
  };
  const subirAdjuntoPregunta = async (archivo: File) => {
    setSubiendoAdjunto(true);
    try {
      const fd = new FormData();
      fd.set("archivo", archivo);
      const r = await reactivoAdjuntoSubirAccion(fd);
      if (r.error) toast({ error: r.error });
      else if (r.ok) onCambiar({ ...pregunta, adjuntoUrl: r.ok.url, adjuntoTipo: r.ok.tipo });
    } catch {
      toast({ error: "No pudimos subir el archivo — intenta de nuevo" });
    } finally {
      setSubiendoAdjunto(false);
    }
  };
  /** Pide la explicación a Ollama y va pegando el texto según llega (streaming) —
   *  así se ve avance de inmediato en vez de un botón "Pensando…" congelado. */
  const explicarConIA = async () => {
    setExplicando(true);
    onCambiar({ ...pregunta, explicacion: "" });
    try {
      const res = await fetch("/api/reactivos/explicar-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enunciado: pregunta.enunciado, opciones: pregunta.opciones, correcta: pregunta.correcta }),
      });
      if (!res.ok || !res.body) {
        const mensaje = await res.text().catch(() => "");
        toast({ error: mensaje || "No pudimos contactar a la IA. Intenta de nuevo en unos segundos." });
        return;
      }
      const lector = res.body.getReader();
      const decodificador = new TextDecoder();
      let acumulado = "";
      while (true) {
        const { done, value } = await lector.read();
        if (done) break;
        acumulado += decodificador.decode(value, { stream: true });
        onCambiar({ ...pregunta, explicacion: acumulado });
      }
      toast({ ok: "Sugerencia de la IA lista — revísala antes de guardar." });
    } catch {
      toast({ error: "No pudimos contactar a la IA. Intenta de nuevo en unos segundos." });
    } finally {
      setExplicando(false);
    }
  };

  return (
    <div className="tarjeta rx-pregunta-item">
      <div className="mat-item-cab">
        <span className="mat-item-num">Pregunta {n}</span>
        {permiteQuitar && (
          <button type="button" className="mat-item-borrar" onClick={onQuitar}><IconoPanel n="x" cls="ic-sm" /> Quitar</button>
        )}
      </div>
      <label className="pl-campo">Enunciado
        <textarea rows={2} value={pregunta.enunciado} placeholder="Escribe la pregunta…" onChange={(e) => onCambiar({ ...pregunta, enunciado: e.target.value })} />
      </label>
      <div className="pl-campo">
        <span>Material de la pregunta <small>(opcional — una imagen o archivo que acompaña el enunciado)</small></span>
        {pregunta.adjuntoUrl ? (
          <div className="rx-pregunta-adjunto">
            {pregunta.adjuntoTipo === "imagen"
              ? <img src={pregunta.adjuntoUrl} alt="" />
              : <span className="rx-pregunta-adjunto-nombre"><IconoPanel n="prompts" cls="ic-sm" /> {pregunta.adjuntoTipo}</span>}
            <button type="button" className="mat-quitar" aria-label="Quitar material" onClick={() => onCambiar({ ...pregunta, adjuntoUrl: null, adjuntoTipo: null })}>
              <IconoPanel n="x" cls="ic-sm" />
            </button>
          </div>
        ) : (
          <label className="mat-dropzone">
            <input type="file" hidden accept=".jpg,.jpeg,.png,.webp,.mp4,.pdf"
              onChange={(e) => { if (e.target.files?.[0]) subirAdjuntoPregunta(e.target.files[0]); e.target.value = ""; }} />
            <IconoPanel n="prompts" cls="ic-sm" />
            <span>{subiendoAdjunto ? "Subiendo…" : "Elige una imagen o archivo"}</span>
          </label>
        )}
      </div>
      <div className="pl-campo">
        <span>Opciones — marca cuál es la correcta</span>
        {pregunta.opciones.map((op, i) => (
          <div key={i} className="rx-opcion">
            <button type="button" className={`rx-correcta${pregunta.correcta === i ? " on" : ""}`}
              onClick={() => onCambiar({ ...pregunta, correcta: i })} aria-pressed={pregunta.correcta === i} aria-label={`Opción ${i + 1} es la correcta`}>
              {pregunta.correcta === i && <IconoPanel n="check" cls="ic-sm" />}
            </button>
            {pregunta.opcionesTipo[i] === "imagen" ? (
              op ? (
                <span className="rx-opcion-imagen">
                  <img src={op} alt="" />
                  <button type="button" className="mat-quitar" aria-label="Quitar imagen" onClick={() => onCambiar({ ...pregunta, opciones: pregunta.opciones.map((o, idx) => (idx === i ? "" : o)) })}>
                    <IconoPanel n="x" cls="ic-sm" />
                  </button>
                </span>
              ) : (
                <label className="rx-opcion-subir">
                  <input type="file" hidden accept=".jpg,.jpeg,.png,.webp"
                    onChange={(e) => { if (e.target.files?.[0]) subirImagenOpcion(i, e.target.files[0]); e.target.value = ""; }} />
                  {subiendoOpcion === i ? "Subiendo…" : "Elige una imagen"}
                </label>
              )
            ) : (
              <input type="text" value={op} placeholder={`Opción ${i + 1}`}
                onChange={(e) => onCambiar({ ...pregunta, opciones: pregunta.opciones.map((o, idx) => (idx === i ? e.target.value : o)) })} />
            )}
            <button type="button" className={`rx-opcion-tipo${pregunta.opcionesTipo[i] === "imagen" ? " on" : ""}`}
              title={pregunta.opcionesTipo[i] === "imagen" ? "Usar texto en vez de imagen" : "Usar una imagen como esta opción"}
              onClick={() => alternarTipoOpcion(i)}>
              <IconoPanel n="imagen" cls="ic-sm" />
            </button>
            {pregunta.opciones.length > MIN_OPCIONES && (
              <button type="button" className="rx-quitar" aria-label="Quitar opción" onClick={() => quitarOpcion(i)}><IconoPanel n="x" /></button>
            )}
          </div>
        ))}
        {pregunta.opciones.length < MAX_OPCIONES && (
          <button type="button" className="boton mini fantasma" onClick={agregarOpcion} style={{ marginTop: 6 }}>+ Agregar opción</button>
        )}
      </div>
      <label className="pl-campo">Explicación <small>(se muestra al alumno al calificar)</small>
        <textarea rows={4} value={pregunta.explicacion} placeholder="Por qué esa opción es la correcta…" onChange={(e) => onCambiar({ ...pregunta, explicacion: e.target.value })} />
      </label>
      <button type="button" className="boton mini fantasma rx-ia" disabled={explicando || !pregunta.enunciado.trim()} onClick={explicarConIA}>
        <IconoPanel n="chispa" cls="ic-sm" /> {explicando ? "Pensando…" : "Explicar con IA"}
      </button>
    </div>
  );
}

/** Material de apoyo (imagen/video/documento) para un rango de preguntas del examen. */
function AdjuntosExamen({ totalPreguntas, adjuntos, onAgregar, onQuitar }: {
  totalPreguntas: number; adjuntos: AdjuntoEditable[]; onAgregar: (a: AdjuntoEditable) => void; onQuitar: (cid: string) => void;
}) {
  const toast = useToastResultado();
  const [desde, setDesde] = useState("1");
  const [hasta, setHasta] = useState("1");
  const [subiendo, setSubiendo] = useState(false);
  const opcionesPregunta = Array.from({ length: totalPreguntas }, (_, i) => ({ valor: String(i + 1), nombre: `Pregunta ${i + 1}` }));

  const subirTodos = async (files: FileList) => {
    setSubiendo(true);
    try {
      for (const f of Array.from(files)) {
        try {
          const fd = new FormData();
          fd.set("archivo", f);
          const r = await reactivoAdjuntoSubirAccion(fd);
          if (r.error) toast({ error: `"${f.name}": ${r.error}` });
          else if (r.ok) {
            const d = Math.min(parseInt(desde, 10) || 1, totalPreguntas);
            const h = Math.max(parseInt(hasta, 10) || 1, d);
            onAgregar({ cid: nuevoId(), desde: d, hasta: h, tipo: r.ok.tipo as AdjuntoEditable["tipo"], nombre: r.ok.nombre, url: r.ok.url });
          }
        } catch {
          toast({ error: `No pudimos subir "${f.name}" — intenta de nuevo` });
        }
      }
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="pl-campo ancho rx-adjuntos">
      <span>Material de apoyo por rango de preguntas <small>(opcional — imagen, video o documento)</small></span>
      {adjuntos.length > 0 && (
        <ul className="mat-archivos-lista">
          {adjuntos.map((a) => (
            <li key={a.cid}>
              <IconoPanel n="prompts" cls="ic-sm" />
              <span className="mat-archivo-nombre">{a.nombre} <small>— {a.desde === a.hasta ? `pregunta ${a.desde}` : `preguntas ${a.desde}–${a.hasta}`}</small></span>
              <button type="button" className="mat-quitar" aria-label="Quitar adjunto" onClick={() => onQuitar(a.cid)}><IconoPanel n="x" cls="ic-sm" /></button>
            </li>
          ))}
        </ul>
      )}
      <div className="rx-adjunto-rango">
        <SelectorDesplegable sinVacio placeholder="Desde" valor={desde} opciones={opcionesPregunta} onChange={setDesde} />
        <span>a</span>
        <SelectorDesplegable sinVacio placeholder="Hasta" valor={hasta} opciones={opcionesPregunta} onChange={setHasta} />
      </div>
      <label className="mat-dropzone">
        <input type="file" multiple hidden accept=".jpg,.jpeg,.png,.webp,.mp4,.pdf"
          onChange={(e) => { if (e.target.files?.length) subirTodos(e.target.files); e.target.value = ""; }} />
        <IconoPanel n="prompts" cls="ic-sm" />
        <span>{subiendo ? "Subiendo…" : "Elige uno o varios archivos para ese rango"}</span>
      </label>
    </div>
  );
}

const PASOS_EXAMEN = [
  { titulo: "Datos del examen", sub: "Título, tema, calificación mínima y orden" },
  { titulo: "Preguntas", sub: "Cada una con sus opciones y explicación" },
  { titulo: "Adjuntos", sub: "Material de apoyo opcional" },
];

/** Formulario completo de un examen — datos generales + lista de preguntas + adjuntos, en pasos. */
function ExamenFrame({ cursos, editar, onListo, onCerrar }: { cursos: Curso[]; editar: Examen | null; onListo: () => void; onCerrar: () => void }) {
  const toast = useToastResultado();
  const [paso, setPaso] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const [cursoIds, setCursoIds] = useState<number[]>(editar?.cursoIds ?? (cursos[0] ? [cursos[0].id] : []));
  const [titulo, setTitulo] = useState(editar?.titulo ?? "");
  const [tema, setTema] = useState(editar?.tema ?? "");
  const [porcentajeMinimo, setPorcentajeMinimo] = useState(String(editar?.porcentajeMinimo ?? 70));
  const [ordenAleatorio, setOrdenAleatorio] = useState(editar?.ordenAleatorio ?? true);
  const [preguntas, setPreguntas] = useState<PreguntaEditable[]>(
    editar?.preguntas.length
      ? editar.preguntas.map((p) => ({
          cid: nuevoId(), dbId: p.id, enunciado: p.enunciado, opciones: p.opciones, opcionesTipo: p.opcionesTipo,
          correcta: p.correcta, explicacion: p.explicacion, adjuntoUrl: p.adjuntoUrl, adjuntoTipo: p.adjuntoTipo,
        }))
      : [preguntaVacia()],
  );
  const [adjuntos, setAdjuntos] = useState<AdjuntoEditable[]>(
    editar?.adjuntos.map((a) => ({ cid: nuevoId(), dbId: a.id, desde: a.desde, hasta: a.hasta, tipo: a.tipo as AdjuntoEditable["tipo"], nombre: a.nombre, url: a.url })) ?? [],
  );

  const [, accion, pendiente] = useActionState<Resultado, FormData>(async (prev) => {
    const fd = new FormData();
    fd.set("curso_ids", JSON.stringify(cursoIds));
    fd.set("titulo", titulo);
    fd.set("tema", tema);
    fd.set("porcentaje_minimo", porcentajeMinimo);
    fd.set("orden_aleatorio", ordenAleatorio ? "1" : "0");
    if (editar) fd.set("examen_id", String(editar.id));
    fd.set("preguntas", JSON.stringify(preguntas.map((p) => ({
      dbId: p.dbId, enunciado: p.enunciado, opciones: p.opciones, opcionesTipo: p.opcionesTipo,
      correcta: p.correcta, explicacion: p.explicacion, adjuntoUrl: p.adjuntoUrl, adjuntoTipo: p.adjuntoTipo,
    }))));
    fd.set("adjuntos", JSON.stringify(adjuntos.map((a) => ({ dbId: a.dbId, desde: a.desde, hasta: a.hasta, tipo: a.tipo, nombre: a.nombre, url: a.url }))));
    const r = await examenGuardarAccion(prev, fd);
    toast(r);
    if (r.ok) { onListo(); setPaso(0); }
    return r;
  }, {});

  const cambiarPregunta = (cid: string, nueva: PreguntaEditable) => setPreguntas((ps) => ps.map((p) => (p.cid === cid ? nueva : p)));
  const quitarPregunta = (cid: string) => setPreguntas((ps) => (ps.length > 1 ? ps.filter((p) => p.cid !== cid) : ps));

  function cerrar() { onCerrar(); setPaso(0); }

  /** Valida solo los campos visibles del paso actual antes de avanzar. */
  function siguiente() {
    const invalido = formRef.current?.querySelector<HTMLElement>(`[data-paso="${paso}"] :invalid`);
    if (invalido) { (invalido as HTMLInputElement).reportValidity(); return; }
    setPaso((p) => p + 1);
  }

  return (
    <form action={accion} ref={formRef}>
      <Asistente pasos={PASOS_EXAMEN} activo={paso}>
        <div data-paso="0" style={{ display: paso === 0 ? "block" : "none" }}>
          <AsistentePaso eyebrow="Paso 1 de 3" titulo="Datos del examen">
            <div className="pl-campo ancho">
              <span>Modalidad(es) donde aparece <small>(el mismo examen, sin duplicar preguntas)</small></span>
              <div className="us-chips">
                {cursos.map((c) => (
                  <label key={c.id} className="chip-modulo">
                    <input type="checkbox" checked={cursoIds.includes(c.id)}
                      onChange={() => setCursoIds((ids) => ids.includes(c.id) ? ids.filter((x) => x !== c.id) : [...ids, c.id])} />
                    <span>{c.nombre}</span>
                  </label>
                ))}
              </div>
            </div>
            <label className="pl-campo">Título del examen
              <input type="text" value={titulo} placeholder="Ej. Simulacro Álgebra — bloque 1" onChange={(e) => setTitulo(e.target.value)} />
            </label>
            <label className="pl-campo">Tema <small>(opcional — agrupa también la práctica libre por bloque)</small>
              <input type="text" maxLength={120} value={tema} placeholder="Ej. Álgebra, Comprensión lectora…" onChange={(e) => setTema(e.target.value)} />
            </label>
            <label className="pl-campo">% mínimo para aprobar
              <input type="number" min={0} max={100} value={porcentajeMinimo} onChange={(e) => setPorcentajeMinimo(e.target.value)} />
            </label>
            <div className="pl-campo">
              <Interruptor activo={ordenAleatorio} onChange={setOrdenAleatorio} etiqueta="Preguntas al azar en Práctica"
                detalle={ordenAleatorio ? "El alumno las ve en orden distinto cada vez" : "El alumno las ve en el orden de arriba"} />
            </div>
          </AsistentePaso>
        </div>
        <div data-paso="1" style={{ display: paso === 1 ? "block" : "none" }}>
          <AsistentePaso eyebrow="Paso 2 de 3" titulo="Preguntas">
            <div className="pl-campo ancho">
              <div className="rx-preguntas-lista">
                {preguntas.map((p, i) => (
                  <PreguntaFrame key={p.cid} n={i + 1} pregunta={p} permiteQuitar={preguntas.length > 1}
                    onCambiar={(nueva) => cambiarPregunta(p.cid, nueva)} onQuitar={() => quitarPregunta(p.cid)} />
                ))}
              </div>
              <button type="button" className="boton fantasma" onClick={() => setPreguntas((ps) => [...ps, preguntaVacia()])} style={{ marginTop: 12 }}>+ Agregar pregunta</button>
            </div>
          </AsistentePaso>
        </div>
        <div data-paso="2" style={{ display: paso === 2 ? "block" : "none" }}>
          <AsistentePaso eyebrow="Paso 3 de 3" titulo="Adjuntos">
            <AdjuntosExamen totalPreguntas={preguntas.length} adjuntos={adjuntos}
              onAgregar={(a) => setAdjuntos((as) => [...as, a])}
              onQuitar={(cid) => setAdjuntos((as) => as.filter((a) => a.cid !== cid))} />
          </AsistentePaso>
        </div>
        <div className="us-asistente-nav">
          <button type="button" className="boton fantasma" onClick={paso === 0 ? cerrar : () => setPaso((p) => p - 1)}>
            {paso === 0 ? "Cancelar" : "Atrás"}
          </button>
          {paso < PASOS_EXAMEN.length - 1
            ? <button type="button" className="boton primario" onClick={siguiente}>Siguiente</button>
            : <BotonMagnetico type="submit" className="boton primario boton-magnetico" disabled={pendiente}>
                {pendiente ? "Guardando…" : editar ? "Guardar cambios" : "Guardar examen"}
              </BotonMagnetico>}
        </div>
      </Asistente>
    </form>
  );
}

/** Diálogo para elegir rápido en qué modalidad(es) aparece un examen, sin abrir
 *  el asistente completo — el mismo examen, sin duplicar preguntas. Cada
 *  modalidad es un switch independiente que guarda solo, sin botón aparte:
 *  se ve al instante si el examen ya aparece ahí o no. */
function ModalidadesDialogo({ abierto, examen, cursos, onCerrar }: { abierto: boolean; examen: Examen | null; cursos: Curso[]; onCerrar: () => void }) {
  const toast = useToastResultado();
  const [seleccion, setSeleccion] = useState<Set<number>>(new Set());
  const [ocupado, setOcupado] = useState<number | null>(null);

  useEffect(() => { if (examen) setSeleccion(new Set(examen.cursoIds)); }, [examen]);

  const alternar = async (id: number) => {
    if (!examen) return;
    const activando = !seleccion.has(id);
    if (!activando && seleccion.size === 1) { toast({ error: "El examen debe aparecer en al menos una modalidad" }); return; }
    const nueva = new Set(seleccion);
    if (activando) nueva.add(id); else nueva.delete(id);
    setSeleccion(nueva);
    setOcupado(id);
    const r = await examenModalidadesAccion(examen.id, Array.from(nueva));
    if (r.error) setSeleccion(seleccion); // revierte si falló
    toast(r);
    setOcupado(null);
  };

  return (
    <Velo abierto={abierto} onCerrar={onCerrar}>
      <div className="us-frame rx-modalidades-frame" role="dialog" aria-modal="true">
        <div className="us-frame-cab">
          <div className="us-quien"><b>Modalidad(es) donde aparece</b><span>{examen?.titulo} · el mismo examen, sin duplicar preguntas</span></div>
          <button type="button" className="toast-x us-cerrar" aria-label="Cerrar" onClick={onCerrar}><IconoPanel n="x" /></button>
        </div>
        <div className="rx-modalidades-lista">
          {cursos.map((c) => (
            <Interruptor key={c.id} activo={seleccion.has(c.id)} etiqueta={c.nombre}
              onChange={() => { if (ocupado === null) alternar(c.id); }} />
          ))}
        </div>
      </div>
    </Velo>
  );
}

function ExamenTarjeta({ examen, onEditar, onModalidades }: { examen: Examen; onEditar: () => void; onModalidades: () => void }) {
  const toast = useToastResultado();
  const [confirmar, setConfirmar] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  return (
    <div className="tarjeta rx-examen-tarjeta">
      <div className="rx-examen-cab">
        <div>
          <b>{examen.titulo}</b>
          <span className="rx-examen-meta">{examen.cursoNombres.join(" + ") || "Sin modalidad asignada"}{examen.tema ? ` · ${examen.tema}` : ""} · {examen.preguntas.length} preguntas{examen.adjuntos.length > 0 ? ` · ${examen.adjuntos.length} adjuntos` : ""}</span>
        </div>
        <button type="button" className={`gaje-punto ${examen.activo ? "ok" : "neutro"}`} disabled={ocupado}
          onClick={async () => { setOcupado(true); toast(await examenActivoAccion(examen.id, !examen.activo)); setOcupado(false); }}
          title={examen.activo ? "Clic para desactivar" : "Clic para activar"}>
          {examen.activo ? "activo" : "inactivo"}
        </button>
      </div>
      <div className="rx-examen-pie">
        <button type="button" className="boton mini fantasma" onClick={onEditar}>Editar</button>
        <button type="button" className="boton mini fantasma" onClick={onModalidades} title="Elegir en qué modalidad(es) aparece">
          <IconoPanel n="route" cls="ic-sm" /> Modalidad(es)
        </button>
        <button type="button" className="boton mini fantasma rx-borrar" onClick={() => setConfirmar(true)}>Eliminar</button>
      </div>
      <ConfirmarDialogo abierto={confirmar}
        texto={`Se eliminará el examen "${examen.titulo}". Sus preguntas dejan de mostrarse agrupadas (el historial de intentos ya resueltos no se pierde).`}
        onNo={() => setConfirmar(false)}
        onSi={async () => { setConfirmar(false); setOcupado(true); toast(await examenBorrarAccion(examen.id)); setOcupado(false); }} />
    </div>
  );
}

function ListaExamenes({ examenes, cursos }: { examenes: Examen[]; cursos: Curso[] }) {
  const [abierto, setAbierto] = useState<"crear" | Examen | null>(null);
  const [modalidadesDe, setModalidadesDe] = useState<Examen | null>(null);

  return (
    <div className="tarjeta rx-panel" style={{ marginBottom: 20 }}>
      <div className="stat-fila" style={{ marginTop: 0, marginBottom: 16 }}>
        <div className="stat-tarjeta" style={{ "--stat-col": "var(--pino)" } as React.CSSProperties}>
          <span className="st-etq">Exámenes</span>
          <span className="st-num">{examenes.length}</span>
        </div>
        <div className="stat-tarjeta" style={{ "--stat-col": "var(--ok)" } as React.CSSProperties}>
          <span className="st-etq">Preguntas totales</span>
          <span className="st-num">{examenes.reduce((n, e) => n + e.preguntas.length, 0)}</span>
        </div>
      </div>
      <div className="rx-cab">
        <BotonMagnetico className="boton primario boton-magnetico" onClick={() => setAbierto("crear")}>+ Agregar examen</BotonMagnetico>
      </div>
      {examenes.length === 0 ? (
        <div className="vacio">Sin exámenes todavía — agrupa varias preguntas en el primero</div>
      ) : (
        <div className="rx-examenes-grid">
          {examenes.map((e) => <ExamenTarjeta key={e.id} examen={e} onEditar={() => setAbierto(e)} onModalidades={() => setModalidadesDe(e)} />)}
        </div>
      )}

      <ModalidadesDialogo abierto={modalidadesDe !== null} examen={modalidadesDe} cursos={cursos} onCerrar={() => setModalidadesDe(null)} />

      <Velo abierto={abierto !== null} onCerrar={() => setAbierto(null)}>
        <div className="us-frame us-frame-asistente" role="dialog" aria-modal="true">
          <div className="us-frame-cab">
            <div className="us-quien"><b>{abierto === "crear" ? "Agregar examen" : "Editar examen"}</b><span>Agrupa preguntas, cada una con su propia explicación</span></div>
            <button type="button" className="toast-x us-cerrar" aria-label="Cerrar" onClick={() => setAbierto(null)}><IconoPanel n="x" /></button>
          </div>
          {abierto !== null && (
            <ExamenFrame cursos={cursos} editar={abierto === "crear" ? null : abierto} onListo={() => setAbierto(null)} onCerrar={() => setAbierto(null)} />
          )}
        </div>
      </Velo>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reactivos sueltos (sin agrupar en examen) — conviven con la práctica libre.
// ---------------------------------------------------------------------------

const PASOS_REACTIVO = [
  { titulo: "Curso y enunciado", sub: "Dónde aparece y qué se pregunta" },
  { titulo: "Opciones de respuesta", sub: "Marca cuál es la correcta" },
  { titulo: "Explicación", sub: "Opcional — se muestra al calificar" },
];

function FormularioReactivo({ cursos, editar, onListo, onCerrar }: {
  cursos: Curso[]; editar: Reactivo | null; onListo: () => void; onCerrar: () => void;
}) {
  const toast = useToastResultado();
  const [paso, setPaso] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const [opciones, setOpciones] = useState<string[]>(editar?.opciones.length ? editar.opciones : ["", "", "", ""]);
  const [correcta, setCorrecta] = useState(editar?.respuesta_correcta ?? 0);
  const [cursoId, setCursoId] = useState(String(editar?.curso_id ?? cursos[0]?.id ?? ""));
  const accionBase = editar ? reactivoActualizarAccion : reactivoCrearAccion;
  const [, accion, pendiente] = useActionState<Resultado, FormData>(async (prev, fd) => {
    const r = await accionBase(prev, fd);
    toast(r);
    if (r.ok) { onListo(); setPaso(0); }
    return r;
  }, {});

  const agregarOpcion = () => { if (opciones.length < MAX_OPCIONES) setOpciones([...opciones, ""]); };
  const quitarOpcion = (i: number) => {
    if (opciones.length <= MIN_OPCIONES) return;
    setOpciones(opciones.filter((_, idx) => idx !== i));
    if (correcta === i) setCorrecta(0);
    else if (correcta > i) setCorrecta(correcta - 1);
  };

  function cerrar() { onCerrar(); setPaso(0); }

  /** Valida solo los campos visibles del paso actual antes de avanzar. */
  function siguiente() {
    const invalido = formRef.current?.querySelector<HTMLElement>(`[data-paso="${paso}"] :invalid`);
    if (invalido) { (invalido as HTMLInputElement).reportValidity(); return; }
    setPaso((p) => p + 1);
  }

  return (
    <form action={accion} ref={formRef}>
      {editar && <input type="hidden" name="id" value={editar.id} />}
      <Asistente pasos={PASOS_REACTIVO} activo={paso}>
        <div data-paso="0" style={{ display: paso === 0 ? "block" : "none" }}>
          <AsistentePaso eyebrow="Paso 1 de 3" titulo="Curso y enunciado">
            <label className="pl-campo">Curso
              <SelectorDesplegable placeholder="Elige un curso" valor={cursoId} opciones={cursos.map((c) => ({ valor: String(c.id), nombre: c.nombre }))} onChange={setCursoId} />
              <input type="hidden" name="curso_id" value={cursoId} required />
            </label>
            <label className="pl-campo">Tema <small>(opcional — agrupa la práctica por bloque)</small>
              <input type="text" name="tema" maxLength={120} defaultValue={editar?.tema ?? ""} placeholder="Ej. Álgebra, Comprensión lectora…" />
            </label>
            <label className="pl-campo ancho">Enunciado
              <textarea name="enunciado" required rows={3} defaultValue={editar?.enunciado ?? ""} />
            </label>
          </AsistentePaso>
        </div>
        <div data-paso="1" style={{ display: paso === 1 ? "block" : "none" }}>
          <AsistentePaso eyebrow="Paso 2 de 3" titulo="Opciones de respuesta">
            <div className="pl-campo ancho">
              <span>Opciones — marca cuál es la correcta</span>
              <input type="hidden" name="respuesta_correcta" value={correcta} />
              {opciones.map((op, i) => (
                <div key={i} className="rx-opcion">
                  <button type="button" className={`rx-correcta${correcta === i ? " on" : ""}`}
                    onClick={() => setCorrecta(i)} aria-pressed={correcta === i} aria-label={`Opción ${i + 1} es la correcta`}>
                    {correcta === i && <IconoPanel n="check" cls="ic-sm" />}
                  </button>
                  <input type="text" name={`opcion_${i}`} required value={op} placeholder={`Opción ${i + 1}`}
                    onChange={(e) => setOpciones(opciones.map((o, idx) => (idx === i ? e.target.value : o)))} />
                  {opciones.length > MIN_OPCIONES && (
                    <button type="button" className="rx-quitar" aria-label="Quitar opción" onClick={() => quitarOpcion(i)}><IconoPanel n="x" /></button>
                  )}
                </div>
              ))}
              {opciones.length < MAX_OPCIONES && (
                <button type="button" className="boton mini fantasma" onClick={agregarOpcion} style={{ marginTop: 6 }}>+ Agregar opción</button>
              )}
            </div>
          </AsistentePaso>
        </div>
        <div data-paso="2" style={{ display: paso === 2 ? "block" : "none" }}>
          <AsistentePaso eyebrow="Paso 3 de 3" titulo="Explicación">
            <label className="pl-campo ancho">Explicación <small>(opcional — se muestra al alumno al calificar)</small>
              <textarea name="explicacion" rows={2} defaultValue={editar?.explicacion ?? ""} />
            </label>
          </AsistentePaso>
        </div>
        <div className="us-asistente-nav">
          <button type="button" className="boton fantasma" onClick={paso === 0 ? cerrar : () => setPaso((p) => p - 1)}>
            {paso === 0 ? "Cancelar" : "Atrás"}
          </button>
          {paso < PASOS_REACTIVO.length - 1
            ? <button type="button" className="boton primario" onClick={siguiente}>Siguiente</button>
            : <button type="submit" className="boton primario" disabled={pendiente}>{pendiente ? "Guardando…" : editar ? "Guardar cambios" : "Agregar reactivo suelto"}</button>}
        </div>
      </Asistente>
    </form>
  );
}

function ToggleActivo({ id, activo }: { id: number; activo: boolean }) {
  const toast = useToastResultado();
  const [pendiente, setPendiente] = useState(false);
  return (
    <button type="button" className={`gaje-punto ${activo ? "ok" : "neutro"}`} disabled={pendiente}
      onClick={async () => {
        setPendiente(true);
        const r = await reactivoActivoAccion(id, !activo);
        toast(r);
        setPendiente(false);
      }}
      title={activo ? "Clic para desactivar" : "Clic para activar"}>
      {activo ? "activo" : "inactivo"}
    </button>
  );
}

function ListaReactivosSueltos({ inicial, cursos }: { inicial: Reactivo[]; cursos: Curso[] }) {
  const [abierto, setAbierto] = useState<"crear" | Reactivo | null>(null);

  return (
    <div className="tarjeta rx-panel">
      <div className="rx-cab rx-cab-espaciada">
        <div>
          <b>Reactivos sueltos</b>
          <div className="sub" style={{ margin: 0 }}>Sin agrupar en examen — entran a la práctica libre igual que los que sí están en un examen.</div>
        </div>
        <button type="button" className="boton fantasma" onClick={() => setAbierto("crear")}>+ Agregar reactivo suelto</button>
      </div>
      <table className="lista">
        <thead>
          <tr><th>Curso</th><th>Tema</th><th>Enunciado</th><th>Estado</th><th></th></tr>
        </thead>
        <tbody>
          {inicial.length === 0 && (
            <tr><td colSpan={5}><div className="vacio">Sin reactivos sueltos</div></td></tr>
          )}
          {inicial.map((r) => (
            <tr key={r.id}>
              <td>{r.curso_nombre}</td>
              <td>{r.tema ?? "—"}</td>
              <td style={{ maxWidth: 420, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.enunciado}</td>
              <td><ToggleActivo id={r.id} activo={r.activo} /></td>
              <td><button type="button" className="boton mini fantasma" onClick={() => setAbierto(r)}>Editar</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      <Velo abierto={abierto !== null} onCerrar={() => setAbierto(null)}>
        <div className="us-frame us-frame-asistente" role="dialog" aria-modal="true">
          <div className="us-frame-cab">
            <div className="us-quien"><b>{abierto === "crear" ? "Agregar reactivo suelto" : "Editar reactivo"}</b><span>Opción múltiple — se resuelve en el portal del alumno</span></div>
            <button type="button" className="toast-x us-cerrar" aria-label="Cerrar" onClick={() => setAbierto(null)}><IconoPanel n="x" /></button>
          </div>
          {abierto !== null && (
            <FormularioReactivo cursos={cursos} editar={abierto === "crear" ? null : abierto} onListo={() => setAbierto(null)} onCerrar={() => setAbierto(null)} />
          )}
        </div>
      </Velo>
    </div>
  );
}

export function ClienteReactivos({ examenes, sueltos, cursos }: { examenes: Examen[]; sueltos: Reactivo[]; cursos: Curso[] }) {
  return (
    <>
      <ListaExamenes examenes={examenes} cursos={cursos} />
      <ListaReactivosSueltos inicial={sueltos} cursos={cursos} />
    </>
  );
}
