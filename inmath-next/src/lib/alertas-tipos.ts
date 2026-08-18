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

export const ESTILOS: Alerta["estilo"][] = ["azul", "menta", "ambar", "coral"];
export const POSICIONES: { valor: Alerta["posicion"]; nombre: string }[] = [
  { valor: "arriba", nombre: "Arriba (después del héroe)" },
  { valor: "precios", nombre: "Antes de los paquetes" },
  { valor: "final", nombre: "Al final (antes del CTA)" },
];
