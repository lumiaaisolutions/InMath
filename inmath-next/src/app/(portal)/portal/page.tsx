import Link from "next/link";
import { prisma } from "@/lib/db";
import { ahoraPared } from "@/lib/fechas";
import { Icono } from "@/components/Icono";
import { requiereAlumno } from "@/lib/portal/sesion";
import { tienePagoConfirmado } from "@/lib/portal/auth";
import { leerMateriales } from "@/lib/portal/materiales";
import { AvancePuntos } from "./AvancePuntos";

export const dynamic = "force-dynamic";

const MESES = ["", "ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
function fechaCorta(d: Date): string {
  return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} ${MESES[d.getUTCMonth() + 1]}`;
}
function hora(d: Date): string {
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}
function fechaLarga(d: Date): string {
  return `${fechaCorta(d)} ${d.getUTCFullYear()}`;
}

export default async function PortalInicio() {
  const alumno = await requiereAlumno();
  const ahora = ahoraPared();

  // Gate de pago: si no ha pagado, el portal queda BLOQUEADO (solo puede pagar,
  // agendar su sesión gratis o ir a Mi cuenta).
  const pagado = await tienePagoConfirmado(alumno.prospecto_id);
  if (!pagado) {
    const proxCita = await prisma.citas.findFirst({
      where: { prospecto_id: alumno.prospecto_id, estado: { in: ["agendada", "confirmada"] }, inicio: { gte: ahora } },
      orderBy: { inicio: "asc" },
    });
    return (
      <section className="pt-panel">
        <div className="pt-wrap">
          <header className="pt-head pt-rev" style={{ ["--d" as string]: "0ms" }}>
            <div className="pt-head-id">
              <span className="pt-kicker">Portal del alumno</span>
              <h1>Hola, {alumno.nombre.split(" ")[0]}.</h1>
              <p className="pt-head-sub">{alumno.curso_nombre}</p>
            </div>
          </header>

          <div className="pt-bloqueo pt-rev" style={{ ["--d" as string]: "80ms" }}>
            <span className="pt-bloqueo-ic"><Icono n="lock" /></span>
            <h2>Falta completar tu pago</h2>
            <p>Tu cuenta ya está lista, pero para desbloquear tu avance, material y reportes necesitas completar tu inscripción.</p>
            <div className="pt-bloqueo-cta">
              <Link className="boton glow glow-halo grande" href="/pago"><Icono n="card" /> Completar mi pago</Link>
              {!proxCita && <Link className="boton ghost grande" href="/agenda"><Icono n="calendar" /> Agendar mi sesión gratis</Link>}
            </div>
            {proxCita && (
              <p className="pt-bloqueo-cita"><Icono n="calendar" /> Tu sesión gratis: {fechaCorta(proxCita.inicio)} · {hora(proxCita.inicio)}</p>
            )}
            <p className="pt-bloqueo-nota">Mientras tanto, sí puedes agendar tu <b>sesión de orientación gratuita</b> y revisar <Link href="/portal/cuenta">tu cuenta</Link>.</p>
          </div>
        </div>
      </section>
    );
  }

  const [proximaCita, reportes, materiales, avances, curso, asesoriasTomadas] = await Promise.all([
    prisma.citas.findFirst({
      where: { prospecto_id: alumno.prospecto_id, estado: { in: ["agendada", "confirmada"] }, inicio: { gte: ahora } },
      orderBy: { inicio: "asc" },
    }),
    prisma.reportes_generados.findMany({
      where: { alumno_id: alumno.id },
      orderBy: { periodo_inicio: "desc" },
      take: 20,
    }),
    leerMateriales(),
    prisma.avance_alumnos.findMany({
      where: { alumno_id: alumno.id },
      orderBy: { fecha: "desc" },
      take: 2,
    }),
    prisma.cursos.findUnique({ where: { id: alumno.curso_id }, select: { duracion_semanas: true } }),
    prisma.citas.count({ where: { prospecto_id: alumno.prospecto_id, estado: "completada" } }),
  ]);

  const primerNombre = alumno.nombre.split(" ")[0];
  const avance = avances[0]?.porcentaje ?? 0;
  const avancePrevio = avances[1]?.porcentaje ?? null;
  const delta = avancePrevio !== null ? avance - avancePrevio : null;
  const semanas = curso?.duracion_semanas ?? null;

  // Días desde la inscripción (constancia — refuerzo positivo).
  const diasInscrito = Math.max(0, Math.floor((ahora.getTime() - alumno.inscrito_en.getTime()) / 86400_000));

  const chips = [
    { n: diasInscrito, etq: diasInscrito === 1 ? "día contigo" : "días contigo" },
    { n: reportes.length, etq: reportes.length === 1 ? "reporte" : "reportes" },
    { n: asesoriasTomadas, etq: asesoriasTomadas === 1 ? "asesoría" : "asesorías" },
    { n: materiales.length, etq: materiales.length === 1 ? "material" : "materiales" },
  ];

  return (
    <section className="pt-panel">
      <div className="pt-wrap">
        {/* Encabezado personalizado + métricas rápidas (escaneo preatentivo) */}
        <header className="pt-head pt-rev" style={{ ["--d" as string]: "0ms" }}>
          <div className="pt-head-id">
            <span className="pt-kicker">Portal del alumno</span>
            <h1>Hola, {primerNombre}.</h1>
            <p className="pt-head-sub">{alumno.curso_nombre}</p>
          </div>
        </header>

        <div className="pt-chips pt-rev" style={{ ["--d" as string]: "60ms" }}>
          {chips.map((c) => (
            <div className="pt-chip" key={c.etq}>
              <b>{c.n}</b><span>{c.etq}</span>
            </div>
          ))}
        </div>

        {/* Notificación flotante (ref: "Health Improving") */}
        {delta !== null && delta > 0 && (
          <div className="pt-notif pt-rev" style={{ ["--d" as string]: "90ms" }}>
            <span className="pt-notif-ic"><Icono n="trend" /></span>
            <div className="pt-notif-tx"><b>Tu avance va subiendo</b><span>+{delta}% en la última semana</span></div>
            <span className="pt-notif-spark" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></span>
          </div>
        )}

        {/* Dos tarjetas hero de gradiente completo con cifra dot-matrix. */}
        <div className="pt-heros">
          <article className="pt-hero pt-hero-verde pt-rev" style={{ ["--d" as string]: "120ms" }}>
            <div className="pt-hero-cab">
              <span className="pt-hero-etq"><Icono n="trend" /> Tu avance</span>
              <span className="pt-pill">{avance >= 80 ? "¡Excelente!" : avance >= 40 ? "En curso" : "Empezando"}</span>
            </div>
            <div className="pt-cifra"><AvancePuntos valor={avance} /></div>
            <div className="pt-hero-pie">
              <span>{avances.length === 0 ? "Tu avance aparece aquí cada semana." : "del curso completado"}</span>
            </div>
          </article>

          <article className="pt-hero pt-hero-coral pt-rev" style={{ ["--d" as string]: "180ms" }}>
            <div className="pt-hero-cab">
              <span className="pt-hero-etq"><Icono n="calendar" /> Tu próxima asesoría</span>
              {proximaCita && <span className="pt-pill">{fechaCorta(proximaCita.inicio)}</span>}
            </div>
            {proximaCita ? (
              <>
                <div className="pt-cifra pt-cifra-fecha">{hora(proximaCita.inicio)}<em>{fechaCorta(proximaCita.inicio)}</em></div>
                <div className="pt-hero-pie">
                  {proximaCita.meet_link ? (
                    <a className="pt-hero-cta" href={proximaCita.meet_link} target="_blank" rel="noopener">
                      <Icono n="video" /> Entrar a la videollamada
                    </a>
                  ) : (
                    <span>Te enviamos el enlace por WhatsApp.</span>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="pt-cifra pt-cifra-vacia">Sin agendar</div>
                <div className="pt-hero-pie">
                  <Link className="pt-hero-cta" href="/agenda"><Icono n="calendar" /> Agendar mi asesoría gratis</Link>
                </div>
              </>
            )}
          </article>
        </div>

        {/* Fila de datos clave (Biomarkers → tus números del curso) */}
        <div className="pt-stats pt-rev" style={{ ["--d" as string]: "240ms" }}>
          <div className="pt-stat">
            <span className="pt-stat-etq">Duración</span>
            <b className="pt-stat-n">{semanas ?? "—"}<i>{semanas ? "sem" : ""}</i></b>
          </div>
          <div className="pt-stat">
            <span className="pt-stat-etq">Reportes</span>
            <b className="pt-stat-n">{reportes.length}</b>
          </div>
          <div className="pt-stat">
            <span className="pt-stat-etq">Asesorías</span>
            <b className="pt-stat-n">{asesoriasTomadas}</b>
          </div>
          <div className="pt-stat">
            <span className="pt-stat-etq">Material</span>
            <b className="pt-stat-n">{materiales.length}</b>
          </div>
        </div>

        {/* Accesos rápidos a las secciones propias */}
        <div className="pt-accesos pt-rev" style={{ ["--d" as string]: "300ms" }}>
          <Link className="pt-acceso" href="/portal/material">
            <span className="pt-acceso-ic pt-acceso-mat"><Icono n="book" /></span>
            <span className="pt-acceso-tx"><b>Material de tu curso</b><span>{materiales.length} recurso{materiales.length === 1 ? "" : "s"} disponible{materiales.length === 1 ? "" : "s"}</span></span>
            <Icono n="arrow" />
          </Link>
          <Link className="pt-acceso" href="/portal/reportes">
            <span className="pt-acceso-ic pt-acceso-rep"><Icono n="trend" /></span>
            <span className="pt-acceso-tx"><b>Tus reportes de avance</b><span>{reportes.length === 0 ? "Aún sin reportes" : `${reportes.length} reporte${reportes.length === 1 ? "" : "s"}`}</span></span>
            <Icono n="arrow" />
          </Link>
        </div>

        <footer className="pt-foot pt-rev" style={{ ["--d" as string]: "420ms" }}>
          <span>Inscrito el {fechaLarga(alumno.inscrito_en)}</span>
        </footer>
      </div>
    </section>
  );
}
