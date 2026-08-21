import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** El login es ÚNICO para staff y alumnos: vive en /panel/login. */
export default async function PortalLoginRedirect({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  redirect(error ? `/panel/login?error=${encodeURIComponent(error)}` : "/panel/login");
}
