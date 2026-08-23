"use client";
import { useActionState } from "react";
import Link from "next/link";
import { Icono } from "@/components/Icono";
import { subirComprobante, type EstadoComprobante } from "./actions";

const money = (c: number) => (c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export type DatosPagoPantalla = {
  pagoId: number; token: string; montoCentavos: number; moneda: string; link: string | null;
};

/** Insignia "Mercado Pago" (wordmark propio, sin usar el logotipo oficial). */
function InsigniaMercadoPago() {
  return (
    <span className="pp-marca pp-marca-mp" aria-label="Mercado Pago">
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 12a9 9 0 1 1 9 9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /><circle cx="12" cy="12" r="3" fill="currentColor" /></svg>
      Mercado Pago
    </span>
  );
}
/** Insignia "OXXO" (wordmark propio, sin usar el logotipo oficial). */
function InsigniaOxxo() {
  return <span className="pp-marca pp-marca-oxxo" aria-label="OXXO">OXXO</span>;
}

/** Pantalla para ELEGIR CÓMO PAGAR: tres métodos claramente separados — tarjeta
 *  en línea, efectivo en OXXO (ambos vía Mercado Pago) y transferencia manual
 *  con comprobante. La usa el wizard tras crear la cuenta y el alumno ya
 *  registrado que entra a "Completar mi pago" desde su portal. */
export function PantallaPago({ pago, cursoNombre, nombre, datosPago, saludoInicial }: {
  pago: DatosPagoPantalla; cursoNombre: string; nombre: string; datosPago: string; saludoInicial?: boolean;
}) {
  const [comp, compAccion, compPend] = useActionState<EstadoComprobante, FormData>(subirComprobante, {});

  if (comp.ok) {
    return (
      <div className="tarjeta-form pp-fin">
        <div className="aviso ok">¡Recibimos tu comprobante! En cuanto se confirme, tu portal se desbloquea. Mientras, ya puedes entrar con tu correo y contraseña.</div>
        <Link className="boton glow bloque grande" href="/portal" style={{ marginTop: 14 }}>Ir a mi portal</Link>
      </div>
    );
  }

  return (
    <div className="tarjeta-form pp">
      <div className="aviso ok">
        {saludoInicial
          ? <>Elige cómo completar tu pago, {nombre.split(" ")[0]}. Al confirmarse, se desbloquea todo tu portal.</>
          : <>¡Cuenta creada, {nombre.split(" ")[0]}! Elige cómo pagar. Puedes entrar a tu portal ahora mismo (se desbloquea al confirmar el pago).</>}
      </div>

      <div className="pp-resumen">
        <span>{cursoNombre}</span>
        <b>${money(pago.montoCentavos)} {pago.moneda}</b>
      </div>

      <p className="pp-titulo">Elige tu método de pago</p>

      <div className="pp-metodos">
        {/* Método 1: Tarjeta en línea, vía Mercado Pago */}
        {pago.link ? (
          <a className="pp-metodo pp-metodo-online" href={pago.link}>
            <span className="pp-metodo-ic pp-ic-tarjeta"><Icono n="card" /></span>
            <span className="pp-metodo-tx">
              <b>Pagar con tarjeta</b>
              <small>Débito o crédito, en línea. Tu acceso se activa automáticamente.</small>
              <InsigniaMercadoPago />
            </span>
            <span className="pp-metodo-fl"><Icono n="arrow" /></span>
          </a>
        ) : (
          <div className="pp-metodo pp-metodo-off" aria-disabled="true">
            <span className="pp-metodo-ic pp-ic-tarjeta"><Icono n="card" /></span>
            <span className="pp-metodo-tx"><b>Pagar con tarjeta</b><small>Disponible muy pronto. Por ahora usa la transferencia de abajo.</small></span>
          </div>
        )}

        {/* Método 2: Efectivo en tienda OXXO, vía Mercado Pago */}
        {pago.link ? (
          <a className="pp-metodo pp-metodo-online pp-metodo-oxxo" href={pago.link}>
            <span className="pp-metodo-ic pp-ic-oxxo"><Icono n="chat" /></span>
            <span className="pp-metodo-tx">
              <b>Pagar en efectivo (OXXO)</b>
              <small>Genera tu código, págalo en cualquier tienda OXXO en 48 h.</small>
              <span className="pp-marcas-fila"><InsigniaOxxo /><InsigniaMercadoPago /></span>
            </span>
            <span className="pp-metodo-fl"><Icono n="arrow" /></span>
          </a>
        ) : (
          <div className="pp-metodo pp-metodo-off" aria-disabled="true">
            <span className="pp-metodo-ic pp-ic-oxxo"><Icono n="chat" /></span>
            <span className="pp-metodo-tx"><b>Pagar en efectivo (OXXO)</b><small>Disponible muy pronto. Por ahora usa la transferencia de abajo.</small></span>
          </div>
        )}

        {/* Método 3: transferencia + comprobante */}
        <div className="pp-metodo pp-metodo-trans">
          <div className="pp-metodo-cab">
            <span className="pp-metodo-ic pp-ic-trans"><Icono n="file" /></span>
            <span className="pp-metodo-tx">
              <b>Pagar por transferencia</b>
              <small>Haz tu transferencia bancaria y sube tu comprobante para validar.</small>
            </span>
          </div>
          <p className="pp-datos">{datosPago}</p>
          <form action={compAccion} className="formulario pp-form">
            <input type="hidden" name="pago_id" value={pago.pagoId} />
            <input type="hidden" name="token" value={pago.token} />
            <div className="campo">
              <label htmlFor="comprobante">Sube tu comprobante (foto o PDF)</label>
              <input type="file" id="comprobante" name="comprobante" accept=".jpg,.jpeg,.png,.webp,.pdf" required />
            </div>
            <button type="submit" className="boton bloque grande" disabled={compPend}>{compPend ? "Enviando…" : "Enviar comprobante"} <span className="flecha"><Icono n="arrow" /></span></button>
          </form>
        </div>
      </div>

      <div className="pp-seguro"><Icono n="check" /> Pago seguro y encriptado — tus datos nunca pasan por nuestros servidores.</div>

      {comp.error && <div className="aviso error" style={{ marginTop: 12 }}>{comp.error}</div>}
      <Link className="pp-despues" href="/portal">Prefiero pagar después — ir a mi portal →</Link>
    </div>
  );
}
