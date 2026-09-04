import Link from "next/link";
import { requiereSesion, moduloPermitido } from "@/lib/panel/sesion";
import { avatarUrl } from "@/lib/panel/media";
import { leerSemana, lunesDe } from "@/lib/disponibilidad";
import { ahoraPared, isoDia } from "@/lib/fechas";
import { prisma } from "@/lib/db";
import { IconoPanel } from "@/components/IconoPanel";
import { OverlayCarga } from "@/components/OverlayCarga";
import { NavPanel, SalirBoton, AgentePanelIA, ToastProvider, ScriptsPanel } from "./ClientePanel";
import { MathyToggleBoton } from "@/components/MathyVisibilidad";

export const dynamic = "force-dynamic";

export default async function PanelAppLayout({ children }: { children: React.ReactNode }) {
  const u = await requiereSesion();
  const foto = await avatarUrl(u.id);

  // TODO el menú va por categorías desplegables — nada suelto en el nivel de
  // arriba (25-ago-2026). "Configuración" es la única visible para cualquier
  // rol (ahí vive también "Mi cuenta"); el resto respeta permisos por módulo.
  const items: { href: string; texto: string; ic: string }[] = [];
  const grupos: { titulo: string; ic: string; items: { href: string; texto: string; ic: string }[] }[] = [];

  const ventasItems = ([
    ["/panel", "Pipeline", "pipeline", "pipeline"],
    ["/panel/citas", "Citas", "calendar", "citas"],
    ["/panel/alumnos", "Alumnos y pagos", "alumnos", "alumnos"],
  ] as const).filter(([, , , mod]) => moduloPermitido(u, mod)).map(([href, texto, ic]) => ({ href, texto, ic }));
  if (ventasItems.length > 0) grupos.push({ titulo: "Ventas y alumnos", ic: "pipeline", items: ventasItems });

  if (u.rol === "admin") {
    // Los módulos con interruptor en /panel/usuarios (Reactivos, Precios)
    // también se respetan para admins; el resto de apartados de admin no
    // tienen interruptor y siempre se muestran.
    grupos.push(
      {
        titulo: "Contenido y sitio", ic: "imagen",
        items: [
          { href: "/panel/disponibilidad", texto: "Disponibilidad", ic: "reloj" },
          { href: "/panel/materiales", texto: "Material del curso", ic: "prompts" },
          ...(moduloPermitido(u, "reactivos") ? [{ href: "/panel/reactivos", texto: "Reactivos", ic: "check" }] : []),
          { href: "/panel/fases", texto: "Fases del curso", ic: "route" },
          { href: "/panel/alertas", texto: "Alertas de la página", ic: "alerta" },
          { href: "/panel/personalizar-login", texto: "Personalizar login", ic: "imagen" },
        ],
      },
      {
        titulo: "Administración", ic: "config",
        items: [
          ...(moduloPermitido(u, "precios") ? [{ href: "/panel/precios", texto: "Precios y promociones", ic: "pagos" }] : []),
          { href: "/panel/usuarios", texto: "Usuarios", ic: "user" },
        ],
      },
    );
  } else if (moduloPermitido(u, "reactivos")) {
    grupos.push({ titulo: "Contenido y sitio", ic: "imagen", items: [{ href: "/panel/reactivos", texto: "Reactivos", ic: "check" }] });
  }

  // Configuración: visible para TODOS (ahí vive "Mi cuenta" — perfil, foto,
  // contraseña); los ajustes del sistema quedan ocultos adentro si no eres
  // admin ni tienes el permiso explícito "configuracion".
  grupos.push({ titulo: "Mi cuenta", ic: "user", items: [{ href: "/panel/configuracion", texto: "Configuración", ic: "config" }] });

  // Aviso: ¿ya se ajustó la disponibilidad de esta semana y la próxima? (solo
  // admin). Ya no hay horario de respaldo — si una semana no está definida,
  // /agenda y Mathy no ofrecen NINGÚN horario esa semana, así que avisar de
  // la semana actual es tan urgente (o más) que avisar de la próxima.
  const estaLunes = isoDia(lunesDe(ahoraPared()));
  const proxLunes = isoDia(new Date(lunesDe(ahoraPared()).getTime() + 7 * 86400_000));
  const [faltaEsta, faltaProx] = u.rol === "admin"
    ? await Promise.all([leerSemana(estaLunes).then((s) => !s), leerSemana(proxLunes).then((s) => !s)])
    : [false, false];

  // Red de seguridad del link de Meet: citas activas futuras SIN enlace →
  // alerta roja imposible de ignorar (el cliente aún no recibe su link; el
  // sistema reintenta solo cada 10 min, pero el staff puede resolverlo ya
  // desde la ficha con "Generar link" o "Pegar link").
  const citasSinLink = await prisma.citas.count({
    where: { estado: { in: ["agendada", "confirmada"] }, meet_link: null, inicio: { gt: ahoraPared() } },
  });

  return (
    <div className="app">
      <OverlayCarga marca="panel" />
      <aside className="sidebar">
        <div className="marca">
          <img src="/img/inmath.svg" alt="" width={64} height={64} />
          <div><strong>Inmath CRM</strong><span>Cursos · Ventas</span></div>
          <MathyToggleBoton className="marca-mathy" />
        </div>
        <NavPanel items={items} grupos={grupos} />
        <div className="pie perfil-widget">
          <span className="pw-avatar-lg">
            {foto ? <img src={foto} alt="" /> : u.nombre.charAt(0).toUpperCase()}
          </span>
          <b className="pw-nombre">{u.nombre}</b>
          <i className={`pw-chip ${u.rol === "admin" ? "admin" : ""}`}>{u.rol === "admin" ? "Administrador" : "Asesor"}</i>
          <SalirBoton><IconoPanel n="logout" cls="ic-sm" /> Cerrar sesión</SalirBoton>
        </div>
      </aside>
      <main className="contenido">
        {citasSinLink > 0 && (
          <Link className="banner-disp banner-disp-urgente" href="/panel">
            <IconoPanel n="alerta" cls="ic-sm" />
            <span><b>{citasSinLink === 1 ? "1 asesoría agendada NO tiene enlace de Meet" : `${citasSinLink} asesorías agendadas NO tienen enlace de Meet`}</b> — el cliente aún no recibe su link. Ábrela desde el pipeline y usa &ldquo;Generar link&rdquo; o &ldquo;Pegar link&rdquo;; el correo al cliente sale solo.</span>
            <span className="banner-cta">Resolver ahora</span>
          </Link>
        )}
        {faltaEsta && (
          <Link className="banner-disp banner-disp-urgente" href={`/panel/disponibilidad?semana=${estaLunes}`}>
            <IconoPanel n="alerta" cls="ic-sm" />
            <span><b>Esta semana no tiene horarios definidos</b> — /agenda y Mathy no podrán ofrecer ninguna cita hasta que la definas.</span>
            <span className="banner-cta">Definir horarios</span>
          </Link>
        )}
        {!faltaEsta && faltaProx && (
          <Link className="banner-disp" href={`/panel/disponibilidad?semana=${proxLunes}`}>
            <IconoPanel n="reloj" cls="ic-sm" />
            <span>Aún no defines la disponibilidad de la <b>próxima semana</b> — no se ofrecerán horarios esa semana hasta que la definas.</span>
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
