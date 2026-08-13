import Link from "next/link";
import { requiereSesion, moduloPermitido } from "@/lib/panel/sesion";
import { avatarUrl } from "@/lib/panel/media";
import { IconoPanel } from "@/components/IconoPanel";
import { NavPanel, SalirBoton, AgentePanelIA, ToastProvider } from "./ClientePanel";

export const dynamic = "force-dynamic";

export default async function PanelAppLayout({ children }: { children: React.ReactNode }) {
  const u = await requiereSesion();
  const foto = await avatarUrl(u.id);

  const items: { href: string; texto: string; ic: string }[] = [];
  for (const [href, texto, ic, mod] of [
    ["/panel", "Pipeline", "pipeline", "pipeline"],
    ["/panel/citas", "Citas", "calendar", "citas"],
    ["/panel/alumnos", "Alumnos", "alumnos", "alumnos"],
    ["/panel/pagos", "Pagos", "pagos", "pagos"],
  ] as const) {
    if (moduloPermitido(u, mod)) items.push({ href, texto, ic });
  }
  if (u.rol === "admin") {
    items.push(
      { href: "/panel/usuarios", texto: "Usuarios", ic: "user" },
      { href: "/panel/personalizar-login", texto: "Personalizar login", ic: "imagen" },
      { href: "/panel/configuracion", texto: "Configuración", ic: "config" },
      { href: "/panel/prompts", texto: "Prompts del bot", ic: "prompts" },
    );
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="marca">
          <img src="/img/inmath.svg" alt="" width={34} height={34} />
          <div><strong>Inmath CRM</strong><span>Cursos · Ventas</span></div>
        </div>
        <NavPanel items={items} />
        <div className="pie perfil-widget">
          <Link className="pw-link" href="/panel/perfil" title="Ver mi perfil">
            <span className="pw-avatar">
              {foto ? <img src={foto} alt="" /> : u.nombre.charAt(0).toUpperCase()}
            </span>
            <span className="pw-quien">
              <b>{u.nombre}</b>
              <i className={`pw-chip ${u.rol === "admin" ? "admin" : ""}`}>{u.rol === "admin" ? "Administrador" : "Asesor"}</i>
            </span>
          </Link>
          <SalirBoton><IconoPanel n="logout" /></SalirBoton>
        </div>
      </aside>
      <main className="contenido">
        <ToastProvider>{children}</ToastProvider>
      </main>
      <AgentePanelIA />
    </div>
  );
}
