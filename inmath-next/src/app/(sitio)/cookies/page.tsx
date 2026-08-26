import type { Metadata } from "next";
import Link from "next/link";
import { GestionCookies } from "./GestionCookies";

export const metadata: Metadata = { title: "Gestionar Cookies — Cursos InMath", alternates: { canonical: "/cookies" } };
const CONTACTO = "cursosinmath@gmail.com";

export default function Cookies() {
  return (
    <div className="legal">
      <div className="centrado legal-caja">
        <Link className="volver" href="/">← Volver al inicio</Link>
        <span className="eyebrow" style={{ marginBottom: 14 }}>Tu privacidad</span>
        <h1>Gestionar Cookies</h1>
        <p className="legal-fecha">Última actualización: 22 de agosto de 2026</p>
        <p>Las cookies son pequeños archivos que el sitio guarda en tu navegador. En Cursos InMath usamos únicamente las <b>estrictamente necesarias</b> para que puedas iniciar sesión y usar tu portal de forma segura.</p>

        <GestionCookies />

        <h2>¿Qué cookies usamos?</h2>
        <ul>
          <li><b>Sesión de acceso</b> (esencial): mantiene tu sesión iniciada de forma segura. Es una cookie firmada y de solo servidor.</li>
          <li><b>Preferencias</b> (esencial): recuerda ajustes básicos de la interfaz.</li>
        </ul>
        <p>No usamos cookies de publicidad ni de seguimiento de terceros. Si en el futuro añadimos analíticas, respetaremos la preferencia que elijas arriba.</p>

        <p className="legal-cierre">¿Dudas sobre cookies o privacidad? Escríbenos a <a href={`mailto:${CONTACTO}`}>{CONTACTO}</a>. Consulta también nuestro <Link href="/privacidad">Aviso de Privacidad</Link>.</p>
      </div>
    </div>
  );
}
