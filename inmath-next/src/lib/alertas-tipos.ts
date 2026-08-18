/** Tipos y constantes de las alertas de la landing — SIN dependencias de
 *  servidor (este archivo lo importan componentes cliente). */
export type Alerta = {
  id: string;
  titulo: string;
  texto: string;
  estilo: "azul" | "menta" | "ambar" | "coral";
  enlace: string;
  enlace_texto: string;
  posicion: "arriba" | "precios" | "final";
  /** banner = frame dentro de la página; emergente = ventana sobre toda la
   *  página al entrar (muestra además el plan con su descuento). */
  formato: "banner" | "emergente";
  /** Ruta de imagen o video subido (servida por /panel/img/alertas/...). */
  media: string;
  /** Diseño y contenido fino (tipografías, tamaños, distribución, cuadritos). */
  diseno: DisenoAlerta;
  activo: boolean;
};

export const FORMATOS: { valor: Alerta["formato"]; nombre: string }[] = [
  { valor: "banner", nombre: "Banner dentro de la página" },
  { valor: "emergente", nombre: "Ventana emergente (toda la pantalla)" },
];

/** Destinos existentes de la página para el enlace de la alerta. */
export const DESTINOS: { valor: string; nombre: string; detalle: string }[] = [
  { valor: "/pago", nombre: "Inscripción y pago", detalle: "El formulario para inscribirse y pagar el curso" },
  { valor: "/agenda", nombre: "Agendar asesoría gratis", detalle: "El calendario para apartar una asesoría de diagnóstico" },
  { valor: "/#precios", nombre: "Paquetes y precios", detalle: "La sección de planes con la oferta vigente" },
  { valor: "/#como", nombre: "Cómo funciona", detalle: "Los 4 pasos del método, al inicio de la página" },
  { valor: "/#incluye", nombre: "Qué incluye", detalle: "La lista de todo lo que incluye la inscripción" },
  { valor: "custom", nombre: "Link específico…", detalle: "Escribe tú la dirección exacta" },
];

/** ¿La ruta de media es un video? */
export const esVideo = (ruta: string) => /\.mp4($|\?)/i.test(ruta);

/** Diseño/contenido fino de una alerta — TODO configurable desde el panel. */
export type DisenoAlerta = {
  fuente_titulo: "display" | "cuerpo";
  fuente_texto: "display" | "cuerpo";
  tam_titulo: "ch" | "md" | "gd" | "xg";
  tam_texto: "ch" | "md" | "gd";
  alineacion: "izquierda" | "centro" | "derecha";
  media_lado: "izquierda" | "derecha";
  radio: "suave" | "medio" | "redondo";
  cuadro_estilo: "claro" | "vidrio" | "oscuro";
  mostrar_kicker: boolean; kicker_texto: string;
  mostrar_plan: boolean; plan_titulo: string; plan_sub: string; plan_precio: string; plan_antes: string;
  mostrar_marcador: boolean; marcador_texto: string;
};

export const DISENO_DEFECTO: DisenoAlerta = {
  fuente_titulo: "display", fuente_texto: "cuerpo",
  tam_titulo: "md", tam_texto: "md",
  alineacion: "izquierda", media_lado: "izquierda", radio: "medio", cuadro_estilo: "claro",
  mostrar_kicker: true, kicker_texto: "Oferta por tiempo limitado",
  mostrar_plan: true, plan_titulo: "", plan_sub: "Pago único · acceso inmediato · asesoría 1 a 1", plan_precio: "", plan_antes: "$4,500",
  mostrar_marcador: true, marcador_texto: "Ahorras $500 inscribiéndote hoy",
};

export function normalizaDiseno(x?: Partial<DisenoAlerta>): DisenoAlerta {
  const d = { ...DISENO_DEFECTO, ...(x ?? {}) };
  if (!["display", "cuerpo"].includes(d.fuente_titulo)) d.fuente_titulo = "display";
  if (!["display", "cuerpo"].includes(d.fuente_texto)) d.fuente_texto = "cuerpo";
  if (!["ch", "md", "gd", "xg"].includes(d.tam_titulo)) d.tam_titulo = "md";
  if (!["ch", "md", "gd"].includes(d.tam_texto)) d.tam_texto = "md";
  if (!["izquierda", "centro", "derecha"].includes(d.alineacion)) d.alineacion = "izquierda";
  if (!["izquierda", "derecha"].includes(d.media_lado)) d.media_lado = "izquierda";
  if (!["suave", "medio", "redondo"].includes(d.radio)) d.radio = "medio";
  if (!["claro", "vidrio", "oscuro"].includes(d.cuadro_estilo)) d.cuadro_estilo = "claro";
  return d;
}

const TAM_TIT = { ch: "1rem", md: "1.24rem", gd: "1.55rem", xg: "1.9rem" };
const TAM_TIT_EM = { ch: "clamp(1.4rem,3.6vw,2.1rem)", md: "clamp(1.8rem,5vw,3rem)", gd: "clamp(2.2rem,6vw,3.7rem)", xg: "clamp(2.6rem,7vw,4.4rem)" };
const TAM_TX = { ch: ".84rem", md: ".95rem", gd: "1.1rem" };
const RADIO = { suave: "12px", medio: "24px", redondo: "34px" };
const CUADRO = {
  claro:  { bg: "rgba(255,255,255,.94)", fg: "#1B2F52", sub: "#565D72" },
  vidrio: { bg: "rgba(255,255,255,.55)", fg: "#1B2F52", sub: "#3d4763" },
  oscuro: { bg: "rgba(20,26,44,.88)",    fg: "#ffffff", sub: "#AFC4EF" },
};

/** Variables CSS que aplican el diseño configurado (banner y emergente). */
export function varsDiseno(d: DisenoAlerta): Record<string, string> {
  const c = CUADRO[d.cuadro_estilo];
  return {
    "--a-f-tit": d.fuente_titulo === "cuerpo" ? "var(--cuerpo)" : "var(--display)",
    "--a-f-tx": d.fuente_texto === "display" ? "var(--display)" : "var(--cuerpo)",
    "--a-tam-tit": TAM_TIT[d.tam_titulo],
    "--a-tam-tit-em": TAM_TIT_EM[d.tam_titulo],
    "--a-tam-tx": TAM_TX[d.tam_texto],
    "--a-alin": d.alineacion === "izquierda" ? "left" : d.alineacion === "derecha" ? "right" : "center",
    "--a-just": d.alineacion === "izquierda" ? "flex-start" : d.alineacion === "derecha" ? "flex-end" : "center",
    "--a-radio": RADIO[d.radio],
    "--a-media-orden": d.media_lado === "derecha" ? "3" : "-1",
    "--a-cuadro-bg": c.bg, "--a-cuadro-fg": c.fg, "--a-cuadro-sub": c.sub,
  };
}

export const ESTILOS: Alerta["estilo"][] = ["azul", "menta", "ambar", "coral"];
export const POSICIONES: { valor: Alerta["posicion"]; nombre: string }[] = [
  { valor: "arriba", nombre: "Arriba (después del héroe)" },
  { valor: "precios", nombre: "Antes de los paquetes" },
  { valor: "final", nombre: "Al final (antes del CTA)" },
];
