"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { etiquetaEtapa } from "@/lib/panel/formato";
import {
  cambiarEtapaAccion, asignarAccion, reasignarAccion, generarLinkAccion,
  conversacionAccion, mensajeAsesorAccion,
} from "../../acciones";
import { useToastResultado } from "../../ClientePanel";

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
        <select value={etapaSel} onChange={(e) => setEtapaSel(e.target.value)}>
          {ETAPAS.map((et) => <option key={et} value={et}>{etiquetaEtapa(et)}</option>)}
        </select>
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
        <select value={asesorSel} onChange={(e) => setAsesorSel(e.target.value)}>
          {!asesorId && <option value="">Auto (menor carga)</option>}
          {asesores.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </select>
        <button className="boton mini fantasma" disabled={pendiente}>{asesorId ? "Reasignar" : "Asignar"}</button>
      </form>
      <form onSubmit={(e) => { e.preventDefault(); start(async () => toast(await generarLinkAccion(prospectoId))); }}>
        <button className="boton mini primario" disabled={pendiente}>Generar link de pago</button>
      </form>
    </div>
  );
}
