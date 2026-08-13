import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requiereAdmin } from "@/lib/panel/sesion";
import { avatarUrl } from "@/lib/panel/media";
import { UsuariosRejilla, NuevoUsuarioBoton, type UsuarioFicha } from "./ClienteUsuarios";

export const metadata: Metadata = { title: "Usuarios — Inmath CRM" };
export const dynamic = "force-dynamic";

export default async function Usuarios() {
  const yo = await requiereAdmin();
  const usuarios = await prisma.usuarios.findMany({
    select: { id: true, nombre: true, email: true, rol: true, telefono: true, activo: true, modulos: true, es_asesor: true },
    orderBy: [{ rol: "asc" }, { nombre: "asc" }],
  });
  const fichas: UsuarioFicha[] = await Promise.all(usuarios.map(async (u) => ({
    id: u.id, nombre: u.nombre, email: u.email, rol: u.rol as string,
    telefono: u.telefono, activo: u.activo, esAsesor: u.es_asesor,
    modulos: u.modulos === null ? null : (u.modulos as string[]),
    foto: await avatarUrl(u.id),
  })));

  return (
    <>
      <div className="cabecera">
        <div>
          <h1>Usuarios</h1>
          <div className="sub">Quién entra al panel, con qué rol y a qué módulos</div>
        </div>
        <NuevoUsuarioBoton />
      </div>
      <UsuariosRejilla usuarios={fichas} yoId={yo.id} />
    </>
  );
}
