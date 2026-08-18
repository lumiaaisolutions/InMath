import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requiereModulo } from "@/lib/panel/sesion";
import { ListaPagos } from "./ClientePagos";

export const metadata: Metadata = { title: "Pagos — Inmath CRM" };
export const dynamic = "force-dynamic";

export default async function Pagos() {
  await requiereModulo("pagos");
  const filas = await prisma.pagos.findMany({
    orderBy: { creado_en: "desc" }, take: 200,
    include: {
      prospectos: { select: { id: true, nombre: true, telefono_whatsapp: true, correo: true, etapa: true } },
      cursos: { select: { nombre: true } },
    },
  });

  // Serializable: fechas a ISO para pasar al cliente.
  const pagos = filas.map((pg) => ({
    id: pg.id,
    monto_centavos: pg.monto_centavos,
    moneda: pg.moneda,
    procesador: pg.procesador,
    estado: pg.estado,
    comprobante: pg.comprobante,
    comprobante_subido_en: pg.comprobante_subido_en?.toISOString() ?? null,
    link_pago: pg.link_pago,
    referencia_externa: pg.referencia_externa,
    creado_en: pg.creado_en.toISOString(),
    link_generado_en: pg.link_generado_en?.toISOString() ?? null,
    expira_en: pg.expira_en?.toISOString() ?? null,
    pagado_en: pg.pagado_en?.toISOString() ?? null,
    curso_nombre: pg.cursos.nombre,
    prospecto: {
      id: pg.prospectos.id,
      nombre: pg.prospectos.nombre,
      telefono_whatsapp: pg.prospectos.telefono_whatsapp,
      correo: pg.prospectos.correo,
      etapa: pg.prospectos.etapa,
    },
  }));

  return (
    <>
      <div className="cabecera">
        <div>
          <h1>Pagos</h1>
          <div className="sub">Links generados, confirmaciones y recuperación de carritos. Un pago pendiente se cancela solo a las 72h si nadie lo confirma (con avisos por correo a las 24h y 3h antes).</div>
        </div>
      </div>
      <ListaPagos pagos={pagos} />
    </>
  );
}
