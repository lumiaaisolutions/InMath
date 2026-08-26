"use client";
import { useActionState, useRef, useState } from "react";
import { IconoPanel } from "@/components/IconoPanel";
import { useToastResultado, Segmentado, BotonMagnetico } from "../ClientePanel";
import { guardarMaterialesAccion, materialArchivoSubirAccion, materialPortadaSubirAccion } from "./acciones";
import type { Material } from "@/lib/portal/materiales";

let contador = 0;
const nuevoId = () => `m${Date.now()}${contador++}`;

const TIPOS_MATERIAL = [
  { valor: "documento", nombre: "Documento" }, { valor: "video", nombre: "Video" }, { valor: "enlace", nombre: "Enlace" },
] as const;

const dinero = (bytes: number) => bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/** Portada opcional del material — dropzone chico, sube y recorta 800×450 en el servidor. */
function PortadaMaterial({ portada, onSubida }: { portada: string | null; onSubida: (url: string | null) => void }) {
  const toast = useToastResultado();
  const [subiendo, setSubiendo] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  const subir = async (f: File) => {
    setSubiendo(true);
    try {
      const fd = new FormData();
      fd.set("imagen", f);
      const r = await materialPortadaSubirAccion(fd);
      if (r.error) toast({ error: r.error });
      else if (r.ok) onSubida(r.ok);
    } catch {
      toast({ error: "No pudimos subir la imagen — intenta de nuevo" });
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <label className={`mat-portada${portada ? " con-imagen" : ""}`}>
      <input ref={file} type="file" accept=".jpg,.jpeg,.png,.webp" hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) subir(f); }} />
      {portada
        ? <img src={portada} alt="" />
        : <span className="mat-portada-ph"><IconoPanel n="imagen" cls="ic-sm" /> Imagen<br />representativa</span>}
      {subiendo && <span className="mat-portada-cargando">Subiendo…</span>}
      {portada && (
        <button type="button" className="icono-burbuja mat-portada-quitar" aria-label="Quitar imagen"
          onClick={(e) => { e.preventDefault(); onSubida(null); }}>
          <IconoPanel n="x" cls="ic-sm" />
        </button>
      )}
    </label>
  );
}

/** Dropzone de archivos (uno o varios) para materiales tipo documento/video. */
function ArchivosMaterial({ archivos, onAgregar, onQuitar }: {
  archivos: Material["archivos"]; onAgregar: (a: Material["archivos"][number]) => void; onQuitar: (i: number) => void;
}) {
  const toast = useToastResultado();
  const [subiendo, setSubiendo] = useState(false);
  const [activa, setActiva] = useState(false);

  const subirTodos = async (files: FileList) => {
    setSubiendo(true);
    try {
      for (const f of Array.from(files)) {
        try {
          const fd = new FormData();
          fd.set("archivo", f);
          const r = await materialArchivoSubirAccion(fd);
          if (r.error) toast({ error: `"${f.name}": ${r.error}` });
          else if (r.ok) onAgregar(r.ok);
        } catch {
          toast({ error: `No pudimos subir "${f.name}" — intenta de nuevo` });
        }
      }
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="mat-archivos">
      <label className={`mat-dropzone${activa ? " activa" : ""}`}
        onDragEnter={(e) => { e.preventDefault(); setActiva(true); }}
        onDragOver={(e) => { e.preventDefault(); setActiva(true); }}
        onDragLeave={(e) => { e.preventDefault(); setActiva(false); }}
        onDrop={(e) => { e.preventDefault(); setActiva(false); if (e.dataTransfer.files.length) subirTodos(e.dataTransfer.files); }}>
        <input type="file" multiple hidden accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.mp4,.mp3,.jpg,.jpeg,.png,.webp"
          onChange={(e) => { if (e.target.files?.length) subirTodos(e.target.files); e.target.value = ""; }} />
        <IconoPanel n="prompts" cls="ic-sm" />
        <span>{subiendo ? "Subiendo…" : "Arrastra uno o varios archivos, o haz clic para elegirlos"}</span>
      </label>
      {archivos.length > 0 && (
        <ul className="mat-archivos-lista">
          {archivos.map((a, i) => (
            <li key={a.url}>
              <IconoPanel n="prompts" cls="ic-sm" />
              <span className="mat-archivo-nombre">{a.nombre}</span>
              <span className="mat-archivo-peso">{dinero(a.tamanoBytes)}</span>
              <a href={a.url} target="_blank" rel="noopener" className="mat-ver" aria-label={`Ver ${a.nombre}`}>Ver</a>
              <button type="button" className="mat-quitar" aria-label="Quitar archivo" onClick={() => onQuitar(i)}><IconoPanel n="x" cls="ic-sm" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

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

  const set = <K extends keyof Material>(id: string, campo: K, valor: Material[K]) =>
    setLista((l) => l.map((m) => (m.id === id ? { ...m, [campo]: valor } : m)));
  // Actualiza archivos leyendo el estado MÁS RECIENTE dentro del updater — no desde un
  // snapshot capturado en el closure. Necesario porque varias subidas seguidas (varios
  // archivos elegidos a la vez) llaman a esto en el mismo ciclo, antes de que React
  // vuelva a renderizar; usar `m.archivos` de afuera pisaba el archivo anterior en vez
  // de agregarlo.
  const agregarArchivo = (id: string, archivo: Material["archivos"][number]) =>
    setLista((l) => l.map((m) => (m.id === id ? { ...m, archivos: [...m.archivos, archivo] } : m)));
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
  const agregar = () => setLista((l) => [...l, {
    id: nuevoId(), titulo: "", descripcion: "", tipo: "documento", portada: null, url: "", archivos: [], orden: l.length,
  }]);

  return (
    <form action={accion} className="mat-form">
      {lista.length === 0 && <div className="tarjeta vacio">Sin material aún. Agrega guías, videos o enlaces para tus alumnos.</div>}
      {lista.map((m, i) => (
        <div key={m.id} className="tarjeta mat-tarjeta-item">
          <div className="mat-item-cab">
            <div className="mat-orden">
              <button type="button" className="mat-mini" disabled={i === 0} onClick={() => mover(m.id, -1)} aria-label="Subir">↑</button>
              <button type="button" className="mat-mini" disabled={i === lista.length - 1} onClick={() => mover(m.id, 1)} aria-label="Bajar">↓</button>
            </div>
            <span className="mat-item-num">Material {i + 1}</span>
            <button type="button" className="mat-item-borrar" aria-label="Quitar material" onClick={() => quitar(m.id)}>
              <IconoPanel n="x" cls="ic-sm" /> Quitar
            </button>
          </div>
          <div className="mat-item-cuerpo">
            <PortadaMaterial portada={m.portada} onSubida={(url) => set(m.id, "portada", url)} />
            <div className="mat-item-campos">
              <label className="pl-campo">Título<input type="text" value={m.titulo} placeholder="Ej. Guía semana 1" onChange={(e) => set(m.id, "titulo", e.target.value)} /></label>
              <label className="pl-campo">Descripción <small>(el alumno la ve antes de abrirlo)</small>
                <textarea value={m.descripcion} rows={2} placeholder="De qué trata este material…" onChange={(e) => set(m.id, "descripcion", e.target.value)} />
              </label>
              <label className="pl-campo">Tipo de material
                <Segmentado opciones={[...TIPOS_MATERIAL]} valor={m.tipo} onChange={(v) => set(m.id, "tipo", v)} />
              </label>
              {m.tipo === "enlace" ? (
                <label className="pl-campo">Enlace<input type="text" value={m.url} placeholder="https://…" onChange={(e) => set(m.id, "url", e.target.value)} /></label>
              ) : (
                <ArchivosMaterial
                  archivos={m.archivos}
                  onAgregar={(a) => agregarArchivo(m.id, a)}
                  onQuitar={(idx) => set(m.id, "archivos", m.archivos.filter((_, ix) => ix !== idx))}
                />
              )}
            </div>
          </div>
        </div>
      ))}
      <div className="mat-acciones">
        <button type="button" className="boton fantasma" onClick={agregar}>+ Agregar material</button>
        <BotonMagnetico type="submit" className="boton primario boton-magnetico" disabled={pendiente} onClick={undefined}>
          {pendiente ? "Guardando…" : "Guardar cambios"}
        </BotonMagnetico>
      </div>
    </form>
  );
}
