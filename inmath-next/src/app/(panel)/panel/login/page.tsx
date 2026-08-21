import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { usuarioActual } from "@/lib/panel/sesion";
import { alumnoActual } from "@/lib/portal/sesion";
import { googleConfigurado } from "@/lib/portal/auth";
import { archivosLogin } from "@/lib/panel/media";
import { LoginClient, type SlideLogin } from "./LoginClient";

export const metadata: Metadata = { title: "Entrar — Cursos Inmath" };
export const dynamic = "force-dynamic";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await usuarioActual()) redirect("/panel");
  if (await alumnoActual()) redirect("/portal");
  const { error } = await searchParams;

  const filas = await prisma.configuraciones.findMany({
    where: { clave: { in: ["login_titulo", "login_texto", "login_media_meta"] } },
  });
  const conf = Object.fromEntries(filas.map((f) => [f.clave, f.valor]));
  let meta: Record<string, { titulo?: string; texto?: string; orden?: number }> = {};
  try { meta = JSON.parse(conf.login_media_meta ?? "{}") || {}; } catch { /* json corrupto → sin meta */ }

  const archivos = await archivosLogin();
  archivos.sort((a, b) => ((meta[a]?.orden ?? 50) - (meta[b]?.orden ?? 50)) || a.localeCompare(b));
  const slides: SlideLogin[] = archivos.map((archivo) => ({
    src: `/panel/img/login/${archivo}`,
    esVideo: /\.mp4$/i.test(archivo),
    titulo: meta[archivo]?.titulo ?? conf.login_titulo?.trim() ?? "",
    texto: meta[archivo]?.texto ?? conf.login_texto?.trim() ?? "",
  }));

  const sitioUrl = process.env.APP_URL?.replace(/\/$/, "") || "/";
  return (
    <LoginClient
      slides={slides}
      sitioUrl={sitioUrl}
      tituloDefecto={conf.login_titulo?.trim() ?? ""}
      textoDefecto={conf.login_texto?.trim() ?? ""}
      conGoogle={googleConfigurado()}
      errorGoogle={error}
    />
  );
}
