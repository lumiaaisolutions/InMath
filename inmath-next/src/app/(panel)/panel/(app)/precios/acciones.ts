"use server";
import { revalidatePath } from "next/cache";
import { mkdir } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import { prisma } from "@/lib/db";
import { requiereModulo } from "@/lib/panel/sesion";
import { dirImgPanel } from "@/lib/panel/media";
import { ahoraPared } from "@/lib/fechas";
import { enviarCorreo } from "@/lib/correo";
import { dinero as formatoDinero } from "@/lib/panel/formato";

export type Resultado = { ok?: string; error?: string };

const MODALIDADES = ["asesorias", "video", "ambos"] as const;

function centavos(fd: FormData, campo: string): number | null {
  const v = String(fd.get(campo) ?? "").trim();
  if (!v) return null;
  const n = Math.round(parseFloat(v) * 100);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

type CamposCurso = {
  nombre: string; precio: number; precioOriginal: number | null; semanas: number | null;
  modalidad: typeof MODALIDADES[number]; promocionActiva: boolean; promocionTexto: string | null;
  expiraEn: Date | null; destacado: boolean; activo: boolean; orden: number;
  descripcion: string | null; imagen: string | null;
};

function leerCamposCurso(fd: FormData): { error: string } | CamposCurso {
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
  const descripcion = String(fd.get("descripcion") ?? "").trim() || null;
  const imagen = String(fd.get("imagen") ?? "").trim() || null;

  if (!nombre) return { error: "El nombre es obligatorio" };
  if (precio === null || precio < 100) return { error: "El precio debe ser un número válido (mínimo $1.00)" };
  if (precioOriginal !== null && precioOriginal <= precio) return { error: "El precio tachado debe ser MAYOR al precio actual" };
  if (!(MODALIDADES as readonly string[]).includes(modalidad)) return { error: "Modalidad inválida" };
  if (promocionActiva && !precioOriginal) return { error: "Para activar la promoción, define el precio tachado" };

  return {
    nombre, precio, precioOriginal, semanas, modalidad: modalidad as typeof MODALIDADES[number],
    promocionActiva, promocionTexto, expiraEn: expiraRaw ? new Date(expiraRaw) : null,
    destacado, activo, orden: Number.isFinite(parseInt(ordenRaw, 10)) ? parseInt(ordenRaw, 10) : 0,
    descripcion, imagen,
  };
}

/** Sube la imagen del curso que el alumno ve en /portal/fases (recorte 16:9). */
export async function cursoImagenSubirAccion(fd: FormData): Promise<{ ok?: string; error?: string }> {
  await requiereModulo("precios");
  const imagen = fd.get("imagen");
  if (!(imagen instanceof File) || imagen.size === 0) return { error: "Elige una imagen válida" };
  if (imagen.size > 8 * 1024 * 1024) return { error: "Solo JPG, PNG o WebP de hasta 8 MB" };
  const dir = path.join(dirImgPanel(), "cursos");
  await mkdir(dir, { recursive: true });
  const nombreArchivo = `curso-${randomBytes(6).toString("hex")}.jpg`;
  try {
    await sharp(Buffer.from(await imagen.arrayBuffer())).rotate()
      .resize(1000, 560, { fit: "cover" }).jpeg({ quality: 85 })
      .toFile(path.join(dir, nombreArchivo));
  } catch { return { error: "No pudimos procesar esa imagen" }; }
  return { ok: `/panel/img/cursos/${nombreArchivo}` };
}

/** Avisa por correo a los alumnos con pago YA CONFIRMADO de este curso que su precio cambió — solo
 *  se llama cuando un curso EXISTENTE cambia de precio (nunca al crear uno nuevo). */
async function avisarCambioDePrecio(cursoId: number, nombreCurso: string, precioAnterior: number, precioNuevo: number, moneda: string) {
  const pagos = await prisma.pagos.findMany({
    where: { curso_id: cursoId, estado: "pagado" },
    include: { alumnos: { select: { nombre: true, email: true } }, prospectos: { select: { nombre: true, correo: true } } },
  });
  const sitio = (process.env.APP_URL ?? "https://inmath.lumiaaisolutions.com").replace(/\/$/, "");
  const vistos = new Set<string>();
  const subio = precioNuevo > precioAnterior;

  for (const pago of pagos) {
    const correo = (pago.alumnos?.email || pago.prospectos.correo || "").trim().toLowerCase();
    if (!correo || vistos.has(correo)) continue;
    vistos.add(correo);
    const nombre = pago.alumnos?.nombre || pago.prospectos.nombre || "Hola";
    await enviarCorreo({
      para: [correo],
      asunto: `Actualizamos el precio de ${nombreCurso}`,
      tono: "azul",
      preheader: `El precio de ${nombreCurso} cambió de ${formatoDinero(precioAnterior, moneda)} a ${formatoDinero(precioNuevo, moneda)}.`,
      texto: [
        `Hola ${nombre},`,
        "",
        `Te avisamos que el precio de "${nombreCurso}" cambió de ${formatoDinero(precioAnterior, moneda)} a ${formatoDinero(precioNuevo, moneda)}.`,
        "",
        subio
          ? "Tu inscripción ya está pagada y confirmada, así que este cambio NO te afecta — tu acceso sigue igual, sin ningún cobro adicional."
          : "Tu inscripción ya está pagada y confirmada — este cambio es solo para nuevas inscripciones y no representa ningún cobro ni reembolso.",
      ].join("\n"),
      cta: { url: `${sitio}/portal`, label: "Ir a mi portal", icono: "check" },
    });
  }
}

/** Fase 8/10 — precio, modalidad, duración y promoción del curso (cada curso
 *  YA es un paquete vendible independiente, no se agrega una entidad nueva). */
export async function cursoActualizarAccion(_prev: Resultado, fd: FormData): Promise<Resultado> {
  await requiereModulo("precios");
  const id = parseInt(String(fd.get("id") ?? "0"), 10);
  if (id < 1) return { error: "Curso inválido" };

  const v = leerCamposCurso(fd);
  if ("error" in v) return v;

  const anterior = await prisma.cursos.findUnique({ where: { id }, select: { precio_centavos: true, moneda: true, nombre: true } });

  await prisma.cursos.update({
    where: { id },
    data: {
      nombre: v.nombre, precio_centavos: v.precio, precio_original_centavos: v.precioOriginal,
      duracion_semanas: v.semanas, modalidad: v.modalidad,
      promocion_activa: v.promocionActiva, promocion_texto: v.promocionTexto,
      promocion_expira_en: v.expiraEn,
      destacado: v.destacado, activo: v.activo, orden: v.orden,
      descripcion: v.descripcion, imagen: v.imagen,
    },
  });

  if (anterior && anterior.precio_centavos !== v.precio) {
    await avisarCambioDePrecio(id, v.nombre, anterior.precio_centavos, v.precio, anterior.moneda);
  }

  revalidatePath("/panel/precios");
  revalidatePath("/");
  revalidatePath("/pago");
  return { ok: "Curso actualizado" };
}

/** Agrega un paquete/curso nuevo — visible en /pago y, si se marca "destacado", en la portada. */
export async function cursoCrearAccion(_prev: Resultado, fd: FormData): Promise<Resultado> {
  await requiereModulo("precios");
  const v = leerCamposCurso(fd);
  if ("error" in v) return v;

  await prisma.cursos.create({
    data: {
      nombre: v.nombre, precio_centavos: v.precio, precio_original_centavos: v.precioOriginal,
      duracion_semanas: v.semanas, modalidad: v.modalidad,
      promocion_activa: v.promocionActiva, promocion_texto: v.promocionTexto,
      promocion_expira_en: v.expiraEn,
      destacado: v.destacado, activo: v.activo, orden: v.orden,
      descripcion: v.descripcion, imagen: v.imagen,
    },
  });
  revalidatePath("/panel/precios");
  revalidatePath("/");
  revalidatePath("/pago");
  return { ok: "Curso agregado" };
}

/** Elimina un curso — solo si nunca recibió pagos (si ya tiene historial, se debe desactivar en vez de borrar). */
export async function cursoEliminarAccion(id: number): Promise<Resultado> {
  await requiereModulo("precios");
  const pagos = await prisma.pagos.count({ where: { curso_id: id } });
  if (pagos > 0) return { error: "Este curso ya tiene pagos registrados — desactívalo en vez de eliminarlo para no perder el historial." };
  await prisma.cursos.delete({ where: { id } });
  revalidatePath("/panel/precios");
  revalidatePath("/");
  revalidatePath("/pago");
  return { ok: "Curso eliminado" };
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
