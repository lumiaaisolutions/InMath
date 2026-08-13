import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma, config } from "./db";
import { ahoraPared } from "./fechas";
import { inscribirPorPago } from "./inscripcion";

/** Evento neutro que produce un webhook verificado (port de ProcesadorPago). */
export type EventoPago = { referencia_externa: string; estado: "pagado" | "fallido"; metadatos?: Record<string, unknown> };
export type LinkPago = { link: string; referencia_externa: string };

type PagoFila = { id: number; monto_centavos: number; moneda: string };
type ProspectoFila = { id: number; nombre: string | null };
type CursoFila = { id: number; nombre: string; precio_centavos: number; moneda: string };

export interface ProcesadorPago {
  crearLink(pago: PagoFila, prospecto: ProspectoFila, curso: CursoFila): Promise<LinkPago>;
  verificarWebhook(headers: Headers, cuerpoCrudo: string): Promise<EventoPago | null>;
}

/** Port de DriverSimulado (firma HMAC con PAGO_WEBHOOK_SECRET). */
const driverSimulado: ProcesadorPago = {
  async crearLink(pago) {
    const referencia = `SIM-${pago.id}-${randomBytes(6).toString("hex")}`;
    return { link: `https://pagos.simulado.local/checkout/${referencia}`, referencia_externa: referencia };
  },
  async verificarWebhook(headers, cuerpoCrudo) {
    const secreto = process.env.PAGO_WEBHOOK_SECRET ?? "";
    const firma = headers.get("x-firma-simulada") ?? "";
    if (!secreto || !firma) return null;
    const esperada = createHmac("sha256", secreto).update(cuerpoCrudo).digest("hex");
    const dada = Buffer.from(firma);
    if (dada.length !== Buffer.from(esperada).length || !timingSafeEqual(Buffer.from(esperada), dada)) return null;
    let datos: { referencia_externa?: string; estado?: string };
    try { datos = JSON.parse(cuerpoCrudo); } catch { return null; }
    if (!datos.referencia_externa) return null;
    return {
      referencia_externa: String(datos.referencia_externa),
      estado: datos.estado === "pagado" ? "pagado" : "fallido",
      metadatos: { origen: "simulado" },
    };
  },
};

/**
 * Port fiel de DriverMercadoPago (Checkout Pro): preferencia → init_point;
 * webhook firmado (x-signature ts/v1 sobre el manifest) y re-consulta del
 * pago real a la API antes de aplicar el evento.
 */
const driverMercadoPago: ProcesadorPago = {
  async crearLink(pago, prospecto, curso) {
    const accessToken = requerirEnv("MERCADOPAGO_ACCESS_TOKEN");
    const baseUrl = (process.env.APP_URL ?? "").replace(/\/$/, "");
    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        items: [{ title: curso.nombre ?? "Curso Inmath", quantity: 1, currency_id: pago.moneda ?? "MXN", unit_price: Math.round(pago.monto_centavos) / 100 }],
        payer: prospecto.nombre ? { name: prospecto.nombre } : {},
        external_reference: `pago-${pago.id}`,
        notification_url: baseUrl ? `${baseUrl}/api/webhooks/pago/mercadopago` : undefined,
        back_urls: baseUrl ? {
          success: `${baseUrl}/pago?estado=exitoso`,
          pending: `${baseUrl}/pago?estado=pendiente`,
          failure: `${baseUrl}/pago?estado=fallido`,
        } : undefined,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    const datos = await res.json().catch(() => ({}));
    if (res.status !== 201 || !datos.init_point) {
      throw new Error(`MercadoPago respondió ${res.status} al crear la preferencia: ${datos.message ?? JSON.stringify(datos).slice(0, 300)}`);
    }
    return { link: datos.init_point, referencia_externa: String(datos.id) };
  },
  async verificarWebhook(headers, cuerpoCrudo) {
    const secreto = process.env.MERCADOPAGO_WEBHOOK_SECRET ?? "";
    const firma = headers.get("x-signature") ?? "";
    const requestId = headers.get("x-request-id") ?? "";
    if (!secreto || !firma) return null;
    const partes: Record<string, string> = {};
    for (const par of firma.split(",")) {
      const [clave, valor] = par.trim().split("=", 2);
      partes[clave?.trim() ?? ""] = valor?.trim() ?? "";
    }
    const ts = partes.ts ?? "", v1 = partes.v1 ?? "";
    if (!ts || !v1) return null;
    let datos: { type?: string; data?: { id?: unknown } };
    try { datos = JSON.parse(cuerpoCrudo); } catch { return null; }
    const pagoId = String(datos.data?.id ?? "");
    if (!pagoId) return null;
    let manifest = `id:${pagoId.toLowerCase()};`;
    if (requestId) manifest += `request-id:${requestId};`;
    manifest += `ts:${ts};`;
    const esperado = createHmac("sha256", secreto).update(manifest).digest("hex");
    if (Buffer.from(v1).length !== Buffer.from(esperado).length || !timingSafeEqual(Buffer.from(esperado), Buffer.from(v1))) return null;
    if (datos.type !== "payment") return null;

    // El cuerpo del webhook no es confiable por sí solo: re-consultar el pago real.
    const accessToken = requerirEnv("MERCADOPAGO_ACCESS_TOKEN");
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${pagoId}`, {
      headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(30_000),
    });
    if (res.status !== 200) return null;
    const pago = await res.json().catch(() => ({}));
    if (!pago.external_reference) return null;
    return {
      referencia_externa: String(pago.external_reference).replace("pago-", ""),
      estado: pago.status === "approved" ? "pagado" : "fallido",
      metadatos: { origen: "mercadopago", mp_payment_id: pagoId, mp_status: pago.status ?? null },
    };
  },
};

function requerirEnv(clave: string): string {
  const v = process.env[clave];
  if (!v) throw new Error(`Falta ${clave} en .env`);
  return v;
}

/** Port de Fabrica::porNombre. */
export function procesadorPorNombre(nombre: string): ProcesadorPago {
  switch (nombre) {
    case "simulado": return driverSimulado;
    case "mercadopago": return driverMercadoPago;
    default: throw new Error("No hay procesador de pago configurado (clave procesador_pago_activo).");
  }
}

export async function procesadorActivo(): Promise<ProcesadorPago> {
  return procesadorPorNombre((await config("procesador_pago_activo", "")).trim());
}

/**
 * Port de PagoServicio::aplicarEvento: idempotente; pagado → inscribe en
 * transacción lógica; fallido → marca fallido si sigue pendiente.
 */
export async function aplicarEventoPago(evento: EventoPago): Promise<{ ok: boolean; mensaje: string }> {
  const pago = await prisma.pagos.findUnique({ where: { referencia_externa: evento.referencia_externa } });
  if (!pago) return { ok: false, mensaje: "Pago no encontrado para esa referencia" };
  if (pago.estado === "pagado") return { ok: true, mensaje: "Pago ya estaba confirmado (webhook duplicado)" };

  if (evento.estado === "pagado") {
    const n = await prisma.pagos.updateMany({
      where: { id: pago.id, estado: { not: "pagado" } },
      data: { estado: "pagado", pagado_en: ahoraPared(), metadatos: (evento.metadatos ?? {}) as never },
    });
    if (n.count > 0) await inscribirPorPago(pago);
    return { ok: true, mensaje: "Pago confirmado y alumno inscrito" };
  }
  await prisma.pagos.updateMany({ where: { id: pago.id, estado: "pendiente" }, data: { estado: "fallido" } });
  return { ok: true, mensaje: "Pago marcado como fallido" };
}
