import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { Icono } from "@/components/Icono";
import { requiereAlumno } from "@/lib/portal/sesion";
import { mediaAlumno } from "@/lib/portal/media";
import { dosFactoresActivo } from "@/lib/portal/dosfactores";
import { ClienteCuenta, SubirFoto, DatosEditables, DosFactores } from "./ClienteCuenta";

export const metadata: Metadata = { title: "Mi cuenta — Portal InMath" };
export const dynamic = "force-dynamic";

const MESES = ["", "ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const fecha = (d: Date) => `${d.getUTCDate()} ${MESES[d.getUTCMonth() + 1]} ${d.getUTCFullYear()}`;

export default async function CuentaPage() {
  const alumno = await requiereAlumno();
  const [media, avances, asesorias, dosFA] = await Promise.all([
    mediaAlumno(alumno.id),
    prisma.avance_alumnos.findFirst({ where: { alumno_id: alumno.id }, orderBy: { fecha: "desc" }, select: { porcentaje: true } }),
    prisma.citas.count({ where: { prospecto_id: alumno.prospecto_id, estado: "completada" } }),
    dosFactoresActivo(alumno.id),
  ]);
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
        {/* Tarjeta de perfil grande, a todo el ancho */}
        <div className="pf-tarjeta pt-rev" style={{ ["--d" as string]: "0ms" }}>
          <div className={`pf-banner${media.banner ? "" : " pf-banner-vacio"}`} style={media.banner ? { backgroundImage: `url(${media.banner})` } : undefined}>
            <SubirFoto tipo="banner" etiqueta="Cambiar portada" />
          </div>
          <div className="pf-cabeza">
            <div className="pf-avatar-caja">
              {media.avatar ? <img className="pf-avatar" src={media.avatar} alt="" /> : <span className="pf-avatar pf-avatar-ini">{inicial}</span>}
              <SubirFoto tipo="avatar" etiqueta="Cambiar foto" />
            </div>
            <div className="pf-id">
              <h1>{alumno.nombre}</h1>
              <p>{alumno.curso_nombre}</p>
              <span className={`pf-estado ${alumno.estado === "activo" ? "ok" : ""}`}>
                <i /> {alumno.estado === "activo" ? "Inscripción activa" : alumno.estado}
              </span>
            </div>
            <div className="pf-metricas">
              <div className="pf-metrica"><b>{avance}%</b><span>Avance</span></div>
              <div className="pf-metrica"><b>{asesorias}</b><span>Asesorías</span></div>
            </div>
          </div>
        </div>

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

          {/* Seguridad */}
          <div className="pf-bloque pt-rev pf-bloque-ancho" style={{ ["--d" as string]: "160ms" }}>
            <span className="pf-bloque-tit"><Icono n="lock" /> Seguridad</span>
            <DosFactores activo={dosFA} />
            <div className="pf-sep" />
            <ClienteCuenta />
          </div>
        </div>
      </div>
    </section>
  );
}
