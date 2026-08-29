"use client";
import { useActionState, useState } from "react";
import { IconoPanel } from "@/components/IconoPanel";
import { Velo, ConfirmarDialogo, useToastResultado, SelectorDesplegable, BotonMagnetico } from "../ClientePanel";
import {
  faseGuardarAccion, faseActivaAccion, faseBorrarAccion,
  faseVideoSubirAccion, faseDocumentoSubirAccion, type Resultado,
} from "./acciones";

type RecursoFicha = { id: number; tipo: string; titulo: string; url: string };
type ExamenFicha = { examenId: number; titulo: string };
type Fase = {
  id: number; curso_id: number; curso_nombre: string; titulo: string; descripcion: string | null;
  orden: number; porcentaje_minimo: number; activo: boolean;
  recursos: RecursoFicha[]; examenes: ExamenFicha[];
};
type ExamenDisponible = { id: number; titulo: string; cursoIds: number[] };
type Curso = { id: number; nombre: string };

let contador = 0;
const nuevoId = () => `n${Date.now()}${contador++}`;

const TIPO_ETIQUETA: Record<string, string> = { video_link: "Video (link)", video_archivo: "Video (archivo)", documento: "Documento" };

// ---------------------------------------------------------------------------
// Videos y materiales de la fase
// ---------------------------------------------------------------------------

type RecursoEditable = { cid: string; dbId?: number; tipo: "video_link" | "video_archivo" | "documento"; titulo: string; url: string };

function RecursosFase({ recursos, onAgregar, onQuitar }: {
  recursos: RecursoEditable[]; onAgregar: (r: RecursoEditable) => void; onQuitar: (cid: string) => void;
}) {
  const toast = useToastResultado();
  const [tituloLink, setTituloLink] = useState("");
  const [link, setLink] = useState("");
  const [subiendo, setSubiendo] = useState(false);

  const agregarLink = () => {
    if (!tituloLink.trim() || !link.trim()) { toast({ error: "Escribe un título y pega el link del video" }); return; }
    if (!/^https?:\/\//i.test(link.trim())) { toast({ error: "El link debe empezar con http:// o https://" }); return; }
    onAgregar({ cid: nuevoId(), tipo: "video_link", titulo: tituloLink.trim(), url: link.trim() });
    setTituloLink(""); setLink("");
  };

  const subirVideo = async (archivo: File) => {
    setSubiendo(true);
    try {
      const fd = new FormData();
      fd.set("archivo", archivo);
      const r = await faseVideoSubirAccion(fd);
      if (r.error) toast({ error: r.error });
      else if (r.ok) onAgregar({ cid: nuevoId(), tipo: "video_archivo", titulo: r.ok.nombre, url: r.ok.url });
    } catch {
      toast({ error: "No pudimos subir el video — intenta de nuevo" });
    } finally {
      setSubiendo(false);
    }
  };

  const subirDocumentos = async (files: FileList) => {
    setSubiendo(true);
    try {
      for (const f of Array.from(files)) {
        const fd = new FormData();
        fd.set("archivo", f);
        const r = await faseDocumentoSubirAccion(fd);
        if (r.error) toast({ error: `"${f.name}": ${r.error}` });
        else if (r.ok) onAgregar({ cid: nuevoId(), tipo: "documento", titulo: r.ok.nombre, url: r.ok.url });
      }
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="pl-campo rx-adjuntos">
      <span>Videos y materiales de esta fase</span>
      {recursos.length > 0 && (
        <ul className="mat-archivos-lista">
          {recursos.map((r) => (
            <li key={r.cid}>
              <IconoPanel n={r.tipo === "documento" ? "prompts" : "video"} cls="ic-sm" />
              <span className="mat-archivo-nombre">{r.titulo} <small>— {TIPO_ETIQUETA[r.tipo]}</small></span>
              <button type="button" className="mat-quitar" aria-label="Quitar" onClick={() => onQuitar(r.cid)}><IconoPanel n="x" cls="ic-sm" /></button>
            </li>
          ))}
        </ul>
      )}

      <div className="rx-adjunto-rango" style={{ alignItems: "flex-end" }}>
        <label className="pl-campo" style={{ flex: 1, margin: 0 }}>Título del video
          <input type="text" value={tituloLink} placeholder="Ej. Introducción a fracciones" onChange={(e) => setTituloLink(e.target.value)} />
        </label>
        <label className="pl-campo" style={{ flex: 1, margin: 0 }}>Link (YouTube, Vimeo, Drive…)
          <input type="url" value={link} placeholder="https://…" onChange={(e) => setLink(e.target.value)} />
        </label>
        <button type="button" className="boton mini fantasma" onClick={agregarLink}>+ Agregar link</button>
      </div>

      <label className="mat-dropzone">
        <input type="file" hidden accept=".mp4,.mov,.webm"
          onChange={(e) => { if (e.target.files?.[0]) subirVideo(e.target.files[0]); e.target.value = ""; }} />
        <IconoPanel n="video" cls="ic-sm" />
        <span>{subiendo ? "Subiendo…" : "O sube un archivo de video (.mp4, .mov, .webm — hasta 200 MB)"}</span>
      </label>
      <label className="mat-dropzone">
        <input type="file" multiple hidden accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.jpg,.jpeg,.png,.webp"
          onChange={(e) => { if (e.target.files?.length) subirDocumentos(e.target.files); e.target.value = ""; }} />
        <IconoPanel n="prompts" cls="ic-sm" />
        <span>{subiendo ? "Subiendo…" : "Sube uno o varios documentos de apoyo"}</span>
      </label>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Selector de exámenes que hay que aprobar para pasar la fase
// ---------------------------------------------------------------------------

function SelectorExamenes({ examenesDisponibles, seleccionados, onCambiar }: {
  examenesDisponibles: ExamenDisponible[]; seleccionados: number[]; onCambiar: (ids: number[]) => void;
}) {
  const alternar = (id: number) => {
    onCambiar(seleccionados.includes(id) ? seleccionados.filter((x) => x !== id) : [...seleccionados, id]);
  };
  return (
    <div className="pl-campo">
      <span>Exámenes que debe aprobar para pasar de fase <small>(si eliges varios, debe aprobar TODOS)</small></span>
      {examenesDisponibles.length === 0 ? (
        <div className="vacio" style={{ padding: "10px 0" }}>Este curso todavía no tiene exámenes en Reactivos.</div>
      ) : (
        <div className="us-chips">
          {examenesDisponibles.map((e) => (
            <label key={e.id} className="chip-modulo">
              <input type="checkbox" checked={seleccionados.includes(e.id)} onChange={() => alternar(e.id)} />
              <span>{e.titulo}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Formulario completo de una fase
// ---------------------------------------------------------------------------

function FaseFrame({ cursos, examenes, editar, onListo, onCerrar }: {
  cursos: Curso[]; examenes: ExamenDisponible[]; editar: Fase | null; onListo: () => void; onCerrar: () => void;
}) {
  const toast = useToastResultado();
  const [cursoId, setCursoId] = useState(String(editar?.curso_id ?? cursos[0]?.id ?? ""));
  const [titulo, setTitulo] = useState(editar?.titulo ?? "");
  const [descripcion, setDescripcion] = useState(editar?.descripcion ?? "");
  const [porcentajeMinimo, setPorcentajeMinimo] = useState(String(editar?.porcentaje_minimo ?? 70));
  const [orden, setOrden] = useState(editar ? String(editar.orden) : "");
  const [recursos, setRecursos] = useState<RecursoEditable[]>(
    editar?.recursos.map((r) => ({ cid: nuevoId(), dbId: r.id, tipo: r.tipo as RecursoEditable["tipo"], titulo: r.titulo, url: r.url })) ?? [],
  );
  const [examenesSel, setExamenesSel] = useState<number[]>(editar?.examenes.map((e) => e.examenId) ?? []);

  const examenesDelCurso = examenes.filter((e) => e.cursoIds.includes(Number(cursoId)));

  const [, accion, pendiente] = useActionState<Resultado, FormData>(async (prev) => {
    const fd = new FormData();
    fd.set("curso_id", cursoId);
    fd.set("titulo", titulo);
    fd.set("descripcion", descripcion);
    fd.set("porcentaje_minimo", porcentajeMinimo);
    if (orden !== "") fd.set("orden", orden);
    if (editar) fd.set("fase_id", String(editar.id));
    fd.set("recursos", JSON.stringify(recursos.map((r) => ({ dbId: r.dbId, tipo: r.tipo, titulo: r.titulo, url: r.url }))));
    fd.set("examenes", JSON.stringify(examenesSel.map((examenId) => ({ examenId }))));
    const r = await faseGuardarAccion(prev, fd);
    toast(r);
    if (r.ok) onListo();
    return r;
  }, {});

  return (
    <form action={accion} className="pl-form rx-examen-form">
      <label className="pl-campo">Curso
        <SelectorDesplegable placeholder="Elige un curso" valor={cursoId} opciones={cursos.map((c) => ({ valor: String(c.id), nombre: c.nombre }))} onChange={setCursoId} />
      </label>
      <label className="pl-campo">Título de la fase
        <input type="text" value={titulo} placeholder="Ej. Fase 1: Fundamentos de álgebra" onChange={(e) => setTitulo(e.target.value)} />
      </label>
      <label className="pl-campo">Descripción <small>(opcional, el alumno la ve)</small>
        <textarea rows={2} value={descripcion ?? ""} onChange={(e) => setDescripcion(e.target.value)} />
      </label>
      <div className="us-campos">
        <label className="pl-campo">% mínimo para aprobar
          <input type="number" min={0} max={100} value={porcentajeMinimo} onChange={(e) => setPorcentajeMinimo(e.target.value)} />
        </label>
        <label className="pl-campo">Orden <small>(opcional, en blanco = al final)</small>
          <input type="number" min={0} value={orden} placeholder="Automático" onChange={(e) => setOrden(e.target.value)} />
        </label>
      </div>

      <RecursosFase recursos={recursos} onAgregar={(r) => setRecursos((rs) => [...rs, r])} onQuitar={(cid) => setRecursos((rs) => rs.filter((r) => r.cid !== cid))} />
      <SelectorExamenes examenesDisponibles={examenesDelCurso} seleccionados={examenesSel} onCambiar={setExamenesSel} />

      <div className="us-pie">
        <button type="button" className="boton fantasma" onClick={onCerrar}>Cancelar</button>
        <BotonMagnetico type="submit" className="boton primario boton-magnetico" disabled={pendiente}>
          {pendiente ? "Guardando…" : editar ? "Guardar cambios" : "Crear fase"}
        </BotonMagnetico>
      </div>
    </form>
  );
}

function FaseTarjeta({ fase, onEditar }: { fase: Fase; onEditar: () => void }) {
  const toast = useToastResultado();
  const [confirmar, setConfirmar] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  return (
    <div className="tarjeta rx-examen-tarjeta">
      <div className="rx-examen-cab">
        <div>
          <b>{fase.orden}. {fase.titulo}</b>
          <span className="rx-examen-meta">
            {fase.curso_nombre} · {fase.recursos.length} recursos · {fase.examenes.length} examen(es) · aprobar con {fase.porcentaje_minimo}%
          </span>
        </div>
        <button type="button" className={`gaje-punto ${fase.activo ? "ok" : "neutro"}`} disabled={ocupado}
          onClick={async () => { setOcupado(true); toast(await faseActivaAccion(fase.id, !fase.activo)); setOcupado(false); }}
          title={fase.activo ? "Clic para desactivar" : "Clic para activar"}>
          {fase.activo ? "activa" : "inactiva"}
        </button>
      </div>
      {fase.examenes.length === 0 && (
        <div className="aviso error" style={{ margin: "8px 0 0" }}>Sin examen asignado — el alumno nunca podrá desbloquear la siguiente fase.</div>
      )}
      <div className="rx-examen-pie">
        <button type="button" className="boton mini fantasma" onClick={onEditar}>Editar</button>
        <button type="button" className="boton mini fantasma rx-borrar" onClick={() => setConfirmar(true)}>Eliminar</button>
      </div>
      <ConfirmarDialogo abierto={confirmar}
        texto={`Se eliminará la fase "${fase.titulo}". Los alumnos que ya la aprobaron conservan su avance en las fases siguientes.`}
        onNo={() => setConfirmar(false)}
        onSi={async () => { setConfirmar(false); setOcupado(true); toast(await faseBorrarAccion(fase.id)); setOcupado(false); }} />
    </div>
  );
}

export function ClienteFases({ fases, examenes, cursos }: { fases: Fase[]; examenes: ExamenDisponible[]; cursos: Curso[] }) {
  const [abierto, setAbierto] = useState<"crear" | Fase | null>(null);
  const [cursoFiltro, setCursoFiltro] = useState(String(cursos[0]?.id ?? ""));
  const visibles = fases.filter((f) => String(f.curso_id) === cursoFiltro);

  return (
    <div className="tarjeta rx-panel">
      <div className="rx-cab rx-cab-espaciada">
        <label className="pl-campo" style={{ margin: 0, minWidth: 260 }}>Curso
          <SelectorDesplegable placeholder="Elige un curso" valor={cursoFiltro} opciones={cursos.map((c) => ({ valor: String(c.id), nombre: c.nombre }))} onChange={setCursoFiltro} />
        </label>
        <BotonMagnetico className="boton primario boton-magnetico" onClick={() => setAbierto("crear")}>+ Agregar fase</BotonMagnetico>
      </div>
      {visibles.length === 0 ? (
        <div className="vacio">Este curso todavía no tiene fases — el alumno no verá el apartado "Fases" hasta que agregues la primera.</div>
      ) : (
        <div className="rx-examenes-grid">
          {visibles.map((f) => <FaseTarjeta key={f.id} fase={f} onEditar={() => setAbierto(f)} />)}
        </div>
      )}

      <Velo abierto={abierto !== null} onCerrar={() => setAbierto(null)}>
        <div className="us-frame rx-frame-ancho" role="dialog" aria-modal="true">
          <div className="us-frame-cab">
            <div className="us-quien"><b>{abierto === "crear" ? "Agregar fase" : "Editar fase"}</b><span>Videos, materiales y el examen para desbloquear la siguiente</span></div>
            <button type="button" className="toast-x us-cerrar" aria-label="Cerrar" onClick={() => setAbierto(null)}><IconoPanel n="x" /></button>
          </div>
          {abierto !== null && (
            <FaseFrame cursos={cursos} examenes={examenes} editar={abierto === "crear" ? null : abierto} onListo={() => setAbierto(null)} onCerrar={() => setAbierto(null)} />
          )}
        </div>
      </Velo>
    </div>
  );
}
