"use client";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { IconoPanel } from "@/components/IconoPanel";
import { citaCrearAccion, type Resultado } from "../acciones";
import { Velo, useToastResultado, SelectorDesplegable, SelectorFecha, SelectorHora, BotonMagnetico } from "../ClientePanel";

export function FiltroAsesorCitas({ asesores, filtro, semana }: {
  asesores: { id: number; nombre: string }[]; filtro: string; semana: string;
}) {
  const router = useRouter();
  return (
    <SelectorDesplegable
      placeholder="Todos"
      valor={filtro}
      opciones={asesores.map((a) => ({ valor: String(a.id), nombre: a.nombre }))}
      onChange={(v) => router.push(`/panel/citas?semana=${semana}${v ? `&asesor_id=${v}` : ""}`)}
    />
  );
}

/** Modal "+ Nueva cita" — port del citaModal de citas.php. */
export function NuevaCitaBoton({ asesores, hoy }: { asesores: { id: number; nombre: string }[]; hoy: string }) {
  const [abierto, setAbierto] = useState(false);
  const [fecha, setFecha] = useState(hoy);
  const [hora, setHora] = useState("");
  const [asesorId, setAsesorId] = useState("");
  const toast = useToastResultado();
  const [, accion, pendiente] = useActionState<Resultado, FormData>(async (prev, fd) => {
    const r = await citaCrearAccion(prev, fd);
    toast(r);
    if (r.ok) setAbierto(false);
    return r;
  }, {});

  return (
    <>
      <BotonMagnetico className="boton primario boton-magnetico" onClick={() => setAbierto(true)}>+ Nueva cita</BotonMagnetico>
      <Velo abierto={abierto} onCerrar={() => setAbierto(false)}>
        <div className="us-frame" role="dialog" aria-modal="true">
          <div className="us-frame-cab">
            <div className="us-quien"><b>Nueva cita</b><span>Se valida que el horario no se empalme</span></div>
            <button type="button" className="toast-x us-cerrar" aria-label="Cerrar" onClick={() => setAbierto(false)}><IconoPanel n="x" /></button>
          </div>
          <form action={accion} className="pl-form">
            <label className="pl-campo">Nombre del prospecto<input type="text" name="nombre" required maxLength={120} /></label>
            <label className="pl-campo">WhatsApp (10 dígitos)<input type="tel" name="telefono" required inputMode="numeric" maxLength={15} placeholder="55 1234 5678" /></label>
            <label className="pl-campo">Correo
              <input type="email" name="correo" required placeholder="correo@ejemplo.com" />
              <small style={{ color: "var(--tinta-3)" }}>Ahí le llega el enlace de la videollamada.</small>
            </label>
            <div className="us-campos">
              <label className="pl-campo">Fecha
                <SelectorFecha valor={fecha} onChange={setFecha} min={hoy} />
                <input type="hidden" name="fecha" value={fecha} required />
              </label>
              <label className="pl-campo">Hora
                <SelectorHora valor={hora} onChange={setHora} min="08:00" max="20:30" />
                <input type="hidden" name="hora" value={hora} required />
              </label>
            </div>
            <label className="pl-campo">Asesor
              <SelectorDesplegable
                placeholder="Asignar automáticamente"
                valor={asesorId}
                opciones={asesores.map((a) => ({ valor: String(a.id), nombre: a.nombre }))}
                onChange={setAsesorId}
              />
              <input type="hidden" name="asesor_id" value={asesorId} />
            </label>
            <label className="pl-campo">Enlace de videollamada <span style={{ color: "var(--tinta-3)", fontWeight: 400 }}>(opcional)</span>
              <input type="url" name="meet_link" inputMode="url" placeholder="https://meet.google.com/… o Zoom" />
              <small style={{ color: "var(--tinta-3)" }}>El alumno lo verá en su portal para entrar a la asesoría.</small>
            </label>
            <div className="us-pie"><button className="boton primario" disabled={pendiente || !hora}>{pendiente ? "Agendando…" : "Agendar cita"}</button></div>
          </form>
        </div>
      </Velo>
    </>
  );
}
