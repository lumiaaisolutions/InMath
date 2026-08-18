"use client";
import { useActionState } from "react";
import { solicitarResetAccion, type EstadoReset } from "./acciones";

/** Solicitud de restablecimiento: pide el correo y manda el enlace. */
export function ClienteRecuperar() {
  const [estado, accion, pendiente] = useActionState<EstadoReset, FormData>(solicitarResetAccion, {});
  return (
    <div className="login-body reset-body">
      <div className="login-caja login-plano reset-caja">
        <div className="login-logo">
          <img src="/img/inmath.svg" alt="" width={34} height={34} />
          <b>Cursos <span>Inmath</span></b>
        </div>
        <h1 className="login-saludo">¿Olvidaste tu contraseña?</h1>
        <p className="login-sub">Escribe tu correo y te enviamos un enlace para crear una nueva.</p>
        {estado.error && <div className="aviso error aviso-sacudida">{estado.error}</div>}
        {estado.ok ? (
          <>
            <div className="aviso ok">{estado.ok}</div>
            <a className="boton primario glow login-entrar" href="/panel/login">Volver al inicio de sesión</a>
          </>
        ) : (
          <form action={accion}>
            <div className="campo">
              <label htmlFor="email">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="3" /><path d="m3 6 9 7 9-7" /></svg>
                Correo
              </label>
              <input type="email" id="email" name="email" required autoFocus autoComplete="username" placeholder="tu@correo.com" />
            </div>
            <button type="submit" className="boton primario glow login-entrar" disabled={pendiente}>
              {pendiente ? "Enviando…" : "Enviarme el enlace"}
            </button>
            <a className="login-olvide" href="/panel/login">Volver al inicio de sesión</a>
          </form>
        )}
      </div>
    </div>
  );
}
