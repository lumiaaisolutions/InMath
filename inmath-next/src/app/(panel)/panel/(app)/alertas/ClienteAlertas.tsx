"use client";
import { useActionState, useRef, useState } from "react";
import { guardarAlertasAccion, alertaMediaSubirAccion, type ResultadoMedia } from "./acciones";
import { useToastResultado } from "../ClientePanel";
import { IconoPanel } from "@/components/IconoPanel";
import { ESTILOS, POSICIONES, FORMATOS, DESTINOS, esVideo, type Alerta } from "@/lib/alertas-tipos";
import type { Resultado } from "../acciones";

const NOMBRE_ESTILO: Record<Alerta["estilo"], string> = {
  azul: "Azul", menta: "Menta", ambar: "Ámbar", coral: "Coral",
};

const nueva = (): Alerta => ({
  id: Math.random().toString(36).slice(2, 9),
  titulo: "", texto: "", estilo: "ambar",
  enlace: "/pago", enlace_texto: "Inscribirme", posicion: "arriba",
  formato: "banner", media: "", activo: true,
});

/** Preview compartido: el MISMO markup del banner de la landing. */
function PreviewBanner({ a }: { a: Alerta }) {
  return (
    <div className={`alerta-frame alerta-${a.estilo}`}>
      {a.media && (esVideo(a.media)
        ? <video className="alerta-media" src={a.media} muted loop autoPlay playsInline />
        : <img className="alerta-media" src={a.media} alt="" />)}
      <div className="alerta-cuerpo">
        <b>{a.titulo || "Escribe un título…"}</b>
        {a.texto && <p>{a.texto}</p>}
      </div>
      {a.enlace_texto && <span className="alerta-cta">{a.enlace_texto}</span>}
      <span className="alerta-brillo" aria-hidden="true" />
    </div>
  );
}

/** Preview del emergente: la ventana de pantalla completa, a escala. */
function PreviewEmergente({ a }: { a: Alerta }) {
  return (
    <div className="al-em-marco">
      <div className={`am-lienzo alerta-${a.estilo}`}>
        {a.media && (esVideo(a.media)
          ? <video className="am-fondo" src={a.media} muted loop autoPlay playsInline />
          : <img className="am-fondo" src={a.media} alt="" />)}
        <div className="am-velo-int" />
        <div className="am-contenido">
          <span className="am-kicker"><IconoPanel n="reloj" /> Oferta por tiempo limitado</span>
          <h3>{a.titulo || "Escribe un título…"}</h3>
          {a.texto && <p className="am-texto">{a.texto}</p>}
          <div className="am-plan">
            <div className="am-plan-info"><b>Curso Propedéutico InMath</b><span>Pago único · acceso inmediato</span></div>
            <div className="am-plan-precio"><b>$4,000</b><s>$4,500</s></div>
          </div>
          <span className="am-marcador">Ahorras $500 inscribiéndote hoy</span>
          <span className="am-cta">{a.enlace_texto || "Inscribirme ahora"}</span>
        </div>
      </div>
    </div>
  );
}

/** Editor de alertas: tarjetas arriba; al seleccionar, frame con preview + configuración. */
export function ClienteAlertas({ iniciales }: { iniciales: Alerta[] }) {
  const toast = useToastResultado();
  const [alertas, setAlertas] = useState<Alerta[]>(iniciales);
  const [selId, setSelId] = useState<string | null>(iniciales[0]?.id ?? null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);

  const [, accion, pendiente] = useActionState<Resultado, FormData>(async (prev, fd) => {
    const r = await guardarAlertasAccion(prev, fd);
    toast(r);
    return r;
  }, {});

  const sel = alertas.find((a) => a.id === selId) ?? null;
  const set = (campo: keyof Alerta, v: string | boolean) =>
    setAlertas((xs) => xs.map((a) => (a.id === selId ? { ...a, [campo]: v } : a)));
  const quitar = (id: string) => {
    setAlertas((xs) => xs.filter((a) => a.id !== id));
    if (selId === id) setSelId(null);
  };
  const agregar = () => {
    const a = nueva();
    setAlertas((xs) => [...xs, a]);
    setSelId(a.id);
  };

  async function subirMedia(archivo: File) {
    setSubiendo(true);
    const fd = new FormData();
    fd.set("media", archivo);
    const r: ResultadoMedia = await alertaMediaSubirAccion({}, fd);
    toast(r);
    if (r.ruta) set("media", r.ruta);
    setSubiendo(false);
  }

  const destinoActual = DESTINOS.some((d) => d.valor === sel?.enlace) ? sel?.enlace : "custom";

  return (
    <>
      <div className="cabecera">
        <div>
          <h1>Alertas de la página</h1>
          <div className="sub">Avisos que aparecen en la página pública: como banner dentro del contenido o como ventana emergente a pantalla completa. Selecciona una tarjeta para verla y configurarla.</div>
        </div>
        {alertas.length < 6 && (
          <button type="button" className="boton primario" onClick={agregar}>+ Agregar alerta</button>
        )}
      </div>

      {alertas.length === 0 ? (
        <div className="tarjeta al-vacio">
          <p>Aún no hay alertas. Crea la primera con <b>+ Agregar alerta</b> — por ejemplo, un aviso de oferta con imagen, o una ventana de bienvenida con el plan.</p>
        </div>
      ) : (
        <div className="al-tarjetas">
          {alertas.map((a) => (
            <button key={a.id} type="button" className={`al-tarj${a.id === selId ? " sel" : ""}`} onClick={() => setSelId(a.id)}>
              <span className={`al-tarj-sw al-sw-${a.estilo}`} />
              <span className="al-tarj-tx">
                <b>{a.titulo || "Sin título"}</b>
                <i>{a.formato === "emergente" ? "Ventana emergente" : `Banner · ${POSICIONES.find((p) => p.valor === a.posicion)?.nombre ?? ""}`}</i>
              </span>
              <span className={`al-tarj-estado${a.activo ? " on" : ""}`}>{a.activo ? "Visible" : "Oculta"}</span>
            </button>
          ))}
        </div>
      )}

      {sel && (
        <div className="tarjeta al-frame">
          <div className="al-frame-prev">
            <span className="al-preview-tag">{sel.formato === "emergente" ? "Así se ve la ventana (toda la pantalla)" : "Así se ve el banner"}</span>
            {sel.formato === "emergente" ? <PreviewEmergente a={sel} /> : <PreviewBanner a={sel} />}
          </div>

          <div className="al-editor">
            <div className="al-fila">
              <label className="pl-campo">Formato
                <select value={sel.formato} onChange={(e) => set("formato", e.target.value)}>
                  {FORMATOS.map((f) => <option key={f.valor} value={f.valor}>{f.nombre}</option>)}
                </select>
              </label>
              {sel.formato === "banner" ? (
                <label className="pl-campo">Posición en la página
                  <select value={sel.posicion} onChange={(e) => set("posicion", e.target.value)}>
                    {POSICIONES.map((p) => <option key={p.valor} value={p.valor}>{p.nombre}</option>)}
                  </select>
                </label>
              ) : (
                <div className="pl-campo al-nota-em">Aparece al entrar, a pantalla completa, con el plan y su descuento. Se muestra una vez por visita y el visitante puede cerrarla.</div>
              )}
            </div>
            <label className="pl-campo">Título
              <input type="text" value={sel.titulo} maxLength={80} placeholder="Ej. Inscripciones abiertas"
                onChange={(e) => set("titulo", e.target.value)} />
            </label>
            <label className="pl-campo">Texto
              <input type="text" value={sel.texto} maxLength={160} placeholder="Ej. Precio especial hasta agotar lugares"
                onChange={(e) => set("texto", e.target.value)} />
            </label>
            <div className="al-fila">
              <div className="pl-campo al-estilos-campo">Estilo
                <div className="al-estilos" role="radiogroup" aria-label="Estilo de color">
                  {ESTILOS.map((es) => (
                    <button key={es} type="button" className={`al-sw al-sw-${es}${sel.estilo === es ? " activo" : ""}`}
                      title={NOMBRE_ESTILO[es]} aria-label={NOMBRE_ESTILO[es]}
                      onClick={() => set("estilo", es)} />
                  ))}
                </div>
              </div>
              <div className="pl-campo">Imagen o video
                <div className="al-media-fila">
                  <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp,.mp4" hidden
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) subirMedia(f); e.target.value = ""; }} />
                  <button type="button" className="boton mini" disabled={subiendo} onClick={() => fileRef.current?.click()}>
                    {subiendo ? "Subiendo…" : sel.media ? "Cambiar" : "Subir archivo"}
                  </button>
                  {sel.media && <button type="button" className="boton mini al-quitar" onClick={() => set("media", "")}>Quitar</button>}
                </div>
              </div>
            </div>
            <div className="al-fila">
              <label className="pl-campo">El botón lleva a
                <select value={destinoActual} onChange={(e) => set("enlace", e.target.value === "custom" ? "" : e.target.value)}>
                  {DESTINOS.map((d) => <option key={d.valor} value={d.valor}>{d.nombre}</option>)}
                </select>
                <small className="al-detalle">{DESTINOS.find((d) => d.valor === destinoActual)?.detalle}</small>
              </label>
              <label className="pl-campo">Texto del botón
                <input type="text" value={sel.enlace_texto} maxLength={30} placeholder="Ej. Inscribirme"
                  onChange={(e) => set("enlace_texto", e.target.value)} />
              </label>
            </div>
            {destinoActual === "custom" && (
              <label className="pl-campo">Link específico
                <input type="text" value={sel.enlace} placeholder="https://… o /ruta"
                  onChange={(e) => set("enlace", e.target.value)} />
              </label>
            )}
            <div className="al-pie">
              <label className="us-toggle al-toggle">
                <input type="checkbox" checked={sel.activo} onChange={(e) => set("activo", e.target.checked)} />
                <span className="us-toggle-tx"><b>{sel.activo ? "Visible en la página" : "Oculta"}</b></span>
              </label>
              <button type="button" className="boton mini al-quitar" onClick={() => quitar(sel.id)}>
                <IconoPanel n="x" cls="ic-sm" /> Quitar alerta
              </button>
            </div>
          </div>
        </div>
      )}

      {alertas.length > 0 && (
        <form action={accion} className="al-guardar">
          <input type="hidden" name="alertas" value={JSON.stringify(alertas)} />
          <button className="boton primario" disabled={pendiente}>{pendiente ? "Guardando…" : "Guardar cambios"}</button>
        </form>
      )}
    </>
  );
}
