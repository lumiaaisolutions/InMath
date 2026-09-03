"use client";
import { useActionState, useRef, useState } from "react";
import { IconoPanel } from "@/components/IconoPanel";
import { Velo, ConfirmarDialogo, useToastResultado, Segmentado, BotonMagnetico, SelectorFechaHora, Asistente, AsistentePaso } from "../ClientePanel";
import {
  cursoActualizarAccion, cursoCrearAccion, cursoEliminarAccion, cursoImagenSubirAccion,
  cuponCrearAccion, cuponActivoAccion, procesadorPagoAccion, type Resultado,
} from "./acciones";

const dinero = (centavos: number) => (centavos / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ── Controles propios (sin <select> ni <input type="checkbox"> nativos) ─ */

function Interruptor({ activo, onChange, etiqueta, detalle }: { activo: boolean; onChange: (v: boolean) => void; etiqueta: string; detalle?: string }) {
  return (
    <button type="button" className={`interr${activo ? " on" : ""}`} role="switch" aria-checked={activo} onClick={() => onChange(!activo)}>
      <span className="interr-sw" aria-hidden="true" />
      <span className="interr-tx"><b>{etiqueta}</b>{detalle && <i>{detalle}</i>}</span>
    </button>
  );
}

/* ── Mercado Pago ─────────────────────────────────────────────────────── */

export function SwitchMercadoPago({ activo: activoInicial }: { activo: boolean }) {
  const toast = useToastResultado();
  const [activo, setActivo] = useState(activoInicial);
  const [pendiente, setPendiente] = useState(false);

  return (
    <button type="button" className={`interr pp-interr-ancho${activo ? " on" : ""}`} role="switch" aria-checked={activo} disabled={pendiente}
      onClick={async () => {
        setPendiente(true);
        const fd = new FormData();
        if (!activo) fd.set("mercadopago_activo", "on");
        const r = await procesadorPagoAccion({}, fd);
        toast(r);
        if (r.ok) setActivo(!activo);
        setPendiente(false);
      }}>
      <span className="interr-sw" aria-hidden="true" />
      <span className="interr-tx">
        <b>Cobrar con tarjeta y OXXO</b>
        <i>{activo ? "Encendido — tus alumnos pueden pagar en línea al instante" : "Apagado — solo pueden pagar por transferencia"}</i>
      </span>
    </button>
  );
}

/* ── Cursos y paquetes ────────────────────────────────────────────────── */

type Curso = {
  id: number; nombre: string; precio_centavos: number; precio_original_centavos: number | null;
  moneda: string; duracion_semanas: number | null; modalidad: string;
  promocion_activa: boolean; promocion_texto: string | null; promocion_expira_en: string | null;
  destacado: boolean; activo: boolean; orden: number;
  descripcion?: string | null; imagen?: string | null;
};

const MODALIDADES = [
  { valor: "asesorias" as const, nombre: "Solo asesorías" },
  { valor: "video" as const, nombre: "Solo video" },
  { valor: "ambos" as const, nombre: "Asesorías + video" },
];

const SEMANAS_POR_MES = 52 / 12;
const UNIDADES_DURACION = [
  { valor: "semanas" as const, nombre: "Semanas" },
  { valor: "meses" as const, nombre: "Meses" },
];

/** Vista previa en vivo — la MISMA tarjeta que ve el alumno, alimentada por
 *  el estado actual del formulario (no por lo que ya está guardado). */
function VistaPreviaCurso({ nombre, moneda, precio, precioOriginal, promoActiva, promoTexto, destacado, activo, modalidad }: {
  nombre: string; moneda: string; precio: number; precioOriginal: number | null;
  promoActiva: boolean; promoTexto: string; destacado: boolean; activo: boolean; modalidad: string;
}) {
  const promoValida = promoActiva && precioOriginal !== null && precioOriginal > precio;
  return (
    <div className="pp-preview">
      <span className="pp-preview-etq"><IconoPanel n="imagen" cls="ic-sm" /> Así se ve para el alumno</span>
      <div className="al-tarj pp-curso-tarj pp-preview-tarj">
        <div className="pp-curso-tarj-cab">
          <b>{nombre || "Nombre del curso"}</b>
          <span className={`gaje ${activo ? "ok" : "neutro"}`}>{activo ? "visible" : "oculto"}</span>
        </div>
        <div className="pp-curso-tarj-precio">
          <b>${dinero(Math.round(precio * 100))}</b> {moneda}
          {promoValida && <s>${dinero(Math.round((precioOriginal ?? 0) * 100))}</s>}
        </div>
        <div className="pp-curso-tarj-pie">
          <span>{MODALIDAD_ETQ[modalidad] ?? modalidad}</span>
          {destacado && <span className="gaje grad">recomendado</span>}
          {promoValida && <span className="gaje ok">{promoTexto || "promoción activa"}</span>}
        </div>
      </div>
      <p className="pp-preview-donde">
        {!activo
          ? "Oculto — no aparece en ningún lado del sitio hasta que lo actives."
          : destacado
            ? "Aparece como el plan destacado en la portada del sitio (inicio) y en la lista completa de /pago."
            : "Aparece en la lista completa de planes de /pago. Actívalo como \"Plan recomendado\" para que también aparezca en la portada del sitio."}
      </p>
    </div>
  );
}

const CURSO_VACIO: Curso = {
  id: 0, nombre: "", precio_centavos: 0, precio_original_centavos: null, moneda: "MXN",
  duracion_semanas: 8, modalidad: "asesorias", promocion_activa: false, promocion_texto: null,
  promocion_expira_en: null, destacado: false, activo: true, orden: 0, descripcion: null, imagen: null,
};

const PASOS_CURSO = [
  { titulo: "Datos básicos", sub: "Nombre, modalidad y duración" },
  { titulo: "Precio y promoción", sub: "Cuánto cuesta y si hay oferta" },
  { titulo: "Visibilidad", sub: "Dónde y cómo se muestra" },
  { titulo: "Portal del alumno", sub: "Descripción e imagen de la fase" },
];

function FormularioCurso({ curso, onListo, onCerrar }: { curso: Curso | null; onListo: () => void; onCerrar: () => void }) {
  const base = curso ?? CURSO_VACIO;
  const esNuevo = curso === null;
  const toast = useToastResultado();
  const [nombre, setNombre] = useState(base.nombre);
  const [precio, setPrecio] = useState(base.precio_centavos / 100);
  const [precioOriginal, setPrecioOriginal] = useState(base.precio_original_centavos ? base.precio_original_centavos / 100 : null);
  const [promocionTexto, setPromocionTexto] = useState(base.promocion_texto ?? "");
  const [modalidad, setModalidad] = useState(base.modalidad as "asesorias" | "video" | "ambos");
  const [destacado, setDestacado] = useState(base.destacado);
  const [activo, setActivo] = useState(base.activo);
  const [promoActiva, setPromoActiva] = useState(base.promocion_activa);
  const [unidadDuracion, setUnidadDuracion] = useState<"semanas" | "meses">("semanas");
  const [duracionSemanas, setDuracionSemanas] = useState(base.duracion_semanas ?? 1);
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [promocionExpira, setPromocionExpira] = useState(base.promocion_expira_en ?? "");
  const [descripcion, setDescripcion] = useState(base.descripcion ?? "");
  const [imagen, setImagen] = useState(base.imagen ?? "");
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [paso, setPaso] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const duracionMostrada = unidadDuracion === "semanas" ? duracionSemanas : Math.round((duracionSemanas / SEMANAS_POR_MES) * 10) / 10;

  /** Valida solo los campos visibles del paso actual antes de avanzar. */
  function siguiente() {
    const invalido = formRef.current?.querySelector<HTMLElement>(`[data-paso="${paso}"] :invalid`);
    if (invalido) { (invalido as HTMLInputElement).reportValidity(); return; }
    setPaso((p) => p + 1);
  }

  const [, accion, pendiente] = useActionState<Resultado, FormData>(async (prev, fd) => {
    fd.set("modalidad", modalidad);
    fd.set("duracion_semanas", String(duracionSemanas));
    fd.set("promocion_expira_en", promocionExpira);
    fd.set("descripcion", descripcion);
    fd.set("imagen", imagen);
    if (destacado) fd.set("destacado", "on"); else fd.delete("destacado");
    if (activo) fd.set("activo", "on"); else fd.delete("activo");
    if (promoActiva) fd.set("promocion_activa", "on"); else fd.delete("promocion_activa");
    const r = await (esNuevo ? cursoCrearAccion : cursoActualizarAccion)(prev, fd);
    toast(r);
    if (r.ok) { setPaso(0); onListo(); }
    return r;
  }, {});

  function cerrar() { setPaso(0); onCerrar(); }

  return (
    <form action={accion} className="al-editor" ref={formRef}>
      {!esNuevo && <input type="hidden" name="id" value={base.id} />}

      <VistaPreviaCurso
        nombre={nombre} moneda={base.moneda} precio={precio} precioOriginal={precioOriginal}
        promoActiva={promoActiva} promoTexto={promocionTexto} destacado={destacado} activo={activo} modalidad={modalidad}
      />

      <Asistente pasos={PASOS_CURSO} activo={paso}>
        <div data-paso="0" style={{ display: paso === 0 ? "block" : "none" }}>
          <AsistentePaso eyebrow="Paso 1 de 4" titulo="Datos básicos del curso">
            <label className="pl-campo ancho">Nombre del curso
              <input type="text" name="nombre" required maxLength={190} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Como lo va a ver el alumno" />
            </label>
            <label className="pl-campo ancho">Cómo se imparte
              <Segmentado opciones={MODALIDADES} valor={modalidad} onChange={setModalidad} />
            </label>
            <label className="pl-campo ancho">Duración
              <div className="pp-duracion">
                <input type="number" min={0.5} step="any" value={duracionMostrada}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value) || 0;
                    setDuracionSemanas(Math.max(1, Math.round(unidadDuracion === "semanas" ? v : v * SEMANAS_POR_MES)));
                  }} />
                <Segmentado opciones={UNIDADES_DURACION} valor={unidadDuracion} onChange={setUnidadDuracion} />
              </div>
              <small className="pp-duracion-ayuda">= {duracionSemanas} semana{duracionSemanas === 1 ? "" : "s"} en total</small>
            </label>
          </AsistentePaso>
        </div>

        <div data-paso="1" style={{ display: paso === 1 ? "block" : "none" }}>
          <AsistentePaso eyebrow="Paso 2 de 4" titulo="Precio y promoción">
            <label className="pl-campo">Precio de venta ({base.moneda})
              <input type="number" name="precio" required min={1} step="0.01" value={precio} onChange={(e) => setPrecio(parseFloat(e.target.value) || 0)} />
            </label>
            <div className="pl-campo ancho">
              <Interruptor activo={promoActiva} onChange={setPromoActiva} etiqueta="Mostrar promoción" detalle="Un precio tachado y un mensaje de oferta en la página de inicio" />
            </div>
            {promoActiva && (
              <div className="pl-campo ancho al-campo-anidado">
                <div className="al-campo">
                  <label>Precio anterior — se muestra tachado (debe ser mayor al precio de venta)</label>
                  <input type="number" name="precio_original" min={1} step="0.01"
                    value={precioOriginal ?? ""} onChange={(e) => setPrecioOriginal(e.target.value ? parseFloat(e.target.value) : null)} />
                </div>
                <div className="al-campo">
                  <label>Mensaje de la promoción (opcional)</label>
                  <input type="text" name="promocion_texto" maxLength={160} value={promocionTexto} onChange={(e) => setPromocionTexto(e.target.value)} placeholder="Ej. Ahorras $500 inscribiéndote hoy" />
                </div>
                <div className="al-campo">
                  <label>Se apaga sola el (opcional)</label>
                  <SelectorFechaHora valor={promocionExpira} onChange={setPromocionExpira} />
                </div>
              </div>
            )}
          </AsistentePaso>
        </div>

        <div data-paso="2" style={{ display: paso === 2 ? "block" : "none" }}>
          <AsistentePaso eyebrow="Paso 3 de 4" titulo="Dónde y cómo se muestra">
            <label className="pl-campo">Orden en la página <small>(los números más chicos aparecen primero)</small>
              <input type="number" name="orden" defaultValue={base.orden} style={{ maxWidth: 120 }} />
            </label>
            <div className="pl-campo ancho">
              <Interruptor activo={destacado} onChange={setDestacado} etiqueta="Plan recomendado" detalle="Se resalta como la mejor opción en la página de inicio" />
            </div>
            <div className="pl-campo ancho">
              <Interruptor activo={activo} onChange={setActivo} etiqueta="Curso visible" detalle={activo ? "Los alumnos nuevos pueden inscribirse" : "Oculto — nadie puede inscribirse a este curso"} />
            </div>
          </AsistentePaso>
        </div>

        <div data-paso="3" style={{ display: paso === 3 ? "block" : "none" }}>
          <AsistentePaso eyebrow="Paso 4 de 4" titulo="Portal del alumno (Fases)">
            <label className="pl-campo ancho">Descripción <small>(el alumno la ve como tarjeta de su curso en &ldquo;Fases&rdquo;)</small>
              <textarea rows={2} maxLength={500} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej. Domina el EXANI-II a tu ritmo, con asesorías 1 a 1 y reporte semanal de avance." />
            </label>
            <div className="pl-campo ancho">
              <label>Imagen de la tarjeta <small>(opcional, 1000×560 recomendado)</small></label>
              {imagen && <img src={imagen} alt="" style={{ width: "100%", maxWidth: 320, borderRadius: 12, marginBottom: 8, display: "block" }} />}
              <label className="mat-dropzone">
                <input type="file" hidden accept=".jpg,.jpeg,.png,.webp"
                  onChange={async (e) => {
                    const archivo = e.target.files?.[0];
                    e.target.value = "";
                    if (!archivo) return;
                    setSubiendoImagen(true);
                    const fdImg = new FormData();
                    fdImg.set("imagen", archivo);
                    const r = await cursoImagenSubirAccion(fdImg);
                    setSubiendoImagen(false);
                    if (r.ok) setImagen(r.ok);
                  }} />
                <IconoPanel n="imagen" cls="ic-sm" />
                <span>{subiendoImagen ? "Subiendo…" : imagen ? "Cambiar imagen" : "Subir imagen"}</span>
              </label>
            </div>
          </AsistentePaso>
        </div>

        <div className="us-asistente-nav">
          <button type="button" className="boton fantasma" onClick={paso === 0 ? cerrar : () => setPaso((p) => p - 1)}>
            {paso === 0 ? "Cancelar" : "Atrás"}
          </button>
          {paso < PASOS_CURSO.length - 1
            ? <button type="button" key="paso-siguiente" className="boton primario" onClick={siguiente}>Siguiente</button>
            : <BotonMagnetico type="submit" className="boton primario boton-magnetico" disabled={pendiente}>
                {pendiente ? "Guardando…" : esNuevo ? "Agregar curso" : "Guardar cambios"}
              </BotonMagnetico>}
        </div>
      </Asistente>

      {!esNuevo && (
        <div className="us-eliminar-form">
          <button type="button" className="boton peligro" disabled={borrando} onClick={() => setConfirmarBorrar(true)}>{borrando ? "Eliminando…" : "Eliminar curso"}</button>
        </div>
      )}

      {!esNuevo && (
        <ConfirmarDialogo
          abierto={confirmarBorrar}
          texto={`Se eliminará "${base.nombre}" por completo. Si ya tiene pagos registrados, el sistema no dejará borrarlo — desactívalo en ese caso.`}
          onNo={() => setConfirmarBorrar(false)}
          onSi={async () => {
            setConfirmarBorrar(false);
            setBorrando(true);
            const r = await cursoEliminarAccion(base.id);
            toast(r);
            setBorrando(false);
            if (r.ok) onListo();
          }}
        />
      )}
    </form>
  );
}

const MODALIDAD_ETQ: Record<string, string> = { asesorias: "Asesorías", video: "Video", ambos: "Asesorías + video" };

export function ListaCursos({ inicial }: { inicial: Curso[] }) {
  const [editando, setEditando] = useState<"crear" | Curso | null>(null);
  return (
    <div>
      <div className="rx-cab"><BotonMagnetico className="boton primario boton-magnetico" onClick={() => setEditando("crear")}>+ Agregar curso</BotonMagnetico></div>
      {inicial.length === 0 ? (
        <div className="vacio">Sin cursos todavía — agrega el primer paquete vendible</div>
      ) : (
        <div className="pp-cursos-grid">
          {inicial.map((c) => (
            <button type="button" key={c.id} className="al-tarj pp-curso-tarj" onClick={() => setEditando(c)}>
              <div className="pp-curso-tarj-cab">
                <b>{c.nombre}</b>
                <span className={`gaje ${c.activo ? "ok" : "neutro"}`}>{c.activo ? "visible" : "oculto"}</span>
              </div>
              <div className="pp-curso-tarj-precio">
                <b>${dinero(c.precio_centavos)}</b> {c.moneda}
                {c.precio_original_centavos && <s>${dinero(c.precio_original_centavos)}</s>}
              </div>
              <div className="pp-curso-tarj-pie">
                <span>{MODALIDAD_ETQ[c.modalidad] ?? c.modalidad}</span>
                {c.destacado && <span className="gaje grad">recomendado</span>}
                {c.promocion_activa && <span className="gaje ok">promoción activa</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      <Velo abierto={editando !== null} onCerrar={() => setEditando(null)}>
        <div className="us-frame us-frame-asistente" role="dialog" aria-modal="true">
          <div className="us-frame-cab">
            <div className="us-quien"><b>{editando === "crear" ? "Agregar curso" : editando?.nombre}</b><span>Precio, cómo se imparte y promoción</span></div>
            <button type="button" className="toast-x us-cerrar" aria-label="Cerrar" onClick={() => setEditando(null)}><IconoPanel n="x" /></button>
          </div>
          {editando !== null && (
            <FormularioCurso curso={editando === "crear" ? null : editando} onListo={() => setEditando(null)} onCerrar={() => setEditando(null)} />
          )}
        </div>
      </Velo>
    </div>
  );
}

/* ── Cupones ──────────────────────────────────────────────────────────── */

type Cupon = {
  id: number; codigo: string; tipo: string; valor: number; curso_id: number | null; curso_nombre: string | null;
  activo: boolean; usos_maximos: number | null; expira_en: string | null;
};
type CursoLigero = { id: number; nombre: string };

const PASOS_CUPON = [
  { titulo: "Código y descuento", sub: "Qué escribe el alumno y cuánto descuenta" },
  { titulo: "Vigencia", sub: "Límites de uso y caducidad" },
];

function FormularioCupon({ cursos, onListo, onCerrar }: { cursos: CursoLigero[]; onListo: () => void; onCerrar: () => void }) {
  const toast = useToastResultado();
  const [tipo, setTipo] = useState<"porcentaje" | "monto_fijo">("porcentaje");
  const [cursoId, setCursoId] = useState<string>("");
  const [expiraEn, setExpiraEn] = useState("");
  const [paso, setPaso] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const [, accion, pendiente] = useActionState<Resultado, FormData>(async (prev, fd) => {
    fd.set("tipo", tipo);
    fd.set("curso_id", cursoId);
    fd.set("expira_en", expiraEn);
    const r = await cuponCrearAccion(prev, fd);
    toast(r);
    if (r.ok) { setPaso(0); onListo(); }
    return r;
  }, {});

  function cerrar() { setPaso(0); onCerrar(); }

  /** Valida solo los campos visibles del paso actual antes de avanzar. */
  function siguiente() {
    const invalido = formRef.current?.querySelector<HTMLElement>(`[data-paso="${paso}"] :invalid`);
    if (invalido) { (invalido as HTMLInputElement).reportValidity(); return; }
    setPaso((p) => p + 1);
  }

  const opcionesCurso = [{ valor: "", nombre: "Todos los cursos" }, ...cursos.map((c) => ({ valor: String(c.id), nombre: c.nombre }))];

  return (
    <form action={accion} ref={formRef}>
      <Asistente pasos={PASOS_CUPON} activo={paso}>
        <div data-paso="0" style={{ display: paso === 0 ? "block" : "none" }}>
          <AsistentePaso eyebrow="Paso 1 de 2" titulo="Código y descuento">
            <label className="pl-campo ancho">El alumno lo escribe al elegir cómo pagar
              <input type="text" name="codigo" required maxLength={40} style={{ textTransform: "uppercase" }} placeholder="Ej. INMATH10" />
            </label>
            <label className="pl-campo ancho">Para qué curso aplica
              <Segmentado opciones={opcionesCurso} valor={cursoId} onChange={setCursoId} />
            </label>
            <label className="pl-campo ancho">Cuánto descuenta
              <Segmentado
                opciones={[{ valor: "porcentaje" as const, nombre: "Porcentaje (%)" }, { valor: "monto_fijo" as const, nombre: "Monto fijo ($)" }]}
                valor={tipo} onChange={setTipo}
              />
            </label>
            <label className="pl-campo">{tipo === "porcentaje" ? "Porcentaje de descuento (1-100)" : "Monto que se descuenta ($)"}
              <input type="number" name="valor" required min={1} max={tipo === "porcentaje" ? 100 : undefined} step={tipo === "porcentaje" ? 1 : 0.01} style={{ maxWidth: 160 }} />
            </label>
          </AsistentePaso>
        </div>

        <div data-paso="1" style={{ display: paso === 1 ? "block" : "none" }}>
          <AsistentePaso eyebrow="Paso 2 de 2" titulo="Vigencia (opcional)">
            <label className="pl-campo">Cuántas veces se puede usar
              <input type="number" name="usos_maximos" min={1} placeholder="Sin límite" />
            </label>
            <label className="pl-campo">Deja de funcionar el
              <SelectorFechaHora valor={expiraEn} onChange={setExpiraEn} />
            </label>
          </AsistentePaso>
        </div>

        <div className="us-asistente-nav">
          <button type="button" className="boton fantasma" onClick={paso === 0 ? cerrar : () => setPaso((p) => p - 1)}>
            {paso === 0 ? "Cancelar" : "Atrás"}
          </button>
          {paso < PASOS_CUPON.length - 1
            ? <button type="button" key="paso-siguiente" className="boton primario" onClick={siguiente}>Siguiente</button>
            : <button type="submit" className="boton primario" disabled={pendiente}>{pendiente ? "Creando…" : "Crear cupón"}</button>}
        </div>
      </Asistente>
    </form>
  );
}

function ToggleCupon({ id, activo }: { id: number; activo: boolean }) {
  const toast = useToastResultado();
  const [pendiente, setPendiente] = useState(false);
  return (
    <button type="button" className={`gaje ${activo ? "ok" : "neutro"}`} disabled={pendiente}
      onClick={async () => { setPendiente(true); toast(await cuponActivoAccion(id, !activo)); setPendiente(false); }}>
      {activo ? "activo" : "inactivo"}
    </button>
  );
}

export function ListaCupones({ inicial, cursos }: { inicial: Cupon[]; cursos: CursoLigero[] }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div>
      <div className="rx-cab"><button type="button" className="boton primario" onClick={() => setAbierto(true)}>+ Crear cupón</button></div>
      <div className="pp-cupones-scroll">
      <table className="lista">
        <thead><tr><th>Código</th><th>Descuento</th><th>Para</th><th>Usos</th><th>Deja de funcionar</th><th>Estado</th></tr></thead>
        <tbody>
          {inicial.length === 0 && <tr><td colSpan={6}><div className="vacio">Sin cupones todavía — crea el primero</div></td></tr>}
          {inicial.map((c) => (
            <tr key={c.id}>
              <td style={{ fontFamily: "var(--mono)", fontWeight: 700 }}>{c.codigo}</td>
              <td>{c.tipo === "porcentaje" ? `${c.valor}%` : `$${dinero(c.valor)}`}</td>
              <td>{c.curso_nombre ?? "Todos los cursos"}</td>
              <td>{c.usos_maximos ?? "Sin límite"}</td>
              <td>{c.expira_en ? new Date(c.expira_en).toLocaleDateString("es-MX") : "No expira"}</td>
              <td><ToggleCupon id={c.id} activo={c.activo} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      <Velo abierto={abierto} onCerrar={() => setAbierto(false)}>
        <div className="us-frame us-frame-asistente" role="dialog" aria-modal="true">
          <div className="us-frame-cab">
            <div className="us-quien"><b>Crear cupón</b><span>El alumno lo captura al elegir cómo pagar</span></div>
            <button type="button" className="toast-x us-cerrar" aria-label="Cerrar" onClick={() => setAbierto(false)}><IconoPanel n="x" /></button>
          </div>
          {abierto && <FormularioCupon cursos={cursos} onListo={() => setAbierto(false)} onCerrar={() => setAbierto(false)} />}
        </div>
      </Velo>
    </div>
  );
}
