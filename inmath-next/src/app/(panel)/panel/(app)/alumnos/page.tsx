import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requiereModulo } from "@/lib/panel/sesion";
import { fechaCorta } from "@/lib/panel/formato";
import { NuevoAlumnoBoton } from "./ClienteAlumnos";

export const metadata: Metadata = { title: "Alumnos — Inmath CRM" };
export const dynamic = "force-dynamic";

export default async function Alumnos() {
  await requiereModulo("alumnos");
  const alumnos = await prisma.alumnos.findMany({
    orderBy: { inscrito_en: "desc" }, take: 300,
    include: { cursos: { select: { nombre: true } } },
  });
  const cursos = await prisma.cursos.findMany({ where: { activo: true }, select: { id: true, nombre: true }, orderBy: { id: "asc" } });

  return (
    <>
      <div className="cabecera">
        <div>
          <h1>Alumnos inscritos</h1>
          <div className="sub">{alumnos.length} en total</div>
        </div>
        <NuevoAlumnoBoton cursos={cursos} />
      </div>
      <div className="tarjeta">
        <table className="lista">
          <thead>
            <tr><th>Nombre</th><th>Teléfono</th><th>Curso</th><th>Inscrito</th><th>Reportes por</th><th>Estado</th></tr>
          </thead>
          <tbody>
            {alumnos.length === 0 && (
              <tr><td colSpan={6}><div className="vacio">Aún no hay alumnos inscritos</div></td></tr>
            )}
            {alumnos.map((a) => (
              <tr key={a.id}>
                <td><Link href={`/panel/prospectos/${a.prospecto_id}`} style={{ fontWeight: 600, color: "var(--navy)" }}>{a.nombre}</Link></td>
                <td style={{ fontFamily: "var(--mono)", fontSize: ".8rem" }}>{a.telefono}</td>
                <td>{a.cursos.nombre}</td>
                <td>{fechaCorta(a.inscrito_en)}</td>
                <td>{a.canal_reporte}</td>
                <td><span className={`gaje ${a.estado === "activo" ? "ok" : "neutro"}`}>{a.estado}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
