import { stat, mkdir } from "node:fs/promises";
import path from "node:path";
import { dirImgPanel } from "@/lib/panel/media";

/** Directorio de imágenes del portal del alumno (avatar + banner). */
export function dirPortal(): string {
  return path.join(dirImgPanel(), "portal");
}

export async function asegurarDirPortal(): Promise<string> {
  const d = dirPortal();
  await mkdir(d, { recursive: true });
  return d;
}

/** URLs del avatar y banner del alumno (con cache-buster), null si no tiene. */
export async function mediaAlumno(alumnoId: number): Promise<{ avatar: string | null; banner: string | null }> {
  const url = async (tipo: "avatar" | "banner") => {
    try {
      const s = await stat(path.join(dirPortal(), `${alumnoId}-${tipo}.jpg`));
      return `/portal/img/${alumnoId}-${tipo}.jpg?v=${Math.floor(s.mtimeMs)}`;
    } catch { return null; }
  };
  return { avatar: await url("avatar"), banner: await url("banner") };
}
