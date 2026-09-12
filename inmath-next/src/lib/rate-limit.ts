import { prisma } from "./db";
import type { NextRequest } from "next/server";

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

/**
 * Límite genérico de "máximo N solicitudes por ventana de tiempo" (A-05) —
 * PERSISTENTE (misma técnica de arriba: JSON en `configuraciones`), a
 * diferencia del `Map` en memoria que usaban el chat y otros endpoints
 * públicos, que se reiniciaba con cada `pm2 restart` y no se compartía entre
 * procesos. Clave separada del login para no mezclar los dos conteos.
 */
const CLAVE_CFG_VENTANAS = "rate_limit_ventanas";

async function leerVentanas(): Promise<Record<string, number[]>> {
  const fila = await prisma.configuraciones.findUnique({ where: { clave: CLAVE_CFG_VENTANAS } });
  try { return JSON.parse(fila?.valor ?? "{}"); } catch { return {}; }
}
async function guardarVentanas(mapa: Record<string, number[]>) {
  await prisma.configuraciones.upsert({
    where: { clave: CLAVE_CFG_VENTANAS },
    update: { valor: JSON.stringify(mapa) },
    create: { clave: CLAVE_CFG_VENTANAS, valor: JSON.stringify(mapa), tipo: "json", descripcion: "Contadores de rate-limit por ventana (chat, formularios públicos)" },
  });
}

/** true si `clave` (ej. "chat:1.2.3.4") ya alcanzó `maxEnVentana` solicitudes
 *  en los últimos `ventanaMs` — y registra esta solicitud si no. */
export async function limiteExcedido(clave: string, maxEnVentana: number, ventanaMs: number): Promise<boolean> {
  const ahora = Date.now();
  const mapa = await leerVentanas();
  // Poda de paso: quita claves completamente vencidas para no crecer sin fin.
  for (const k of Object.keys(mapa)) {
    mapa[k] = mapa[k].filter((t) => t > ahora - ventanaMs);
    if (mapa[k].length === 0) delete mapa[k];
  }
  const previos = mapa[clave] ?? [];
  if (previos.length >= maxEnVentana) { mapa[clave] = previos; await guardarVentanas(mapa); return true; }
  mapa[clave] = [...previos, ahora];
  await guardarVentanas(mapa);
  return false;
}

/** IP real del visitante — el sitio está detrás de Cloudflare, que SIEMPRE
 *  sobrescribe `CF-Connecting-IP` con la IP real (no falsificable por el
 *  cliente); `X-Forwarded-For` sí lo es (nginx no filtra IPs de confianza),
 *  así que solo se usa como respaldo para acceso directo (ej. local). */
export function ipConfiable(req: NextRequest): string {
  return req.headers.get("cf-connecting-ip")
    ?? req.headers.get("x-real-ip")
    ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "local";
}
