"use client";
import { useActionState, useState } from "react";
import { IconoPanel } from "@/components/IconoPanel";
import { Velo, useToastResultado } from "../ClientePanel";
import { reactivoCrearAccion, reactivoActualizarAccion, reactivoActivoAccion, type Resultado } from "./acciones";

type Reactivo = {
  id: number; curso_id: number; curso_nombre: string; tema: string | null;
  enunciado: string; opciones: string[]; respuesta_correcta: number;
  explicacion: string | null; activo: boolean;
};
type Curso = { id: number; nombre: string };

const MIN_OPCIONES = 2;
const MAX_OPCIONES = 6;

/** Formulario de alta/edición — comparte lógica entre "Agregar" y "Editar". */
function FormularioReactivo({ cursos, editar, onListo, onCerrar }: {
  cursos: Curso[]; editar: Reactivo | null; onListo: () => void; onCerrar: () => void;
}) {
  const toast = useToastResultado();
  const [opciones, setOpciones] = useState<string[]>(editar?.opciones.length ? editar.opciones : ["", "", "", ""]);
  const [correcta, setCorrecta] = useState(editar?.respuesta_correcta ?? 0);
  const accionBase = editar ? reactivoActualizarAccion : reactivoCrearAccion;
  const [, accion, pendiente] = useActionState<Resultado, FormData>(async (prev, fd) => {
    const r = await accionBase(prev, fd);
    toast(r);
    if (r.ok) onListo();
    return r;
  }, {});

  const agregarOpcion = () => { if (opciones.length < MAX_OPCIONES) setOpciones([...opciones, ""]); };
  const quitarOpcion = (i: number) => {
    if (opciones.length <= MIN_OPCIONES) return;
    setOpciones(opciones.filter((_, idx) => idx !== i));
    if (correcta === i) setCorrecta(0);
    else if (correcta > i) setCorrecta(correcta - 1);
  };

  return (
    <form action={accion} className="pl-form">
      {editar && <input type="hidden" name="id" value={editar.id} />}
      <label className="pl-campo">Curso
        <select name="curso_id" required defaultValue={editar?.curso_id ?? ""}>
          <option value="" disabled>Elige un curso</option>
          {cursos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </label>
      <label className="pl-campo">Tema (opcional — agrupa la práctica por bloque)
        <input type="text" name="tema" maxLength={120} defaultValue={editar?.tema ?? ""} placeholder="Ej. Álgebra, Comprensión lectora…" />
      </label>
      <label className="pl-campo">Enunciado
        <textarea name="enunciado" required rows={3} defaultValue={editar?.enunciado ?? ""} />
      </label>

      <div className="pl-campo">
        <span>Opciones — marca cuál es la correcta</span>
        {opciones.map((op, i) => (
          <div key={i} className="rx-opcion">
            <input type="radio" name="respuesta_correcta" value={i} checked={correcta === i} onChange={() => setCorrecta(i)} aria-label={`Opción ${i + 1} es la correcta`} />
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

      <label className="pl-campo">Explicación (opcional — se muestra al alumno al calificar)
        <textarea name="explicacion" rows={2} defaultValue={editar?.explicacion ?? ""} />
      </label>

      <div className="us-pie">
        <button type="button" className="boton fantasma" onClick={onCerrar}>Cancelar</button>
        <button className="boton primario" disabled={pendiente}>{pendiente ? "Guardando…" : editar ? "Guardar cambios" : "Agregar reactivo"}</button>
      </div>
    </form>
  );
}

function ToggleActivo({ id, activo }: { id: number; activo: boolean }) {
  const toast = useToastResultado();
  const [pendiente, setPendiente] = useState(false);
  return (
    <button type="button" className={`gaje ${activo ? "ok" : "neutro"}`} disabled={pendiente}
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

export function ListaReactivos({ inicial, cursos }: { inicial: Reactivo[]; cursos: Curso[] }) {
  const [abierto, setAbierto] = useState<"crear" | Reactivo | null>(null);

  return (
    <div className="tarjeta">
      <div className="rx-cab">
        <button type="button" className="boton primario" onClick={() => setAbierto("crear")}>+ Agregar reactivo</button>
      </div>
      <table className="lista">
        <thead>
          <tr><th>Curso</th><th>Tema</th><th>Enunciado</th><th>Estado</th><th></th></tr>
        </thead>
        <tbody>
          {inicial.length === 0 && (
            <tr><td colSpan={5}><div className="vacio">Sin reactivos todavía — agrega el primero</div></td></tr>
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
        <div className="us-frame" role="dialog" aria-modal="true">
          <div className="us-frame-cab">
            <div className="us-quien"><b>{abierto === "crear" ? "Agregar reactivo" : "Editar reactivo"}</b><span>Opción múltiple — se resuelve en el portal del alumno</span></div>
            <button type="button" className="toast-x us-cerrar" aria-label="Cerrar" onClick={() => setAbierto(null)}><IconoPanel n="x" /></button>
          </div>
          {abierto !== null && (
            <FormularioReactivo
              cursos={cursos}
              editar={abierto === "crear" ? null : abierto}
              onListo={() => setAbierto(null)}
              onCerrar={() => setAbierto(null)}
            />
          )}
        </div>
      </Velo>
    </div>
  );
}
