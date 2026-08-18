"use client";
import { useActionState, useState } from "react";
import { restablecerAccion, type EstadoReset } from "../recuperar/acciones";

/** Formulario de nueva contraseña (llega desde el enlace del correo). */
export function ClienteRestablecer({ token, valido }: { token: string; valido: boolean }) {
  const [estado, accion, pendiente] = useActionState<EstadoReset, FormData>(restablecerAccion, {});
  const [ver, setVer] = useState(false);

  return (
    <div className="login-body reset-body">
      <div className="login-caja login-plano reset-caja">
        <div className="login-logo">
          <img src="/img/inmath.svg" alt="" width={34} height={34} />
          <b>Cursos <span>Inmath</span></b>
        </div>
        {!valido && !estado.ok ? (
          <>
            <h1 className="login-saludo">Este enlace ya no es válido</h1>
            <p className="login-sub">Venció o ya se usó. Solicita uno nuevo y te lo enviamos por correo.</p>
            <a className="boton primario glow login-entrar" href="/panel/login/recuperar">Solicitar un enlace nuevo</a>
          </>
        ) : estado.ok ? (
          <>
            <h1 className="login-saludo">¡Contraseña actualizada!</h1>
            <div className="aviso ok">{estado.ok}</div>
            <a className="boton primario glow login-entrar" href="/panel/login">Iniciar sesión</a>
          </>
        ) : (
          <>
            <h1 className="login-saludo">Crea tu nueva contraseña</h1>
            <p className="login-sub">Mínimo 8 caracteres. La usarás para entrar al panel.</p>
            {estado.error && <div className="aviso error aviso-sacudida">{estado.error}</div>}
            <form action={accion}>
              <input type="hidden" name="token" value={token} />
              <div className="campo">
                <label htmlFor="password">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
                  Nueva contraseña
                </label>
                <div className="campo-pass">
                  <input type={ver ? "text" : "password"} id="password" name="password" required minLength={8} autoComplete="new-password" placeholder="••••••••" />
                  <button type="button" className="ver-pass" aria-label={ver ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={ver} onClick={() => setVer(!ver)}>
                    {!ver ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.6 10.6 0 0 1 12 19c-6.5 0-10-7-10-7a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.6 9.6 0 0 1 12 4c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19" /><path d="m1 1 22 22" /></svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="campo">
                <label htmlFor="confirma">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                  Repite la contraseña
                </label>
                <input type={ver ? "text" : "password"} id="confirma" name="confirma" required minLength={8} autoComplete="new-password" placeholder="••••••••" />
              </div>
              <button type="submit" className="boton primario glow login-entrar" disabled={pendiente}>
                {pendiente ? "Guardando…" : "Guardar contraseña"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
