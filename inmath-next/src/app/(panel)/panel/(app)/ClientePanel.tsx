"use client";
import { useEffect, useLayoutEffect, useRef, useState, createContext, useContext } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Liquid } from "liquid-gooey";
import { motion, useSpring } from "motion/react";
import { IconoPanel } from "@/components/IconoPanel";
import { MascotaMathy } from "@/components/MascotaMathy";
import { useMathyVisible } from "@/components/MathyVisibilidad";
import { logoutAccion, agentePanelAccion } from "./acciones";

/**
 * Control propio de opciones (reemplaza <select>): la píldora que marca la
 * opción activa no salta con un cambio de clase — se mide la opción elegida
 * y un `Liquid.Item effect="move"` (liquid-gooey) la hace "chorrear" hasta
 * ahí, como un indicador de tab líquido. Único en todo el sistema — todos
 * los módulos lo importan de aquí en vez de duplicarlo.
 */
export function Segmentado<T extends string>({ opciones, valor, onChange }: {
  opciones: { valor: T; nombre: string; icono?: string }[]; valor: T; onChange: (v: T) => void;
}) {
  const contRef = useRef<HTMLDivElement>(null);
  const botRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [rect, setRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  useLayoutEffect(() => {
    const cont = contRef.current;
    const bot = botRefs.current[valor];
    if (!cont || !bot) return;
    const medir = () => {
      const c = cont.getBoundingClientRect();
      const b = bot.getBoundingClientRect();
      setRect({ x: b.left - c.left, y: b.top - c.top, w: b.width, h: b.height });
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(cont);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor, opciones.length]);

  return (
    <div className="seg" role="radiogroup" ref={contRef}>
      {rect && (
        <Liquid className="seg-liquido" style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}
          fill="var(--seg-pildora, rgba(107,159,255,.16))">
          <Liquid.Item effect="move" move={{ springiness: .6, wobble: .35, trail: .45 }}>
            <div className="seg-pildora" style={{ width: rect.w, height: rect.h, transform: `translate(${rect.x}px, ${rect.y}px)` }} />
          </Liquid.Item>
        </Liquid>
      )}
      {opciones.map((o) => (
        <button key={o.valor} type="button" role="radio" aria-checked={valor === o.valor}
          ref={(el) => { botRefs.current[o.valor] = el; }}
          className={`seg-op${valor === o.valor ? " on" : ""}`} onClick={() => onChange(o.valor)}>
          {o.icono && <IconoPanel n={o.icono} cls="ic-sm" />} {o.nombre}
        </button>
      ))}
    </div>
  );
}

/**
 * Desplegable propio (reemplaza <select> cuando hay demasiadas opciones para
 * pastillas — ej. filtrar por asesor). Botón + lista flotante con blur al
 * salir del foco, sin ningún elemento nativo de formulario.
 */
export function SelectorDesplegable({ opciones, valor, onChange, placeholder = "Todos", sinVacio = false }: {
  opciones: { valor: string; nombre: string }[]; valor: string; onChange: (v: string) => void; placeholder?: string; sinVacio?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const actual = opciones.find((o) => o.valor === valor)?.nombre ?? placeholder;
  return (
    <div className="desp" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setAbierto(false); }}>
      <button type="button" className="desp-btn" onClick={() => setAbierto((a) => !a)} aria-haspopup="listbox" aria-expanded={abierto}>
        <span>{actual}</span>
        <IconoPanel n="abajo" cls="ic-sm" />
      </button>
      {abierto && (
        <div className="desp-lista" role="listbox">
          {!sinVacio && (
            <button type="button" role="option" aria-selected={valor === ""} className={`desp-op${valor === "" ? " on" : ""}`}
              onClick={() => { onChange(""); setAbierto(false); }}>{placeholder}</button>
          )}
          {opciones.map((o) => (
            <button key={o.valor} type="button" role="option" aria-selected={valor === o.valor}
              className={`desp-op${valor === o.valor ? " on" : ""}`}
              onClick={() => { onChange(o.valor); setAbierto(false); }}>
              {o.nombre}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const HORAS_DIA: string[] = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);

/** Selector de hora propio (reemplaza <input type="time">). */
export function SelectorHora({ valor, onChange, min, max }: { valor: string; onChange: (v: string) => void; min?: string; max?: string }) {
  const [abierto, setAbierto] = useState(false);
  const horas = HORAS_DIA.filter((h) => (!min || h >= min) && (!max || h <= max));
  return (
    <div className="disp-hora-sel" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setAbierto(false); }}>
      <button type="button" className="disp-hora-btn" onClick={() => setAbierto((a) => !a)} aria-haspopup="listbox" aria-expanded={abierto}>
        {valor || "— : —"}
      </button>
      {abierto && (
        <div className="disp-hora-lista" role="listbox">
          {horas.map((h) => (
            <button key={h} type="button" role="option" aria-selected={h === valor}
              className={`disp-hora-op${h === valor ? " on" : ""}`}
              onClick={() => { onChange(h); setAbierto(false); }}>
              {h}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const DIAS_SEM = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];
const MESES_ANIO = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const aIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Selector de fecha propio (reemplaza <input type="date">): botón + calendario mensual flotante. */
export function SelectorFecha({ valor, onChange, min }: { valor: string; onChange: (v: string) => void; min?: string }) {
  const [abierto, setAbierto] = useState(false);
  const base = valor ? new Date(`${valor}T00:00:00`) : new Date();
  const [mesVisto, setMesVisto] = useState(() => new Date(base.getFullYear(), base.getMonth(), 1));
  const hoy = aIso(new Date());
  const primerDia = new Date(mesVisto.getFullYear(), mesVisto.getMonth(), 1);
  const diasEnMes = new Date(mesVisto.getFullYear(), mesVisto.getMonth() + 1, 0).getDate();
  const celdas: (Date | null)[] = ([] as (Date | null)[])
    .concat(Array.from({ length: primerDia.getDay() }, () => null))
    .concat(Array.from({ length: diasEnMes }, (_, i) => new Date(mesVisto.getFullYear(), mesVisto.getMonth(), i + 1)));
  const etq = valor
    ? `${base.getDate()} de ${MESES_ANIO[base.getMonth()]} de ${base.getFullYear()}`
    : "Elegir fecha";

  return (
    <div className="disp-hora-sel" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setAbierto(false); }}>
      <button type="button" className="disp-hora-btn" onClick={() => setAbierto((a) => !a)} aria-haspopup="dialog" aria-expanded={abierto}>
        <IconoPanel n="calendar" cls="ic-sm" /> {etq}
      </button>
      {abierto && (
        <div className="disp-fecha-cal" role="dialog">
          <div className="disp-fecha-nav">
            <button type="button" className="icono-burbuja" aria-label="Mes anterior"
              onClick={() => setMesVisto(new Date(mesVisto.getFullYear(), mesVisto.getMonth() - 1, 1))}>‹</button>
            <b>{MESES_ANIO[mesVisto.getMonth()]} {mesVisto.getFullYear()}</b>
            <button type="button" className="icono-burbuja" aria-label="Mes siguiente"
              onClick={() => setMesVisto(new Date(mesVisto.getFullYear(), mesVisto.getMonth() + 1, 1))}>›</button>
          </div>
          <div className="disp-fecha-sem">{DIAS_SEM.map((d) => <span key={d}>{d}</span>)}</div>
          <div className="disp-fecha-grid">
            {celdas.map((d, i) => {
              if (!d) return <span key={i} />;
              const iso = aIso(d);
              const deshabilitado = !!min && iso < min;
              return (
                <button key={i} type="button" disabled={deshabilitado}
                  className={`disp-fecha-dia${iso === valor ? " on" : ""}${iso === hoy ? " hoy" : ""}`}
                  onClick={() => { onChange(iso); setAbierto(false); }}>
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/** Fecha + hora combinadas — reemplaza a <input type="datetime-local">. Valor/salida en
 *  formato "YYYY-MM-DDTHH:MM", igual al que espera un <input type="datetime-local"> nativo. */
export function SelectorFechaHora({ valor, onChange, min }: { valor: string; onChange: (v: string) => void; min?: string }) {
  const [fecha, hora] = valor ? valor.split("T") : ["", ""];
  const cambiar = (f: string, h: string) => onChange(f && h ? `${f}T${h}` : "");
  return (
    <div className="sel-fecha-hora">
      <SelectorFecha valor={fecha ?? ""} onChange={(f) => cambiar(f, hora || "12:00")} min={min?.split("T")[0]} />
      <SelectorHora valor={hora ?? ""} onChange={(h) => cambiar(fecha, h)} />
    </div>
  );
}

/** Contador +/- — reemplaza a <input type="number">. */
export function SelectorNumero({ valor, onChange, min = 1, max = 99 }: { valor: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div className="sel-num">
      <button type="button" className="sel-num-btn" disabled={valor <= min} aria-label="Disminuir" onClick={() => onChange(Math.max(min, valor - 1))}>−</button>
      <span className="sel-num-val">{valor}</span>
      <button type="button" className="sel-num-btn" disabled={valor >= max} aria-label="Aumentar" onClick={() => onChange(Math.min(max, valor + 1))}>+</button>
    </div>
  );
}

/**
 * Botón magnético (patrón "Amicro", portado a nuestros tokens/CSS propios en
 * vez de Tailwind): sigue el cursor unos px cuando pasa cerca, con un spring
 * — un toque premium en los CTA principales de cada módulo.
 */
export function BotonMagnetico({ children, className = "", onClick, type = "button", disabled, range = 46, strength = .32 }: {
  children: React.ReactNode; className?: string; onClick?: () => void; type?: "button" | "submit"; disabled?: boolean;
  range?: number; strength?: number;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const springConfig = { stiffness: 150, damping: 15, mass: .6 };
  const x = useSpring(0, springConfig);
  const y = useSpring(0, springConfig);

  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={disabled}
      onMouseMove={(e: React.MouseEvent) => {
        const el = ref.current;
        if (!el) return;
        const { left, top, width, height } = el.getBoundingClientRect();
        const cx = left + width / 2, cy = top + height / 2;
        const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
        if (dist < range) { x.set((e.clientX - cx) * strength); y.set((e.clientY - cy) * strength); }
        else { x.set(0); y.set(0); }
      }}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      onClick={onClick}
      style={{ x, y }}
      className={className}
    >
      {children}
    </motion.button>
  );
}

/**
 * Renderiza en <body> con portal. CRÍTICO para modales/overlays con
 * position:fixed: si un ancestro tiene transform/filter/backdrop-filter (las
 * tarjetas .cabecera del panel lo tienen), el fixed se ancla a ESE ancestro y
 * el modal sale como tira arriba en vez de centrado en el viewport. El portal
 * lo saca a <body> y el fixed vuelve a ser relativo al viewport.
 */
export function EnBody({ children }: { children: React.ReactNode }) {
  const [montado, setMontado] = useState(false);
  useEffect(() => { setMontado(true); }, []);
  if (!montado) return null;
  return createPortal(children, document.body);
}

/** Nav del sidebar con estado activo por ruta (como _layout-inicio.php). */
type NavItem = { href: string; texto: string; ic: string };
type NavGrupo = { titulo: string; ic: string; items: NavItem[] };

const esActivo = (ruta: string, href: string) =>
  href === "/panel" ? ruta === "/panel" || ruta.startsWith("/panel/prospectos") : ruta.startsWith(href);

/** Sidebar: ítems frecuentes fijos + secciones DESPLEGABLES (admin) para que el
 *  sidebar no necesite scroll vertical. Cada grupo se abre/cierra por su cuenta
 *  y, si al abrirlo la lista no cabe en pantalla, esa lista sí puede scrollear. */
export function NavPanel({ items, grupos = [] }: { items: NavItem[]; grupos?: NavGrupo[] }) {
  const ruta = usePathname();
  const [abierto, setAbierto] = useState(false);
  const [grupoAbierto, setGrupoAbierto] = useState<string | null>(
    () => grupos.find((g) => g.items.some((it) => esActivo(ruta, it.href)))?.titulo ?? null,
  );
  // Cierra el menú (móvil) al cambiar de ruta; mantiene abierto el grupo activo.
  useEffect(() => {
    setAbierto(false);
    document.querySelector(".sidebar")?.classList.remove("menu-abierto");
    const activo = grupos.find((g) => g.items.some((it) => esActivo(ruta, it.href)));
    if (activo) setGrupoAbierto(activo.titulo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruta]);
  const alternar = () => {
    const sb = document.querySelector(".sidebar");
    const nuevo = !sb?.classList.contains("menu-abierto");
    sb?.classList.toggle("menu-abierto", nuevo);
    setAbierto(nuevo);
  };
  return (
    <>
      <button type="button" className="nav-hamb" aria-label={abierto ? "Cerrar menú" : "Abrir menú"} aria-expanded={abierto} onClick={alternar}>
        <IconoPanel n={abierto ? "x" : "menu"} />
      </button>
      <nav className="nav">
        {items.map((it) => (
          <Link key={it.href} href={it.href} className={esActivo(ruta, it.href) ? "activo" : ""}>
            <IconoPanel n={it.ic} />{it.texto}
          </Link>
        ))}
        {grupos.map((g) => {
          const activo = g.items.some((it) => esActivo(ruta, it.href));
          const expandido = grupoAbierto === g.titulo;
          return (
            <div key={g.titulo} className={`nav-grupo${expandido ? " abierto" : ""}${activo ? " tiene-activo" : ""}`}>
              <button type="button" className="nav-grupo-tit" aria-expanded={expandido}
                onClick={() => setGrupoAbierto(expandido ? null : g.titulo)}>
                <IconoPanel n={g.ic} />{g.titulo}
                <span className="nav-grupo-caret" aria-hidden="true">▾</span>
              </button>
              <div className="nav-grupo-items">
                <div className="nav-grupo-items-in">
                  {g.items.map((it) => (
                    <Link key={it.href} href={it.href} className={esActivo(ruta, it.href) ? "activo" : ""}>
                      <IconoPanel n={it.ic} />{it.texto}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </nav>
    </>
  );
}

export function SalirBoton({ children }: { children: React.ReactNode }) {
  return (
    <form action={logoutAccion} className="pw-salir-form">
      <button type="submit" className="pw-salir" title="Cerrar sesión" aria-label="Cerrar sesión">{children}</button>
    </form>
  );
}

/* ── Toast (port del flash + toast del layout PHP) ─────────────────────── */

type ToastMsg = { texto: string; tipo: "ok" | "error" } | null;
const ToastCtx = createContext<(t: ToastMsg) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToastCrudo] = useState<ToastMsg>(null);
  const [saliendo, setSaliendo] = useState(false);
  const setToast = (t: ToastMsg) => { setSaliendo(false); setToastCrudo(t); };
  useEffect(() => {
    if (!toast) return;
    const t1 = setTimeout(() => setSaliendo(true), 5200);
    const t2 = setTimeout(() => setToastCrudo(null), 5550);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [toast]);
  return (
    <ToastCtx.Provider value={setToast}>
      {children}
      {toast && (
        <EnBody>
          <div className={`toast ${toast.tipo}${saliendo ? " saliendo" : ""}`} role="status">
            <span className="toast-ic"><IconoPanel n={toast.tipo === "error" ? "alerta" : "check"} /></span>
            <span className="toast-cuerpo">
              <b>{toast.tipo === "error" ? "Atención" : "Listo"}</b>
              <p>{toast.texto}</p>
            </span>
            <button type="button" className="toast-x" aria-label="Cerrar aviso" onClick={() => setToast(null)}><IconoPanel n="x" /></button>
            <i className="toast-barra" />
          </div>
        </EnBody>
      )}
    </ToastCtx.Provider>
  );
}

/** Muestra el resultado {ok|error} de una acción como toast. */
export function useToastResultado() {
  const setToast = useToast();
  return (r: { ok?: string; error?: string } | undefined) => {
    if (!r) return;
    if (r.error) setToast({ texto: r.error, tipo: "error" });
    else if (r.ok) setToast({ texto: r.ok, tipo: "ok" });
  };
}

/* ── Confirmación con diseño propio (port del confirmar-velo) ──────────── */

export function ConfirmarDialogo({ abierto, texto, onSi, onNo }: {
  abierto: boolean; texto: string; onSi: () => void; onNo: () => void;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!abierto) return;
    const id = requestAnimationFrame(() => setVisible(true));
    return () => { cancelAnimationFrame(id); setVisible(false); };
  }, [abierto]);
  useEffect(() => {
    if (!abierto) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onNo(); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [abierto, onNo]);
  if (!abierto) return null;
  return (
    <EnBody>
      <div className={`confirmar-velo${visible ? " visible" : ""}`} onClick={(e) => { if (e.target === e.currentTarget) onNo(); }}>
        <div className="confirmar-caja" role="alertdialog" aria-modal="true">
          <span className="toast-ic error"><IconoPanel n="alerta" /></span>
          <b>¿Estás seguro?</b>
          <p>{texto}</p>
          <div className="confirmar-botones">
            <button type="button" className="boton fantasma" onClick={onNo}>Cancelar</button>
            <button type="button" className="boton peligro" onClick={onSi} autoFocus>Sí, continuar</button>
          </div>
        </div>
      </div>
    </EnBody>
  );
}

/* ── Modal genérico (port de .us-velo/.us-frame) ───────────────────────── */

export function Velo({ abierto, onCerrar, children }: {
  abierto: boolean; onCerrar: () => void; children: React.ReactNode;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!abierto) return;
    const id = requestAnimationFrame(() => setVisible(true));
    return () => { cancelAnimationFrame(id); setVisible(false); };
  }, [abierto]);
  useEffect(() => {
    if (!abierto) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onCerrar(); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [abierto, onCerrar]);
  if (!abierto) return null;
  return (
    <EnBody>
      <div className={`us-velo${visible ? " visible" : ""}`}>
        {children}
      </div>
    </EnBody>
  );
}

/* ── Formulario tipo asistente: pasos numerados a la izquierda + campos
 *  agrupados a la derecha, en vez de todos los campos amontonados en una
 *  sola columna. El formulario (validación, envío) lo sigue controlando
 *  quien lo usa; este componente solo pone la estructura visual. ────────── */
export type PasoAsistente = { titulo: string; sub?: string };

export function Asistente({ pasos, activo, children }: {
  pasos: PasoAsistente[]; activo: number; children: React.ReactNode;
}) {
  return (
    <div className="us-asistente">
      <div className="us-asistente-pasos">
        {pasos.map((p, i) => (
          <div key={p.titulo} className={`us-asistente-paso${i === activo ? " activo" : i < activo ? " hecho" : ""}`}>
            <span className="us-asistente-num">{i < activo ? <IconoPanel n="check" cls="ic-sm" /> : i + 1}</span>
            <span className="us-asistente-txt">{p.titulo}</span>
          </div>
        ))}
      </div>
      <div className="us-asistente-cuerpo">{children}</div>
    </div>
  );
}

/** Cabecera de contenido de un paso (eyebrow + título + ayuda opcional). */
export function AsistentePaso({ eyebrow, titulo, sub, children }: {
  eyebrow?: string; titulo: string; sub?: string; children: React.ReactNode;
}) {
  return (
    <div>
      {eyebrow && <div className="us-asistente-eyebrow">{eyebrow}</div>}
      <h3 className="us-asistente-titulo-paso">{titulo}</h3>
      {sub && <p className="us-asistente-sub-paso">{sub}</p>}
      <div className="us-asistente-campos">{children}</div>
    </div>
  );
}

/* ── Pantalla de carga del panel (show/hide en nav y envío) ────────────── */

export function ScriptsPanel() {
  const pathname = usePathname();
  useEffect(() => {
    const overlay = document.getElementById("cargaOverlay");
    const MINIMO = 600, SAFETY = 1500;
    let safety: ReturnType<typeof setTimeout> | undefined;
    const ocultar = () => overlay?.classList.add("oculta");
    const mostrar = () => { overlay?.classList.remove("oculta"); if (safety) clearTimeout(safety); safety = setTimeout(ocultar, SAFETY); };
    // Al montar/cambiar de apartado: ocultar tras un mínimo perceptible.
    const hide = setTimeout(ocultar, MINIMO);
    const clickNav = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      try {
        const d = new URL(a.href, location.href);
        if (d.origin !== location.origin || (d.pathname === location.pathname && d.search === location.search)) return;
        mostrar();
      } catch { /* no-op */ }
    };
    const onSubmit = (e: Event) => { if ((e.target as HTMLElement)?.tagName === "FORM") mostrar(); };
    document.addEventListener("click", clickNav);
    document.addEventListener("submit", onSubmit);
    return () => {
      clearTimeout(hide); if (safety) clearTimeout(safety);
      document.removeEventListener("click", clickNav);
      document.removeEventListener("submit", onSubmit);
    };
  }, [pathname]);
  return null;
}

/* ── Mathy del panel (port de agenteIAPanel) ───────────────────────────── */

export function AgentePanelIA() {
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState<{ rol: "usuario" | "asistente"; texto: string }[]>([
    { rol: "asistente", texto: "¡Hola! Soy Mathy. ¿En qué te ayudo: mover un prospecto de etapa, agendar una cita o revisar pagos?" },
  ]);
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(false);
  const lista = useRef<HTMLDivElement>(null);
  useEffect(() => { lista.current?.scrollTo(0, 1e6); }, [mensajes, abierto]);

  // Visibilidad global: el usuario decide con "Ocultar/Mostrar Mathy" en el
  // sidebar — reemplaza al auto-ocultado por scroll que en móvil dejaba la
  // mascota encimada sobre botones (Ver/Editar/Eliminar) bloqueando clics.
  const visible = useMathyVisible();

  async function enviar() {
    const m = texto.trim();
    if (!m || cargando) return;
    setTexto(""); setMensajes((x) => [...x, { rol: "usuario", texto: m }]); setCargando(true);
    try {
      const d = await agentePanelAccion(m, mensajes.slice(-12));
      setMensajes((x) => [...x, { rol: "asistente", texto: d.respuesta ?? d.error ?? "No pude responder, intenta de nuevo." }]);
    } catch {
      setMensajes((x) => [...x, { rol: "asistente", texto: "No pude conectarme. Intenta de nuevo en un momento." }]);
    } finally { setCargando(false); }
  }

  const libro = <MascotaMathy />;

  if (!visible) return null;
  return (
    <div className="agente-ia">
      <button type="button" className="agente-btn" aria-expanded={abierto} aria-label="Abrir a Mathy, el asistente del panel"
        onClick={() => setAbierto(!abierto)}>
        {libro}
      </button>
      {abierto && (
        <div className="agente-panel" role="dialog" aria-label="Mathy, el asistente del panel">
          <div className="ap-cab">
            <div className="ap-quien">
              <MascotaMathy sinManos />
              <div><b>Mathy</b><span>La IA del panel</span></div>
            </div>
            <button type="button" className="ap-cerrar" aria-label="Cerrar asistente" onClick={() => setAbierto(false)}><IconoPanel n="x" /></button>
          </div>
          <div className="ap-mensajes" ref={lista}>
            {mensajes.map((m, i) => (
              <div key={i} className={`ap-msg ${m.rol === "usuario" ? "usuario" : "bot"}`}>{m.texto}</div>
            ))}
            {cargando && <div className="ap-msg bot cargando">Escribiendo…</div>}
          </div>
          <div className="ap-entrada">
            <input type="text" value={texto} maxLength={500} autoComplete="off" placeholder="Escribe tu pregunta…"
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); enviar(); } }} />
            <button type="button" aria-label="Enviar mensaje" disabled={cargando} onClick={enviar}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
