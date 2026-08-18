import { config } from "./db";
import { ESTILOS, type Alerta } from "./alertas-tipos";

export type { Alerta } from "./alertas-tipos";
export { ESTILOS, POSICIONES } from "./alertas-tipos";

function normaliza(x: Partial<Alerta>): Alerta {
  return {
    id: String(x.id ?? Math.random().toString(36).slice(2, 9)),
    titulo: String(x.titulo ?? ""),
    texto: String(x.texto ?? ""),
    estilo: ESTILOS.includes(x.estilo as Alerta["estilo"]) ? (x.estilo as Alerta["estilo"]) : "azul",
    enlace: String(x.enlace ?? ""),
    enlace_texto: String(x.enlace_texto ?? ""),
    posicion: ["arriba", "precios", "final"].includes(x.posicion as string) ? (x.posicion as Alerta["posicion"]) : "arriba",
    activo: !!x.activo,
  };
}

export async function leerAlertas(): Promise<Alerta[]> {
  try {
    const j = JSON.parse(await config("alertas_landing", "[]"));
    return Array.isArray(j) ? j.map(normaliza) : [];
  } catch {
    return [];
  }
}

export async function alertasActivas(posicion: Alerta["posicion"]): Promise<Alerta[]> {
  return (await leerAlertas()).filter((a) => a.activo && a.posicion === posicion && (a.titulo || a.texto));
}
