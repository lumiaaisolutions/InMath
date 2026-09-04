import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requiereSesion } from "@/lib/panel/sesion";
import { ahoraPared, isoDia } from "@/lib/fechas";
import { etiquetaEtapa, fechaCorta, dinero } from "@/lib/panel/formato";
import { AccionesProspecto, EliminarRegistroBoton, CitaAcciones } from "./ClienteProspecto";
import { mediaAlumnoParaPanel } from "@/lib/portal/media";

export const metadata: Metadata = { title: "Prospecto — Inmath CRM" };
export const dynamic = "force-dynamic";

// Nota (03-sep-2026): el bloque "Conversación de WhatsApp" se ELIMINÓ de esta
// ficha a petición del cliente — el canal de WhatsApp Business está
// deshabilitado por decisión suya (el sitio usa wa.me directo), así que el
// bloque siempre salía vacío. Si algún día se activa el canal, el componente
// ChatConversacion sigue vivo en ClienteProspecto.tsx listo para reconectarse.
export default async function Prospecto({ params }: { params: Promise<{ id: string }> }) {
  await requiereSesion();
  const id = parseInt((await params).id, 10);
  const p = await prisma.prospectos.findUnique({
    where: { id },
    include: { usuarios: { select: { nombre: true } }, cursos: { select: { nombre: true } } },
  });
  if (!p) notFound();

  const bitacora = await prisma.bitacora_pipeline.findMany({ where: { prospecto_id: id }, orderBy: { creado_en: "asc" } });
  const nombresUsuario = new Map(
    (await prisma.usuarios.findMany({ select: { id: true, nombre: true } })).map((u) => [u.id, u.nombre]),
  );
  const citas = await prisma.citas.findMany({
    where: { prospecto_id: id }, orderBy: { inicio: "desc" },
    include: { usuarios: { select: { nombre: true } } },
  });
  const pagos = await prisma.pagos.findMany({ where: { prospecto_id: id }, orderBy: { id: "desc" } });
  const asesores = await prisma.usuarios.findMany({
    where: { es_asesor: true, activo: true }, select: { id: true, nombre: true }, orderBy: { id: "asc" },
  });
  const alumno = await prisma.alumnos.findUnique({ where: { prospecto_id: id }, select: { id: true, email: true, estado: true, inscrito_en: true } });
  const sinPago = !pagos.some((pg) => pg.estado === "pagado");
  const ahora = ahoraPared();
  const hoyIso = isoDia(ahora);

  const califs: [string, string][] = [];
  if (p.datos_calificacion && typeof p.datos_calificacion === "object" && !Array.isArray(p.datos_calificacion)) {
    for (const [k, v] of Object.entries(p.datos_calificacion as Record<string, unknown>)) {
      const nombre = (k.charAt(0).toUpperCase() + k.slice(1)).replace(/_/g, " ");
      califs.push([nombre, typeof v === "object" ? JSON.stringify(v) : String(v)]);
    }
  }

  const media = alumno ? await mediaAlumnoParaPanel(alumno.id) : { avatar: null, banner: null };

  return (
    <>
      {media.banner && (
        <div className="af-banner af-banner-pagina"><img src={media.banner} alt="" /></div>
      )}
      <div className="cabecera">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {media.avatar && <span className="af-foto af-foto-pagina"><img src={media.avatar} alt="" /></span>}
          <div>
          <h1>{p.nombre ?? "Sin nombre"}</h1>
          <div className="sub">
            <span style={{ fontFamily: "var(--mono)" }}>{p.telefono_whatsapp}</span>
            {" · "}{etiquetaEtapa(p.etapa)}{" · Fuente: "}{p.fuente}
          </div>
          </div>
        </div>
        <Link className="boton fantasma" href="/panel">← Pipeline</Link>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div>
          <div className="tarjeta">
            <div className="seccion">
              <h3>Ficha completa</h3>
              <dl>
                <div className="dato"><dt>Nombre</dt><dd>{p.nombre ?? "Sin nombre"}</dd></div>
                <div className="dato"><dt>WhatsApp</dt><dd style={{ fontFamily: "var(--mono)" }}>{p.telefono_whatsapp}</dd></div>
                <div className="dato"><dt>Correo</dt><dd>{alumno?.email ?? p.correo ?? "Sin correo"}</dd></div>
                <div className="dato"><dt>Etapa</dt><dd>{etiquetaEtapa(p.etapa)}</dd></div>
                <div className="dato"><dt>Fuente</dt><dd>{p.fuente}</dd></div>
                <div className="dato"><dt>Puntaje</dt><dd>{p.puntaje_calificacion !== null ? `${p.puntaje_calificacion} / 100` : "—"}</dd></div>
                <div className="dato"><dt>Asesor</dt><dd>{p.usuarios?.nombre ?? "Sin asignar"}</dd></div>
                <div className="dato"><dt>Curso de interés</dt><dd>{p.cursos?.nombre ?? "—"}</dd></div>
                <div className="dato"><dt>Alta</dt><dd>{fechaCorta(p.creado_en)}</dd></div>
                {alumno && (
                  <>
                    <div className="dato"><dt>Cuenta de alumno</dt><dd>{alumno.estado}</dd></div>
                    <div className="dato"><dt>Inscrito</dt><dd>{fechaCorta(alumno.inscrito_en)}</dd></div>
                  </>
                )}
              </dl>
              {califs.length > 0 && (
                <>
                  <h3 style={{ marginTop: 14 }}>Calificación</h3>
                  {califs.map(([k, v]) => (
                    <div className="dato" key={k}><dt>{k}</dt><dd>{v}</dd></div>
                  ))}
                </>
              )}
            </div>

            <div className="seccion">
              <h3>Acciones</h3>
              <AccionesProspecto
                prospectoId={p.id}
                etapa={p.etapa}
                asesorId={p.asesor_id}
                asesores={asesores}
              />
              {sinPago && (
                <div style={{ marginTop: 12 }}>
                  <EliminarRegistroBoton prospectoId={p.id} nombre={p.nombre ?? p.telefono_whatsapp} />
                </div>
              )}
            </div>

            {citas.length > 0 && (
              <div className="seccion">
                <h3>Citas</h3>
                {citas.map((c) => (
                  <div key={c.id} style={{ marginBottom: 10 }}>
                    <div className="dato">
                      <dt>{fechaCorta(c.inicio)} · {c.usuarios.nombre}</dt>
                      <dd style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <span className={`gaje ${c.estado === "completada" ? "ok" : c.estado === "cancelada" || c.estado === "no_asistio" ? "error" : "neutro"}`}>{c.estado}</span>
                        <CitaAcciones citaId={c.id} activa={["agendada", "confirmada"].includes(c.estado)}
                          esFutura={c.inicio.getTime() >= ahora.getTime()} esHoy={isoDia(c.inicio) === hoyIso} sinPago={sinPago}
                          sinLink={!c.meet_link} />
                      </dd>
                    </div>
                    {c.meet_link && (
                      <a href={c.meet_link} target="_blank" rel="noopener"
                        style={{ font: "var(--t-mini)", fontFamily: "var(--mono)", color: "var(--azul)", wordBreak: "break-all", display: "block", marginTop: 2 }}>
                        {c.meet_link}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            {pagos.length > 0 && (
              <div className="seccion">
                <h3>Pagos</h3>
                {pagos.map((pg) => (
                  <div key={pg.id}>
                    <div className="dato">
                      <dt>{dinero(pg.monto_centavos, pg.moneda)}</dt>
                      <dd><span className={`gaje ${pg.estado === "pagado" ? "ok" : pg.estado === "pendiente" ? "alerta" : "error"}`}>{pg.estado}</span></dd>
                    </div>
                    {pg.link_pago && pg.estado === "pendiente" && (
                      <div style={{ font: "var(--t-mini)", fontFamily: "var(--mono)", color: "var(--tinta-2)", wordBreak: "break-all", marginBottom: 6 }}>{pg.link_pago}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="seccion">
              <h3>Historial del pipeline</h3>
              <div className="linea-tiempo">
                {bitacora.map((b) => (
                  <div className="evento" key={Number(b.id)}>
                    <b>{b.etapa_anterior ? `${etiquetaEtapa(b.etapa_anterior)} → ` : ""}{etiquetaEtapa(b.etapa_nueva)}</b>
                    <small>
                      {fechaCorta(b.creado_en)} · {b.origen}
                      {b.usuario_id && nombresUsuario.has(b.usuario_id) ? ` · ${nombresUsuario.get(b.usuario_id)}` : ""}
                      {b.nota ? ` — ${b.nota}` : ""}
                    </small>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
