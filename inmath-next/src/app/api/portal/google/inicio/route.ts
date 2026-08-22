import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { googleAuthUrl } from "@/lib/portal/google";
import { googleConfigurado } from "@/lib/portal/auth";

/** Inicia el login con Google: guarda `state` (CSRF) y redirige a Google. */
export async function GET(req: NextRequest) {
  if (!googleConfigurado()) {
    const base = (process.env.APP_URL ?? "").replace(/\/$/, "") || req.url;
    return NextResponse.redirect(new URL("/panel/login?error=google-no-config", base));
  }
  const state = randomBytes(16).toString("hex");
  (await cookies()).set("inmath_g_state", state, {
    httpOnly: true, sameSite: "lax", path: "/api/portal/google", maxAge: 600,
    secure: process.env.NODE_ENV === "production",
  });
  return NextResponse.redirect(googleAuthUrl(state));
}
