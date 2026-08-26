import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requiereModulo } from "@/lib/panel/sesion";
import { ahoraPared } from "@/lib/fechas";
import { ListaAlumnos } from "./ClienteAlumnos";

export const metadata: Metadata = { title: "Alumnos y pagos — Inmath CRM" };
export const dynamic = "force-dynamic";

export default async function Alumnos() {
  await requiereModulo("alumnos");

  const [prospectos, cursos] = await Promise.all([
    prisma.prospectos.findMany({
      where: { OR: [{ alumnos: { isNot: null } }, { pagos: { some: {} } }] },
      orderBy: { actualizado_en: "desc" },
      take: 300,
      include: {
        alumnos: { include: { cursos: { select: { nombre: true, duracion_semanas: true } } } },
        pagos: { orderBy: { creado_en: "desc" }, include: { cursos: { select: { nombre: true } } } },
      },
    }),
    prisma.cursos.findMany({ where: { activo: true }, select: { id: true, nombre: true }, orderBy: { id: "asc" } }),
  ]);

  const ahora = ahoraPared().getTime();
  const filas = prospectos.map((p) => {
    const alumno = p.alumnos;
    const pagoReciente = p.pagos[0] ?? null;
    const algunPagoPagado = p.pagos.some((pg) => pg.estado === "pagado");
    const cursoNombre = alumno?.cursos.nombre ?? pagoReciente?.cursos.nombre ?? null;
    const cursoTerminado = !!(alumno?.cursos.duracion_semanas)
      && ahora >= alumno.inscrito_en.getTime() + alumno.cursos.duracion_semanas * 7 * 86400_000;
    const masRecienteCancelado = pagoReciente?.estado === "cancelado";
    const puedeDarBaja = !!alumno && alumno.estado !== "baja" && ((!algunPagoPagado && masRecienteCancelado) || cursoTerminado);

    return {
      prospectoId: p.id,
      nombre: alumno?.nombre ?? p.nombre ?? p.telefono_whatsapp,
      telefono: p.telefono_whatsapp,
      correo: alumno?.email ?? p.correo,
      cursoNombre,
      alumno: alumno ? {
        id: alumno.id, estado: alumno.estado, inscritoEn: alumno.inscrito_en.toISOString(),
        cursoTerminado, puedeDarBaja,
      } : null,
      pagos: p.pagos.map((pg) => ({
        id: pg.id, estado: pg.estado, montoCentavos: pg.monto_centavos, moneda: pg.moneda,
        procesador: pg.procesador, comprobante: pg.comprobante, comprobanteSubidoEn: pg.comprobante_subido_en?.toISOString() ?? null,
        linkPago: pg.link_pago, referenciaExterna: pg.referencia_externa, creadoEn: pg.creado_en.toISOString(),
        linkGeneradoEn: pg.link_generado_en?.toISOString() ?? null, expiraEn: pg.expira_en?.toISOString() ?? null,
        pagadoEn: pg.pagado_en?.toISOString() ?? null, cursoNombre: pg.cursos.nombre,
      })),
    };
  });

  return (
    <>
      <div className="cabecera">
        <div>
          <h1>Alumnos y pagos</h1>
          <div className="sub">{filas.length} en total — cuentas, su pago más reciente y de qué curso</div>
        </div>
      </div>
      <ListaAlumnos inicial={filas} cursos={cursos} />
    </>
  );
}
