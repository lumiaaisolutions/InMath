"use client";
import { useActionState, useState } from "react";
import { IconoPanel } from "@/components/IconoPanel";
import { Velo, useToastResultado } from "../ClientePanel";
import {
  cursoActualizarAccion, cuponCrearAccion, cuponActivoAccion, procesadorPagoAccion, type Resultado,
} from "./acciones";

const dinero = (centavos: number) => (centavos / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ── Controles propios (sin <select> ni <input type="checkbox"> nativos) ─ */

function Segmentado<T extends string>({ opciones, valor, onChange }: {
  opciones: { valor: T; nombre: string }[]; valor: T; onChange: (v: T) => void;
}) {
  return (
    <div className="seg" role="radiogroup">
      {opciones.map((o) => (
        <button key={o.valor} type="button" role="radio" aria-checked={valor === o.valor}
          className={`seg-op${valor === o.valor ? " on" : ""}`} onClick={() => onChange(o.valor)}>
          {o.nombre}
        </button>
      ))}
    </div>
  );
}

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
};

const MODALIDADES = [
  { valor: "asesorias" as const, nombre: "Solo asesorías" },
  { valor: "video" as const, nombre: "Solo video" },
  { valor: "ambos" as const, nombre: "Asesorías + video" },
];

function FormularioCurso({ curso, onListo, onCerrar }: { curso: Curso; onListo: () => void; onCerrar: () => void }) {
  const toast = useToastResultado();
  const [modalidad, setModalidad] = useState(curso.modalidad as "asesorias" | "video" | "ambos");
  const [destacado, setDestacado] = useState(curso.destacado);
  const [activo, setActivo] = useState(curso.activo);
  const [promoActiva, setPromoActiva] = useState(curso.promocion_activa);
  const [, accion, pendiente] = useActionState<Resultado, FormData>(async (prev, fd) => {
    fd.set("modalidad", modalidad);
    if (destacado) fd.set("destacado", "on"); else fd.delete("destacado");
    if (activo) fd.set("activo", "on"); else fd.delete("activo");
    if (promoActiva) fd.set("promocion_activa", "on"); else fd.delete("promocion_activa");
    const r = await cursoActualizarAccion(prev, fd);
    toast(r);
    if (r.ok) onListo();
    return r;
  }, {});

  return (
    <form action={accion} className="al-editor">
      <input type="hidden" name="id" value={curso.id} />

      <div className="al-paso">
        <div className="al-paso-tit"><span className="al-paso-n">1</span> Nombre del curso</div>
        <div className="al-campo">
          <input type="text" name="nombre" required maxLength={190} defaultValue={curso.nombre} placeholder="Como lo va a ver el alumno" />
        </div>
      </div>

      <div className="al-paso">
        <div className="al-paso-tit"><span className="al-paso-n">2</span> Cuánto cuesta</div>
        <div className="al-fila2">
          <div className="al-campo">
            <label>Precio de venta ({curso.moneda})</label>
            <input type="number" name="precio" required min={1} step="0.01" defaultValue={(curso.precio_centavos / 100).toFixed(2)} />
          </div>
          <div className="al-campo">
            <label>Duración (semanas)</label>
            <input type="number" name="duracion_semanas" min={1} defaultValue={curso.duracion_semanas ?? ""} />
          </div>
        </div>
      </div>

      <div className="al-paso">
        <div className="al-paso-tit"><span className="al-paso-n">3</span> Cómo se imparte</div>
        <Segmentado opciones={MODALIDADES} valor={modalidad} onChange={setModalidad} />
      </div>

      <div className="al-paso">
        <div className="al-paso-tit"><span className="al-paso-n">4</span> Dónde y cómo se muestra</div>
        <div className="al-campo">
          <label>Orden en la página (los números más chicos aparecen primero)</label>
          <input type="number" name="orden" defaultValue={curso.orden} style={{ maxWidth: 120 }} />
        </div>
        <Interruptor activo={destacado} onChange={setDestacado} etiqueta="Plan recomendado" detalle="Se resalta como la mejor opción en la página de inicio" />
        <Interruptor activo={activo} onChange={setActivo} etiqueta="Curso visible" detalle={activo ? "Los alumnos nuevos pueden inscribirse" : "Oculto — nadie puede inscribirse a este curso"} />
      </div>

      <div className="al-paso">
        <div className="al-paso-tit"><span className="al-paso-n">5</span> Promoción</div>
        <Interruptor activo={promoActiva} onChange={setPromoActiva} etiqueta="Mostrar promoción" detalle="Un precio tachado y un mensaje de oferta en la página de inicio" />
        {promoActiva && (
          <div className="al-campo-anidado">
            <div className="al-campo">
              <label>Precio anterior — se muestra tachado (debe ser mayor al precio de venta)</label>
              <input type="number" name="precio_original" min={1} step="0.01" defaultValue={curso.precio_original_centavos ? (curso.precio_original_centavos / 100).toFixed(2) : ""} />
            </div>
            <div className="al-campo">
              <label>Mensaje de la promoción (opcional)</label>
              <input type="text" name="promocion_texto" maxLength={160} defaultValue={curso.promocion_texto ?? ""} placeholder="Ej. Ahorras $500 inscribiéndote hoy" />
            </div>
            <div className="al-campo">
              <label>Se apaga sola el (opcional)</label>
              <input type="datetime-local" name="promocion_expira_en" defaultValue={curso.promocion_expira_en ?? ""} />
            </div>
          </div>
        )}
      </div>

      <div className="us-pie">
        <button type="button" className="boton fantasma" onClick={onCerrar}>Cancelar</button>
        <button className="boton primario" disabled={pendiente}>{pendiente ? "Guardando…" : "Guardar cambios"}</button>
      </div>
    </form>
  );
}

const MODALIDAD_ETQ: Record<string, string> = { asesorias: "Asesorías", video: "Video", ambos: "Asesorías + video" };

export function ListaCursos({ inicial }: { inicial: Curso[] }) {
  const [editando, setEditando] = useState<Curso | null>(null);
  return (
    <div>
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

      <Velo abierto={editando !== null} onCerrar={() => setEditando(null)}>
        <div className="us-frame" role="dialog" aria-modal="true">
          <div className="us-frame-cab">
            <div className="us-quien"><b>{editando?.nombre}</b><span>Precio, cómo se imparte y promoción</span></div>
            <button type="button" className="toast-x us-cerrar" aria-label="Cerrar" onClick={() => setEditando(null)}><IconoPanel n="x" /></button>
          </div>
          {editando && <FormularioCurso curso={editando} onListo={() => setEditando(null)} onCerrar={() => setEditando(null)} />}
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

function FormularioCupon({ cursos, onListo, onCerrar }: { cursos: CursoLigero[]; onListo: () => void; onCerrar: () => void }) {
  const toast = useToastResultado();
  const [tipo, setTipo] = useState<"porcentaje" | "monto_fijo">("porcentaje");
  const [cursoId, setCursoId] = useState<string>("");
  const [, accion, pendiente] = useActionState<Resultado, FormData>(async (prev, fd) => {
    fd.set("tipo", tipo);
    fd.set("curso_id", cursoId);
    const r = await cuponCrearAccion(prev, fd);
    toast(r);
    if (r.ok) onListo();
    return r;
  }, {});

  const opcionesCurso = [{ valor: "", nombre: "Todos los cursos" }, ...cursos.map((c) => ({ valor: String(c.id), nombre: c.nombre }))];

  return (
    <form action={accion} className="al-editor">
      <div className="al-paso">
        <div className="al-paso-tit"><span className="al-paso-n">1</span> El código</div>
        <div className="al-campo">
          <label>El alumno lo escribe al elegir cómo pagar</label>
          <input type="text" name="codigo" required maxLength={40} style={{ textTransform: "uppercase" }} placeholder="Ej. INMATH10" />
        </div>
      </div>

      <div className="al-paso">
        <div className="al-paso-tit"><span className="al-paso-n">2</span> Para qué curso aplica</div>
        <Segmentado opciones={opcionesCurso} valor={cursoId} onChange={setCursoId} />
      </div>

      <div className="al-paso">
        <div className="al-paso-tit"><span className="al-paso-n">3</span> Cuánto descuenta</div>
        <Segmentado
          opciones={[{ valor: "porcentaje" as const, nombre: "Porcentaje (%)" }, { valor: "monto_fijo" as const, nombre: "Monto fijo ($)" }]}
          valor={tipo} onChange={setTipo}
        />
        <div className="al-campo" style={{ marginTop: 10 }}>
          <label>{tipo === "porcentaje" ? "Porcentaje de descuento (1-100)" : "Monto que se descuenta ($)"}</label>
          <input type="number" name="valor" required min={1} max={tipo === "porcentaje" ? 100 : undefined} step={tipo === "porcentaje" ? 1 : 0.01} style={{ maxWidth: 160 }} />
        </div>
      </div>

      <div className="al-paso">
        <div className="al-paso-tit"><span className="al-paso-n">4</span> Límites (opcional)</div>
        <div className="al-fila2">
          <div className="al-campo">
            <label>Cuántas veces se puede usar</label>
            <input type="number" name="usos_maximos" min={1} placeholder="Sin límite" />
          </div>
          <div className="al-campo">
            <label>Deja de funcionar el</label>
            <input type="datetime-local" name="expira_en" />
          </div>
        </div>
      </div>

      <div className="us-pie">
        <button type="button" className="boton fantasma" onClick={onCerrar}>Cancelar</button>
        <button className="boton primario" disabled={pendiente}>{pendiente ? "Creando…" : "Crear cupón"}</button>
      </div>
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
        <div className="us-frame" role="dialog" aria-modal="true">
          <div className="us-frame-cab">
            <div className="us-quien"><b>Crear cupón</b><span>El alumno lo captura al elegir cómo pagar</span></div>
            <button type="button" className="toast-x us-cerrar" aria-label="Cerrar" onClick={() => setAbierto(false)}><IconoPanel n="x" /></button>
          </div>
          <FormularioCupon cursos={cursos} onListo={() => setAbierto(false)} onCerrar={() => setAbierto(false)} />
        </div>
      </Velo>
    </div>
  );
}
