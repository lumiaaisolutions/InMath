"use client";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { IconoPanel } from "@/components/IconoPanel";
import { citaCrearAccion, type Resultado } from "../acciones";
import { Velo, useToastResultado } from "../ClientePanel";

export function FiltroAsesorCitas({ asesores, filtro, semana }: {
  asesores: { id: number; nombre: string }[]; filtro: string; semana: string;
}) {
  const router = useRouter();
  return (
    <form className="form-inline">
      <select value={filtro} onChange={(e) => router.push(`/panel/citas?semana=${semana}${e.target.value ? `&asesor_id=${e.target.value}` : ""}`)}>
        <option value="">Todos</option>
        {asesores.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
      </select>
    </form>
  );
}

/** Modal "+ Nueva cita" — port del citaModal de citas.php. */
export function NuevaCitaBoton({ asesores, hoy }: { asesores: { id: number; nombre: string }[]; hoy: string }) {
  const [abierto, setAbierto] = useState(false);
  const toast = useToastResultado();
  const [, accion, pendiente] = useActionState<Resultado, FormData>(async (prev, fd) => {
    const r = await citaCrearAccion(prev, fd);
    toast(r);
    if (r.ok) setAbierto(false);
    return r;
  }, {});

  return (
    <>
      <button type="button" className="boton primario" onClick={() => setAbierto(true)}>+ Nueva cita</button>
      <Velo abierto={abierto} onCerrar={() => setAbierto(false)}>
        <div className="us-frame" role="dialog" aria-modal="true">
          <div className="us-frame-cab">
            <div className="us-quien"><b>Nueva cita</b><span>Se valida que el horario no se empalme</span></div>
            <button type="button" className="toast-x us-cerrar" aria-label="Cerrar" onClick={() => setAbierto(false)}><IconoPanel n="x" /></button>
          </div>
          <form action={accion} className="pl-form">
            <label className="pl-campo">Nombre del prospecto<input type="text" name="nombre" required maxLength={120} /></label>
            <label className="pl-campo">WhatsApp (10 dígitos)<input type="tel" name="telefono" required inputMode="numeric" maxLength={15} placeholder="55 1234 5678" /></label>
            <div className="us-campos">
              <label className="pl-campo">Fecha<input type="date" name="fecha" required min={hoy} /></label>
              <label className="pl-campo">Hora<input type="time" name="hora" required min="08:00" max="20:30" step={1800} /></label>
            </div>
            <label className="pl-campo">Asesor
              <select name="asesor_id" defaultValue="">
                <option value="">Asignar automáticamente</option>
                {asesores.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </label>
            <div className="us-pie"><button className="boton primario" disabled={pendiente}>{pendiente ? "Agendando…" : "Agendar cita"}</button></div>
          </form>
        </div>
      </Velo>
    </>
  );
}
