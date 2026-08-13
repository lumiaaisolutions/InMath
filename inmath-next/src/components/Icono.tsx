import { useId } from "react";

const P: Record<string, string> = {
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  spark: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/>',
  route: '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h6a4 4 0 0 0 4-4V7"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  play: '<polygon points="6 4 20 12 6 20 6 4" fill="currentColor" stroke="none"/>',
  chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  trend: '<path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/>',
  video: '<rect x="2" y="6" width="14" height="12" rx="2"/><path d="M22 8l-6 4 6 4z"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
};
/** Ícono frosted de dos capas — mismo output que icono() en PHP. */
export function Icono({ n, cls = "" }: { n: string; cls?: string }) {
  // useId sobrevive a la hidratación; un contador de módulo divergía entre SSR y cliente.
  const fid = `icf${useId().replace(/\W/g, "")}`;
  const inner = P[n] ?? "";
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      dangerouslySetInnerHTML={{ __html:
        `<defs><filter id="${fid}" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation=".55"/></filter></defs>` +
        `<g class="icg-base" stroke="currentColor" stroke-width="2.4">${inner}</g>` +
        `<g class="icg-frost" stroke="#fff" stroke-width="2" filter="url(#${fid})" transform="translate(1.6 1.6)">${inner}</g>`,
      }}
    />
  );
}
export function Malla() {
  return (
    <div className="mesh" aria-hidden="true">
      <span className="blob b1 par" /><span className="blob b2 par" />
      <span className="blob b3" /><span className="blob b4 par" /><span className="blob b5" />
    </div>
  );
}
