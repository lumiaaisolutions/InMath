"use server";
import { revalidatePath } from "next/cache";
import { requiereAdmin } from "@/lib/panel/sesion";
import { guardarMateriales, type Material } from "@/lib/portal/materiales";

export type ResultadoMateriales = { ok?: string; error?: string };

const TIPOS = ["documento", "video", "enlace"] as const;

export async function guardarMaterialesAccion(_prev: ResultadoMateriales, fd: FormData): Promise<ResultadoMateriales> {
  const u = await requiereAdmin();
  let lista: Material[];
  try {
    lista = JSON.parse(String(fd.get("materiales") ?? "[]"));
  } catch {
    return { error: "No pudimos leer la lista de materiales." };
  }
  if (!Array.isArray(lista)) return { error: "Formato inválido." };
  if (lista.length > 40) return { error: "Máximo 40 materiales." };

  const limpia: Material[] = [];
  for (const m of lista) {
    const titulo = String(m?.titulo ?? "").trim();
    const url = String(m?.url ?? "").trim();
    if (!titulo || !url) continue;
    if (!/^https?:\/\//i.test(url)) return { error: `El enlace de "${titulo}" debe empezar con http:// o https://` };
    const tipo = (TIPOS as readonly string[]).includes(m?.tipo) ? m.tipo : "enlace";
    limpia.push({ id: String(m?.id ?? limpia.length), titulo, tipo, url, orden: limpia.length });
  }

  await guardarMateriales(limpia, u.id);
  revalidatePath("/panel/materiales");
  return { ok: `Material guardado (${limpia.length}).` };
}
