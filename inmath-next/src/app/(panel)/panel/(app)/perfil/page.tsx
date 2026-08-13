import type { Metadata } from "next";
import { requiereSesion } from "@/lib/panel/sesion";
import { avatarUrl } from "@/lib/panel/media";
import { IconoPanel } from "@/components/IconoPanel";
import { PerfilFotoForm, PerfilDatosForm, SalirPerfilBoton } from "./ClientePerfil";

export const metadata: Metadata = { title: "Mi perfil — Inmath CRM" };
export const dynamic = "force-dynamic";

export default async function Perfil() {
  const yo = await requiereSesion();
  const foto = await avatarUrl(yo.id);

  return (
    <>
      <div className="cabecera">
        <div>
          <h1>Mi perfil</h1>
          <div className="sub">Tu información y tu foto — como te ve el equipo</div>
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
          <h2 className="pl-titulo"><IconoPanel n="user" /> Mis datos</h2>
          <PerfilDatosForm nombre={yo.nombre} telefono={yo.telefono ?? ""} />
        </div>
      </div>
    </>
  );
}
