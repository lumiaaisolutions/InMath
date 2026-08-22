"use client";
import { useEffect, useRef, useState, createContext, useContext } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconoPanel } from "@/components/IconoPanel";
import { MascotaMathy } from "@/components/MascotaMathy";
import { logoutAccion, agentePanelAccion } from "./acciones";

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
export function NavPanel({ items }: { items: { href: string; texto: string; ic: string }[] }) {
  const ruta = usePathname();
  const [abierto, setAbierto] = useState(false);
  // Cierra el menú (móvil) al cambiar de ruta.
  useEffect(() => {
    setAbierto(false);
    document.querySelector(".sidebar")?.classList.remove("menu-abierto");
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
      {items.map((it) => {
        const activo = it.href === "/panel"
          ? ruta === "/panel" || ruta.startsWith("/panel/prospectos")
          : ruta.startsWith(it.href);
        return (
          <Link key={it.href} href={it.href} className={activo ? "activo" : ""}>
            <IconoPanel n={it.ic} />{it.texto}
          </Link>
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
          <b>¿Confirmar esta acción?</b>
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
      <div className={`us-velo${visible ? " visible" : ""}`} onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}>
        {children}
      </div>
    </EnBody>
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
