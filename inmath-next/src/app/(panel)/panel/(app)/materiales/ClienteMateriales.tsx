"use client";
import { useActionState, useState } from "react";
import { IconoPanel } from "@/components/IconoPanel";
import { useToastResultado } from "../ClientePanel";
import { guardarMaterialesAccion } from "./acciones";
import type { Material } from "@/lib/portal/materiales";

let contador = 0;
const nuevoId = () => `m${Date.now()}${contador++}`;

export function ClienteMateriales({ inicial }: { inicial: Material[] }) {
  const [lista, setLista] = useState<Material[]>(inicial);
  const toast = useToastResultado();
  const [, accion, pendiente] = useActionState(async () => {
    const fd = new FormData();
    fd.set("materiales", JSON.stringify(lista));
    const r = await guardarMaterialesAccion({}, fd);
    toast(r);
    return r;
  }, {});

  const set = (id: string, campo: keyof Material, valor: string) =>
    setLista((l) => l.map((m) => (m.id === id ? { ...m, [campo]: valor } : m)));
  const quitar = (id: string) => setLista((l) => l.filter((m) => m.id !== id));
  const mover = (id: string, dir: -1 | 1) =>
    setLista((l) => {
      const i = l.findIndex((m) => m.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= l.length) return l;
      const copia = [...l];
      [copia[i], copia[j]] = [copia[j], copia[i]];
      return copia;
    });
  const agregar = () => setLista((l) => [...l, { id: nuevoId(), titulo: "", tipo: "enlace", url: "", orden: l.length }]);

  return (
    <form action={accion} className="mat-form">
      <div className="tarjeta mat-tarjeta">
        {lista.length === 0 && <div className="vacio">Sin material aún. Agrega enlaces a Drive, videos o documentos.</div>}
        {lista.map((m, i) => (
          <div key={m.id} className="mat-fila">
            <div className="mat-orden">
              <button type="button" className="mat-mini" disabled={i === 0} onClick={() => mover(m.id, -1)} aria-label="Subir">↑</button>
              <button type="button" className="mat-mini" disabled={i === lista.length - 1} onClick={() => mover(m.id, 1)} aria-label="Bajar">↓</button>
            </div>
            <div className="mat-campos">
              <input className="mat-inp" placeholder="Título (ej. Guía semana 1)" value={m.titulo} onChange={(e) => set(m.id, "titulo", e.target.value)} />
              <div className="mat-fila2">
                <select className="mat-sel" value={m.tipo} onChange={(e) => set(m.id, "tipo", e.target.value)}>
                  <option value="documento">Documento</option>
                  <option value="video">Video</option>
                  <option value="enlace">Enlace</option>
                </select>
                <input className="mat-inp" placeholder="https://…" value={m.url} onChange={(e) => set(m.id, "url", e.target.value)} />
              </div>
            </div>
            <button type="button" className="mat-quitar" onClick={() => quitar(m.id)} aria-label="Quitar"><IconoPanel n="x" cls="ic-sm" /></button>
          </div>
        ))}
      </div>
      <div className="mat-acciones">
        <button type="button" className="boton ghost" onClick={agregar}>Agregar material</button>
        <button type="submit" className="boton primario" disabled={pendiente}>{pendiente ? "Guardando…" : "Guardar cambios"}</button>
      </div>
    </form>
  );
}
