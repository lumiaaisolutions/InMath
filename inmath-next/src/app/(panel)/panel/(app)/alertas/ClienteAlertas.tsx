"use client";
import { useActionState, useState } from "react";
import { guardarAlertasAccion } from "./acciones";
import { useToastResultado } from "../ClientePanel";
import { IconoPanel } from "@/components/IconoPanel";
import { ESTILOS, POSICIONES, FORMATOS, type Alerta } from "@/lib/alertas-tipos";
import type { Resultado } from "../acciones";

const NOMBRE_ESTILO: Record<Alerta["estilo"], string> = {
  azul: "Azul", menta: "Menta", ambar: "Ámbar", coral: "Coral",
};

const nueva = (): Alerta => ({
  id: Math.random().toString(36).slice(2, 9),
  titulo: "", texto: "", estilo: "azul",
  enlace: "", enlace_texto: "", posicion: "arriba", formato: "banner", activo: true,
});

/** Editor de alertas de la landing: agregar/quitar/personalizar con preview en vivo. */
export function ClienteAlertas({ iniciales }: { iniciales: Alerta[] }) {
  const toast = useToastResultado();
  const [alertas, setAlertas] = useState<Alerta[]>(iniciales);
  const [, accion, pendiente] = useActionState<Resultado, FormData>(async (prev, fd) => {
    const r = await guardarAlertasAccion(prev, fd);
    toast(r);
    return r;
  }, {});

  const set = (id: string, campo: keyof Alerta, v: string | boolean) =>
    setAlertas((xs) => xs.map((a) => (a.id === id ? { ...a, [campo]: v } : a)));
  const quitar = (id: string) => setAlertas((xs) => xs.filter((a) => a.id !== id));

  return (
    <>
      <div className="cabecera">
        <div>
          <h1>Alertas de la página</h1>
          <div className="sub">Mensajes personalizables que aparecen en la página pública. Agrega, quita y edita — el diseño usa los colores del sitio.</div>
        </div>
        {alertas.length < 6 && (
          <button type="button" className="boton primario" onClick={() => setAlertas((xs) => [...xs, nueva()])}>+ Agregar alerta</button>
        )}
      </div>

      {alertas.length === 0 && (
        <div className="tarjeta al-vacio">
          <p>Aún no hay alertas. Crea la primera con <b>+ Agregar alerta</b> — por ejemplo, un aviso de oferta, una fecha límite de inscripción o un mensaje de bienvenida.</p>
        </div>
      )}

      <div className="al-lista">
        {alertas.map((a) => (
          <div key={a.id} className="tarjeta al-item">
            <div className="al-editor">
              <label className="pl-campo">Título
                <input type="text" value={a.titulo} maxLength={80} placeholder="Ej. Inscripciones abiertas"
                  onChange={(e) => set(a.id, "titulo", e.target.value)} />
              </label>
              <label className="pl-campo">Texto
                <input type="text" value={a.texto} maxLength={160} placeholder="Ej. Precio especial hasta agotar lugares"
                  onChange={(e) => set(a.id, "texto", e.target.value)} />
              </label>
              <div className="al-fila">
                <label className="pl-campo">Formato
                  <select value={a.formato} onChange={(e) => set(a.id, "formato", e.target.value)}>
                    {FORMATOS.map((f) => <option key={f.valor} value={f.valor}>{f.nombre}</option>)}
                  </select>
                </label>
                {a.formato === "banner" ? (
                  <label className="pl-campo">Posición en la página
                    <select value={a.posicion} onChange={(e) => set(a.id, "posicion", e.target.value)}>
                      {POSICIONES.map((p) => <option key={p.valor} value={p.valor}>{p.nombre}</option>)}
                    </select>
                  </label>
                ) : (
                  <div className="pl-campo al-nota-em">La ventana aparece al entrar a la página, muestra este aviso + el plan con su descuento, y el visitante puede cerrarla. Se enseña una vez por visita.</div>
                )}
              </div>
              <div className="al-fila">
                <div className="pl-campo al-estilos-campo">Estilo
                  <div className="al-estilos" role="radiogroup" aria-label="Estilo de color">
                    {ESTILOS.map((es) => (
                      <button key={es} type="button" className={`al-sw al-sw-${es}${a.estilo === es ? " activo" : ""}`}
                        title={NOMBRE_ESTILO[es]} aria-label={NOMBRE_ESTILO[es]}
                        onClick={() => set(a.id, "estilo", es)} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="al-fila">
                <label className="pl-campo">Enlace (opcional)
                  <input type="text" value={a.enlace} placeholder="/pago o /agenda"
                    onChange={(e) => set(a.id, "enlace", e.target.value)} />
                </label>
                <label className="pl-campo">Texto del botón
                  <input type="text" value={a.enlace_texto} maxLength={30} placeholder="Ej. Inscribirme"
                    onChange={(e) => set(a.id, "enlace_texto", e.target.value)} />
                </label>
              </div>
              <div className="al-pie">
                <label className="us-toggle al-toggle">
                  <input type="checkbox" checked={a.activo} onChange={(e) => set(a.id, "activo", e.target.checked)} />
                  <span className="us-toggle-tx"><b>{a.activo ? "Visible en la página" : "Oculta"}</b></span>
                </label>
                <button type="button" className="boton mini al-quitar" onClick={() => quitar(a.id)}>
                  <IconoPanel n="x" cls="ic-sm" /> Quitar
                </button>
              </div>
            </div>
            {/* Preview en vivo con el MISMO diseño de la landing */}
            <div className="al-preview">
              <span className="al-preview-tag">Así se ve</span>
              <div className={`alerta-frame alerta-${a.estilo}`}>
                <div className="alerta-cuerpo">
                  {a.titulo && <b>{a.titulo}</b>}
                  {a.texto && <p>{a.texto}</p>}
                </div>
                {a.enlace && a.enlace_texto && <span className="alerta-cta">{a.enlace_texto}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {alertas.length > 0 && (
        <form action={accion} className="al-guardar">
          <input type="hidden" name="alertas" value={JSON.stringify(alertas)} />
          <button className="boton primario" disabled={pendiente}>{pendiente ? "Guardando…" : "Guardar cambios"}</button>
        </form>
      )}
    </>
  );
}
