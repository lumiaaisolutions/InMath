"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icono } from "@/components/Icono";
import { MathyToggleBoton } from "@/components/MathyVisibilidad";

const ITEMS = [
  { key: "inicio", label: "Inicio", href: "/portal", icon: "route" },
  { key: "fases", label: "Fases", href: "/portal/fases", icon: "video" },
  { key: "material", label: "Material", href: "/portal/material", icon: "list" },
  { key: "practica", label: "Práctica", href: "/portal/practica", icon: "check" },
  { key: "reportes", label: "Reportes", href: "/portal/reportes", icon: "trend" },
  { key: "cuenta", label: "Mi cuenta", href: "/portal/cuenta", icon: "user" },
];

/** Menú del portal EN EL HEADER (al lado del logo). En escritorio es una
 *  píldora horizontal con una "burbuja" de acento que se desliza al
 *  apartado activo; en móvil (≤620px) se convierte en menú de hamburguesa
 *  desplegable — mismo patrón que el sitio público, mismo componente para
 *  ambos anchos (la clase `.abierto` la maneja este React, no CSS/JS aparte).
 *  Con pago pendiente (`bloqueado`), solo se muestran Inicio y Mi cuenta —
 *  el resto de apartados de todos modos redirigen al candado de pago. */
export function NavPortalHeader({ bloqueado = false }: { bloqueado?: boolean }) {
  const pathname = usePathname();
  const activo =
    pathname === "/portal" ? "inicio"
    : pathname.startsWith("/portal/fases") ? "fases"
    : pathname.startsWith("/portal/material") ? "material"
    : pathname.startsWith("/portal/practica") ? "practica"
    : pathname.startsWith("/portal/reportes") ? "reportes"
    : pathname.startsWith("/portal/cuenta") ? "cuenta"
    : "inicio";

  const items = bloqueado ? ITEMS.filter((it) => it.key === "inicio" || it.key === "cuenta") : ITEMS;
  const refs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [burbuja, setBurbuja] = useState({ x: 0, w: 0, listo: false });
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    const mover = () => {
      const el = refs.current[activo];
      if (el && el.offsetWidth) setBurbuja({ x: el.offsetLeft, w: el.offsetWidth, listo: true });
    };
    mover();
    // Re-medir tras el layout y tras cargar las fuentes (offsetWidth cambia).
    const raf = requestAnimationFrame(mover);
    document.fonts?.ready.then(mover).catch(() => {});
    window.addEventListener("resize", mover);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", mover); };
  }, [activo]);

  // Cierra el menú al cambiar de página (el link ya navegó, no tiene caso
  // dejarlo desplegado tapando la pantalla nueva).
  useEffect(() => { setAbierto(false); }, [pathname]);

  return (
    <>
      <button type="button" className="nav-hdr-toggle" aria-expanded={abierto} aria-controls="navPortal"
        aria-label={abierto ? "Cerrar menú" : "Abrir menú"} onClick={() => setAbierto((v) => !v)}>
        <Icono n={abierto ? "x" : "list"} />
      </button>
      <nav id="navPortal" className={`nav-hdr${abierto ? " abierto" : ""}`} aria-label="Secciones del portal">
        <span className="nav-hdr-burbuja" aria-hidden="true"
          style={{ transform: `translateX(${burbuja.x}px)`, width: burbuja.w, opacity: burbuja.listo ? 1 : 0 }} />
        {items.map((it) => (
          <Link key={it.key} href={it.href}
            ref={(el) => { refs.current[it.key] = el; }}
            className={`nav-hdr-item${activo === it.key ? " activo" : ""}`}
            aria-current={activo === it.key ? "page" : undefined}>
            <Icono n={it.icon} /><span>{it.label}</span>
          </Link>
        ))}
        <span className="nav-hdr-salir nav-hdr-mathy"><MathyToggleBoton /></span>
        <form action="/portal/logout" method="post" className="nav-hdr-salir">
          <button type="submit"><Icono n="logout" /><span>Salir</span></button>
        </form>
      </nav>
    </>
  );
}
