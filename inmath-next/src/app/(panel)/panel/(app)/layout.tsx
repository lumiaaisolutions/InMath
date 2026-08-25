import Link from "next/link";
import { requiereSesion, moduloPermitido } from "@/lib/panel/sesion";
import { avatarUrl } from "@/lib/panel/media";
import { leerSemana, lunesDe } from "@/lib/disponibilidad";
import { ahoraPared, isoDia } from "@/lib/fechas";
import { IconoPanel } from "@/components/IconoPanel";
import { OverlayCarga } from "@/components/OverlayCarga";
import { NavPanel, SalirBoton, AgentePanelIA, ToastProvider, ScriptsPanel } from "./ClientePanel";

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
    ["/panel/reactivos", "Reactivos", "check", "reactivos"],
  ] as const) {
    if (moduloPermitido(u, mod)) items.push({ href, texto, ic });
  }
  // Los ítems de admin se agrupan en secciones DESPLEGABLES: así el sidebar no
  // necesita scroll vertical (solo se expande la sección que se abre, y esa sí
  // scrollea si el resultado no cabe en pantalla).
  const grupos: { titulo: string; ic: string; items: { href: string; texto: string; ic: string }[] }[] = [];
  if (u.rol === "admin") {
    grupos.push(
      {
        titulo: "Contenido y sitio", ic: "imagen",
        items: [
          { href: "/panel/disponibilidad", texto: "Disponibilidad", ic: "reloj" },
          { href: "/panel/materiales", texto: "Material del curso", ic: "prompts" },
          { href: "/panel/alertas", texto: "Alertas de la página", ic: "alerta" },
          { href: "/panel/personalizar-login", texto: "Personalizar login", ic: "imagen" },
        ],
      },
      {
        titulo: "Administración", ic: "config",
        items: [
          { href: "/panel/precios", texto: "Precios y promociones", ic: "pagos" },
          { href: "/panel/usuarios", texto: "Usuarios", ic: "user" },
          { href: "/panel/configuracion", texto: "Configuración", ic: "config" },
        ],
      },
    );
  }

  // Aviso: ¿ya se ajustó la disponibilidad de la próxima semana? (solo admin)
  const proxLunes = isoDia(new Date(lunesDe(ahoraPared()).getTime() + 7 * 86400_000));
  const faltaDisp = u.rol === "admin" ? !(await leerSemana(proxLunes)) : false;

  return (
    <div className="app">
      <OverlayCarga marca="panel" />
      <aside className="sidebar">
        <div className="marca">
          <img src="/img/inmath.svg" alt="" width={64} height={64} />
          <div><strong>Inmath CRM</strong><span>Cursos · Ventas</span></div>
        </div>
        <NavPanel items={items} grupos={grupos} />
        <div className="pie perfil-widget">
          <span className="pw-avatar-lg">
            {foto ? <img src={foto} alt="" /> : u.nombre.charAt(0).toUpperCase()}
          </span>
          <b className="pw-nombre">{u.nombre}</b>
          <i className={`pw-chip ${u.rol === "admin" ? "admin" : ""}`}>{u.rol === "admin" ? "Administrador" : "Asesor"}</i>
          <Link className="pw-config" href="/panel/perfil"><IconoPanel n="config" cls="ic-sm" /> Configura tu información</Link>
          <SalirBoton><IconoPanel n="logout" cls="ic-sm" /> Cerrar sesión</SalirBoton>
        </div>
      </aside>
      <main className="contenido">
        {faltaDisp && (
          <Link className="banner-disp" href={`/panel/disponibilidad?semana=${proxLunes}`}>
            <IconoPanel n="reloj" cls="ic-sm" />
            <span>Aún no defines la disponibilidad de la <b>próxima semana</b>. Mientras tanto se usa el horario base.</span>
            <span className="banner-cta">Definir horarios</span>
          </Link>
        )}
        <ToastProvider>{children}</ToastProvider>
      </main>
      <AgentePanelIA />
      <ScriptsPanel />
    </div>
  );
}
