"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icono } from "./Icono";

/** Overlay de carga + nav móvil + motor de scrubbing — port del JS de _comun.php. */
export function ScriptsSitio() {
  const pathname = usePathname();
  // Depende de pathname: en la navegación cliente de Next NO dispara `window load`,
  // así que el overlay se oculta cuando la nueva ruta ya montó (aquí), y el
  // scrubbing se reinicializa con los .scrub de la página actual.
  useEffect(() => {
    const overlay = document.getElementById("cargaOverlay");
    const MINIMO = 600, SAFETY = 1500;
    let safety: ReturnType<typeof setTimeout> | undefined;
    const ocultar = () => overlay?.classList.add("oculta");
    const mostrar = () => { overlay?.classList.remove("oculta"); if (safety) clearTimeout(safety); safety = setTimeout(ocultar, SAFETY); };
    // Al montar/cambiar de ruta (incluye reload): ocultar tras un mínimo perceptible.
    const hideTimer = setTimeout(ocultar, MINIMO);
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
      if (safety) clearTimeout(safety);
      document.removeEventListener("click", clickNav);
      document.removeEventListener("submit", onSubmit);
      btn?.removeEventListener("click", toggle);
      quitarScrub?.();
    };
  }, [pathname]);
  return null;
}

/** Extrae las acciones interactivas de una respuesta del bot. */
function parseaBot(textoCrudo: string) {
  let texto = textoCrudo;
  const humano = texto.includes("[CONTACTO_HUMANO]");
  const irAgenda = texto.includes("[IR_AGENDA]");
  let opciones: string[] = [];
  const m = texto.match(/\[OPCIONES:([^\]]+)\]/);
  if (m) opciones = m[1].split("|").map((s) => s.trim()).filter(Boolean).slice(0, 4);
  texto = texto.replace(/\[OPCIONES:[^\]]+\]/g, "").replace("[CONTACTO_HUMANO]", "").replace("[IR_AGENDA]", "").trim();
  return { texto, humano, irAgenda, opciones };
}

const MascotaSVG = ({ id }: { id: string }) => (
  <svg className="agente-libro" viewBox="0 0 48 48" aria-hidden="true">
    <defs><linearGradient id={id} x1="6" y1="34" x2="42" y2="13" gradientUnits="userSpaceOnUse">
      <stop offset="0" stopColor="#6B9FFF" /><stop offset="1" stopColor="#AFCFFF" /></linearGradient></defs>
    <path d="M24 15 C 17 10.5 10 10 6 13.5 V 33 C 10 29.5 17 30 24 34.5" fill="none" stroke={`url(#${id})`} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M24 15 C 31 10.5 38 10 42 13.5 V 33 C 38 29.5 31 30 24 34.5" fill="none" stroke={`url(#${id})`} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    <rect className="agente-ojo i" x="18.6" y="18.4" width="3.8" height="3.8" />
    <rect className="agente-ojo d" x="25.6" y="18.4" width="3.8" height="3.8" />
  </svg>
);

/** Chat flotante de Mathy — interactivo: chips de opciones, accesos directos,
 *  modo ampliado (PC/tableta) y mascota que reacciona a la conversación. */
export function AgenteIA({ whatsappUrl = "" }: { whatsappUrl?: string }) {
  // Abierto SIEMPRE al cargar/entrar (decisión de producto); el usuario puede
  // cerrarlo y reabrirlo con el botón. Cierre con animación "genio".
  const [abierto, setAbierto] = useState(true);
  const [cerrando, setCerrando] = useState(false);
  const [amplio, setAmplio] = useState(false);
  const [animo, setAnimo] = useState<"normal" | "piensa" | "feliz" | "triste">("normal");
  const cerrar = () => {
    setCerrando(true);
    setTimeout(() => { setAbierto(false); setCerrando(false); setAmplio(false); }, 470);
  };
  const [mensajes, setMensajes] = useState<{ rol: "usuario" | "asistente"; texto: string }[]>([
    { rol: "asistente", texto: "¡Hola! Soy Mathy. ¿Tienes dudas del curso o quieres agendar tu asesoría gratis? [OPCIONES: Quiero agendar mi asesoría gratis | ¿Qué incluye el curso? | ¿Cuánto cuesta?]" },
  ]);
  const [texto, setTexto] = useState(""); const [cargando, setCargando] = useState(false);
  const lista = useRef<HTMLDivElement>(null);
  const animoTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => { lista.current?.scrollTo(0, 1e6); }, [mensajes, abierto, cargando]);

  const reacciona = (a: "feliz" | "triste") => {
    setAnimo(a);
    if (animoTimer.current) clearTimeout(animoTimer.current);
    animoTimer.current = setTimeout(() => setAnimo("normal"), 2800);
  };

  async function enviar(manual?: string) {
    const m = (manual ?? texto).trim(); if (!m || cargando) return;
    setTexto(""); setMensajes((x) => [...x, { rol: "usuario", texto: m }]); setCargando(true); setAnimo("piensa");
    try {
      const r = await fetch("/api/agente", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensaje: m, historial: mensajes.slice(-12) }),
        signal: AbortSignal.timeout(25_000),
      });
      const d = await r.json();
      const respuesta = d.respuesta ?? d.error ?? "No pude responder, intenta de nuevo.";
      setMensajes((x) => [...x, { rol: "asistente", texto: respuesta }]);
      if (d.agendado || /¡Listo|agendada/i.test(respuesta)) reacciona("feliz");
      else if (d.error) reacciona("triste");
      else setAnimo("normal");
    } catch {
      setMensajes((x) => [...x, { rol: "asistente", texto: "Sin conexión, intenta de nuevo. [CONTACTO_HUMANO]" }]);
      reacciona("triste");
    } finally { setCargando(false); }
  }

  return (
    <div className={`agente-ia animo-${animo}`}>
      <button type="button" className="agente-btn" aria-expanded={abierto} aria-label="Abrir a Mathy"
        onClick={() => (abierto ? cerrar() : setAbierto(true))}>
        <MascotaSVG id="ag-t" />
      </button>
      {abierto && amplio && <div className="ap-velo-fondo" onClick={() => setAmplio(false)} />}
      {abierto && (
        <div className={`agente-panel genio${cerrando ? " genio-cierra" : ""}${amplio ? " amplio" : ""}`} role="dialog" aria-label="Mathy">
          <div className="ap-cab">
            <div className="ap-quien">
              <span className="ap-avatar-caja"><MascotaSVG id="ag-t2" /></span>
              <div><b>Mathy</b><span>La IA de Cursos InMath</span></div>
            </div>
            <button type="button" className="ap-cerrar ap-amplia" aria-label={amplio ? "Vista normal" : "Ampliar chat"}
              onClick={() => setAmplio(!amplio)}>
              <Icono n={amplio ? "reduce" : "amplia"} />
            </button>
            <button type="button" className="ap-cerrar" aria-label="Cerrar" onClick={cerrar}><Icono n="x" /></button>
          </div>
          <div className="ap-mensajes" ref={lista}>
            {mensajes.map((m, i) => {
              if (m.rol === "usuario") return <div key={i} className="ap-msg usuario">{m.texto}</div>;
              const { texto: tx, humano, irAgenda, opciones } = parseaBot(m.texto);
              const esUltimo = i === mensajes.length - 1;
              return (
                <div key={i} className="ap-msg bot">
                  {tx}
                  {humano && whatsappUrl && (
                    <a className="ap-humano" href={whatsappUrl} target="_blank" rel="noopener">
                      <Icono n="chat" /> Hablar con una persona
                    </a>
                  )}
                  {irAgenda && (
                    <Link className="ap-humano ap-agenda" href="/agenda" onClick={() => cerrar()}><Icono n="calendar" /> Ver horarios y agendar yo</Link>
                  )}
                  {esUltimo && !cargando && opciones.length > 0 && (
                    <div className="ap-chips">
                      {opciones.map((op) => (
                        <button key={op} type="button" className="ap-chip" onClick={() => enviar(op)}>{op}</button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {cargando && <div className="ap-msg cargando">escribiendo…</div>}
          </div>
          <div className="ap-entrada">
            <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escribe tu pregunta…"
              onKeyDown={(e) => e.key === "Enter" && enviar()} />
            <button type="button" onClick={() => enviar()} disabled={cargando} aria-label="Enviar"><Icono n="arrow" /></button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Formulario del CTA final: guarda al prospecto y además envía la duda por
 *  correo al buzón de contacto (cursosinmath@gmail.com). */
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
    <div className="form-cta"><div className="aviso-cta"><Icono n="check" /> ¡Gracias, {estado.ok}! Recibimos tu mensaje y te contactamos muy pronto.</div></div>
  );
  return (
    <form className="form-cta" onSubmit={enviar}>
      {estado.error && <div className="aviso-cta">{estado.error}</div>}
      <input type="text" name="nombre" placeholder="Tu nombre" required />
      <input type="tel" name="telefono" placeholder="WhatsApp (10 dígitos)" required inputMode="numeric" />
      <input type="email" name="correo" placeholder="Tu correo" required />
      <textarea name="mensaje" placeholder="¿Qué te gustaría preguntarnos? (opcional)" rows={3} maxLength={600} />
      <button type="submit" className="boton glow glow-halo">Quiero que me escriban →</button>
      <p className="legal">Sin spam. Solo lo usamos para contactarte y responder tu duda.</p>
    </form>
  );
}
