"use client";
import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconoPanel } from "@/components/IconoPanel";
import { citaCrearAccion, type Resultado } from "../acciones";
import { Velo, useToastResultado, SelectorDesplegable, SelectorFecha, SelectorHora, BotonMagnetico, Asistente, AsistentePaso } from "../ClientePanel";

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
const PASOS_CITA = [
  { titulo: "Prospecto", sub: "Quién es y cómo contactarlo" },
  { titulo: "Fecha y hora", sub: "Cuándo es la asesoría" },
  { titulo: "Asesor y enlace", sub: "Quién la da y por dónde" },
];

export function NuevaCitaBoton({ asesores, hoy }: { asesores: { id: number; nombre: string }[]; hoy: string }) {
  const [abierto, setAbierto] = useState(false);
  const [paso, setPaso] = useState(0);
  const [fecha, setFecha] = useState(hoy);
  const [hora, setHora] = useState("");
  const [asesorId, setAsesorId] = useState("");
  const toast = useToastResultado();
  const formRef = useRef<HTMLFormElement>(null);
  const [, accion, pendiente] = useActionState<Resultado, FormData>(async (prev, fd) => {
    const r = await citaCrearAccion(prev, fd);
    toast(r);
    if (r.ok) { setAbierto(false); setPaso(0); }
    return r;
  }, {});

  function cerrar() { setAbierto(false); setPaso(0); }

  /** Valida solo los campos visibles del paso actual antes de avanzar. */
  function siguiente() {
    const invalido = formRef.current?.querySelector<HTMLElement>(`[data-paso="${paso}"] :invalid`);
    if (invalido) { (invalido as HTMLInputElement).reportValidity(); return; }
    setPaso((p) => p + 1);
  }

  return (
    <>
      <BotonMagnetico className="boton primario boton-magnetico" onClick={() => setAbierto(true)}>+ Nueva cita</BotonMagnetico>
      <Velo abierto={abierto} onCerrar={cerrar}>
        <div className="us-frame us-frame-asistente" role="dialog" aria-modal="true">
          <div className="us-frame-cab">
            <div className="us-quien"><b>Nueva cita</b><span>Se valida que el horario no se empalme</span></div>
            <button type="button" className="toast-x us-cerrar" aria-label="Cerrar" onClick={cerrar}><IconoPanel n="x" /></button>
          </div>
          <form action={accion} ref={formRef}>
            <Asistente pasos={PASOS_CITA} activo={paso}>
              <div data-paso="0" style={{ display: paso === 0 ? "block" : "none" }}>
                <AsistentePaso eyebrow="Paso 1 de 3" titulo="¿Quién es el prospecto?">
                  <label className="pl-campo ancho">Nombre del prospecto<input type="text" name="nombre" required maxLength={120} /></label>
                  <label className="pl-campo">WhatsApp (10 dígitos)<input type="tel" name="telefono" required inputMode="numeric" maxLength={15} placeholder="55 1234 5678" /></label>
                  <label className="pl-campo">Correo<input type="email" name="correo" required placeholder="correo@ejemplo.com" /></label>
                  <p className="pl-ayuda ancho" style={{ gridColumn: "1 / -1" }}>Al correo le llega el enlace de su asesoría en línea.</p>
                </AsistentePaso>
              </div>
              <div data-paso="1" style={{ display: paso === 1 ? "block" : "none" }}>
                <AsistentePaso eyebrow="Paso 2 de 3" titulo="¿Cuándo es la asesoría?">
                  <label className="pl-campo">Fecha
                    <SelectorFecha valor={fecha} onChange={setFecha} min={hoy} />
                    <input type="hidden" name="fecha" value={fecha} required />
                  </label>
                  <label className="pl-campo">Hora
                    <SelectorHora valor={hora} onChange={setHora} min="08:00" max="20:30" />
                    <input type="hidden" name="hora" value={hora} required />
                  </label>
                </AsistentePaso>
              </div>
              <div data-paso="2" style={{ display: paso === 2 ? "block" : "none" }}>
                <AsistentePaso eyebrow="Paso 3 de 3" titulo="Asesor y enlace de la asesoría">
                  <label className="pl-campo ancho">Asesor
                    <SelectorDesplegable
                      placeholder="Asignar automáticamente"
                      valor={asesorId}
                      opciones={asesores.map((a) => ({ valor: String(a.id), nombre: a.nombre }))}
                      onChange={setAsesorId}
                    />
                    <input type="hidden" name="asesor_id" value={asesorId} />
                  </label>
                  <label className="pl-campo ancho">Enlace de la asesoría en línea <span style={{ color: "var(--tinta-3)", fontWeight: 400 }}>(opcional)</span>
                    <input type="url" name="meet_link" inputMode="url" placeholder="https://meet.google.com/… o Zoom" />
                    <small style={{ color: "var(--tinta-3)" }}>El alumno lo verá en su portal para entrar a la asesoría.</small>
                  </label>
                </AsistentePaso>
              </div>
              <div className="us-asistente-nav">
                <button type="button" className="boton fantasma" onClick={paso === 0 ? cerrar : () => setPaso((p) => p - 1)}>
                  {paso === 0 ? "Cancelar" : "Atrás"}
                </button>
                {paso < PASOS_CITA.length - 1
                  ? <button type="button" className="boton primario" onClick={siguiente}>Siguiente</button>
                  : <button type="submit" className="boton primario" disabled={pendiente || !hora}>{pendiente ? "Agendando…" : "Agendar cita"}</button>}
              </div>
            </Asistente>
          </form>
        </div>
      </Velo>
    </>
  );
}
