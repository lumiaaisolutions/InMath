import type { Metadata } from "next";
import { requiereSesion } from "@/lib/panel/sesion";
import { avatarUrl } from "@/lib/panel/media";
import { IconoPanel } from "@/components/IconoPanel";
import { PerfilFotoForm, PerfilDatosForm, SalirPerfilBoton } from "../perfil/ClientePerfil";
import { calendarDirectoConfigurado, calendarCuentaConectada } from "@/lib/google-calendar";

export const metadata: Metadata = { title: "Configuración — Inmath CRM" };
export const dynamic = "force-dynamic";

export default async function Configuracion({ searchParams }: { searchParams: Promise<{ calendar?: string }> }) {
  const yo = await requiereSesion();
  const foto = await avatarUrl(yo.id);
  const { calendar } = await searchParams;
  const [calConectado, calCuenta] = yo.rol === "admin"
    ? await Promise.all([calendarDirectoConfigurado(), calendarCuentaConectada()])
    : [false, null];

  return (
    <>
      <div className="cabecera">
        <div>
          <h1>Configuración</h1>
          <div className="sub">Tu cuenta — los cambios aplican de inmediato</div>
        </div>
      </div>

      <div className="perfil-rejilla">
        <div className="tarjeta perfil-carta">
          <div className="pc-banner" />
          <PerfilFotoForm foto={foto} inicial={yo.nombre.charAt(0).toUpperCase()} />
          <div className="pc-nombre">{yo.nombre}</div>
          <div className="pc-chips">
            <span className={`pw-chip ${yo.rol === "admin" ? "admin" : ""}`}>{yo.rol === "admin" ? "Administrador" : "Asesor"}</span>
            <span className="pw-chip suave">{yo.email}</span>
          </div>
          <p className="pc-nota">Tu foto se recorta automáticamente en círculo. JPG, PNG o WebP de hasta 8 MB.</p>
          <SalirPerfilBoton><IconoPanel n="logout" /> Cerrar sesión</SalirPerfilBoton>
        </div>

        <div className="tarjeta pl-tarjeta">
          <h2 className="pl-titulo"><IconoPanel n="user" /> Mi cuenta</h2>
          <PerfilDatosForm nombre={yo.nombre} telefono={yo.telefono ?? ""} />
        </div>

        {yo.rol === "admin" && (
          <div className="tarjeta pl-tarjeta">
            <h2 className="pl-titulo"><IconoPanel n="calendar" /> Enlace de Meet de las asesorías</h2>
            {calendar === "conectada" && <div className="aviso ok" style={{ marginBottom: 12 }}>Listo — Google Calendar quedó conectado como respaldo.</div>}
            {calendar === "error" && <div className="aviso error" style={{ marginBottom: 12 }}>No se pudo conectar. Intenta de nuevo y autoriza con la cuenta del negocio.</div>}
            <p className="pc-nota" style={{ textAlign: "left", margin: "0 0 12px" }}>
              Al agendarse una cita, el enlace de Meet lo crea el robot automático. Si el robot
              falla, el sitio lo crea DIRECTO con la cuenta de Google que conectes aquí — así el
              cliente siempre recibe su enlace. {calConectado
                ? <>Respaldo activo con <b>{calCuenta}</b>. Puedes reconectar para cambiar de cuenta.</>
                : <b>El respaldo aún no está conectado: conéctalo una sola vez con cursosinmath@gmail.com.</b>}
            </p>
            <a className="boton primario" href="/panel/api/google-calendar/conectar">
              {calConectado ? "Reconectar Google Calendar" : "Conectar Google Calendar"}
            </a>
          </div>
        )}
      </div>
    </>
  );
}
