import type { Metadata } from "next";
import { requiereAdmin } from "@/lib/panel/sesion";
import { leerMateriales } from "@/lib/portal/materiales";
import { ClienteMateriales } from "./ClienteMateriales";

export const metadata: Metadata = { title: "Material del curso — Inmath CRM" };
export const dynamic = "force-dynamic";

export default async function MaterialesPage() {
  await requiereAdmin();
  const materiales = await leerMateriales();
  return (
    <>
      <div className="cabecera">
        <div>
          <h1>Material del curso</h1>
          <div className="sub">Sube archivos, agrega enlaces (Drive, YouTube) o ambos — esto es lo que el alumno ve en su portal. Se guarda al dar clic en Guardar.</div>
        </div>
      </div>
      <ClienteMateriales inicial={materiales} />
    </>
  );
}
