"use client";
import { useActionState, useRef, useState } from "react";
import { guardarAlertasAccion, alertaMediaSubirAccion, type ResultadoMedia } from "./acciones";
import { useToastResultado, Segmentado, ConfirmarDialogo, SelectorFechaHora } from "../ClientePanel";
import { IconoPanel } from "@/components/IconoPanel";
import { CuentaRegresiva } from "@/components/CuentaRegresiva";
import { AlertaEmergenteLienzo } from "@/components/AlertaEmergente";
import {
  ESTILOS, POSICIONES, DESTINOS, esVideo, varsDiseno, DISENO_DEFECTO,
  type Alerta, type DisenoAlerta,
} from "@/lib/alertas-tipos";
import type { Resultado } from "../acciones";

const NOMBRE_ESTILO: Record<Alerta["estilo"], string> = {
  azul: "Azul", menta: "Menta", ambar: "Ámbar", coral: "Coral",
};

const nueva = (): Alerta => ({
  id: Math.random().toString(36).slice(2, 9),
  titulo: "", texto: "", estilo: "ambar",
  enlace: "/pago", enlace_texto: "Inscribirme", posicion: "arriba",
  formato: "banner", media: "", diseno: { ...DISENO_DEFECTO }, activo: true,
});


/** Interruptor custom: reemplaza a <input type="checkbox">. */
function Interruptor({ activo, onChange, etiqueta, detalle }: { activo: boolean; onChange: (v: boolean) => void; etiqueta: string; detalle?: string }) {
  return (
    <button type="button" className={`interr${activo ? " on" : ""}`} role="switch" aria-checked={activo} onClick={() => onChange(!activo)}>
      <span className="interr-sw" aria-hidden="true" />
      <span className="interr-tx"><b>{etiqueta}</b>{detalle && <i>{detalle}</i>}</span>
    </button>
  );
}

/** Contenido rico compartido por el preview de banner y de emergente. */
function ContenidoRico({ a, escala }: { a: Alerta; escala?: boolean }) {
  const d = a.diseno;
  return (
    <>
      {d.mostrar_kicker && d.kicker_texto && <span className={escala ? "am-kicker" : "alb-kicker"}><IconoPanel n="reloj" /> {d.kicker_texto}</span>}
      {d.mostrar_cuenta && d.fecha_limite && <CuentaRegresiva fecha={d.fecha_limite} className="alb-cuenta" />}
      {escala ? <h3>{a.titulo || "Escribe un título…"}</h3> : <h2 className="alb-titulo">{a.titulo || "Escribe un título…"}</h2>}
      {a.texto && <p className={escala ? "am-texto" : "alb-texto"}>{a.texto}</p>}
      {d.mostrar_plan && (
        <div className={escala ? "am-plan" : "alb-plan"}>
          <div className={escala ? "am-plan-info" : "alb-plan-info"}><b>{d.plan_titulo || "Curso Propedéutico InMath"}</b>{d.plan_sub && <span>{d.plan_sub}</span>}</div>
          <div className={escala ? "am-plan-precio" : "alb-plan-precio"}><b>{d.plan_precio || "$4,000"}</b>{d.plan_antes && <s>{d.plan_antes}</s>}</div>
        </div>
      )}
      {d.mostrar_marcador && d.marcador_texto && <span className={escala ? "am-marcador" : "alb-marcador"}>{d.marcador_texto}</span>}
      <span className={escala ? "am-cta" : "alb-cta"}>{a.enlace_texto || "Inscribirme ahora"}</span>
    </>
  );
}

/** Preview del banner con el diseño configurado aplicado. */
function PreviewBanner({ a }: { a: Alerta }) {
  return (
    <div className={`alb alerta-${a.estilo}`} style={varsDiseno(a.diseno) as React.CSSProperties}>
      {a.media && (
        <div className="alb-media">
          {esVideo(a.media) ? <video src={a.media} muted loop autoPlay playsInline /> : <img src={a.media} alt="" />}
        </div>
      )}
      <ContenidoRico a={a} />
    </div>
  );
}

/** Preview del emergente (pantalla completa, a escala) con todo aplicado. */
function PreviewEmergente({ a }: { a: Alerta }) {
  // MISMO componente que renderiza la landing (AlertaEmergenteLienzo) — nada
  // duplicado: lo que el admin configura es exactamente lo que ve el
  // visitante, con la estructura completa (cerrar, kicker, plan, marcador,
  // CTA y "Quizá después").
  return (
    <div className="al-em-marco">
      <AlertaEmergenteLienzo alerta={a} precio="$4,000" curso="Curso Propedéutico InMath" preview />
    </div>
  );
}

/** Editor de alertas: tarjetas; al seleccionar, preview + configuración por pasos. */
export function ClienteAlertas({ iniciales }: { iniciales: Alerta[] }) {
  const toast = useToastResultado();
  const [alertas, setAlertas] = useState<Alerta[]>(iniciales);
  const [selId, setSelId] = useState<string | null>(iniciales[0]?.id ?? null);
  const [avanzado, setAvanzado] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [confirmarQuitar, setConfirmarQuitar] = useState(false);

  const [, accion, pendiente] = useActionState<Resultado, FormData>(async (prev, fd) => {
    const r = await guardarAlertasAccion(prev, fd);
    toast(r);
    return r;
  }, {});

  const sel = alertas.find((a) => a.id === selId) ?? null;
  const set = (campo: keyof Alerta, v: string | boolean) =>
    setAlertas((xs) => xs.map((a) => (a.id === selId ? { ...a, [campo]: v } : a)));
  const setD = (campo: keyof DisenoAlerta, v: string | boolean) =>
    setAlertas((xs) => xs.map((a) => (a.id === selId ? { ...a, diseno: { ...a.diseno, [campo]: v } } : a)));
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

  const destinoActual = DESTINOS.some((d) => d.valor === sel?.enlace) ? sel?.enlace! : "custom";

  return (
    <>
      <div className="cabecera">
        <div>
          <h1>Alertas de la página</h1>
          <div className="sub">Avisos de la página pública. Elige una tarjeta para editarla — verás el preview en vivo mientras configuras.</div>
        </div>
        {alertas.length < 6 && (
          <button type="button" className="boton primario" onClick={agregar}>+ Agregar alerta</button>
        )}
      </div>

      {alertas.length === 0 ? (
        <div className="tarjeta al-vacio">
          <IconoPanel n="alerta" />
          <p>Aún no hay alertas. Crea la primera con <b>+ Agregar alerta</b>.</p>
        </div>
      ) : (
        <div className="al-tarjetas">
          {alertas.map((a) => (
            <button key={a.id} type="button" className={`al-tarj al-tarj-${a.estilo}${a.id === selId ? " sel" : ""}`} onClick={() => setSelId(a.id)}>
              <span className="al-tarj-mini">
                <span className="al-tarj-mini-kicker" />
                <span className="al-tarj-mini-lineas"><i /><i /></span>
                <span className="al-tarj-mini-boton" />
              </span>
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
            {/* Paso 1 — Tipo y dónde aparece */}
            <div className="al-paso">
              <div className="al-paso-tit"><span className="al-paso-n">1</span> ¿Qué tipo de aviso quieres?</div>
              <div className="al-tipo-cards">
                <button type="button" className={`al-tipo-card${sel.formato === "banner" ? " on" : ""}`} onClick={() => set("formato", "banner")}>
                  <span className="al-tipo-mini al-tipo-mini-banner"><i /></span>
                  <b>Banner en la página</b><small>Franja llamativa dentro del sitio, no interrumpe la navegación.</small>
                </button>
                <button type="button" className={`al-tipo-card${sel.formato === "emergente" ? " on" : ""}`} onClick={() => set("formato", "emergente")}>
                  <span className="al-tipo-mini al-tipo-mini-em"><i /></span>
                  <b>Ventana emergente</b><small>Aparece al entrar, a pantalla completa. Se puede cerrar.</small>
                </button>
              </div>
              {sel.formato === "banner" && (
                <div className="al-campo" style={{ marginTop: 14 }}>
                  <label>¿Dónde de la página aparece?</label>
                  <Segmentado opciones={POSICIONES.map((p) => ({ valor: p.valor, nombre: p.nombre }))}
                    valor={sel.posicion} onChange={(v) => set("posicion", v)} />
                </div>
              )}
            </div>

            {/* Paso 2 — Contenido */}
            <div className="al-paso">
              <div className="al-paso-tit"><span className="al-paso-n">2</span> Escribe el contenido</div>
              <div className="al-campo">
                <label htmlFor="al-titulo">Título</label>
                <input id="al-titulo" type="text" value={sel.titulo} maxLength={80} placeholder="Ej. Inscripciones abiertas"
                  onChange={(e) => set("titulo", e.target.value)} />
              </div>
              <div className="al-campo">
                <label htmlFor="al-texto">Texto</label>
                <input id="al-texto" type="text" value={sel.texto} maxLength={160} placeholder="Ej. Precio especial hasta agotar lugares"
                  onChange={(e) => set("texto", e.target.value)} />
              </div>
              <div className="al-fila2">
                <div className="al-campo">
                  <label>Color</label>
                  <div className="al-estilos" role="radiogroup" aria-label="Estilo de color">
                    {ESTILOS.map((es) => (
                      <button key={es} type="button" className={`al-sw al-sw-${es}${sel.estilo === es ? " activo" : ""}`}
                        title={NOMBRE_ESTILO[es]} aria-label={NOMBRE_ESTILO[es]} onClick={() => set("estilo", es)} />
                    ))}
                  </div>
                </div>
                <div className="al-campo">
                  <label>Imagen o video (opcional)</label>
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

              <div className="al-subseccion">Destacados (opcionales)</div>
              <Interruptor activo={sel.diseno.mostrar_kicker} onChange={(v) => setD("mostrar_kicker", v)}
                etiqueta="Etiqueta superior" detalle='Ej. "Oferta por tiempo limitado"' />
              {sel.diseno.mostrar_kicker && (
                <div className="al-campo al-campo-anidado">
                  <input type="text" value={sel.diseno.kicker_texto} maxLength={50} onChange={(e) => setD("kicker_texto", e.target.value)} />
                </div>
              )}

              <Interruptor activo={sel.diseno.mostrar_cuenta} onChange={(v) => setD("mostrar_cuenta", v)}
                etiqueta="Cuenta regresiva" detalle="Muestra días/horas/min/seg hasta una fecha límite" />
              {sel.diseno.mostrar_cuenta && (
                <div className="al-campo al-campo-anidado">
                  <label>Fecha y hora límite</label>
                  <SelectorFechaHora valor={sel.diseno.fecha_limite} onChange={(v) => setD("fecha_limite", v)} />
                </div>
              )}

              <Interruptor activo={sel.diseno.mostrar_plan} onChange={(v) => setD("mostrar_plan", v)}
                etiqueta="Cuadrito del plan" detalle="Muestra el curso y su precio en una tarjeta" />
              {sel.diseno.mostrar_plan && (
                <div className="al-campo-anidado al-fila2">
                  <div className="al-campo">
                    <label>Título del plan</label>
                    <input type="text" value={sel.diseno.plan_titulo} maxLength={60} placeholder="(vacío = nombre real del curso)" onChange={(e) => setD("plan_titulo", e.target.value)} />
                  </div>
                  <div className="al-campo">
                    <label>Subtítulo</label>
                    <input type="text" value={sel.diseno.plan_sub} maxLength={80} onChange={(e) => setD("plan_sub", e.target.value)} />
                  </div>
                  <div className="al-campo">
                    <label>Precio</label>
                    <input type="text" value={sel.diseno.plan_precio} maxLength={16} placeholder="(vacío = precio real)" onChange={(e) => setD("plan_precio", e.target.value)} />
                  </div>
                  <div className="al-campo">
                    <label>Precio anterior (tachado)</label>
                    <input type="text" value={sel.diseno.plan_antes} maxLength={16} placeholder="Vacío = no se muestra" onChange={(e) => setD("plan_antes", e.target.value)} />
                  </div>
                </div>
              )}

              <Interruptor activo={sel.diseno.mostrar_marcador} onChange={(v) => setD("mostrar_marcador", v)}
                etiqueta="Marcador de ahorro" detalle='Ej. "Ahorras $500 inscribiéndote hoy"' />
              {sel.diseno.mostrar_marcador && (
                <div className="al-campo al-campo-anidado">
                  <input type="text" value={sel.diseno.marcador_texto} maxLength={60} onChange={(e) => setD("marcador_texto", e.target.value)} />
                </div>
              )}
            </div>

            {/* Paso 3 — Botón */}
            <div className="al-paso">
              <div className="al-paso-tit"><span className="al-paso-n">3</span> Configura el botón</div>
              <div className="al-campo">
                <label>El botón lleva a</label>
                <Segmentado opciones={DESTINOS.map((d) => ({ valor: d.valor, nombre: d.nombre }))}
                  valor={destinoActual} onChange={(v) => set("enlace", v === "custom" ? "" : v)} />
                <small className="al-detalle">{DESTINOS.find((d) => d.valor === destinoActual)?.detalle}</small>
              </div>
              {destinoActual === "custom" && (
                <div className="al-campo">
                  <label>Link específico</label>
                  <input type="text" value={sel.enlace} placeholder="https://… o /ruta" onChange={(e) => set("enlace", e.target.value)} />
                </div>
              )}
              <div className="al-campo">
                <label>Texto del botón</label>
                <input type="text" value={sel.enlace_texto} maxLength={30} placeholder="Ej. Inscribirme" onChange={(e) => set("enlace_texto", e.target.value)} />
              </div>
            </div>

            {/* Paso 4 — Diseño avanzado (colapsable) */}
            <div className="al-paso">
              <button type="button" className="al-avanzado-tog" onClick={() => setAvanzado((v) => !v)}>
                <span className="al-paso-tit" style={{ margin: 0 }}><span className="al-paso-n">4</span> Diseño avanzado</span>
                <span className="al-avanzado-caret" aria-hidden="true">{avanzado ? "▲" : "▼"}</span>
              </button>
              {avanzado && (
                <div className="al-avanzado-cuerpo">
                  <div className="al-fila2">
                    <div className="al-campo">
                      <label>Fuente del título</label>
                      <Segmentado opciones={[{ valor: "display", nombre: "Títulos" }, { valor: "cuerpo", nombre: "Texto" }]}
                        valor={sel.diseno.fuente_titulo} onChange={(v) => setD("fuente_titulo", v)} />
                    </div>
                    <div className="al-campo">
                      <label>Fuente del texto</label>
                      <Segmentado opciones={[{ valor: "cuerpo", nombre: "Texto" }, { valor: "display", nombre: "Títulos" }]}
                        valor={sel.diseno.fuente_texto} onChange={(v) => setD("fuente_texto", v)} />
                    </div>
                  </div>
                  <div className="al-fila2">
                    <div className="al-campo">
                      <label>Tamaño del título</label>
                      <Segmentado opciones={[{ valor: "ch", nombre: "Chico" }, { valor: "md", nombre: "Normal" }, { valor: "gd", nombre: "Grande" }, { valor: "xg", nombre: "XL" }]}
                        valor={sel.diseno.tam_titulo} onChange={(v) => setD("tam_titulo", v)} />
                    </div>
                    <div className="al-campo">
                      <label>Tamaño del texto</label>
                      <Segmentado opciones={[{ valor: "ch", nombre: "Chico" }, { valor: "md", nombre: "Normal" }, { valor: "gd", nombre: "Grande" }]}
                        valor={sel.diseno.tam_texto} onChange={(v) => setD("tam_texto", v)} />
                    </div>
                  </div>
                  <div className="al-campo">
                    <label>Alineación del contenido</label>
                    <Segmentado opciones={[{ valor: "izquierda", nombre: "Izquierda" }, { valor: "centro", nombre: "Centro" }, { valor: "derecha", nombre: "Derecha" }]}
                      valor={sel.diseno.alineacion} onChange={(v) => setD("alineacion", v)} />
                  </div>
                  {sel.formato === "banner" ? (
                    <div className="al-campo">
                      <label>Lado de la imagen/video</label>
                      <Segmentado opciones={[{ valor: "izquierda", nombre: "Izquierda" }, { valor: "derecha", nombre: "Derecha" }]}
                        valor={sel.diseno.media_lado} onChange={(v) => setD("media_lado", v)} />
                    </div>
                  ) : (
                    <div className="al-campo">
                      <label>Diseño de los cuadritos</label>
                      <Segmentado opciones={[{ valor: "claro", nombre: "Claro" }, { valor: "vidrio", nombre: "Vidrio" }, { valor: "oscuro", nombre: "Oscuro" }]}
                        valor={sel.diseno.cuadro_estilo} onChange={(v) => setD("cuadro_estilo", v)} />
                    </div>
                  )}
                  <div className="al-campo">
                    <label>Bordes</label>
                    <Segmentado opciones={[{ valor: "suave", nombre: "Rectos" }, { valor: "medio", nombre: "Redondeados" }, { valor: "redondo", nombre: "Muy redondeados" }]}
                      valor={sel.diseno.radio} onChange={(v) => setD("radio", v)} />
                  </div>
                </div>
              )}
            </div>

            <div className="al-pie">
              <Interruptor activo={sel.activo} onChange={(v) => set("activo", v)}
                etiqueta={sel.activo ? "Visible en la página" : "Oculta"} />
              <button type="button" className="boton mini al-quitar" onClick={() => setConfirmarQuitar(true)}>
                <IconoPanel n="x" cls="ic-sm" /> Quitar alerta
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmarDialogo
        abierto={confirmarQuitar}
        texto={`Se quitará "${sel?.titulo || "esta alerta"}" del editor — no se borra de la página hasta que des clic en Guardar cambios.`}
        onNo={() => setConfirmarQuitar(false)}
        onSi={() => { if (sel) quitar(sel.id); setConfirmarQuitar(false); }}
      />

      {alertas.length > 0 && (
        <form action={accion} className="al-guardar">
          <input type="hidden" name="alertas" value={JSON.stringify(alertas)} />
          <button className="boton primario" disabled={pendiente}>{pendiente ? "Guardando…" : "Guardar cambios"}</button>
        </form>
      )}
    </>
  );
}
