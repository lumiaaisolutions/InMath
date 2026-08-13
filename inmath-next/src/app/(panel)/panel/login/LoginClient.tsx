"use client";
import { useActionState, useEffect, useState } from "react";
import { loginAccion, type EstadoLogin } from "./actions";

export type SlideLogin = { src: string; esVideo: boolean; titulo: string; texto: string };

/** Port 1:1 de vistas/login.php: split con carrusel + formulario animado. */
export function LoginClient({ slides, sitioUrl, tituloDefecto, textoDefecto }: {
  slides: SlideLogin[]; sitioUrl: string; tituloDefecto: string; textoDefecto: string;
}) {
  const [estado, accion, pendiente] = useActionState<EstadoLogin, FormData>(loginAccion, {});
  const [actual, setActual] = useState(0);
  const [verPass, setVerPass] = useState(false);

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
            <h1 className="login-saludo lc-e e2">¡Hola de nuevo!</h1>
            <p className="login-sub lc-e e3">Inicia sesión para continuar.</p>
            {estado.error && <div className="aviso error aviso-sacudida">{estado.error}</div>}
            <form action={accion}>
              <div className="campo lc-e e4">
                <label htmlFor="email">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="3" /><path d="m3 6 9 7 9-7" /></svg>
                  Correo
                </label>
                <input type="email" id="email" name="email" required autoFocus autoComplete="username" placeholder="tu@correo.com" />
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
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
