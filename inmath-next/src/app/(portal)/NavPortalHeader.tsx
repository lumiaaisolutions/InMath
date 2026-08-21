"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icono } from "@/components/Icono";

const ITEMS = [
  { key: "inicio", label: "Inicio", href: "/portal", icon: "route" },
  { key: "material", label: "Material", href: "/portal/material", icon: "list" },
  { key: "reportes", label: "Reportes", href: "/portal/reportes", icon: "trend" },
  { key: "cuenta", label: "Mi cuenta", href: "/portal/cuenta", icon: "user" },
];

/** Menú del portal EN EL HEADER (al lado del logo). Una "burbuja" de acento se
 *  desliza al apartado activo con rebote suave al cambiar de página. */
export function NavPortalHeader() {
  const pathname = usePathname();
  const activo =
    pathname === "/portal" ? "inicio"
    : pathname.startsWith("/portal/material") ? "material"
    : pathname.startsWith("/portal/reportes") ? "reportes"
    : pathname.startsWith("/portal/cuenta") ? "cuenta"
    : "inicio";

  const refs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [burbuja, setBurbuja] = useState({ x: 0, w: 0, listo: false });

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

  return (
    <nav className="nav-hdr" aria-label="Secciones del portal">
      <span className="nav-hdr-burbuja" aria-hidden="true"
        style={{ transform: `translateX(${burbuja.x}px)`, width: burbuja.w, opacity: burbuja.listo ? 1 : 0 }} />
      {ITEMS.map((it) => (
        <Link key={it.key} href={it.href}
          ref={(el) => { refs.current[it.key] = el; }}
          className={`nav-hdr-item${activo === it.key ? " activo" : ""}`}
          aria-current={activo === it.key ? "page" : undefined}>
          <Icono n={it.icon} /><span>{it.label}</span>
        </Link>
      ))}
      <form action="/portal/logout" method="post" className="nav-hdr-salir">
        <button type="submit"><Icono n="logout" /><span>Salir</span></button>
      </form>
    </nav>
  );
}
