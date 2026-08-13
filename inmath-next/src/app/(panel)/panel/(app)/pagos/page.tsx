import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requiereModulo } from "@/lib/panel/sesion";
import { fechaCorta, dinero } from "@/lib/panel/formato";
import { AprobarPagoBoton } from "./ClientePagos";

export const metadata: Metadata = { title: "Pagos — Inmath CRM" };
export const dynamic = "force-dynamic";

export default async function Pagos() {
  await requiereModulo("pagos");
  const pagos = await prisma.pagos.findMany({
    orderBy: { creado_en: "desc" }, take: 200,
    include: { prospectos: { select: { id: true, nombre: true, telefono_whatsapp: true } } },
  });

  return (
    <>
      <div className="cabecera">
        <div>
          <h1>Pagos</h1>
          <div className="sub">Links generados, confirmaciones y recuperación de carritos</div>
        </div>
      </div>
      <div className="tarjeta">
        <table className="lista">
          <thead>
            <tr><th>Prospecto</th><th>Monto</th><th>Procesador</th><th>Comprobante</th><th>Estado</th><th></th></tr>
          </thead>
          <tbody>
            {pagos.length === 0 && (
              <tr><td colSpan={6}><div className="vacio">Sin pagos registrados</div></td></tr>
            )}
            {pagos.map((pg) => (
              <tr key={pg.id}>
                <td><Link href={`/panel/prospectos/${pg.prospectos.id}`} style={{ fontWeight: 600, color: "var(--navy)" }}>{pg.prospectos.nombre ?? pg.prospectos.telefono_whatsapp}</Link></td>
                <td>{dinero(pg.monto_centavos, pg.moneda)}</td>
                <td>{pg.procesador ?? "—"}</td>
                <td>
                  {pg.comprobante ? (
                    <>
                      <a href={`/panel/comprobante/${pg.id}`} target="_blank" style={{ fontWeight: 600, color: "#6B9FFF" }}>Ver comprobante</a>
                      <div style={{ font: "var(--t-mini)", color: "var(--tinta-3)" }}>{fechaCorta(pg.comprobante_subido_en)}</div>
                    </>
                  ) : "—"}
                </td>
                <td><span className={`gaje ${pg.estado === "pagado" ? "ok" : pg.estado === "pendiente" ? "alerta" : "error"}`}>{pg.estado}</span></td>
                <td>
                  {pg.estado === "pendiente" && pg.comprobante && <AprobarPagoBoton pagoId={pg.id} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
