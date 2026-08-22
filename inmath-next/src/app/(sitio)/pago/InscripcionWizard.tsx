"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Icono } from "@/components/Icono";
import { registrarAlumnoAccion, subirComprobante, type EstadoComprobante } from "./actions";
import { useActionState } from "react";
import { REGLAS_PASSWORD, evaluaPassword, passwordSegura, fuerzaPassword } from "@/lib/password";

const money = (c: number) => (c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type Curso = { id: number; nombre: string; precioCentavos: number; moneda: string };
type Datos = { nombre: string; whatsapp: string; correo: string; password: string; confirmar: string; cursoId: number };
type Pago = { pagoId: number; token: string; montoCentavos: number; moneda: string; link: string | null };

type Prefill = { nombre: string; correo: string; google: boolean };

/** Registro paso a paso: recoge TODOS los datos antes de continuar; el pago va
 *  al final. "Pagar después" crea la cuenta pero deja el portal bloqueado.
 *  Con Google (prefill.google) el correo viene fijo y se omite la contraseña. */
export function InscripcionWizard({ curso, cursos, datosPago, prefill }: { curso: Curso | null; cursos: Curso[]; datosPago: string; prefill?: Prefill }) {
  const google = prefill?.google ?? false;
  // Cada paso tiene una CLAVE (el contenido se decide por clave, no por índice).
  const CLAVES = google ? (["nombre", "whatsapp", "resumen"] as const) : (["nombre", "whatsapp", "correo", "password", "resumen"] as const);
  const ETIQUETAS: Record<string, string> = { nombre: "Tu nombre", whatsapp: "WhatsApp", correo: "Correo", password: "Contraseña", resumen: google ? "Confirma y paga" : "Pago" };
  const PASOS = CLAVES.map((c) => ETIQUETAS[c]);
  const [paso, setPaso] = useState(0);
  const clave = CLAVES[paso];
  const [d, setD] = useState<Datos>({ nombre: prefill?.nombre ?? "", whatsapp: "", correo: prefill?.correo ?? "", password: "", confirmar: "", cursoId: curso?.id ?? 0 });
  const [verPass, setVerPass] = useState(false);
  const [error, setError] = useState<string>("");
  const [pago, setPago] = useState<Pago | null>(null);
  const [pendiente, start] = useTransition();
  const [comp, compAccion, compPend] = useActionState<EstadoComprobante, FormData>(subirComprobante, {});

  const set = (k: keyof Datos, v: string | number) => setD((x) => ({ ...x, [k]: v }));
  const total = PASOS.length;

  const validaPaso = (): string => {
    if (clave === "nombre" && d.nombre.trim().length < 2) return "Escribe tu nombre completo.";
    if (clave === "whatsapp" && d.whatsapp.replace(/\D+/g, "").length !== 10) return "Tu WhatsApp debe tener 10 dígitos.";
    if (clave === "correo" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.correo.trim())) return "Escribe un correo válido.";
    if (clave === "password") {
      if (!passwordSegura(d.password)) return "Tu contraseña aún no cumple los requisitos de seguridad.";
      if (d.password !== d.confirmar) return "Las contraseñas no coinciden.";
    }
    return "";
  };

  const siguiente = () => {
    const e = validaPaso();
    if (e) { setError(e); return; }
    setError("");
    setPaso((p) => Math.min(total - 1, p + 1));
  };
  const atras = () => { setError(""); setPaso((p) => Math.max(0, p - 1)); };

  const registrar = () => {
    setError("");
    start(async () => {
      const fd = new FormData();
      fd.set("nombre", d.nombre.trim()); fd.set("whatsapp", d.whatsapp);
      fd.set("correo", d.correo.trim()); fd.set("password", d.password); fd.set("curso_id", String(d.cursoId));
      if (google) fd.set("google", "1");
      const r = await registrarAlumnoAccion(fd);
      if (r.error) { setError(r.error); return; }
      if (r.ok) setPago(r.ok);
    });
  };

  // Pantalla final: comprobante subido.
  if (comp.ok) {
    return (
      <div className="tarjeta-form wz-fin">
        <div className="aviso ok">¡Recibimos tu comprobante! En cuanto se confirme, tu portal se desbloquea. Mientras, ya puedes entrar con tu WhatsApp y contraseña.</div>
        <Link className="boton glow bloque grande" href="/panel/login" style={{ marginTop: 14 }}>Entrar a mi portal</Link>
      </div>
    );
  }

  // Pantalla de PAGO (tras registrar).
  if (pago) {
    return (
      <div className="tarjeta-form wz-pago">
        <div className="aviso ok">¡Cuenta creada, {d.nombre.split(" ")[0]}! Elige cómo pagar. Puedes entrar a tu portal ahora mismo (se desbloquea al confirmar el pago).</div>
        <div className="resumen-pago" style={{ marginBottom: 16 }}>
          <span>{curso?.nombre}</span>
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
        <Link className="wz-despues" href="/panel/login">Prefiero pagar después — entrar a mi portal →</Link>
      </div>
    );
  }

  return (
    <div className="tarjeta-form wz">
      {/* Progreso */}
      <div className="wz-barra" aria-hidden="true">
        {PASOS.map((_, i) => <span key={i} className={`wz-punto${i === paso ? " activo" : ""}${i < paso ? " hecho" : ""}`} />)}
      </div>
      <div className="wz-meta">Paso {paso + 1} de {total} · {PASOS[paso]}</div>

      {error && <div className="aviso error">{error}</div>}

      <div className="wz-cuerpo" key={paso}>
        {clave === "nombre" && (
          <div className="campo">
            <label htmlFor="w-nombre"><Icono n="user" /> ¿Cómo te llamas?</label>
            <input id="w-nombre" type="text" value={d.nombre} autoFocus placeholder="Nombre completo"
              onChange={(e) => set("nombre", e.target.value)} onKeyDown={(e) => e.key === "Enter" && siguiente()} />
          </div>
        )}
        {clave === "whatsapp" && (
          <div className="campo">
            <label htmlFor="w-wa"><Icono n="chat" /> Tu WhatsApp (10 dígitos)</label>
            <input id="w-wa" type="tel" inputMode="numeric" value={d.whatsapp} autoFocus placeholder="55 1234 5678"
              onChange={(e) => set("whatsapp", e.target.value.replace(/\D+/g, "").slice(0, 10))} onKeyDown={(e) => e.key === "Enter" && siguiente()} />
            <small className="ayuda-campo">Será tu usuario para entrar al portal.</small>
          </div>
        )}
        {clave === "correo" && (
          <div className="campo">
            <label htmlFor="w-correo"><Icono n="chat" /> Tu correo electrónico</label>
            <input id="w-correo" type="email" value={d.correo} autoFocus placeholder="tu@correo.com" autoComplete="email"
              onChange={(e) => set("correo", e.target.value)} onKeyDown={(e) => e.key === "Enter" && siguiente()} />
            <small className="ayuda-campo">Ahí te damos el seguimiento y tus datos de acceso.</small>
          </div>
        )}
        {clave === "password" && (() => {
          const chk = evaluaPassword(d.password);
          const fuerza = fuerzaPassword(d.password);
          const NIVEL = ["", "Débil", "Aceptable", "Buena", "Fuerte"];
          const coincide = d.confirmar.length > 0 && d.password === d.confirmar;
          return (
          <div className="wz-pass">
            <div className="campo">
              <label htmlFor="w-pass"><Icono n="lock" /> Crea tu contraseña</label>
              <div className="campo-pass">
                <input id="w-pass" type={verPass ? "text" : "password"} value={d.password} autoFocus placeholder="Tu contraseña segura" autoComplete="new-password"
                  onChange={(e) => set("password", e.target.value)} />
                <button type="button" className="ver-pass" aria-label={verPass ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={verPass} onClick={() => setVerPass((v) => !v)}>
                  {!verPass ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.6 10.6 0 0 1 12 19c-6.5 0-10-7-10-7a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.6 9.6 0 0 1 12 4c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19" /><path d="m1 1 22 22" /></svg>
                  )}
                </button>
              </div>
            </div>
            {d.password.length > 0 && (
              <div className="wz-fuerza" aria-hidden="true">
                <div className="wz-fuerza-barra"><i className={`n${fuerza}`} style={{ width: `${(fuerza / 4) * 100}%` }} /></div>
                <span className={`wz-fuerza-txt n${fuerza}`}>{NIVEL[fuerza]}</span>
              </div>
            )}
            <ul className="wz-reqs">
              {REGLAS_PASSWORD.map((r) => (
                <li key={r.clave} className={chk[r.clave] ? "ok" : ""}>
                  <span className="wz-req-ic">{chk[r.clave] ? <Icono n="check" /> : <i className="wz-req-punto" />}</span>
                  {r.etiqueta}
                </li>
              ))}
            </ul>
            <div className="campo">
              <label htmlFor="w-pass2"><Icono n="lock" /> Confirma tu contraseña</label>
              <div className="campo-pass">
                <input id="w-pass2" type={verPass ? "text" : "password"} value={d.confirmar} placeholder="Repite tu contraseña" autoComplete="new-password"
                  onChange={(e) => set("confirmar", e.target.value)} onKeyDown={(e) => e.key === "Enter" && siguiente()} />
              </div>
              {d.confirmar.length > 0 && (
                <small className={`wz-match ${coincide ? "ok" : "no"}`}>
                  {coincide ? "✓ Las contraseñas coinciden" : "Las contraseñas aún no coinciden"}
                </small>
              )}
            </div>
            <small className="ayuda-campo">Con ella entras a tu portal de alumno. No la compartas con nadie.</small>
          </div>
          );
        })()}
        {clave === "resumen" && (
          <div className="wz-resumen">
            {cursos.length > 1 && (
              <div className="campo">
                <label><Icono n="book" /> Elige tu modalidad</label>
                <div className="wz-cursos">
                  {cursos.map((c) => (
                    <button type="button" key={c.id} className={`wz-curso${d.cursoId === c.id ? " activo" : ""}`} onClick={() => set("cursoId", c.id)}>
                      <b>{c.nombre}</b>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="resumen-pago resumen-oferta">
              <span>{cursos.find((c) => c.id === d.cursoId)?.nombre ?? curso?.nombre}</span>
              <div className="ro-precio"><s>$4,500</s><b>${money(curso?.precioCentavos ?? 400000)} {curso?.moneda ?? "MXN"}</b></div>
            </div>
            <ul className="wz-checklist">
              <li><Icono n="check" /> {d.nombre}</li>
              <li><Icono n="check" /> WhatsApp {d.whatsapp}</li>
              <li><Icono n="check" /> {d.correo}</li>
            </ul>
          </div>
        )}
      </div>

      <div className="wz-nav">
        {paso > 0 && <button type="button" className="boton ghost" onClick={atras}>← Atrás</button>}
        {paso < total - 1 ? (
          <button type="button" className="boton glow bloque" onClick={siguiente}>Continuar <span className="flecha"><Icono n="arrow" /></span></button>
        ) : (
          <button type="button" className="boton glow glow-halo bloque" onClick={registrar} disabled={pendiente}>{pendiente ? "Creando tu cuenta…" : "Crear cuenta y elegir pago"} <span className="flecha"><Icono n="arrow" /></span></button>
        )}
      </div>
    </div>
  );
}
