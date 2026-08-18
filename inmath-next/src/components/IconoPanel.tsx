import { useId } from "react";

const P: Record<string, string> = {
  pipeline: '<rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="10" rx="1"/><rect x="17" y="4" width="4" height="13" rx="1"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  alumnos: '<path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1 3 3 6 3s6-2 6-3v-5"/>',
  pagos: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  prompts: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  config: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9 2 2 0 1 1-2.8 2.8 1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.9-1.2 2 2 0 1 1-2.8-2.8A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.5-1 2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9 2 2 0 1 1 2.8-2.8A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.5 2 2 0 1 1 4 0 1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3 2 2 0 1 1 2.8 2.8 1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1 2 2 0 1 1 0 4 1.7 1.7 0 0 0-1.5 1z"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  imagen: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-4.5-4.5L6 21"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  alerta: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5h.01"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  correo: '<rect x="2" y="4" width="20" height="16" rx="3"/><path d="m3 6 9 7 9-7"/>',
  chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
};

/** Ícono frosted del panel — mismo output que icono() en panel/lib/ayuda.php. */
export function IconoPanel({ n, cls = "ic" }: { n: string; cls?: string }) {
  const fid = `pcf${useId().replace(/\W/g, "")}`;
  const inner = P[n] ?? "";
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      dangerouslySetInnerHTML={{ __html:
        `<defs><filter id="${fid}" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation=".55"/></filter></defs>` +
        `<g class="icg-base" stroke="currentColor" stroke-width="2.3">${inner}</g>` +
        `<g class="icg-frost" stroke="#fff" stroke-width="1.9" filter="url(#${fid})" transform="translate(1.6 1.6)">${inner}</g>`,
      }}
    />
  );
}
