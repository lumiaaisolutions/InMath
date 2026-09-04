"use client";
import { useActionState, useRef, useState } from "react";
import { Icono } from "@/components/Icono";
import { subirFotoAlumnoAccion, guardarDatosAlumnoAccion, alternar2faAccion, solicitarCodigoPasswordAccion, cambiarPasswordConCodigoAccion, type EstadoCuenta } from "./actions";

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
        <Icono n="file" /> <span>{pendiente ? "Subiendo…" : etiqueta}</span>
      </button>
      {estado.error && <span className="pf-subir-msg error">{estado.error}</span>}
    </form>
  );
}

/** Contraseña del alumno — detecta el MÉTODO de acceso: cuentas creadas con
 *  Google no tienen contraseña (crearla es opcional), y todo cambio o
 *  creación se confirma con un CÓDIGO enviado al correo de la cuenta. La
 *  sección vive PLEGADA (solo el estado) y el formulario aparece únicamente
 *  tras pedir el código. */
export function ClienteCuenta({ tienePassword, correoEnmascarado }: { tienePassword: boolean; correoEnmascarado: string }) {
  const [paso, setPaso] = useState<"resumen" | "codigo">("resumen");
  const [solicitando, setSolicitando] = useState(false);
  const [msgSolicitud, setMsgSolicitud] = useState<EstadoCuenta>({});
  const [estado, accion, pendiente] = useActionState<EstadoCuenta, FormData>(async (prev, fd) => {
    const r = await cambiarPasswordConCodigoAccion(prev, fd);
    if (r.ok) setPaso("resumen");
    return r;
  }, {});

  const pedirCodigo = async () => {
    setSolicitando(true);
    const r = await solicitarCodigoPasswordAccion();
    setMsgSolicitud(r);
    if (r.ok) setPaso("codigo");
    setSolicitando(false);
  };

  return (
    <div className="pt-cuenta-caja">
      {estado.ok && paso === "resumen" && <div className="aviso ok">{estado.ok}</div>}
      {msgSolicitud.error && <div className="aviso error">{msgSolicitud.error}</div>}

      {paso === "resumen" && (
        <div className="pw-resumen">
          <div className="pw-resumen-tx">
            <b>Contraseña</b>
            {tienePassword
              ? <span className="pw-chip-estado ok"><Icono n="check" /> Configurada</span>
              : <span className="pw-chip-estado neutro">Sin contraseña — entras con Google</span>}
            <small>
              {tienePassword
                ? "Puedes cambiarla cuando quieras; te pediremos un código por correo para confirmar."
                : "Tu cuenta entra con Google. Si quieres, crea una contraseña para también poder entrar con tu correo."}
            </small>
          </div>
          <button type="button" className="boton glow glow-halo" disabled={solicitando} onClick={pedirCodigo}>
            {solicitando ? "Enviando código…" : tienePassword ? "Cambiar contraseña" : "Crear contraseña"}
          </button>
        </div>
      )}

      {paso === "codigo" && (
        <>
          <div className="aviso ok">Te enviamos un código de 6 dígitos a <b>{correoEnmascarado}</b>. Escríbelo aquí para confirmar que eres tú.</div>
          {estado.error && <div className="aviso error">{estado.error}</div>}
          <form action={accion} className="formulario">
            <div className="campo">
              <label htmlFor="codigo"><Icono n="mail" /> Código del correo</label>
              <input type="text" id="codigo" name="codigo" required inputMode="numeric" maxLength={6} pattern="\d{6}" placeholder="000000" autoComplete="one-time-code" />
            </div>
            <div className="campo">
              <label htmlFor="nueva"><Icono n="lock" /> {tienePassword ? "Nueva contraseña" : "Tu contraseña"}</label>
              <input type="password" id="nueva" name="nueva" required autoComplete="new-password" minLength={8} placeholder="Mínimo 8 caracteres" />
            </div>
            <div className="campo">
              <label htmlFor="confirma"><Icono n="lock" /> Repítela</label>
              <input type="password" id="confirma" name="confirma" required autoComplete="new-password" minLength={8} />
            </div>
            <button type="submit" className="boton glow glow-halo bloque grande" disabled={pendiente}>
              {pendiente ? "Guardando…" : tienePassword ? "Confirmar y cambiar" : "Confirmar y crear"} <span className="flecha"><Icono n="arrow" /></span>
            </button>
            <button type="button" className="pw-reenviar" disabled={solicitando} onClick={pedirCodigo}>
              {solicitando ? "Reenviando…" : "Reenviar código"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
