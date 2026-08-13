import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requiereAdmin } from "@/lib/panel/sesion";
import { fechaCorta } from "@/lib/panel/formato";
import { PromptEditor, ReactivarBoton } from "./ClientePrompts";

export const metadata: Metadata = { title: "Prompts del bot — Inmath CRM" };
export const dynamic = "force-dynamic";

export default async function Prompts() {
  await requiereAdmin();
  const prompts = await prisma.prompts.findMany({ orderBy: [{ clave: "asc" }, { version: "desc" }] });
  const porClave = new Map<string, typeof prompts>();
  for (const p of prompts) {
    if (!porClave.has(p.clave)) porClave.set(p.clave, []);
    porClave.get(p.clave)!.push(p);
  }

  return (
    <>
      <div className="cabecera">
        <div>
          <h1>Prompts del bot</h1>
          <div className="sub">Editar crea una versión nueva; puedes reactivar cualquier versión anterior</div>
        </div>
      </div>

      {[...porClave.entries()].map(([clave, versiones]) => {
        const activa = versiones.find((v) => v.activo);
        return (
          <div key={clave} className="tarjeta" style={{ marginBottom: 24 }}>
            <div className="seccion">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>{clave}</h3>
                <span className="gaje grad">versión activa: v{activa?.version ?? 0}</span>
              </div>
              <PromptEditor clave={clave} contenido={activa?.contenido ?? ""} />
            </div>
            <div className="seccion">
              <h3>Versiones</h3>
              {versiones.map((v) => (
                <div className="dato" key={v.id}>
                  <dt>v{v.version} · {fechaCorta(v.creado_en)}{v.notas ? ` — ${v.notas}` : ""}</dt>
                  <dd>
                    {v.activo ? <span className="gaje ok">activa</span> : <ReactivarBoton promptId={v.id} />}
                  </dd>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}
