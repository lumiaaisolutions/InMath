"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/** Overlay de carga + nav móvil + motor de scrubbing — port del JS de _comun.php. */
export function ScriptsSitio() {
  const pathname = usePathname();
  // Depende de pathname: en la navegación cliente de Next NO dispara `window load`,
  // así que el overlay se oculta cuando la nueva ruta ya montó (aquí), y el
  // scrubbing se reinicializa con los .scrub de la página actual.
  useEffect(() => {
    const overlay = document.getElementById("cargaOverlay");
    const MINIMO = 60;
    const hideTimer = setTimeout(() => overlay?.classList.add("oculta"), MINIMO);
    const clickNav = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      try {
        const d = new URL(a.href, location.href);
        if (d.origin !== location.origin || (d.pathname === location.pathname && d.search === location.search)) return;
        overlay?.classList.remove("oculta");
      } catch { /* no-op */ }
    };
    document.addEventListener("click", clickNav);

    // Nav móvil
    const btn = document.getElementById("navToggle"), nav = document.getElementById("navPrincipal");
    const toggle = () => { const ab = nav?.classList.toggle("abierto"); btn?.setAttribute("aria-expanded", ab ? "true" : "false"); };
    btn?.addEventListener("click", toggle);

    let quitarScrub: (() => void) | undefined;
    // Scrubbing (crossfade + Ken Burns anclado al scroll desde la carga)
    if (matchMedia("(prefers-reduced-motion: no-preference)").matches) {
      const cajas = Array.from(document.querySelectorAll<HTMLElement>(".scrub"));
      let medidas: { caja: HTMLElement; ancla: number; recorrido: number }[] = [];
      const medir = () => {
        const sy = window.scrollY, vh = window.innerHeight;
        medidas = cajas.map((caja) => {
          const r = caja.getBoundingClientRect();
          return { caja, ancla: Math.max(0, r.top + sy - vh), recorrido: Math.max(280, r.height) };
        });
      };
      const mezcla = (a: number, b: number, t: number) => a + (b - a) * t;
      const cruce = (lp: number, entra: boolean) => (lp <= 0.42 ? (entra ? 0 : 1) : entra ? (lp - 0.42) / 0.58 : 1 - (lp - 0.42) / 0.58);
      let marcado = false;
      const pintar = () => {
        medidas.forEach((m) => {
          const f1 = m.caja.querySelector<HTMLElement>(".scrub-frame.f1"), f2 = m.caja.querySelector<HTMLElement>(".scrub-frame.f2");
          if (!f1 || !f2) return;
          const p = Math.min(1, Math.max(0, (window.scrollY - m.ancla) / m.recorrido));
          const lp = Math.min(1, Math.max(0, (p - 0.15) / 0.7));
          f1.style.setProperty("opacity", String(cruce(lp, false)), "important");
          f2.style.setProperty("opacity", String(cruce(lp, true)), "important");
          f1.style.setProperty("transform", `scale(${mezcla(1.1, 1, p)}) translate(${mezcla(0, -1.5, p)}%, ${mezcla(0, 1.5, p)}%)`, "important");
          f2.style.setProperty("transform", `scale(${mezcla(1, 1.1, p)}) translate(${mezcla(1.5, 0, p)}%, ${mezcla(-1.5, 0, p)}%)`, "important");
        });
        marcado = false;
      };
      const alScroll = () => { if (!marcado) { marcado = true; requestAnimationFrame(pintar); } };
      const alResize = () => { medir(); pintar(); };
      medir(); pintar();
      window.addEventListener("scroll", alScroll, { passive: true });
      window.addEventListener("resize", alResize);
      quitarScrub = () => {
        window.removeEventListener("scroll", alScroll);
        window.removeEventListener("resize", alResize);
      };
    }
    return () => {
      clearTimeout(hideTimer);
      document.removeEventListener("click", clickNav);
      btn?.removeEventListener("click", toggle);
      quitarScrub?.();
    };
  }, [pathname]);
  return null;
}

/** Chat flotante de Mathy — port del agente del sitio. */
export function AgenteIA() {
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState<{ rol: "usuario" | "asistente"; texto: string }[]>([
    { rol: "asistente", texto: "¡Hola! Soy Mathy 👋 ¿Tienes dudas del curso o quieres agendar tu asesoría gratis?" },
  ]);
  const [texto, setTexto] = useState(""); const [cargando, setCargando] = useState(false);
  const lista = useRef<HTMLDivElement>(null);
  useEffect(() => { lista.current?.scrollTo(0, 1e6); }, [mensajes, abierto]);

  async function enviar() {
    const m = texto.trim(); if (!m || cargando) return;
    setTexto(""); setMensajes((x) => [...x, { rol: "usuario", texto: m }]); setCargando(true);
    try {
      const r = await fetch("/api/agente", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensaje: m, historial: mensajes.slice(-12) }),
      });
      const d = await r.json();
      setMensajes((x) => [...x, { rol: "asistente", texto: d.respuesta ?? d.error ?? "No pude responder, intenta de nuevo." }]);
    } catch {
      setMensajes((x) => [...x, { rol: "asistente", texto: "Sin conexión, intenta de nuevo." }]);
    } finally { setCargando(false); }
  }

  return (
    <div className="agente-ia">
      <button type="button" className="agente-btn" aria-expanded={abierto} aria-label="Abrir a Mathy"
        onClick={() => setAbierto(!abierto)}>
        <svg className="agente-libro" viewBox="0 0 48 48" aria-hidden="true">
          <defs><linearGradient id="ag-t" x1="6" y1="34" x2="42" y2="13" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#6B9FFF" /><stop offset="1" stopColor="#AFCFFF" /></linearGradient></defs>
          <path d="M24 15 C 17 10.5 10 10 6 13.5 V 33 C 10 29.5 17 30 24 34.5" fill="none" stroke="url(#ag-t)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M24 15 C 31 10.5 38 10 42 13.5 V 33 C 38 29.5 31 30 24 34.5" fill="none" stroke="url(#ag-t)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <rect className="agente-ojo i" x="18.6" y="18.4" width="3.8" height="3.8" />
          <rect className="agente-ojo d" x="25.6" y="18.4" width="3.8" height="3.8" />
        </svg>
      </button>
      {abierto && (
        <div className="agente-panel" role="dialog" aria-label="Mathy">
          <div className="ap-cab">
            <div className="ap-quien"><b>Mathy</b><span>La IA de Cursos InMath</span></div>
            <button type="button" className="ap-cerrar" aria-label="Cerrar" onClick={() => setAbierto(false)}>✕</button>
          </div>
          <div className="ap-mensajes" ref={lista}>
            {mensajes.map((m, i) => (
              <div key={i} className={`ap-msg ${m.rol === "usuario" ? "usuario" : "bot"}`}>{m.texto}</div>
            ))}
            {cargando && <div className="ap-msg cargando">escribiendo…</div>}
          </div>
          <div className="ap-entrada">
            <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escribe tu pregunta…"
              onKeyDown={(e) => e.key === "Enter" && enviar()} />
            <button type="button" onClick={enviar} disabled={cargando} aria-label="Enviar">→</button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Formulario del CTA final (mismo comportamiento que el PHP). */
export function CtaForm() {
  const [estado, setEstado] = useState<{ ok?: string; error?: string }>({});
  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const r = await fetch("/api/cta", { method: "POST", body: fd });
    const d = await r.json();
    setEstado(r.ok ? { ok: d.nombre } : { error: d.error });
  }
  if (estado.ok) return (
    <div className="form-cta"><div className="aviso-cta">✓ ¡Gracias, {estado.ok}! Te escribimos por WhatsApp en breve.</div></div>
  );
  return (
    <form className="form-cta" onSubmit={enviar}>
      {estado.error && <div className="aviso-cta">{estado.error}</div>}
      <input type="text" name="nombre" placeholder="Tu nombre" required />
      <input type="tel" name="telefono" placeholder="WhatsApp (10 dígitos)" required inputMode="numeric" />
      <button type="submit" className="boton glow glow-halo">Quiero que me escriban →</button>
      <p className="legal">Sin spam. Solo lo usamos para contactarte por WhatsApp.</p>
    </form>
  );
}
