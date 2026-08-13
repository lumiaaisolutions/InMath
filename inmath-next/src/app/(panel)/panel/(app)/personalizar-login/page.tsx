import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requiereAdmin } from "@/lib/panel/sesion";
import { archivosLogin } from "@/lib/panel/media";
import { PersonalizarLogin, type SlideAdmin } from "./ClientePersonalizar";

export const metadata: Metadata = { title: "Personalizar login — Inmath CRM" };
export const dynamic = "force-dynamic";

export default async function PersonalizarLoginPage() {
  await requiereAdmin();
  const filas = await prisma.configuraciones.findMany({
    where: { clave: { in: ["login_titulo", "login_texto", "login_media_meta"] } },
  });
  const conf = Object.fromEntries(filas.map((f) => [f.clave, f.valor]));
  let meta: Record<string, { titulo?: string; texto?: string; orden?: number }> = {};
  try { meta = JSON.parse(conf.login_media_meta ?? "{}") || {}; } catch { /* json corrupto */ }

  const archivos = await archivosLogin();
  archivos.sort((a, b) => ((meta[a]?.orden ?? 50) - (meta[b]?.orden ?? 50)) || a.localeCompare(b));
  const slides: SlideAdmin[] = archivos.map((archivo) => ({
    archivo,
    src: `/panel/img/login/${archivo}`,
    esVideo: /\.mp4$/i.test(archivo),
    titulo: meta[archivo]?.titulo ?? "",
    texto: meta[archivo]?.texto ?? "",
    orden: meta[archivo]?.orden ?? 50,
  }));

  return (
    <>
      <div className="cabecera">
        <div>
          <h1>Personalizar login</h1>
          <div className="sub">Lo primero que ve tu equipo al entrar — hazlo tuyo</div>
        </div>
      </div>
      <PersonalizarLogin
        slides={slides}
        tituloDefecto={conf.login_titulo?.trim() ?? ""}
        textoDefecto={conf.login_texto?.trim() ?? ""}
      />
    </>
  );
}
