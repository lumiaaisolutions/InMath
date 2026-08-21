"use client";
import { useActionState, useRef } from "react";
import { Icono } from "@/components/Icono";
import { cambiarPasswordAlumnoAccion, subirFotoAlumnoAccion, guardarDatosAlumnoAccion, alternar2faAccion, type EstadoCuenta } from "./actions";

/** Interruptor de verificación en 2 pasos (2FA por correo). */
export function DosFactores({ activo }: { activo: boolean }) {
  const [estado, accion, pend] = useActionState<EstadoCuenta, FormData>(alternar2faAccion, {});
  return (
    <div className="pf-2fa">
      <div className="pf-2fa-tx">
        <b>Verificación en 2 pasos</b>
        <span>Te pedimos un código enviado a tu correo cada vez que entres. Más seguridad para tu cuenta.</span>
        {estado.error && <small className="pf-2fa-msg error">{estado.error}</small>}
        {estado.ok && <small className="pf-2fa-msg ok">{estado.ok}</small>}
      </div>
      <form action={accion}>
        <input type="hidden" name="on" value={activo ? "0" : "1"} />
        <button type="submit" className={`pf-switch${activo ? " on" : ""}`} disabled={pend} role="switch" aria-checked={activo} aria-label="Verificación en 2 pasos">
          <i />
        </button>
      </form>
    </div>
  );
}

/** Datos editables del alumno: nombre y WhatsApp. */
export function DatosEditables({ nombre, whatsapp }: { nombre: string; whatsapp: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoCuenta, FormData>(guardarDatosAlumnoAccion, {});
  return (
    <div className="pt-cuenta-caja">
      {estado.error && <div className="aviso error">{estado.error}</div>}
      {estado.ok && <div className="aviso ok">{estado.ok}</div>}
      <form action={accion} className="formulario">
        <div className="campo">
          <label htmlFor="nombre"><Icono n="user" /> Nombre completo</label>
          <input type="text" id="nombre" name="nombre" defaultValue={nombre} required />
        </div>
        <div className="campo">
          <label htmlFor="whatsapp"><Icono n="chat" /> WhatsApp</label>
          <input type="tel" id="whatsapp" name="whatsapp" defaultValue={whatsapp} inputMode="numeric" placeholder="10 dígitos" />
        </div>
        <button type="submit" className="boton primario bloque" disabled={pendiente}>
          {pendiente ? "Guardando…" : "Guardar cambios"}
        </button>
      </form>
    </div>
  );
}

/** Botón para subir avatar o banner (input file oculto + auto-envío). */
export function SubirFoto({ tipo, etiqueta }: { tipo: "avatar" | "banner"; etiqueta: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoCuenta, FormData>(subirFotoAlumnoAccion, {});
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={accion} className={`pf-subir pf-subir-${tipo}`}>
      <input type="hidden" name="tipo" value={tipo} />
      <input ref={inputRef} type="file" name="archivo" accept="image/*" hidden
        onChange={() => { if (inputRef.current?.files?.length) formRef.current?.requestSubmit(); }} />
      <button type="button" className="pf-subir-btn" disabled={pendiente} onClick={() => inputRef.current?.click()}
        aria-label={etiqueta} title={etiqueta}>
        <Icono n="imagen" /> <span>{pendiente ? "Subiendo…" : etiqueta}</span>
      </button>
      {estado.error && <span className="pf-subir-msg error">{estado.error}</span>}
    </form>
  );
}

/** Cambio de contraseña del alumno. */
export function ClienteCuenta() {
  const [estado, accion, pendiente] = useActionState<EstadoCuenta, FormData>(cambiarPasswordAlumnoAccion, {});
  return (
    <div className="pt-cuenta-caja">
      {estado.error && <div className="aviso error">{estado.error}</div>}
      {estado.ok && <div className="aviso ok">{estado.ok}</div>}
      <form action={accion} className="formulario">
        <div className="campo">
          <label htmlFor="actual"><Icono n="lock" /> Contraseña actual</label>
          <input type="password" id="actual" name="actual" required autoComplete="current-password" />
        </div>
        <div className="campo">
          <label htmlFor="nueva"><Icono n="lock" /> Nueva contraseña</label>
          <input type="password" id="nueva" name="nueva" required autoComplete="new-password" minLength={8} placeholder="Mínimo 8 caracteres" />
        </div>
        <div className="campo">
          <label htmlFor="confirma"><Icono n="lock" /> Repite la nueva contraseña</label>
          <input type="password" id="confirma" name="confirma" required autoComplete="new-password" minLength={8} />
        </div>
        <button type="submit" className="boton glow glow-halo bloque grande" disabled={pendiente}>
          {pendiente ? "Guardando…" : "Cambiar mi contraseña"} <span className="flecha"><Icono n="arrow" /></span>
        </button>
      </form>
    </div>
  );
}
