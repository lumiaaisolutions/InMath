"use server";
import bcrypt from "bcryptjs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requiereAlumno } from "@/lib/portal/sesion";
import { asegurarDirPortal } from "@/lib/portal/media";
import { activarDosFactores } from "@/lib/portal/dosfactores";

export type EstadoCuenta = { ok?: string; error?: string };

/** Activa o desactiva la verificación en 2 pasos (código por correo al entrar). */
export async function alternar2faAccion(_prev: EstadoCuenta, fd: FormData): Promise<EstadoCuenta> {
  const alumno = await requiereAlumno();
  const on = String(fd.get("on") ?? "") === "1";
  if (on && !alumno.email) return { error: "Necesitas un correo en tu cuenta para activar la verificación en 2 pasos." };
  await activarDosFactores(alumno.id, on);
  revalidatePath("/portal/cuenta");
  return { ok: on ? "Verificación en 2 pasos activada. Te pediremos un código al entrar." : "Verificación en 2 pasos desactivada." };
}

/** Actualiza los datos editables del alumno: nombre y WhatsApp. */
export async function guardarDatosAlumnoAccion(_prev: EstadoCuenta, fd: FormData): Promise<EstadoCuenta> {
  const alumno = await requiereAlumno();
  const nombre = String(fd.get("nombre") ?? "").trim();
  const whatsapp = String(fd.get("whatsapp") ?? "").replace(/\D+/g, "");
  if (nombre.length < 2) return { error: "Escribe tu nombre." };
  if (whatsapp && whatsapp.length < 10) return { error: "El WhatsApp debe tener al menos 10 dígitos." };

  try {
    await prisma.alumnos.update({ where: { id: alumno.id }, data: { nombre } });
    await prisma.prospectos.update({ where: { id: alumno.prospecto_id }, data: { nombre } });
    if (whatsapp) {
      // Verifica que el WhatsApp no lo tenga otro prospecto.
      const otro = await prisma.prospectos.findUnique({ where: { telefono_whatsapp: whatsapp } });
      if (otro && otro.id !== alumno.prospecto_id) return { error: "Ese WhatsApp ya está registrado con otra cuenta." };
      await prisma.prospectos.update({ where: { id: alumno.prospecto_id }, data: { telefono_whatsapp: whatsapp } });
      // El WhatsApp es solo dato de contacto: NO afecta el usuario de acceso (que es el correo).
      await prisma.alumnos.update({ where: { id: alumno.id }, data: { telefono: whatsapp } });
    }
  } catch {
    return { error: "No pudimos guardar tus datos. Intenta de nuevo." };
  }
  revalidatePath("/portal/cuenta");
  revalidatePath("/portal");
  return { ok: "Tus datos se actualizaron." };
}

/** Sube y recorta la foto (avatar cuadrado) o el banner (panorámico). */
export async function subirFotoAlumnoAccion(_prev: EstadoCuenta, fd: FormData): Promise<EstadoCuenta> {
  const alumno = await requiereAlumno();
  const tipo = String(fd.get("tipo") ?? "");
  const archivo = fd.get("archivo");
  if (tipo !== "avatar" && tipo !== "banner") return { error: "Tipo de imagen inválido." };
  if (!(archivo instanceof File) || archivo.size === 0) return { error: "Elige una imagen." };
  if (archivo.size > 8 * 1024 * 1024) return { error: "La imagen es muy grande (máx 8 MB)." };

  try {
    const buf = Buffer.from(await archivo.arrayBuffer());
    const img = sharp(buf).rotate();
    const salida = tipo === "avatar"
      ? img.resize(480, 480, { fit: "cover" })
      : img.resize(1600, 480, { fit: "cover" });
    const dir = await asegurarDirPortal();
    await writeFile(path.join(dir, `${alumno.id}-${tipo}.jpg`), await salida.jpeg({ quality: 82 }).toBuffer());
  } catch {
    return { error: "No pudimos procesar la imagen. Prueba con otra (JPG o PNG)." };
  }
  revalidatePath("/portal/cuenta");
  revalidatePath("/portal");
  return { ok: tipo === "avatar" ? "Tu foto se actualizó." : "Tu portada se actualizó." };
}

export async function cambiarPasswordAlumnoAccion(_prev: EstadoCuenta, fd: FormData): Promise<EstadoCuenta> {
  const alumno = await requiereAlumno();
  const actual = String(fd.get("actual") ?? "");
  const nueva = String(fd.get("nueva") ?? "");
  const confirma = String(fd.get("confirma") ?? "");

  if (nueva.length < 8) return { error: "La nueva contraseña debe tener al menos 8 caracteres." };
  if (nueva !== confirma) return { error: "Las contraseñas nuevas no coinciden." };

  const fila = await prisma.alumnos.findUnique({ where: { id: alumno.id }, select: { password_hash: true } });
  if (!fila?.password_hash || !(await bcrypt.compare(actual, fila.password_hash))) {
    await new Promise((r) => setTimeout(r, 600));
    return { error: "Tu contraseña actual no es correcta." };
  }
  if (await bcrypt.compare(nueva, fila.password_hash)) {
    return { error: "La nueva contraseña debe ser distinta a la actual." };
  }

  await prisma.alumnos.update({ where: { id: alumno.id }, data: { password_hash: await bcrypt.hash(nueva, 10) } });
  return { ok: "¡Listo! Tu contraseña se actualizó." };
}
