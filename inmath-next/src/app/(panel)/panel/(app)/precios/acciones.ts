"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requiereModulo } from "@/lib/panel/sesion";
import { ahoraPared } from "@/lib/fechas";

export type Resultado = { ok?: string; error?: string };

const MODALIDADES = ["asesorias", "video", "ambos"] as const;

function centavos(fd: FormData, campo: string): number | null {
  const v = String(fd.get(campo) ?? "").trim();
  if (!v) return null;
  const n = Math.round(parseFloat(v) * 100);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Fase 8/10 — precio, modalidad, duración y promoción del curso (cada curso
 *  YA es un paquete vendible independiente, no se agrega una entidad nueva). */
export async function cursoActualizarAccion(_prev: Resultado, fd: FormData): Promise<Resultado> {
  await requiereModulo("precios");
  const id = parseInt(String(fd.get("id") ?? "0"), 10);
  if (id < 1) return { error: "Curso inválido" };

  const nombre = String(fd.get("nombre") ?? "").trim();
  const precio = centavos(fd, "precio");
  const precioOriginal = centavos(fd, "precio_original");
  const semanasRaw = String(fd.get("duracion_semanas") ?? "").trim();
  const semanas = semanasRaw ? parseInt(semanasRaw, 10) : null;
  const modalidad = String(fd.get("modalidad") ?? "asesorias");
  const promocionActiva = fd.get("promocion_activa") === "on";
  const promocionTexto = String(fd.get("promocion_texto") ?? "").trim() || null;
  const expiraRaw = String(fd.get("promocion_expira_en") ?? "").trim();
  const destacado = fd.get("destacado") === "on";
  const activo = fd.get("activo") === "on";
  const ordenRaw = String(fd.get("orden") ?? "0").trim();

  if (!nombre) return { error: "El nombre es obligatorio" };
  if (precio === null || precio < 100) return { error: "El precio debe ser un número válido (mínimo $1.00)" };
  if (precioOriginal !== null && precioOriginal <= precio) return { error: "El precio tachado debe ser MAYOR al precio actual" };
  if (!(MODALIDADES as readonly string[]).includes(modalidad)) return { error: "Modalidad inválida" };
  if (promocionActiva && !precioOriginal) return { error: "Para activar la promoción, define el precio tachado" };

  await prisma.cursos.update({
    where: { id },
    data: {
      nombre, precio_centavos: precio, precio_original_centavos: precioOriginal,
      duracion_semanas: semanas, modalidad: modalidad as typeof MODALIDADES[number],
      promocion_activa: promocionActiva, promocion_texto: promocionTexto,
      promocion_expira_en: expiraRaw ? new Date(expiraRaw) : null,
      destacado, activo, orden: Number.isFinite(parseInt(ordenRaw, 10)) ? parseInt(ordenRaw, 10) : 0,
    },
  });
  revalidatePath("/panel/precios");
  revalidatePath("/");
  revalidatePath("/pago");
  return { ok: "Curso actualizado" };
}

const TIPOS_CUPON = ["porcentaje", "monto_fijo"] as const;

export async function cuponCrearAccion(_prev: Resultado, fd: FormData): Promise<Resultado> {
  const u = await requiereModulo("precios");
  const codigo = String(fd.get("codigo") ?? "").trim().toUpperCase();
  const tipo = String(fd.get("tipo") ?? "");
  const valorRaw = String(fd.get("valor") ?? "").trim();
  const cursoIdRaw = String(fd.get("curso_id") ?? "").trim();
  const usosRaw = String(fd.get("usos_maximos") ?? "").trim();
  const expiraRaw = String(fd.get("expira_en") ?? "").trim();

  if (!/^[A-Z0-9_-]{3,40}$/.test(codigo)) return { error: "El código debe tener 3-40 caracteres (letras, números, - o _)" };
  if (!(TIPOS_CUPON as readonly string[]).includes(tipo)) return { error: "Tipo de cupón inválido" };
  const valor = parseInt(valorRaw, 10);
  if (!Number.isFinite(valor) || valor <= 0) return { error: "El valor debe ser un número mayor a 0" };
  if (tipo === "porcentaje" && valor > 100) return { error: "Un porcentaje no puede ser mayor a 100" };

  try {
    await prisma.cupones.create({
      data: {
        codigo, tipo: tipo as typeof TIPOS_CUPON[number],
        valor: tipo === "monto_fijo" ? Math.round(valor * 100) : valor,
        curso_id: cursoIdRaw ? parseInt(cursoIdRaw, 10) : null,
        usos_maximos: usosRaw ? parseInt(usosRaw, 10) : null,
        expira_en: expiraRaw ? new Date(expiraRaw) : null,
        creado_por: u.id,
      },
    });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") return { error: "Ya existe un cupón con ese código" };
    throw e;
  }
  revalidatePath("/panel/precios");
  return { ok: "Cupón creado" };
}

export async function cuponActivoAccion(id: number, activo: boolean): Promise<Resultado> {
  await requiereModulo("precios");
  await prisma.cupones.update({ where: { id }, data: { activo } });
  revalidatePath("/panel/precios");
  return { ok: activo ? "Cupón activado" : "Cupón desactivado" };
}

/** Enciende/apaga Mercado Pago sin tocar credenciales (esas viven en .env). */
export async function procesadorPagoAccion(_prev: Resultado, fd: FormData): Promise<Resultado> {
  await requiereModulo("precios");
  const activo = fd.get("mercadopago_activo") === "on";
  await prisma.configuraciones.upsert({
    where: { clave: "procesador_pago_activo" },
    update: { valor: activo ? "mercadopago" : "", actualizado_en: ahoraPared() },
    create: { clave: "procesador_pago_activo", valor: activo ? "mercadopago" : "", tipo: "texto", descripcion: "Procesador de pago activo (mercadopago | vacío = solo transferencia)" },
  });
  revalidatePath("/panel/precios");
  return { ok: activo ? "Mercado Pago activado" : "Mercado Pago desactivado (solo transferencia)" };
}
