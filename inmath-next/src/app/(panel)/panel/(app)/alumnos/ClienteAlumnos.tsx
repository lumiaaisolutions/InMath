"use client";
import { useActionState, useState } from "react";
import { IconoPanel } from "@/components/IconoPanel";
import { alumnoCrearAccion, type Resultado } from "../acciones";
import { Velo, useToastResultado } from "../ClientePanel";

/** Modal "+ Registrar alumno" — port del alumnoModal de alumnos.php. */
export function NuevoAlumnoBoton({ cursos }: { cursos: { id: number; nombre: string }[] }) {
  const [abierto, setAbierto] = useState(false);
  const toast = useToastResultado();
  const [, accion, pendiente] = useActionState<Resultado, FormData>(async (prev, fd) => {
    const r = await alumnoCrearAccion(prev, fd);
    toast(r);
    if (r.ok) setAbierto(false);
    return r;
  }, {});

  return (
    <>
      <button type="button" className="boton primario" onClick={() => setAbierto(true)}>+ Registrar alumno</button>
      <Velo abierto={abierto} onCerrar={() => setAbierto(false)}>
        <div className="us-frame" role="dialog" aria-modal="true">
          <div className="us-frame-cab">
            <div className="us-quien"><b>Registrar alumno</b><span>Alta manual sin pasar por el pipeline</span></div>
            <button type="button" className="toast-x us-cerrar" aria-label="Cerrar" onClick={() => setAbierto(false)}><IconoPanel n="x" /></button>
          </div>
          <form action={accion} className="pl-form">
            <label className="pl-campo">Nombre completo<input type="text" name="nombre" required maxLength={120} /></label>
            <label className="pl-campo">WhatsApp (10 dígitos)<input type="tel" name="telefono" required inputMode="numeric" maxLength={15} placeholder="55 1234 5678" /></label>
            <label className="pl-campo">Curso
              <select name="curso_id" required>
                {cursos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </label>
            <div className="us-pie"><button className="boton primario" disabled={pendiente}>{pendiente ? "Registrando…" : "Registrar"}</button></div>
          </form>
        </div>
      </Velo>
    </>
  );
}
