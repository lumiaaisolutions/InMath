import { prisma } from "./db";
import { ahoraPared } from "./fechas";

export type CursoConPromo = {
  id: number; precio_centavos: number; precio_original_centavos: number | null;
  promocion_activa: boolean; promocion_texto: string | null; promocion_expira_en: Date | null;
};

/** Promoción vigente para mostrar (tachado + texto) — puramente informativa,
 *  NO cambia el monto que se cobra (ese ya es `precio_centavos`). Se apaga
 *  sola si pasó `promocion_expira_en`, sin que nadie tenga que desactivarla. */
export function promocionVigente(curso: CursoConPromo): { precioOriginal: number; texto: string | null } | null {
  if (!curso.promocion_activa) return null;
  if (curso.promocion_expira_en && curso.promocion_expira_en.getTime() <= ahoraPared().getTime()) return null;
  if (!curso.precio_original_centavos || curso.precio_original_centavos <= curso.precio_centavos) return null;
  return { precioOriginal: curso.precio_original_centavos, texto: curso.promocion_texto };
}

export type ResultadoCupon =
  | { ok: true; cuponId: number; descuentoCentavos: number; montoFinalCentavos: number }
  | { ok: false; error: string };

/** Valida un código de cupón contra un curso/monto y calcula el descuento.
 *  El uso se cuenta por pagos ya CONFIRMADOS (no por intentos) para no gastar
 *  el límite de alguien que solo probó el código sin llegar a pagar. */
export async function validarYCalcularCupon(codigo: string, cursoId: number, montoBaseCentavos: number): Promise<ResultadoCupon> {
  const normalizado = codigo.trim().toUpperCase();
  if (!normalizado) return { ok: false, error: "Escribe un código de cupón." };

  const cupon = await prisma.cupones.findUnique({ where: { codigo: normalizado } });
  if (!cupon || !cupon.activo) return { ok: false, error: "Ese cupón no existe o ya no está activo." };
  if (cupon.curso_id !== null && cupon.curso_id !== cursoId) return { ok: false, error: "Ese cupón no aplica para este curso." };
  if (cupon.expira_en && cupon.expira_en.getTime() <= ahoraPared().getTime()) return { ok: false, error: "Ese cupón ya venció." };

  if (cupon.usos_maximos !== null) {
    const usados = await prisma.pagos.count({ where: { cupon_id: cupon.id, estado: "pagado" } });
    if (usados >= cupon.usos_maximos) return { ok: false, error: "Ese cupón ya alcanzó su límite de usos." };
  }

  const descuentoCentavos = cupon.tipo === "porcentaje"
    ? Math.round((montoBaseCentavos * Math.min(cupon.valor, 100)) / 100)
    : Math.min(cupon.valor, montoBaseCentavos);
  const montoFinalCentavos = Math.max(0, montoBaseCentavos - descuentoCentavos);

  return { ok: true, cuponId: cupon.id, descuentoCentavos, montoFinalCentavos };
}
