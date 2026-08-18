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
  activo: boolean;
};

export const ESTILOS: Alerta["estilo"][] = ["azul", "menta", "ambar", "coral"];
export const POSICIONES: { valor: Alerta["posicion"]; nombre: string }[] = [
  { valor: "arriba", nombre: "Arriba (después del héroe)" },
  { valor: "precios", nombre: "Antes de los paquetes" },
  { valor: "final", nombre: "Al final (antes del CTA)" },
];
