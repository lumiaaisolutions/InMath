"use client";
import { useActionState } from "react";
import Link from "next/link";
import { iniciarPago, subirComprobante, type EstadoPago, type EstadoComprobante } from "./actions";
import { Icono } from "@/components/Icono";

const formateaMonto = (centavos: number) =>
  (centavos / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Flujo de inscripción — port 1:1 del markup de pago.php (datos → transferencia + comprobante). */
export function PagoForm({ curso, datosPago }: { curso: { nombre: string; precioCentavos: number; moneda: string } | null; datosPago: string }) {
  const [ini, iniAccion, iniPendiente] = useActionState<EstadoPago, FormData>(iniciarPago, {});
  const [comp, compAccion, compPendiente] = useActionState<EstadoComprobante, FormData>(subirComprobante, {});
  const error = comp.error ?? ini.error;

  return (
    <>
      {error && <div className="aviso error">{error}</div>}
      <div className="tarjeta-form">
        {comp.ok ? (
          <>
            <div className="aviso ok">¡Recibimos tu comprobante! Lo revisamos y en cuanto se confirme te llegan tus datos de acceso por correo.</div>
            <Link className="boton ghost grande" href="/" style={{ marginTop: 16 }}>← Volver al inicio</Link>
          </>
        ) : ini.pago ? (
          <>
            <div className="aviso ok">{ini.pago.yaPague ? `¡Gracias, ${ini.pago.nombre}! Sube tu comprobante y validamos tu inscripción.` : `¡Listo, ${ini.pago.nombre}! Tu enlace de pago está preparado.`}</div>
            <div className="resumen-pago" style={{ marginBottom: 18 }}>
              <span>{curso?.nombre}</span>
              <b>${formateaMonto(ini.pago.montoCentavos)} {ini.pago.moneda}</b>
            </div>
            {ini.pago.link && !ini.pago.yaPague && (
              <>
                <a className="boton glow glow-halo bloque grande" href={ini.pago.link}>Pagar de forma segura <span className="flecha">→</span></a>
                <div className="pago-sep">o paga por transferencia</div>
              </>
            )}
            <div className="transferencia">
              <b>Pago por transferencia</b>
              <p className="datos-transferencia">{datosPago}</p>
              <form action={compAccion} className="formulario" style={{ marginTop: 12 }}>
                <input type="hidden" name="pago_id" value={ini.pago.id} />
                <input type="hidden" name="token" value={ini.pago.token} />
                <div className="campo">
                  <label htmlFor="comprobante">Sube tu comprobante (foto o PDF)</label>
                  <input type="file" id="comprobante" name="comprobante" accept=".jpg,.jpeg,.png,.webp,.pdf" required />
                </div>
                <button type="submit" className="boton bloque grande" disabled={compPendiente}>
                  {compPendiente ? "Enviando…" : "Enviar comprobante"} <span className="flecha">→</span>
                </button>
              </form>
            </div>
            <p className="sub" style={{ fontSize: ".86rem", margin: "16px 0 0" }}>
              Te enviamos este enlace y todo el seguimiento de tu pago por correo. Si no completas el pago, te lo recordamos — tu lugar queda apartado unas horas.
            </p>
          </>
        ) : (
          <form action={iniAccion} className="formulario">
            <input type="text" name="sitio_web" defaultValue="" style={{ display: "none" }} tabIndex={-1} autoComplete="off" />
            <div className="campo">
              <label htmlFor="nombre">Nombre completo</label>
              <input type="text" id="nombre" name="nombre" required />
            </div>
            <div className="campo">
              <label htmlFor="telefono">WhatsApp (10 dígitos)</label>
              <input type="tel" id="telefono" name="telefono" required inputMode="numeric" placeholder="55 1234 5678"
                maxLength={10} pattern="[0-9]{10}" title="Exactamente 10 dígitos, sin espacios"
                onInput={(e) => { const t = e.currentTarget; t.value = t.value.replace(/\D+/g, "").slice(0, 10); }} />
            </div>
            <div className="campo">
              <label htmlFor="correo">Correo electrónico</label>
              <input type="email" id="correo" name="correo" required autoComplete="email" placeholder="tu@correo.com" />
              <small className="ayuda-campo">Ahí te damos el seguimiento de tu pago y tus datos de acceso.</small>
            </div>
            {curso && (
              <div className="resumen-pago resumen-oferta">
                <span>{curso.nombre}</span>
                <div className="ro-precio">
                  <s>$4,500</s>
                  <b>${formateaMonto(curso.precioCentavos)} {curso.moneda}</b>
                </div>
              </div>
            )}
            {curso && <div className="oferta-urgencia"><Icono n="clock" /> Precio de oferta: ahorras $500 · <b>por tiempo limitado</b></div>}
            <button type="submit" className="boton glow glow-halo bloque grande" disabled={iniPendiente}>
              {iniPendiente ? "Preparando…" : "Continuar al pago"} <span className="flecha">→</span>
            </button>
            <button type="submit" name="ya_pague" value="1" className="boton ghost bloque grande" disabled={iniPendiente} style={{ marginTop: 10 }}>
              Ya realicé mi pago — subir comprobante
            </button>
          </form>
        )}
      </div>
    </>
  );
}
