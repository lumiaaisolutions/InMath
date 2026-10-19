"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

/** Píxel de Meta (Facebook) — SOLO en el sitio público (landing, /agenda,
 *  /pago…), nunca en el panel ni en el portal. El snippet base registra el
 *  PageView inicial; como Next navega entre páginas sin recargar (SPA), el
 *  efecto de abajo dispara un PageView adicional en cada cambio de ruta —
 *  sin él, Meta solo contaría la primera página de cada visita. */
const PIXEL_ID = "1777137036800940";

declare global {
  interface Window { fbq?: (...args: unknown[]) => void }
}

export function MetaPixel({ nonce }: { nonce?: string | null }) {
  const pathname = usePathname();
  const primera = useRef(true);

  useEffect(() => {
    // El PageView de la primera carga ya lo manda el snippet base.
    if (primera.current) { primera.current = false; return; }
    window.fbq?.("track", "PageView");
  }, [pathname]);

  return (
    <>
      {/* nonce viene de src/proxy.ts vía headers() en (sitio)/layout.tsx —
          es el único <script> con contenido inline propio del proyecto;
          sin el nonce, el CSP (M-10) lo bloquea. */}
      <Script id="meta-pixel" strategy="afterInteractive" nonce={nonce ?? undefined}>
        {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${PIXEL_ID}');
fbq('track', 'PageView');`}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img height="1" width="1" style={{ display: "none" }} alt=""
          src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`} />
      </noscript>
    </>
  );
}
