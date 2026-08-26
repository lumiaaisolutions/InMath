"use client";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IconoPanel } from "@/components/IconoPanel";
import { loginMediaSubirAccion, loginMediaMetaAccion, loginMediaBorrarAccion, loginMediaRecortarAccion, type Resultado } from "../acciones";
import { Velo, ConfirmarDialogo, SelectorNumero, useToastResultado } from "../ClientePanel";

export type SlideAdmin = {
  archivo: string; src: string; esVideo: boolean;
  titulo: string; texto: string; orden: number;
};

/** Port de personalizar-login.php: dropzone + encuadre 4:5 + galería + preview. */
export function PersonalizarLogin({ slides, tituloDefecto, textoDefecto }: {
  slides: SlideAdmin[]; tituloDefecto: string; textoDefecto: string;
}) {
  const [abierto, setAbierto] = useState<string | null>(null);
  const primero = slides[0] ?? null;
  const tituloPreview = primero?.titulo || tituloDefecto;
  const textoPreview = primero?.texto || textoDefecto;

  return (
    <div className="pl-rejilla">
      <div className="pl-col">
        <div className="tarjeta pl-tarjeta">
          <h2 className="pl-titulo"><IconoPanel n="imagen" /> Fotos y videos del carrusel</h2>
          <p className="pl-ayuda">Rotan automáticamente cada 6 segundos. JPG, PNG, WebP o MP4 · máx. 25 MB.</p>
          <SubirMedia />
          {slides.length === 0 ? (
            <p className="pl-ayuda" style={{ marginTop: 12 }}>Aún no hay archivos — el login muestra la foto por defecto.</p>
          ) : (
            <>
              <p className="pl-ayuda">Haz clic en una imagen para editar su texto y su orden en el carrusel.</p>
              <div className="pl-galeria">
                {slides.map((s) => (
                  <button key={s.archivo} type="button" className="pl-item pl-item-btn" onClick={() => setAbierto(s.archivo)}>
                    {s.esVideo ? (
                      <><video src={s.src} muted /><span className="pl-tipo">Video</span></>
                    ) : (
                      <img src={s.src} alt="" />
                    )}
                    <span className="pl-orden">#{s.orden}</span>
                    {(s.titulo + s.texto).trim() !== "" && <span className="pl-mini-overlay">{s.titulo}</span>}
                  </button>
                ))}
              </div>
              {slides.map((s) => (
                <EditarSlideModal key={s.archivo} slide={s} abierto={abierto === s.archivo} onCerrar={() => setAbierto(null)} />
              ))}
            </>
          )}
        </div>
      </div>

      <div className="pl-col">
        <div className="tarjeta pl-tarjeta pl-sticky">
          <h2 className="pl-titulo"><IconoPanel n="pipeline" /> Vista previa</h2>
          <p className="pl-ayuda">Así se ve la pantalla de inicio de sesión ahora mismo.</p>
          <div className="pl-preview">
            <div className="plp-media">
              <div className="plp-overlay"><b>{tituloPreview}</b><i>{textoPreview}</i></div>
              {primero?.esVideo ? (
                <video src={primero.src} autoPlay muted loop playsInline />
              ) : (
                <img src={primero?.src ?? "/img/login-default.jpg"} alt="" />
              )}
            </div>
            <div className="plp-lado">
              <div className="plp-logo"><img src="/img/inmath.svg" alt="" width={14} height={14} /> <b>Cursos <span>Inmath</span></b></div>
              <div className="plp-saludo">¡Hola de nuevo!</div>
              <div className="plp-texto">Inicia sesión para continuar.</div>
              <div className="plp-input" />
              <div className="plp-input" />
              <div className="plp-boton">Entrar</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Encuadre 4:5 con canvas (pan + zoom) — reutilizable tanto para una foto recién
 * elegida como para volver a recortar una ya guardada del carrusel.
 */
function EncuadreEditor({ archivo, onCancelar, onListo }: { archivo: File; onCancelar: () => void; onListo: (blob: Blob) => void }) {
  const lienzo = useRef<HTMLCanvasElement>(null);
  const img = useRef<HTMLImageElement | null>(null);
  const est = useRef({ escBase: 1, z: 1, ox: 0, oy: 0 });
  const arrastre = useRef<{ x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(100);

  function pintar() {
    const c = lienzo.current, im = img.current;
    if (!c || !im) return;
    const ctx = c.getContext("2d")!;
    const e = est.current;
    const s = e.escBase * e.z, w = im.naturalWidth * s, h = im.naturalHeight * s;
    e.ox = Math.min(0, Math.max(c.width - w, e.ox));
    e.oy = Math.min(0, Math.max(c.height - h, e.oy));
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(im, e.ox, e.oy, w, h);
  }

  useEffect(() => {
    const im = new Image();
    im.onload = () => {
      const c = lienzo.current!;
      const e = est.current;
      e.escBase = Math.max(c.width / im.naturalWidth, c.height / im.naturalHeight);
      e.z = 1; setZoom(100);
      e.ox = (c.width - im.naturalWidth * e.escBase) / 2;
      e.oy = (c.height - im.naturalHeight * e.escBase) / 2;
      img.current = im;
      requestAnimationFrame(pintar);
    };
    im.src = URL.createObjectURL(archivo);
    return () => URL.revokeObjectURL(im.src);
  }, [archivo]);

  function usarFoto() {
    const im = img.current, c = lienzo.current;
    if (!im || !c) return;
    const salida = document.createElement("canvas");
    salida.width = 1080; salida.height = 1200;
    const f = salida.width / c.width;
    const e = est.current;
    const s = e.escBase * e.z * f;
    salida.getContext("2d")!.drawImage(im, e.ox * f, e.oy * f, im.naturalWidth * s, im.naturalHeight * s);
    salida.toBlob((blob) => { if (blob) onListo(blob); }, "image/jpeg", 0.9);
  }

  return (
    <div className="aj-caja">
      <canvas className="aj-lienzo" ref={lienzo} width={450} height={500}
        onPointerDown={(e) => { arrastre.current = { x: e.clientX, y: e.clientY }; (e.target as HTMLElement).setPointerCapture(e.pointerId); }}
        onPointerMove={(e) => {
          if (!arrastre.current || !lienzo.current) return;
          const r = lienzo.current.getBoundingClientRect(), f = lienzo.current.width / r.width;
          est.current.ox += (e.clientX - arrastre.current.x) * f;
          est.current.oy += (e.clientY - arrastre.current.y) * f;
          arrastre.current = { x: e.clientX, y: e.clientY };
          pintar();
        }}
        onPointerUp={() => { arrastre.current = null; }}
        onPointerCancel={() => { arrastre.current = null; }}
      />
      <div className="aj-controles">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3M8 11h6" /></svg>
        <input type="range" className="aj-zoom" min={100} max={250} value={zoom} aria-label="Acercar o alejar la foto"
          onChange={(e) => {
            const zNuevo = parseInt(e.target.value, 10) / 100;
            const c = lienzo.current!, es = est.current;
            const cx = c.width / 2, cy = c.height / 2;
            es.ox = cx - (cx - es.ox) * (zNuevo / es.z);
            es.oy = cy - (cy - es.oy) * (zNuevo / es.z);
            es.z = zNuevo; setZoom(parseInt(e.target.value, 10));
            pintar();
          }} />
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3M8 11h6M11 8v6" /></svg>
      </div>
      <p className="aj-nota">Arrastra la foto para encuadrarla y usa el control para acercar — así se verá en el login.</p>
      <div className="aj-botones">
        <button type="button" className="boton fantasma" onClick={onCancelar}>Cancelar</button>
        <button type="button" className="boton primario" onClick={usarFoto}>Usar esta foto</button>
      </div>
    </div>
  );
}

/** Dropzone + encuadre 4:5 para agregar fotos/videos nuevos al carrusel. */
function SubirMedia() {
  const toast = useToastResultado();
  const [, accion] = useActionState<Resultado, FormData>(async (prev, fd) => {
    const r = await loginMediaSubirAccion(prev, fd);
    toast(r);
    return r;
  }, {});

  const form = useRef<HTMLFormElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const [activa, setActiva] = useState(false);
  const [pendiente, setPendiente] = useState<File | null>(null);

  function alElegir() {
    const f = file.current?.files?.[0];
    if (!f) return;
    if (/\.mp4$/i.test(f.name) || f.type === "video/mp4") { form.current?.requestSubmit(); return; }
    setPendiente(f);
  }

  function cancelarAjuste() {
    setPendiente(null);
    if (file.current) file.current.value = "";
  }

  function usarFoto(blob: Blob) {
    if (!file.current) return;
    const dt = new DataTransfer();
    dt.items.add(new File([blob], "encuadre.jpg", { type: "image/jpeg" }));
    file.current.files = dt.files;
    form.current?.requestSubmit();
    cancelarAjuste();
  }

  return (
    <>
      <form action={accion} ref={form}>
        <label className={`pl-dropzone${activa ? " activa" : ""}`} style={{ display: pendiente ? "none" : undefined }}
          onDragEnter={(e) => { e.preventDefault(); setActiva(true); }}
          onDragOver={(e) => { e.preventDefault(); setActiva(true); }}
          onDragLeave={(e) => { e.preventDefault(); setActiva(false); }}
          onDrop={(e) => {
            e.preventDefault(); setActiva(false);
            if (e.dataTransfer.files.length && file.current) { file.current.files = e.dataTransfer.files; alElegir(); }
          }}>
          <input type="file" name="media" accept=".jpg,.jpeg,.png,.webp,.mp4" required ref={file} onChange={alElegir} />
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4m0 0-4 4m4-4 4 4" /><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></svg>
          <b>Arrastra una foto o video aquí</b>
          <span>o haz clic para elegir un archivo</span>
        </label>
      </form>
      {pendiente && <EncuadreEditor archivo={pendiente} onCancelar={cancelarAjuste} onListo={usarFoto} />}
    </>
  );
}

/** Frame de edición por slide (texto en vivo + orden + borrar) — port del slideModal. */
function EditarSlideModal({ slide, abierto, onCerrar }: { slide: SlideAdmin; abierto: boolean; onCerrar: () => void }) {
  const router = useRouter();
  const [titulo, setTitulo] = useState(slide.titulo);
  const [texto, setTexto] = useState(slide.texto);
  const [orden, setOrden] = useState(slide.orden);
  const [confirmar, setConfirmar] = useState(false);
  const [recortando, setRecortando] = useState<File | null>(null);
  const [cargandoRecorte, setCargandoRecorte] = useState(false);
  const [guardandoRecorte, setGuardandoRecorte] = useState(false);
  const [, startBorrar] = useTransition();
  const toast = useToastResultado();
  const [, accion, pendiente] = useActionState<Resultado, FormData>(async (prev, fd) => {
    const r = await loginMediaMetaAccion(prev, fd);
    toast(r);
    if (r.ok) onCerrar();
    return r;
  }, {});

  async function abrirRecorte() {
    setCargandoRecorte(true);
    try {
      const res = await fetch(slide.src);
      const blob = await res.blob();
      setRecortando(new File([blob], slide.archivo, { type: blob.type || "image/jpeg" }));
    } catch {
      toast({ error: "No pudimos cargar la foto para recortarla" });
    }
    setCargandoRecorte(false);
  }

  async function guardarRecorte(blob: Blob) {
    setGuardandoRecorte(true);
    const fd = new FormData();
    fd.set("archivo", slide.archivo);
    fd.set("media", new File([blob], "encuadre.jpg", { type: "image/jpeg" }));
    const r = await loginMediaRecortarAccion({}, fd);
    toast(r);
    setGuardandoRecorte(false);
    setRecortando(null);
    if (r.ok) { router.refresh(); onCerrar(); }
  }

  return (
    <Velo abierto={abierto} onCerrar={onCerrar}>
      <div className="us-frame" role="dialog" aria-modal="true">
        <div className="us-frame-cab">
          <div className="us-quien"><b>Editar slide</b><span>Así se verá en el login</span></div>
          <button type="button" className="toast-x us-cerrar" aria-label="Cerrar" onClick={onCerrar}><IconoPanel n="x" /></button>
        </div>

        {recortando ? (
          <EncuadreEditor archivo={recortando} onCancelar={() => setRecortando(null)} onListo={guardarRecorte} />
        ) : (
          <>
            <div className="plp-media slide-preview">
              {slide.esVideo ? (
                <video src={slide.src} autoPlay muted loop playsInline />
              ) : (
                <img src={slide.src} alt="" />
              )}
              <div className="plp-overlay">
                <b className="sp-titulo">{titulo}</b>
                <i className="sp-texto">{texto}</i>
              </div>
            </div>
            {!slide.esVideo && (
              <button type="button" className="boton mini fantasma" style={{ marginTop: 10 }} disabled={cargandoRecorte || guardandoRecorte} onClick={abrirRecorte}>
                {cargandoRecorte ? "Cargando…" : guardandoRecorte ? "Guardando recorte…" : "Editar recorte"}
              </button>
            )}
            <form action={accion} className="pl-form" style={{ marginTop: 14 }}>
              <input type="hidden" name="archivo" value={slide.archivo} />
              <input type="hidden" name="orden" value={orden} />
              <label className="pl-campo">Título sobre la imagen
                <input type="text" name="titulo" maxLength={60} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Aprende a tu ritmo" /></label>
              <label className="pl-campo">Texto de apoyo
                <input type="text" name="texto" maxLength={120} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Cursos con acompañamiento real." /></label>
              <label className="pl-campo">Orden en el carrusel (1 = primero)
                <SelectorNumero valor={orden} onChange={setOrden} min={1} max={99} /></label>
              <div className="us-pie"><button className="boton primario" disabled={pendiente}>{pendiente ? "Guardando…" : "Guardar slide"}</button></div>
            </form>
            <div className="us-eliminar-form">
              <button className="boton peligro" onClick={() => setConfirmar(true)}>Eliminar del carrusel</button>
            </div>
          </>
        )}

        <ConfirmarDialogo
          abierto={confirmar}
          texto="El archivo se quitará del carrusel del login."
          onNo={() => setConfirmar(false)}
          onSi={() => {
            setConfirmar(false);
            startBorrar(async () => { toast(await loginMediaBorrarAccion(slide.archivo)); onCerrar(); });
          }}
        />
      </div>
    </Velo>
  );
}
