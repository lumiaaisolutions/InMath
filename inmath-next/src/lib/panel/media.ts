import { readdir, stat } from "node:fs/promises";
import path from "node:path";

/**
 * Uploads del panel (avatares y carrusel del login). Durante el strangler se
 * usa el MISMO directorio que el panel PHP (panel/public/img) para que ambos
 * paneles vean los mismos archivos; en el VPS se apunta con PANEL_IMG_DIR.
 */
export function dirImgPanel(): string {
  return process.env.PANEL_IMG_DIR ?? path.resolve(process.cwd(), "../panel/public/img");
}

export type MediaLogin = { archivo: string; esVideo: boolean };

/** Port del scandir del login: jpg/png/webp/mp4 de img/login, sin orden aún. */
export async function archivosLogin(): Promise<string[]> {
  try {
    const files = await readdir(path.join(dirImgPanel(), "login"));
    return files.filter((f) => /\.(jpe?g|png|webp|mp4)$/i.test(f));
  } catch { return []; }
}

/** URL del avatar del usuario o null si no tiene foto (con cache-buster mtime). */
export async function avatarUrl(usuarioId: number): Promise<string | null> {
  try {
    const s = await stat(path.join(dirImgPanel(), "avatars", `${usuarioId}.jpg`));
    return `/panel/img/avatars/${usuarioId}.jpg?v=${Math.floor(s.mtimeMs)}`;
  } catch { return null; }
}
