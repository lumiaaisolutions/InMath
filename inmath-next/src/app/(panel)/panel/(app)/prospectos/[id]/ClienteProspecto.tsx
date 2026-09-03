"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { etiquetaEtapa } from "@/lib/panel/formato";
import {
  cambiarEtapaAccion, asignarAccion, reasignarAccion, generarLinkAccion,
  conversacionAccion, mensajeAsesorAccion,
} from "../../acciones";
import { useToastResultado, SelectorDesplegable } from "../../ClientePanel";

const ETAPAS = ["prospecto", "calificado", "cita_agendada", "pago_pendiente", "inscrito", "descartado"];

/** Chat + tomar/devolver conversación — port de la columna izquierda de prospecto.php. */
export function ChatConversacion({ conversacion, mensajes }: {
  conversacion: { id: number; estado: string };
  mensajes: { id: number; direccion: string; emisor: string; contenido: string; cuando: string }[];
}) {
  const chat = useRef<HTMLDivElement>(null);
  const [texto, setTexto] = useState("");
  const [pendiente, start] = useTransition();
  const toast = useToastResultado();
  useEffect(() => { if (chat.current) chat.current.scrollTop = 1e9; }, [mensajes.length]);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span className={`gaje ${conversacion.estado === "bot" ? "grad" : conversacion.estado === "asesor" ? "alerta" : "neutro"}`}>
          {conversacion.estado === "bot" ? "● Atiende el bot" : conversacion.estado === "asesor" ? "● Atiende un asesor" : "Cerrada"}
        </span>
        <button
          className={`boton mini${conversacion.estado === "bot" ? "" : " fantasma"}`}
          disabled={pendiente}
          onClick={() => start(async () => toast(await conversacionAccion(conversacion.id, conversacion.estado === "bot" ? "asesor" : "bot")))}
        >
          {conversacion.estado === "bot" ? "Tomar conversación" : "Devolver al bot"}
        </button>
      </div>
      <div className="chat" ref={chat}>
        {mensajes.map((m) => (
          <div key={m.id} className={`burbuja ${m.direccion === "entrante" ? "entrante" : m.emisor === "asesor" ? "asesor" : "bot"}`}>
            <span className="quien">{m.emisor.charAt(0).toUpperCase() + m.emisor.slice(1)}</span>
            {m.contenido}
            <span className="cuando">{m.cuando}</span>
          </div>
        ))}
      </div>
      <form
        style={{ display: "flex", gap: 8, marginTop: 12 }}
        onSubmit={(e) => {
          e.preventDefault();
          const t = texto.trim();
          if (!t) return;
          setTexto("");
          start(async () => toast(await mensajeAsesorAccion(conversacion.id, t)));
        }}
      >
        <input type="text" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Registrar nota / mensaje de asesor…" style={{ flex: 1 }} />
        <button className="boton" disabled={pendiente}>Registrar</button>
      </form>
    </>
  );
}

/** Acciones rápidas (etapa, asignar/reasignar, link de pago) — port de prospecto.php. */
export function AccionesProspecto({ prospectoId, etapa, asesorId, asesores }: {
  prospectoId: number; etapa: string; asesorId: number | null;
  asesores: { id: number; nombre: string }[];
}) {
  const [etapaSel, setEtapaSel] = useState(etapa);
  const [asesorSel, setAsesorSel] = useState(asesorId ? String(asesorId) : "");
  const [pendiente, start] = useTransition();
  const toast = useToastResultado();

  return (
    <div className="acciones-rapidas">
      <form className="form-inline" onSubmit={(e) => { e.preventDefault(); start(async () => toast(await cambiarEtapaAccion(prospectoId, etapaSel))); }}>
        <SelectorDesplegable sinVacio
          valor={etapaSel}
          opciones={ETAPAS.map((et) => ({ valor: et, nombre: etiquetaEtapa(et) }))}
          onChange={setEtapaSel}
        />
        <button className="boton mini" disabled={pendiente}>Mover</button>
      </form>
      <form
        className="form-inline"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => toast(asesorId
            ? await reasignarAccion(prospectoId, parseInt(asesorSel, 10))
            : await asignarAccion(prospectoId, asesorSel ? parseInt(asesorSel, 10) : null)));
        }}
      >
        <SelectorDesplegable sinVacio={!!asesorId}
          placeholder="Auto (menor carga)"
          valor={asesorSel}
          opciones={asesores.map((a) => ({ valor: String(a.id), nombre: a.nombre }))}
          onChange={setAsesorSel}
        />
        <button className="boton mini fantasma" disabled={pendiente}>{asesorId ? "Reasignar" : "Asignar"}</button>
      </form>
      <form onSubmit={(e) => { e.preventDefault(); start(async () => toast(await generarLinkAccion(prospectoId))); }}>
        <button className="boton mini primario" disabled={pendiente}>Generar link de pago</button>
      </form>
    </div>
  );
}

/* ── Diálogo compartido: acción destructiva que exige MOTIVO (se envía por
 *   correo al prospecto). Lo usan "Eliminar registro" y "Cancelar cita". ── */
function MotivoDialogo({ titulo, descripcion, etiquetaBoton, onCerrar, onConfirmar }: {
  titulo: string; descripcion: string; etiquetaBoton: string;
  onCerrar: () => void; onConfirmar: (motivo: string) => Promise<void>;
}) {
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  return (
    <div className="us-velo visible" style={{ zIndex: 400 }}>
      <div className="us-frame" role="dialog" aria-modal="true" style={{ width: "min(460px, 100%)" }}>
        <div className="us-frame-cab">
          <div className="us-quien"><b>{titulo}</b><span>{descripcion}</span></div>
          <button type="button" className="toast-x us-cerrar" aria-label="Cerrar" onClick={onCerrar}>✕</button>
        </div>
        <label className="pl-campo" style={{ display: "grid", gap: 6 }}>
          Motivo <small>(obligatorio — se le informa por correo)</small>
          <textarea rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej. No completaste tu registro y el periodo de inscripción cerró." />
        </label>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
          <button type="button" className="boton fantasma" onClick={onCerrar}>Volver</button>
          <button type="button" className="boton peligro" disabled={enviando || motivo.trim().length < 5}
            onClick={async () => { setEnviando(true); await onConfirmar(motivo.trim()); setEnviando(false); }}>
            {enviando ? "…" : etiquetaBoton}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Eliminar POR COMPLETO el registro del prospecto (solo sin pago completado). */
export function EliminarRegistroBoton({ prospectoId, nombre }: { prospectoId: number; nombre: string }) {
  const [abierto, setAbierto] = useState(false);
  const toast = useToastResultado();
  return (
    <>
      <button type="button" className="boton mini peligro" onClick={() => setAbierto(true)}>Eliminar registro</button>
      {abierto && (
        <MotivoDialogo
          titulo="Eliminar registro"
          descripcion={`Se borra TODO lo de ${nombre}: cuenta, pagos, citas e historial. No se puede deshacer.`}
          etiquetaBoton="Eliminar definitivamente"
          onCerrar={() => setAbierto(false)}
          onConfirmar={async (motivo) => {
            const { registroEliminarAccion } = await import("../../acciones");
            const fd = new FormData();
            fd.set("prospecto_id", String(prospectoId));
            fd.set("motivo", motivo);
            const r = await registroEliminarAccion({}, fd);
            toast(r);
            if (r.ok) window.location.href = "/panel";
            else setAbierto(false);
          }}
        />
      )}
    </>
  );
}

/** Acciones por cita en la ficha: Cancelar (futura, no hoy) / Eliminar (pasada). */
export function CitaAcciones({ citaId, esFutura, esHoy, activa, sinPago }: {
  citaId: number; esFutura: boolean; esHoy: boolean; activa: boolean; sinPago: boolean;
}) {
  const [cancelando, setCancelando] = useState(false);
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const toast = useToastResultado();

  if (activa && esFutura && !esHoy) {
    return (
      <>
        <button type="button" className="boton mini fantasma rx-borrar" onClick={() => setCancelando(true)}>Cancelar</button>
        {cancelando && (
          <MotivoDialogo
            titulo="Cancelar cita"
            descripcion="Se cancela la asesoría y se le informa el motivo por correo, con opción de reagendar."
            etiquetaBoton="Cancelar cita"
            onCerrar={() => setCancelando(false)}
            onConfirmar={async (motivo) => {
              const { citaCancelarAccion } = await import("../../acciones");
              const fd = new FormData();
              fd.set("cita_id", String(citaId));
              fd.set("motivo", motivo);
              const r = await citaCancelarAccion({}, fd);
              toast(r);
              setCancelando(false);
              if (r.ok) window.location.reload();
            }}
          />
        )}
      </>
    );
  }
  if (!esFutura && sinPago) {
    return (
      <>
        <button type="button" className="boton mini fantasma rx-borrar" disabled={ocupado} onClick={() => setConfirmarEliminar(true)}>Eliminar</button>
        {confirmarEliminar && (
          <div className="us-velo visible" style={{ zIndex: 400 }}>
            <div className="us-frame" role="dialog" aria-modal="true" style={{ width: "min(420px, 100%)" }}>
              <div className="us-frame-cab">
                <div className="us-quien"><b>Eliminar cita del historial</b><span>Solo se borra este registro de cita ya pasada. No se avisa por correo.</span></div>
                <button type="button" className="toast-x us-cerrar" aria-label="Cerrar" onClick={() => setConfirmarEliminar(false)}>✕</button>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
                <button type="button" className="boton fantasma" onClick={() => setConfirmarEliminar(false)}>Volver</button>
                <button type="button" className="boton peligro" disabled={ocupado}
                  onClick={async () => {
                    setOcupado(true);
                    const { citaEliminarAccion } = await import("../../acciones");
                    const r = await citaEliminarAccion(citaId);
                    toast(r);
                    setOcupado(false);
                    setConfirmarEliminar(false);
                    if (r.ok) window.location.reload();
                  }}>Eliminar</button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }
  return null;
}
