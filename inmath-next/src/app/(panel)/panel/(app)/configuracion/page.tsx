import type { Metadata } from "next";
import { requiereSesion } from "@/lib/panel/sesion";
import { avatarUrl } from "@/lib/panel/media";
import { IconoPanel } from "@/components/IconoPanel";
import { PerfilFotoForm, PerfilDatosForm, SalirPerfilBoton } from "../perfil/ClientePerfil";

export const metadata: Metadata = { title: "Configuración — Inmath CRM" };
export const dynamic = "force-dynamic";

export default async function Configuracion() {
  const yo = await requiereSesion();
  const foto = await avatarUrl(yo.id);

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
      </div>
    </>
  );
}
