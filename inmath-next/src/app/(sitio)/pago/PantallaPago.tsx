"use client";
import { useActionState } from "react";
import Link from "next/link";
import { Icono } from "@/components/Icono";
import { subirComprobante, type EstadoComprobante } from "./actions";

const money = (c: number) => (c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export type DatosPagoPantalla = {
  pagoId: number; token: string; montoCentavos: number; moneda: string; link: string | null;
};

/** Pantalla para ELEGIR CÓMO PAGAR: pago en línea (si hay link) o transferencia
 *  con subida de comprobante. La usa el wizard tras crear la cuenta y también el
 *  alumno ya registrado que entra a "Completar mi pago" desde su portal. */
export function PantallaPago({ pago, cursoNombre, nombre, datosPago, saludoInicial }: {
  pago: DatosPagoPantalla; cursoNombre: string; nombre: string; datosPago: string; saludoInicial?: boolean;
}) {
  const [comp, compAccion, compPend] = useActionState<EstadoComprobante, FormData>(subirComprobante, {});

  if (comp.ok) {
    return (
      <div className="tarjeta-form wz-fin">
        <div className="aviso ok">¡Recibimos tu comprobante! En cuanto se confirme, tu portal se desbloquea. Mientras, ya puedes entrar con tu correo y contraseña.</div>
        <Link className="boton glow bloque grande" href="/portal" style={{ marginTop: 14 }}>Ir a mi portal</Link>
      </div>
    );
  }

  return (
    <div className="tarjeta-form wz-pago">
      <div className="aviso ok">
        {saludoInicial
          ? <>Elige cómo completar tu pago, {nombre.split(" ")[0]}. Al confirmarse, se desbloquea todo tu portal.</>
          : <>¡Cuenta creada, {nombre.split(" ")[0]}! Elige cómo pagar. Puedes entrar a tu portal ahora mismo (se desbloquea al confirmar el pago).</>}
      </div>
      <div className="resumen-pago" style={{ marginBottom: 16 }}>
        <span>{cursoNombre}</span>
        <b>${money(pago.montoCentavos)} {pago.moneda}</b>
      </div>
      {pago.link && (
        <>
          <a className="boton glow glow-halo bloque grande" href={pago.link}>Pagar de forma segura <span className="flecha"><Icono n="arrow" /></span></a>
          <div className="pago-sep">o paga por transferencia</div>
        </>
      )}
      <div className="transferencia">
        <b>Pago por transferencia</b>
        <p className="datos-transferencia">{datosPago}</p>
        <form action={compAccion} className="formulario" style={{ marginTop: 12 }}>
          <input type="hidden" name="pago_id" value={pago.pagoId} />
          <input type="hidden" name="token" value={pago.token} />
          <div className="campo">
            <label htmlFor="comprobante">Sube tu comprobante (foto o PDF)</label>
            <input type="file" id="comprobante" name="comprobante" accept=".jpg,.jpeg,.png,.webp,.pdf" required />
          </div>
          <button type="submit" className="boton bloque grande" disabled={compPend}>{compPend ? "Enviando…" : "Enviar comprobante"} <span className="flecha"><Icono n="arrow" /></span></button>
        </form>
      </div>
      {comp.error && <div className="aviso error" style={{ marginTop: 12 }}>{comp.error}</div>}
      <Link className="wz-despues" href="/portal">Prefiero pagar después — ir a mi portal →</Link>
    </div>
  );
}
