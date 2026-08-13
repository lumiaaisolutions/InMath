process.env.TZ ??= "America/Mexico_City";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function config(clave: string, porDefecto: string): Promise<string> {
  const fila = await prisma.configuraciones.findUnique({ where: { clave } });
  return fila?.valor ?? porDefecto;
}
