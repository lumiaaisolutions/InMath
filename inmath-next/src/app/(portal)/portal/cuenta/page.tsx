import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { Icono } from "@/components/Icono";
import { requiereAlumno } from "@/lib/portal/sesion";
import { dinero } from "@/lib/panel/formato";
import { mediaAlumno } from "@/lib/portal/media";
import { dosFactoresActivo } from "@/lib/portal/dosfactores";
import { ClienteCuenta, SubirFoto, DatosEditables, DosFactores } from "./ClienteCuenta";

export const metadata: Metadata = { title: "Mi cuenta — Portal InMath" };
export const dynamic = "force-dynamic";

const MESES = ["", "ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const fecha = (d: Date) => `${d.getUTCDate()} ${MESES[d.getUTCMonth() + 1]} ${d.getUTCFullYear()}`;

export default async function CuentaPage() {
  const alumno = await requiereAlumno();
  // Método de acceso: sin password_hash = cuenta creada con Google.
  const filaPass = await prisma.alumnos.findUnique({ where: { id: alumno.id }, select: { password_hash: true, email: true } });
  const tienePassword = Boolean(filaPass?.password_hash);
  const correoEnmascarado = (filaPass?.email ?? "tu correo").replace(/^(.{2})[^@]*(@.*)$/, "$1•••$2");
  const [media, avances, asesorias, dosFA, pago] = await Promise.all([
    mediaAlumno(alumno.id),
    prisma.avance_alumnos.findFirst({ where: { alumno_id: alumno.id }, orderBy: { fecha: "desc" }, select: { porcentaje: true } }),
    prisma.citas.count({ where: { prospecto_id: alumno.prospecto_id, estado: "completada" } }),
    dosFactoresActivo(alumno.id),
    prisma.pagos.findFirst({
      where: { prospecto_id: alumno.prospecto_id, estado: "pagado" }, orderBy: { pagado_en: "desc" },
      select: { id: true, monto_centavos: true, moneda: true, procesador: true, pagado_en: true, comprobante: true },
    }),
  ]);
  const METODO: Record<string, string> = { mercadopago: "MercadoPago", stripe: "Tarjeta", conekta: "Tarjeta", transferencia: "Transferencia", simulado: "Pago manual", efectivo: "Efectivo / OXXO" };
  const inicial = (alumno.nombre.trim()[0] ?? "A").toUpperCase();
  const avance = avances?.porcentaje ?? 0;

  const datos: { etq: string; valor: string; icono: string }[] = [
    { etq: "Curso", valor: alumno.curso_nombre, icono: "book" },
    { etq: "Usuario", valor: alumno.usuario ?? alumno.email ?? alumno.telefono, icono: "lock" },
    { etq: "Correo", valor: alumno.email ?? "—", icono: "chat" },
    { etq: "Inscrito", valor: fecha(alumno.inscrito_en), icono: "calendar" },
  ];

  return (
    <section className="pt-panel pt-cuenta-panel">
      <div className="pt-wrap">
        {/* Tarjeta de perfil grande, a todo el ancho — mismo tratamiento que
            la tarjeta de perfil del inicio (portada fundida a blanco + foto
            flotante + curso-insignia), con controles propios para cambiar
            portada/foto y las métricas como fila con divisores. */}
        <header className="pt-hero-card pt-rev" style={{ ["--d" as string]: "0ms" }}>
          <div className={`pt-hero-banner${media.banner ? "" : " pt-hero-banner-marca"}`}>
            {media.banner && <img src={media.banner} alt="" />}
            <SubirFoto tipo="banner" etiqueta="Cambiar portada" />
          </div>
          <div className="pt-hero-cuerpo">
            <div className="pf-hero-foto-caja">
              <span className="pt-hero-foto">
                {media.avatar
                  ? <img src={media.avatar} alt="" />
                  : <i className="pt-hero-inicial">{inicial}</i>}
              </span>
              <SubirFoto tipo="avatar" etiqueta="Cambiar foto" />
            </div>
            <div className="pt-hero-tx">
              <h1>{alumno.nombre}</h1>
              <div className="pf-hero-badges">
                <span className="pt-hero-curso"><Icono n="book" /> {alumno.curso_nombre}</span>
                <span className={`pf-estado ${alumno.estado === "activo" ? "ok" : ""}`}>
                  <i /> {alumno.estado === "activo" ? "Inscripción activa" : alumno.estado}
                </span>
              </div>
            </div>
          </div>
          <div className="pt-hero-stats">
            <div className="pt-hero-stat"><b>{avance}%</b><span>Avance</span></div>
            <div className="pt-hero-stat"><b>{asesorias}</b><span>Asesorías</span></div>
          </div>
        </header>

        <div className="pt-cuenta-cols">
          {/* Editar perfil */}
          <div className="pf-bloque pt-rev" style={{ ["--d" as string]: "80ms" }}>
            <span className="pf-bloque-tit"><Icono n="user" /> Editar tu perfil</span>
            <DatosEditables nombre={alumno.nombre} whatsapp={alumno.telefono} />
          </div>

          {/* Datos de la cuenta (solo lectura) */}
          <div className="pf-bloque pt-rev" style={{ ["--d" as string]: "120ms" }}>
            <span className="pf-bloque-tit"><Icono n="book" /> Datos de tu cuenta</span>
            <div className="pf-datos">
              {datos.map((d) => (
                <div className="pf-dato" key={d.etq}>
                  <span className="pf-dato-ic"><Icono n={d.icono} /></span>
                  <span className="pf-dato-tx"><small>{d.etq}</small><b>{d.valor}</b></span>
                </div>
              ))}
            </div>
          </div>

          {/* Tu pago (recibo + comprobante) */}
          {pago && (
            <div className="pf-bloque pt-rev pf-bloque-ancho pf-pago" style={{ ["--d" as string]: "150ms" }}>
              <span className="pf-bloque-tit"><Icono n="card" /> Tu pago</span>
              <div className="pf-pago-grid">
                <div className="pf-pago-dato"><small>Monto pagado</small><b className="pf-pago-monto">${dinero(pago.monto_centavos)} {pago.moneda}</b></div>
                <div className="pf-pago-dato"><small>Método</small><b>{METODO[pago.procesador ?? ""] ?? pago.procesador ?? "—"}</b></div>
                <div className="pf-pago-dato"><small>Fecha</small><b>{pago.pagado_en ? fecha(pago.pagado_en) : "—"}</b></div>
                <div className="pf-pago-dato"><small>Folio</small><b>INM-{String(pago.id).padStart(6, "0")}</b></div>
              </div>
              <div className="pf-pago-acciones">
                <a className="boton glow" href={`/portal/recibo/${pago.id}`} target="_blank" rel="noopener"><Icono n="download" /> Descargar recibo (PDF)</a>
                {pago.comprobante && (
                  <a className="boton fantasma" href={`/portal/comprobante/${pago.id}`} target="_blank" rel="noopener"><Icono n="file" /> Ver mi comprobante</a>
                )}
              </div>
              {pago.comprobante && <p className="pf-pago-nota"><Icono n="check" /> Recibimos y validamos tu comprobante.</p>}
            </div>
          )}

          {/* Seguridad */}
          <div className="pf-bloque pt-rev pf-bloque-ancho" style={{ ["--d" as string]: "160ms" }}>
            <span className="pf-bloque-tit"><Icono n="lock" /> Seguridad</span>
            <DosFactores activo={dosFA} />
            <div className="pf-sep" />
            <ClienteCuenta tienePassword={tienePassword} correoEnmascarado={correoEnmascarado} />
          </div>
        </div>
      </div>
    </section>
  );
}
