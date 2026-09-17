"use client";
import { useActionState, useMemo, useState } from "react";
import { IconoPanel } from "@/components/IconoPanel";
import { alumnoCrearAccion, alumnoEditarAccion, alumnoBajaAccion, alumnoReenviarAccesoAccion, registroEliminarAccion, pagoAprobarAccion, pagoCancelarAccion, type Resultado } from "../acciones";
import { ConfirmarDialogo, Velo, useToastResultado, EnBody, Segmentado, SelectorDesplegable, BotonMagnetico } from "../ClientePanel";


/* ── Tipos ─────────────────────────────────────────────────────────────── */
type Pago = {
  id: number; estado: string; montoCentavos: number; moneda: string; procesador: string | null;
  comprobante: string | null; comprobanteSubidoEn: string | null; linkPago: string | null;
  referenciaExterna: string | null; creadoEn: string; linkGeneradoEn: string | null;
  expiraEn: string | null; pagadoEn: string | null; cursoNombre: string;
};
type Fila = {
  prospectoId: number; nombre: string; telefono: string; correo: string | null; cursoNombre: string | null;
  alumno: { id: number; estado: string; inscritoEn: string; cursoTerminado: boolean; puedeDarBaja: boolean; foto: string | null; banner: string | null } | null;
  pagos: Pago[];
};
type Curso = { id: number; nombre: string };

const dinero = (centavos: number, moneda: string) =>
  `$${(centavos / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${moneda}`;
const fecha = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()} ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
};
function horasRestantes(pg: Pago): number | null {
  if (pg.estado !== "pendiente" || !pg.linkGeneradoEn) return null;
  const generado = new Date(pg.linkGeneradoEn).getTime();
  const limite = generado + 72 * 3600_000;
  return Math.max(0, Math.round((limite - Date.now()) / 3600_000));
}

const ESTADO_ALUMNO_ETQ: Record<string, string> = { activo: "Activo", pausado: "Pausado", completado: "Completado", baja: "De baja" };
const ESTADO_PAGO_ETQ: Record<string, string> = { pendiente: "Pendiente", pagado: "Pagado", cancelado: "Cancelado", expirado: "Expirado", fallido: "Fallido", reembolsado: "Reembolsado" };

function GajeEstadoAlumno({ estado }: { estado: string | null }) {
  if (!estado) return <span className="gaje-punto neutro">Sin cuenta</span>;
  const clase = estado === "activo" ? "ok" : estado === "baja" ? "error" : estado === "completado" ? "grad" : "alerta";
  return <span className={`gaje-punto ${clase}`}>{ESTADO_ALUMNO_ETQ[estado] ?? estado}</span>;
}
function GajeEstadoPago({ estado }: { estado: string | null }) {
  if (!estado) return <span className="gaje-punto neutro">Sin pago</span>;
  const clase = estado === "pagado" ? "ok" : estado === "pendiente" ? "alerta" : "error";
  return <span className={`gaje-punto ${clase}`}>{ESTADO_PAGO_ETQ[estado] ?? estado}</span>;
}

/* ── Registrar alumno (alta manual) ──────────────────────────────────────── */
function NuevoAlumnoBoton({ cursos }: { cursos: Curso[] }) {
  const [abierto, setAbierto] = useState(false);
  const [cursoId, setCursoId] = useState(cursos[0] ? String(cursos[0].id) : "");
  const toast = useToastResultado();
  const [, accion, pendiente] = useActionState<Resultado, FormData>(async (prev, fd) => {
    const r = await alumnoCrearAccion(prev, fd);
    toast(r);
    if (r.ok) setAbierto(false);
    return r;
  }, {});

  return (
    <>
      <BotonMagnetico className="boton primario boton-magnetico" onClick={() => setAbierto(true)}>+ Registrar alumno</BotonMagnetico>
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
              <Segmentado opciones={cursos.map((c) => ({ valor: String(c.id), nombre: c.nombre }))} valor={cursoId} onChange={setCursoId} />
              <input type="hidden" name="curso_id" value={cursoId} required />
            </label>
            <div className="us-pie"><button className="boton primario" disabled={pendiente || !cursoId}>{pendiente ? "Registrando…" : "Registrar"}</button></div>
          </form>
        </div>
      </Velo>
    </>
  );
}

/* ── Acciones de pago (aprobar / cancelar) ───────────────────────────────── */
function AccionesPagoReal({ pago, onCerrar }: { pago: Pago; onCerrar?: () => void }) {
  const [confirmar, setConfirmar] = useState<"aprobar" | "cancelar" | null>(null);
  const [enCurso, setEnCurso] = useState(false);
  const toast = useToastResultado();
  if (pago.estado !== "pendiente") return null;
  return (
    <>
      <div className="pg-acciones pg-acciones-ficha">
        <button className="boton primario pg-btn-aprobar" disabled={enCurso} onClick={() => setConfirmar("aprobar")}>
          <IconoPanel n="check" cls="ic-sm" /> {enCurso ? "Procesando…" : "Aprobar e inscribir"}
        </button>
        <button className="boton pg-btn-cancelar" disabled={enCurso} onClick={() => setConfirmar("cancelar")}>
          Cancelar pago
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
          setEnCurso(true);
          (async () => {
            const r = accion === "aprobar" ? await pagoAprobarAccion(pago.id) : await pagoCancelarAccion(pago.id);
            toast(r);
            setEnCurso(false);
            if (!r.error) onCerrar?.();
          })();
        }}
      />
    </>
  );
}

/* ── Reenviar acceso (crear nueva contraseña) ────────────────────────────
 * Para cuando un alumno YA activo dice que no puede entrar — normalmente
 * porque perdió o nunca vio su contraseña temporal. Antes staff no tenía
 * ninguna herramienta para esto sin pedirle ayuda a un desarrollador. */
function BotonReenviarAcceso({ alumnoId }: { alumnoId: number }) {
  const [enCurso, setEnCurso] = useState(false);
  const toast = useToastResultado();
  return (
    <button type="button" className="boton mini" disabled={enCurso} onClick={() => {
      setEnCurso(true);
      (async () => {
        const r = await alumnoReenviarAccesoAccion(alumnoId);
        toast(r);
        setEnCurso(false);
      })();
    }}>
      <IconoPanel n="correo" cls="ic-sm" /> {enCurso ? "Enviando…" : "Reenviar acceso"}
    </button>
  );
}

/* ── Dar de baja ──────────────────────────────────────────────────────── */
function BotonBaja({ alumnoId, onListo }: { alumnoId: number; onListo?: () => void }) {
  const [confirmar, setConfirmar] = useState(false);
  const [enCurso, setEnCurso] = useState(false);
  const toast = useToastResultado();
  return (
    <>
      <button type="button" className="boton mini peligro" disabled={enCurso} onClick={() => setConfirmar(true)}>
        {enCurso ? "…" : "Dar de baja"}
      </button>
      <ConfirmarDialogo
        abierto={confirmar}
        texto="Se dará de baja a este alumno y se le avisará por correo (si dejó uno). Esta acción no se puede deshacer desde aquí."
        onNo={() => setConfirmar(false)}
        onSi={() => {
          setConfirmar(false);
          setEnCurso(true);
          (async () => {
            const r = await alumnoBajaAccion(alumnoId);
            toast(r);
            setEnCurso(false);
            if (!r.error) onListo?.();
          })();
        }}
      />
    </>
  );
}

/* ── Eliminar registro completo (solo sin pago completado) con MOTIVO que
 *   se informa por correo antes de borrar ─────────────────────────────── */
function EliminarRegistroBoton({ fila }: { fila: Fila }) {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const toast = useToastResultado();
  if (fila.pagos.some((p) => p.estado === "pagado")) return null;
  return (
    <>
      <button type="button" className="boton mini peligro" onClick={() => setAbierto(true)}>Eliminar</button>
      {abierto && (
        <EnBody>
          <div className="us-velo visible" style={{ zIndex: 400 }}>
            <div className="us-frame" role="dialog" aria-modal="true" style={{ width: "min(460px, 100%)" }}>
              <div className="us-frame-cab">
                <div className="us-quien"><b>Eliminar registro</b><span>Se borra TODO lo de {fila.nombre}: cuenta, pagos, citas e historial. No se puede deshacer.</span></div>
                <button type="button" className="toast-x us-cerrar" aria-label="Cerrar" onClick={() => setAbierto(false)}><IconoPanel n="x" /></button>
              </div>
              <label className="pl-campo" style={{ display: "grid", gap: 6 }}>
                Motivo <small>(obligatorio — se le informa por correo)</small>
                <textarea rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ej. No completaste tu registro y el periodo de inscripción cerró." />
              </label>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
                <button type="button" className="boton fantasma" onClick={() => setAbierto(false)}>Volver</button>
                <button type="button" className="boton peligro" disabled={enviando || motivo.trim().length < 5}
                  onClick={async () => {
                    setEnviando(true);
                    const fd = new FormData();
                    fd.set("prospecto_id", String(fila.prospectoId));
                    fd.set("motivo", motivo.trim());
                    const r = await registroEliminarAccion({}, fd);
                    toast(r);
                    setEnviando(false);
                    if (r.ok) setAbierto(false);
                  }}>
                  {enviando ? "…" : "Eliminar definitivamente"}
                </button>
              </div>
            </div>
          </div>
        </EnBody>
      )}
    </>
  );
}

/* ── Editar datos de contacto ─────────────────────────────────────────── */
function EditarAlumnoFrame({ fila, onCerrar }: { fila: Fila; onCerrar: () => void }) {
  const toast = useToastResultado();
  const [, accion, pendiente] = useActionState<Resultado, FormData>(async (prev, fd) => {
    const r = await alumnoEditarAccion(prev, fd);
    toast(r);
    if (r.ok) onCerrar();
    return r;
  }, {});
  return (
    <Velo abierto onCerrar={onCerrar}>
      <div className="us-frame" role="dialog" aria-modal="true">
        <div className="us-frame-cab">
          <div className="us-quien"><b>Editar datos</b><span>{fila.nombre}</span></div>
          <button type="button" className="toast-x us-cerrar" aria-label="Cerrar" onClick={onCerrar}><IconoPanel n="x" /></button>
        </div>
        <form action={accion} className="formulario" style={{ display: "grid", gap: 14 }}>
          <input type="hidden" name="prospecto_id" value={fila.prospectoId} />
          <label className="pl-campo">Nombre
            <input type="text" name="nombre" defaultValue={fila.nombre} required maxLength={120} />
          </label>
          <label className="pl-campo">WhatsApp
            <input type="tel" name="telefono" defaultValue={fila.telefono} required maxLength={20} />
          </label>
          <label className="pl-campo">Correo <small>(opcional — ahí le llegan sus accesos y avisos)</small>
            <input type="email" name="correo" defaultValue={fila.correo ?? ""} maxLength={190} />
          </label>
          <div className="pg-acciones" style={{ justifyContent: "flex-end", display: "flex", gap: 10 }}>
            <button type="button" className="boton fantasma" onClick={onCerrar}>Cancelar</button>
            <button type="submit" className="boton primario" disabled={pendiente}>{pendiente ? "Guardando…" : "Guardar cambios"}</button>
          </div>
        </form>
      </div>
    </Velo>
  );
}

/* ── Ficha de detalle (alumno + todos sus pagos) ─────────────────────────── */
function FichaDetalle({ fila, onCerrar }: { fila: Fila; onCerrar: () => void }) {
  const pagoActivo = fila.pagos.find((p) => p.estado === "pendiente") ?? fila.pagos[0] ?? null;
  return (
    <EnBody>
      <div className="us-velo visible">
        <div className="us-frame pg-frame pg-ficha" role="dialog" aria-modal="true">
          {/* Cierre SIEMPRE visible: círculo de vidrio flotante, sobre banner o sobre blanco */}
          <button type="button" className="pg-cerrar" aria-label="Cerrar" onClick={onCerrar}><IconoPanel n="x" /></button>
          {/* Portada y foto que el alumno configuró en su portal (si las tiene) */}
          {fila.alumno?.banner && (
            <div className="af-banner"><img src={fila.alumno.banner} alt="" /></div>
          )}
          <div className="pg-ficha-cab">
            {fila.alumno?.foto
              ? <span className={`af-foto${fila.alumno?.banner ? " af-foto-solapa" : ""}`}><img src={fila.alumno.foto} alt="" /></span>
              : <span className={`pg-ficha-inicial${fila.alumno?.banner ? " af-foto-solapa" : ""}`}>{(fila.nombre || "?").charAt(0).toUpperCase()}</span>}
            <div className="us-quien"><b>{fila.nombre}</b><span>{fila.cursoNombre ?? "Sin curso"}</span></div>
          </div>

          <div className="pg-detalle-grid">
            <div className="pg-bloque">
              <span className="pg-etq">Contacto</span>
              <div className="pg-fila"><IconoPanel n="user" cls="ic-sm" /> {fila.nombre}</div>
              <div className="pg-fila"><IconoPanel n="chat" cls="ic-sm" /> {fila.telefono}</div>
              <div className="pg-fila"><IconoPanel n="correo" cls="ic-sm" /> {fila.correo ?? "Sin correo"}</div>
            </div>
            <div className="pg-bloque">
              <span className="pg-etq">Cuenta</span>
              <div className="pg-fila">Estado: <GajeEstadoAlumno estado={fila.alumno?.estado ?? null} /></div>
              {fila.alumno && <div className="pg-fila">Inscrito: {fecha(fila.alumno.inscritoEn)}</div>}
              {fila.alumno?.cursoTerminado && <div className="pg-fila pg-cuenta"><IconoPanel n="reloj" cls="ic-sm" /> El periodo de su curso ya terminó</div>}
            </div>
            {pagoActivo && (
              <>
                <div className="pg-bloque">
                  <span className="pg-etq">Pago más reciente</span>
                  <div className="pg-fila"><b>{dinero(pagoActivo.montoCentavos, pagoActivo.moneda)}</b></div>
                  <div className="pg-fila">Procesador: {pagoActivo.procesador ?? "—"}</div>
                  <div className="pg-fila">Estado: <GajeEstadoPago estado={pagoActivo.estado} /></div>
                  {horasRestantes(pagoActivo) !== null && (
                    <div className="pg-fila pg-cuenta"><IconoPanel n="reloj" cls="ic-sm" /> Se cancela en ~{horasRestantes(pagoActivo)}h si no se confirma</div>
                  )}
                </div>
                <div className="pg-bloque">
                  <span className="pg-etq">Fechas del pago</span>
                  <div className="pg-fila">Creado: {fecha(pagoActivo.creadoEn)}</div>
                  <div className="pg-fila">Link generado: {fecha(pagoActivo.linkGeneradoEn)}</div>
                  <div className="pg-fila">Expira: {fecha(pagoActivo.expiraEn)}</div>
                  <div className="pg-fila">Pagado: {fecha(pagoActivo.pagadoEn)}</div>
                </div>
                <div className="pg-bloque">
                  <span className="pg-etq">Comprobante</span>
                  {pagoActivo.comprobante ? (
                    <>
                      <a className="pg-fila pg-link" href={`/panel/comprobante/${pagoActivo.id}`} target="_blank" rel="noopener">
                        <IconoPanel n="imagen" cls="ic-sm" /> Ver comprobante
                      </a>
                      <div className="pg-fila">Subido: {fecha(pagoActivo.comprobanteSubidoEn)}</div>
                    </>
                  ) : <div className="pg-fila">Sin comprobante subido</div>}
                  {pagoActivo.estado === "pagado" && (
                    <a className="pg-fila pg-link" href={`/panel/recibo/${pagoActivo.id}`} target="_blank" rel="noopener">
                      <IconoPanel n="pagos" cls="ic-sm" /> Descargar recibo (PDF)
                    </a>
                  )}
                  {pagoActivo.linkPago && (
                    <a className="pg-fila pg-link" href={pagoActivo.linkPago} target="_blank" rel="noopener">
                      <IconoPanel n="pagos" cls="ic-sm" /> Ver enlace de pago
                    </a>
                  )}
                </div>
              </>
            )}
          </div>

          {fila.pagos.length > 1 && (
            <div className="pg-historial">
              <span className="pg-etq">Historial de pagos ({fila.pagos.length})</span>
              <table className="lista">
                <thead><tr><th>Fecha</th><th>Curso</th><th>Monto</th><th>Estado</th></tr></thead>
                <tbody>
                  {fila.pagos.map((p) => (
                    <tr key={p.id}>
                      <td>{fecha(p.creadoEn)}</td><td>{p.cursoNombre}</td>
                      <td>{dinero(p.montoCentavos, p.moneda)}</td><td><GajeEstadoPago estado={p.estado} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pagoActivo && <AccionesPagoReal pago={pagoActivo} onCerrar={onCerrar} />}
          {fila.alumno?.estado === "activo" && fila.correo && (
            <div className="pg-acciones pg-acciones-ficha">
              <BotonReenviarAcceso alumnoId={fila.alumno.id} />
            </div>
          )}
          {fila.alumno?.puedeDarBaja && (
            <div className="pg-acciones">
              <BotonBaja alumnoId={fila.alumno.id} onListo={onCerrar} />
            </div>
          )}
        </div>
      </div>
    </EnBody>
  );
}

/* ── Lista + filtros ──────────────────────────────────────────────────── */
export function ListaAlumnos({ inicial, cursos }: { inicial: Fila[]; cursos: Curso[] }) {
  const [selId, setSelId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [filtroAlumno, setFiltroAlumno] = useState("todos");
  const [filtroPago, setFiltroPago] = useState("todos");
  const sel = inicial.find((f) => f.prospectoId === selId) ?? null;
  const edit = inicial.find((f) => f.prospectoId === editId) ?? null;

  const filas = useMemo(() => inicial.filter((f) => {
    if (filtroAlumno !== "todos") {
      if (filtroAlumno === "sin_cuenta" ? !!f.alumno : f.alumno?.estado !== filtroAlumno) return false;
    }
    if (filtroPago !== "todos") {
      const estadoReciente = f.pagos[0]?.estado ?? null;
      if (filtroPago === "sin_pago" ? !!estadoReciente : estadoReciente !== filtroPago) return false;
    }
    return true;
  }), [inicial, filtroAlumno, filtroPago]);

  return (
    <div className="tarjeta pp-panel">
      <div className="al-alumnos-cab">
        <div className="al-alumnos-filtros">
          <div className="al-alumnos-filtro">
            <span className="al-alumnos-filtro-etq">Estado de la cuenta</span>
            <SelectorDesplegable sinVacio
              opciones={[
                { valor: "todos", nombre: "Todos" }, { valor: "activo", nombre: "Activo" },
                { valor: "pausado", nombre: "Pausado" }, { valor: "completado", nombre: "Completado" },
                { valor: "baja", nombre: "De baja" }, { valor: "sin_cuenta", nombre: "Sin cuenta" },
              ]}
              valor={filtroAlumno} onChange={setFiltroAlumno}
            />
          </div>
          <div className="al-alumnos-filtro">
            <span className="al-alumnos-filtro-etq">Estado del pago</span>
            <SelectorDesplegable sinVacio
              opciones={[
                { valor: "todos", nombre: "Todos" }, { valor: "pendiente", nombre: "Pendiente" },
                { valor: "pagado", nombre: "Pagado" }, { valor: "cancelado", nombre: "Cancelado" },
                { valor: "sin_pago", nombre: "Sin pago" },
              ]}
              valor={filtroPago} onChange={setFiltroPago}
            />
          </div>
        </div>
        <NuevoAlumnoBoton cursos={cursos} />
      </div>

      <div className="al-tabla-scroll">
        <table className="lista">
          <thead>
            <tr><th>Nombre</th><th>Curso</th><th>Cuenta</th><th>Pago</th><th>Monto</th><th></th></tr>
          </thead>
          <tbody>
            {filas.length === 0 && (
              <tr><td colSpan={6}><div className="vacio">Nadie coincide con estos filtros</div></td></tr>
            )}
            {filas.map((f) => {
              const pagoReciente = f.pagos[0] ?? null;
              const restantes = pagoReciente ? horasRestantes(pagoReciente) : null;
              return (
                <tr key={f.prospectoId} className="pg-fila-clic" onClick={() => setSelId(f.prospectoId)}>
                  <td>
                    <span className="al-quien">
                      <span className="pw-avatar-sm">{f.alumno?.foto ? <img src={f.alumno.foto} alt="" /> : (f.nombre || "?").charAt(0).toUpperCase()}</span>
                      <b style={{ color: "var(--pino)" }}>{f.nombre}</b>
                    </span>
                  </td>
                  <td>{f.cursoNombre ?? "—"}</td>
                  <td><GajeEstadoAlumno estado={f.alumno?.estado ?? null} /></td>
                  <td>
                    <GajeEstadoPago estado={pagoReciente?.estado ?? null} />
                    {restantes !== null && <span className={`pg-vence-mini${restantes <= 24 ? " pg-vence" : ""}`}> · {restantes}h</span>}
                  </td>
                  <td>
                    {pagoReciente ? (
                      <b className={`pg-monto pg-monto-${pagoReciente.estado === "pagado" ? "ok" : pagoReciente.estado === "pendiente" ? "alerta" : "neutro"}`}>
                        {dinero(pagoReciente.montoCentavos, pagoReciente.moneda)}
                      </b>
                    ) : "—"}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="al-fila-acciones">
                      <button type="button" className="boton mini fantasma" onClick={() => setSelId(f.prospectoId)} title="Ver ficha completa">
                        <IconoPanel n="ojo" cls="ic-sm" /> Ver
                      </button>
                      <button type="button" className="boton mini fantasma" onClick={() => setEditId(f.prospectoId)} title="Editar nombre, WhatsApp y correo">
                        <IconoPanel n="editar" cls="ic-sm" /> Editar
                      </button>
                      {f.alumno?.puedeDarBaja && <BotonBaja alumnoId={f.alumno.id} />}
                      <EliminarRegistroBoton fila={f} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {sel && <FichaDetalle fila={sel} onCerrar={() => setSelId(null)} />}
      {edit && <EditarAlumnoFrame fila={edit} onCerrar={() => setEditId(null)} />}
    </div>
  );
}
