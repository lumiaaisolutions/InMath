"use client";
import { useState, useTransition } from "react";
import { pagoAprobarAccion, pagoCancelarAccion } from "../acciones";
import { ConfirmarDialogo, useToastResultado, EnBody } from "../ClientePanel";
import { IconoPanel } from "@/components/IconoPanel";
import { etiquetaEtapa } from "@/lib/panel/formato";

type Pago = {
  id: number; monto_centavos: number; moneda: string; procesador: string | null;
  estado: string; comprobante: string | null; comprobante_subido_en: string | null;
  link_pago: string | null; referencia_externa: string | null;
  creado_en: string; link_generado_en: string | null; expira_en: string | null; pagado_en: string | null;
  curso_nombre: string;
  prospecto: { id: number; nombre: string | null; telefono_whatsapp: string; correo: string | null; etapa: string };
};

const dinero = (centavos: number, moneda: string) =>
  `$${(centavos / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${moneda}`;
const fecha = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()} ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
};
/** Horas restantes antes de la cancelación automática a 72h del link. */
function horasRestantes(pg: Pago): number | null {
  if (pg.estado !== "pendiente" || !pg.link_generado_en) return null;
  const generado = new Date(pg.link_generado_en).getTime();
  const limite = generado + 72 * 3600_000;
  return Math.max(0, Math.round((limite - Date.now()) / 3600_000));
}

function Estado({ estado }: { estado: string }) {
  const clase = estado === "pagado" ? "ok" : estado === "pendiente" ? "alerta" : "error";
  return <span className={`gaje ${clase}`}>{estado}</span>;
}

function Acciones({ pago, onCerrar }: { pago: Pago; onCerrar?: () => void }) {
  const [confirmar, setConfirmar] = useState<"aprobar" | "cancelar" | null>(null);
  const [pendiente, start] = useTransition();
  const toast = useToastResultado();
  if (pago.estado !== "pendiente") return null;
  return (
    <>
      <div className="pg-acciones">
        <button className="boton mini primario" disabled={pendiente} onClick={() => setConfirmar("aprobar")}>
          {pendiente ? "…" : "Aprobar e inscribir"}
        </button>
        <button className="boton mini al-quitar" disabled={pendiente} onClick={() => setConfirmar("cancelar")}>
          Cancelar
        </button>
      </div>
      <ConfirmarDialogo
        abierto={confirmar !== null}
        texto={confirmar === "aprobar"
          ? "Se marcará como pagado y se inscribirá al alumno con sus datos de acceso. Si dejó correo, le avisamos ahí."
          : "Se cancelará este pago pendiente. El prospecto seguirá en el sistema; puede generar un nuevo enlace de pago después."}
        onNo={() => setConfirmar(null)}
        onSi={() => {
          const accion = confirmar;
          setConfirmar(null);
          start(async () => {
            const r = accion === "aprobar" ? await pagoAprobarAccion(pago.id) : await pagoCancelarAccion(pago.id);
            toast(r);
            if (!r.error) onCerrar?.();
          });
        }}
      />
    </>
  );
}

/** Ficha completa del pago + prospecto, en portal a <body>. */
function PagoDetalle({ pago, onCerrar }: { pago: Pago; onCerrar: () => void }) {
  const restantes = horasRestantes(pago);
  return (
    <EnBody>
      <div className="us-velo visible" onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}>
        <div className="us-frame pg-frame" role="dialog" aria-modal="true">
          <div className="us-frame-cab">
            <div className="us-quien">
              <b>{pago.prospecto.nombre ?? pago.prospecto.telefono_whatsapp}</b>
              <span>{pago.curso_nombre}</span>
            </div>
            <button type="button" className="toast-x us-cerrar" aria-label="Cerrar" onClick={onCerrar}><IconoPanel n="x" /></button>
          </div>

          <div className="pg-detalle-grid">
            <div className="pg-bloque">
              <span className="pg-etq">Prospecto</span>
              <div className="pg-fila"><IconoPanel n="user" cls="ic-sm" /> {pago.prospecto.nombre ?? "Sin nombre"}</div>
              <div className="pg-fila"><IconoPanel n="chat" cls="ic-sm" /> {pago.prospecto.telefono_whatsapp}</div>
              <div className="pg-fila"><IconoPanel n="correo" cls="ic-sm" /> {pago.prospecto.correo ?? "Sin correo"}</div>
              <div className="pg-fila"><IconoPanel n="pipeline" cls="ic-sm" /> {etiquetaEtapa(pago.prospecto.etapa)}</div>
            </div>
            <div className="pg-bloque">
              <span className="pg-etq">Pago</span>
              <div className="pg-fila"><b>{dinero(pago.monto_centavos, pago.moneda)}</b></div>
              <div className="pg-fila">Procesador: {pago.procesador ?? "—"}</div>
              <div className="pg-fila">Referencia: {pago.referencia_externa ?? "—"}</div>
              <div className="pg-fila">Estado: <Estado estado={pago.estado} /></div>
              {restantes !== null && (
                <div className="pg-fila pg-cuenta">
                  <IconoPanel n="reloj" cls="ic-sm" /> Se cancela en ~{restantes}h si no se confirma
                </div>
              )}
            </div>
            <div className="pg-bloque">
              <span className="pg-etq">Fechas</span>
              <div className="pg-fila">Creado: {fecha(pago.creado_en)}</div>
              <div className="pg-fila">Link generado: {fecha(pago.link_generado_en)}</div>
              <div className="pg-fila">Expira: {fecha(pago.expira_en)}</div>
              <div className="pg-fila">Pagado: {fecha(pago.pagado_en)}</div>
            </div>
            <div className="pg-bloque">
              <span className="pg-etq">Comprobante</span>
              {pago.comprobante ? (
                <>
                  <a className="pg-fila pg-link" href={`/panel/comprobante/${pago.id}`} target="_blank" rel="noopener">
                    <IconoPanel n="imagen" cls="ic-sm" /> Ver comprobante
                  </a>
                  <div className="pg-fila">Subido: {fecha(pago.comprobante_subido_en)}</div>
                </>
              ) : <div className="pg-fila">Sin comprobante subido</div>}
              {pago.link_pago && (
                <a className="pg-fila pg-link" href={pago.link_pago} target="_blank" rel="noopener">
                  <IconoPanel n="pagos" cls="ic-sm" /> Ver enlace de pago
                </a>
              )}
            </div>
          </div>

          <Acciones pago={pago} onCerrar={onCerrar} />
        </div>
      </div>
    </EnBody>
  );
}

/** Tabla de pagos: clic en una fila abre la ficha completa. */
export function ListaPagos({ pagos }: { pagos: Pago[] }) {
  const [selId, setSelId] = useState<number | null>(null);
  const sel = pagos.find((p) => p.id === selId) ?? null;
  return (
    <div className="tarjeta">
      <table className="lista">
        <thead>
          <tr><th>Prospecto</th><th>Monto</th><th>Procesador</th><th>Estado</th><th>Vence en</th><th></th></tr>
        </thead>
        <tbody>
          {pagos.length === 0 && (
            <tr><td colSpan={6}><div className="vacio">Sin pagos registrados</div></td></tr>
          )}
          {pagos.map((pg) => {
            const restantes = horasRestantes(pg);
            return (
              <tr key={pg.id} className="pg-fila-clic" onClick={() => setSelId(pg.id)}>
                <td style={{ fontWeight: 600, color: "var(--pino)" }}>{pg.prospecto.nombre ?? pg.prospecto.telefono_whatsapp}</td>
                <td>{dinero(pg.monto_centavos, pg.moneda)}</td>
                <td>{pg.procesador ?? "—"}</td>
                <td><Estado estado={pg.estado} /></td>
                <td>{restantes !== null ? <span className={restantes <= 24 ? "pg-vence" : ""}>{restantes}h</span> : "—"}</td>
                <td onClick={(e) => e.stopPropagation()}><Acciones pago={pg} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {sel && <PagoDetalle pago={sel} onCerrar={() => setSelId(null)} />}
    </div>
  );
}
