"use client";
import { useActionState, useTransition } from "react";
import { promptGuardarAccion, promptActivarAccion, type Resultado } from "../acciones";
import { useToastResultado } from "../ClientePanel";

export function PromptEditor({ clave, contenido }: { clave: string; contenido: string }) {
  const toast = useToastResultado();
  const [, accion, pendiente] = useActionState<Resultado, FormData>(async (prev, fd) => {
    const r = await promptGuardarAccion(prev, fd);
    toast(r);
    return r;
  }, {});
  return (
    <form action={accion}>
      <input type="hidden" name="clave" value={clave} />
      <textarea name="contenido" style={{ width: "100%", minHeight: 320 }} defaultValue={contenido} key={contenido} />
      <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
        <input type="text" name="notas" placeholder="Nota del cambio (opcional)" style={{ flex: 1 }} />
        <button className="boton primario" disabled={pendiente}>{pendiente ? "Guardando…" : "Guardar como nueva versión"}</button>
      </div>
    </form>
  );
}

export function ReactivarBoton({ promptId }: { promptId: number }) {
  const [pendiente, start] = useTransition();
  const toast = useToastResultado();
  return (
    <button className="boton mini fantasma" disabled={pendiente}
      onClick={() => start(async () => toast(await promptActivarAccion(promptId)))}>
      {pendiente ? "Activando…" : "Reactivar"}
    </button>
  );
}
