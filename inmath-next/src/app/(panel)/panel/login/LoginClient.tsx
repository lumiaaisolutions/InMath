"use client";
import { useActionState, useEffect, useState } from "react";
import { loginAccion, verificar2faAccion, type EstadoLogin } from "./actions";

export type SlideLogin = { src: string; esVideo: boolean; titulo: string; texto: string };

const MENSAJES_GOOGLE: Record<string, string> = {
  "google-no-config": "El acceso con Google no está disponible por ahora.",
  "google-estado": "La sesión con Google expiró. Intenta de nuevo.",
  "google-correo": "No pudimos verificar tu correo de Google.",
  "google-sin-pago": "Aún no confirmamos un pago con ese correo. En cuanto se confirme, tu acceso se activa.",
  "google-no-alumno": "No encontramos una cuenta con ese correo. Usa el correo con el que te inscribiste, o entra con tu usuario.",
};

/** Login ÚNICO (staff + alumno): split con carrusel + formulario animado + Google. */
export function LoginClient({ slides, sitioUrl, tituloDefecto, textoDefecto, conGoogle, errorGoogle }: {
  slides: SlideLogin[]; sitioUrl: string; tituloDefecto: string; textoDefecto: string;
  conGoogle: boolean; errorGoogle?: string;
}) {
  const [estado, accion, pendiente] = useActionState<EstadoLogin, FormData>(loginAccion, {});
  const [est2, accion2, pend2] = useActionState<EstadoLogin, FormData>(verificar2faAccion, {});
  const [actual, setActual] = useState(0);
  const [verPass, setVerPass] = useState(false);
  const reto = estado.reto2fa ?? est2.reto2fa;
  const error = (reto ? est2.error : estado.error) ?? (errorGoogle ? MENSAJES_GOOGLE[errorGoogle] ?? "No pudimos iniciar sesión con Google." : undefined);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setActual((a) => (a + 1) % slides.length), 6500);
    return () => clearInterval(t);
  }, [slides.length]);

  const slide = slides[actual];
  const overTitulo = slide?.titulo ?? tituloDefecto;
  const overTexto = slide?.texto ?? textoDefecto;

  return (
    <div className="login-body">
      <div className="login-split">
        <div className="login-media" id="loginMedia" aria-hidden="true">
          {slides.length === 0 ? (
            <img className="lm-item activo" src="/img/login-default.jpg" alt="" />
          ) : (
            slides.map((s, i) =>
              s.esVideo ? (
                <video key={s.src} className={`lm-item${i === actual ? " activo" : ""}`} src={s.src} autoPlay muted loop playsInline />
              ) : (
                <img key={s.src} className={`lm-item${i === actual ? " activo" : ""}`} src={s.src} alt="" />
              )
            )
          )}
          <span className="lm-velo" />
          {(overTitulo + overTexto).trim() !== "" && (
            <div className="lm-overlay" id="lmOverlay">
              <h2 id="lmOverTitulo">{overTitulo}</h2>
              <p id="lmOverTexto">{overTexto}</p>
            </div>
          )}
          {slides.length > 1 && (
            <div className="lm-dots">
              {slides.map((s, i) => <i key={s.src} className={`lm-dot${i === actual ? " activo" : ""}`} />)}
            </div>
          )}
        </div>
        <div className="login-lado">
          <a className="login-volver" href={sitioUrl}>
            <img src="/img/inmath.svg" alt="" width={22} height={22} />
            Volver al sitio
          </a>
          <div className="login-caja login-plano">
            <div className="login-logo lc-e e1">
              <img src="/img/inmath.svg" alt="" width={34} height={34} />
              <b>Cursos <span>Inmath</span></b>
            </div>
            <h1 className="login-saludo lc-e e2">{reto ? "Verifica que eres tú" : "¡Hola de nuevo!"}</h1>
            <p className="login-sub lc-e e3">{reto ? "Te enviamos un código a tu correo. Escríbelo para entrar." : "Inicia sesión para continuar."}</p>
            {error && <div className="aviso error aviso-sacudida">{error}</div>}
            {reto ? (
              <form action={accion2} className="login-2fa">
                <input type="hidden" name="reto" value={reto} />
                <div className="campo lc-e e4">
                  <label htmlFor="codigo">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
                    Código de 6 dígitos
                  </label>
                  <input type="text" id="codigo" name="codigo" inputMode="numeric" maxLength={6} required autoFocus autoComplete="one-time-code"
                    className="login-2fa-cod" placeholder="••••••" />
                </div>
                <button type="submit" className="boton primario glow login-entrar lc-e e5" disabled={pend2}>
                  {pend2 ? "Verificando…" : "Verificar y entrar"}
                  <svg className="flecha-login" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </button>
              </form>
            ) : (
            <>
            {conGoogle && (
              <>
                <a className="login-google lc-e e3" href="/api/portal/google/inicio">
                  <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z"/>
                  </svg>
                  Continuar con Google
                </a>
                <div className="login-sep lc-e e3"><span>o con tu correo o usuario</span></div>
              </>
            )}
            <form action={accion}>
              <div className="campo lc-e e4">
                <label htmlFor="identificador">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="3" /><path d="m3 6 9 7 9-7" /></svg>
                  Correo
                </label>
                <input type="text" id="identificador" name="identificador" required autoFocus autoComplete="username" placeholder="tu@correo.com" />
              </div>
              <div className="campo lc-e e5">
                <label htmlFor="password">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
                  Contraseña
                </label>
                <div className="campo-pass">
                  <input type={verPass ? "text" : "password"} id="password" name="password" required autoComplete="current-password" placeholder="••••••••" />
                  <button type="button" className="ver-pass" aria-label={verPass ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={verPass}
                    onClick={() => setVerPass(!verPass)}>
                    {!verPass ? (
                      <svg className="ojo-abierto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
                    ) : (
                      <svg className="ojo-cerrado" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.6 10.6 0 0 1 12 19c-6.5 0-10-7-10-7a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.6 9.6 0 0 1 12 4c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19" /><path d="m1 1 22 22" /></svg>
                    )}
                  </button>
                </div>
              </div>
              <button type="submit" className="boton primario glow login-entrar lc-e e6" disabled={pendiente}>
                {pendiente ? "Entrando…" : "Entrar"}
                <svg className="flecha-login" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </button>
              <a className="login-olvide lc-e e6" href="/panel/login/recuperar">¿Olvidaste tu contraseña?</a>
            </form>
            <div className="login-registro lc-e e6">
              <span>¿Aún no tienes cuenta?</span>
              <a href="/pago" className="login-registro-btn">
                Regístrate
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </a>
            </div>
            </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
