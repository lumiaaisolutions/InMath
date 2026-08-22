import { prisma } from "./db";

/**
 * Freno de fuerza bruta PERSISTENTE (H7 de la auditoría): contadores de fallos
 * por clave (ej. identificador de login) guardados en configuraciones (JSON),
 * así sobreviven reinicios de pm2 y aplican aunque haya varios procesos.
 * Complementa el rate-limiting perimetral de Cloudflare.
 */
const CLAVE_CFG = "login_fallos";
const VENTANA_MS = 15 * 60_000; // los fallos caducan a los 15 min

type Entrada = { n: number; hasta: number };
type Mapa = Record<string, Entrada>;

async function leer(): Promise<Mapa> {
  const fila = await prisma.configuraciones.findUnique({ where: { clave: CLAVE_CFG } });
  try {
    const j = JSON.parse(fila?.valor ?? "{}") as Mapa;
    const ahora = Date.now();
    // Poda: fuera entradas cuya ventana ya venció.
    return Object.fromEntries(Object.entries(j).filter(([, v]) => v.hasta > ahora - VENTANA_MS));
  } catch { return {}; }
}

async function guardar(mapa: Mapa) {
  await prisma.configuraciones.upsert({
    where: { clave: CLAVE_CFG },
    update: { valor: JSON.stringify(mapa) },
    create: { clave: CLAVE_CFG, valor: JSON.stringify(mapa), tipo: "json", descripcion: "Contadores anti fuerza bruta del login" },
  });
}

/** ¿Está bloqueada esta clave ahora mismo? (5+ fallos y castigo vigente) */
export async function loginBloqueado(clave: string): Promise<boolean> {
  const e = (await leer())[clave.toLowerCase()];
  return !!e && e.n >= 5 && Date.now() < e.hasta;
}

/** Registra un fallo y calcula el castigo progresivo (1s → 8s → 60s → 300s). */
export async function registrarFalloLogin(clave: string): Promise<void> {
  const mapa = await leer();
  const k = clave.toLowerCase();
  const n = (mapa[k]?.n ?? 0) + 1;
  const castigoS = n >= 20 ? 300 : n >= 10 ? 60 : Math.min(8, Math.max(1, n - 3));
  mapa[k] = { n, hasta: Date.now() + castigoS * 1000 };
  await guardar(mapa);
}

/** Limpia los fallos de una clave tras un login exitoso. */
export async function limpiarFallosLogin(clave: string): Promise<void> {
  const mapa = await leer();
  const k = clave.toLowerCase();
  if (mapa[k]) { delete mapa[k]; await guardar(mapa); }
}
