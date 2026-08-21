"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Portal: pantalla de carga (show/hide al navegar) + efectos de scroll/hover.
 *  - Overlay de carga: se oculta al montar la ruta, se muestra al navegar/enviar.
 *  - Parallax suave de las tarjetas hero al hacer scroll.
 *  - Tilt 3D sutil en tarjetas al mover el cursor (hover).
 * Todo respeta prefers-reduced-motion.
 */
export function ScriptsPortal() {
  const pathname = usePathname();

  useEffect(() => {
    const overlay = document.getElementById("cargaOverlay");
    const MIN = 550, SAFETY = 1500;
    let safety: ReturnType<typeof setTimeout> | undefined;
    const ocultar = () => overlay?.classList.add("oculta");
    const mostrar = () => { overlay?.classList.remove("oculta"); if (safety) clearTimeout(safety); safety = setTimeout(ocultar, SAFETY); };
    const hide = setTimeout(ocultar, MIN);
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

    let quitarFx: (() => void) | undefined;
    if (matchMedia("(prefers-reduced-motion: no-preference)").matches) {
      // Parallax de scroll en las tarjetas hero + tilt en hover.
      const heros = Array.from(document.querySelectorAll<HTMLElement>(".pt-hero"));
      const tiltables = Array.from(document.querySelectorAll<HTMLElement>(".pt-hero, .pt-acceso, .pt-stat"));
      let marcado = false;
      const parallax = () => {
        const vh = window.innerHeight;
        heros.forEach((el, i) => {
          const r = el.getBoundingClientRect();
          const centro = r.top + r.height / 2 - vh / 2;
          const y = Math.max(-14, Math.min(14, -centro * 0.03 * (i % 2 === 0 ? 1 : 1.4)));
          el.style.setProperty("--par", `${y.toFixed(1)}px`);
        });
        marcado = false;
      };
      const alScroll = () => { if (!marcado) { marcado = true; requestAnimationFrame(parallax); } };
      parallax();
      window.addEventListener("scroll", alScroll, { passive: true });
      window.addEventListener("resize", parallax);

      const onMove = (e: PointerEvent) => {
        const el = (e.currentTarget as HTMLElement);
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty("--rx", `${(-py * 5).toFixed(2)}deg`);
        el.style.setProperty("--ry", `${(px * 6).toFixed(2)}deg`);
      };
      const onLeave = (e: PointerEvent) => {
        const el = (e.currentTarget as HTMLElement);
        el.style.setProperty("--rx", "0deg");
        el.style.setProperty("--ry", "0deg");
      };
      tiltables.forEach((el) => { el.addEventListener("pointermove", onMove); el.addEventListener("pointerleave", onLeave); });
      quitarFx = () => {
        window.removeEventListener("scroll", alScroll);
        window.removeEventListener("resize", parallax);
        tiltables.forEach((el) => { el.removeEventListener("pointermove", onMove); el.removeEventListener("pointerleave", onLeave); });
      };
    }

    return () => {
      clearTimeout(hide);
      if (safety) clearTimeout(safety);
      document.removeEventListener("click", clickNav);
      document.removeEventListener("submit", onSubmit);
      quitarFx?.();
    };
  }, [pathname]);

  return null;
}
