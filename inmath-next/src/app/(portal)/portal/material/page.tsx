import type { Metadata } from "next";
import { Icono } from "@/components/Icono";
import { redirect } from "next/navigation";
import { requiereAlumno } from "@/lib/portal/sesion";
import { tienePagoConfirmado } from "@/lib/portal/auth";
import { leerMateriales } from "@/lib/portal/materiales";

export const metadata: Metadata = { title: "Material — Portal InMath" };
export const dynamic = "force-dynamic";

const TIPO_ETIQUETA: Record<string, string> = { documento: "Documento", video: "Video", enlace: "Enlace" };

export default async function MaterialPage() {
  const _al = await requiereAlumno();
  if (!(await tienePagoConfirmado(_al.prospecto_id))) redirect("/portal");
  const materiales = await leerMateriales();

  return (
    <section className="pt-panel">
      <div className="pt-wrap">
        <header className="pt-head pt-rev" style={{ ["--d" as string]: "0ms" }}>
          <div className="pt-head-id">
            <span className="pt-kicker">Tu curso</span>
            <h1>Material</h1>
            <p className="pt-head-sub">Guías, videos y recursos para estudiar a tu ritmo.</p>
          </div>
        </header>

        {materiales.length === 0 ? (
          <div className="pt-vacio pt-rev" style={{ ["--d" as string]: "80ms" }}>
            Pronto encontrarás aquí el material de tu curso.
          </div>
        ) : (
          <div className="pt-mat-grid pt-rev" style={{ ["--d" as string]: "80ms" }}>
            {materiales.map((m) => (
              <article className={`pt-mat pt-mat-${m.tipo}`} key={m.id}>
                {m.portada ? (
                  <span className="pt-mat-portada"><img src={m.portada} alt="" /></span>
                ) : (
                  <span className="pt-mat-ic">
                    <Icono n={m.tipo === "video" ? "video" : m.tipo === "documento" ? "file" : "route"} />
                  </span>
                )}
                <span className="pt-mat-tipo">{TIPO_ETIQUETA[m.tipo]}</span>
                <b className="pt-mat-titulo">{m.titulo}</b>
                {m.descripcion && <p className="pt-mat-desc">{m.descripcion}</p>}
                {m.tipo === "enlace" ? (
                  <a className="pt-mat-abrir" href={m.url} target="_blank" rel="noopener">Abrir <Icono n="arrow" /></a>
                ) : (
                  <div className="pt-mat-archivos">
                    {m.archivos.map((a) => (
                      <a key={a.url} className="pt-mat-archivo" href={a.url} target="_blank" rel="noopener">
                        <Icono n="download" /> {a.nombre}
                      </a>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
