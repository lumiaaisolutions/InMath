import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Programa de Referidos — Cursos InMath", alternates: { canonical: "/referidos" } };
const CONTACTO = "cursosinmath@gmail.com";

export default function Referidos() {
  return (
    <div className="legal">
      <div className="centrado legal-caja">
        <Link className="volver" href="/">← Volver al inicio</Link>
        <span className="eyebrow" style={{ marginBottom: 14 }}>Invita y gana</span>
        <h1>Programa de Referidos</h1>
        <p className="legal-fecha">Última actualización: 22 de agosto de 2026</p>
        <p>¿Te gustó Cursos InMath? Recomiéndanos a quien esté por presentar su examen o quiera reforzar sus bases, y los dos salen ganando.</p>

        <h2>1. Cómo funciona</h2>
        <ul>
          <li>Cuéntanos a quién quieres referir (nombre y WhatsApp) escribiéndonos por WhatsApp o al correo de contacto.</li>
          <li>Tu referido menciona tu nombre al inscribirse.</li>
          <li>Cuando complete su inscripción, ambos reciben el beneficio vigente.</li>
        </ul>

        <h2>2. Beneficios</h2>
        <p>El beneficio (por ejemplo, un descuento en tu siguiente pago o material adicional) se anuncia según la promoción vigente. Escríbenos para conocer el beneficio actual.</p>

        <h2>3. Condiciones</h2>
        <ul>
          <li>El referido debe ser una persona que aún no esté inscrita.</li>
          <li>El beneficio se aplica una vez confirmado el pago del referido.</li>
          <li>No es acumulable con otras promociones salvo que se indique.</li>
          <li>Cursos InMath puede ajustar o terminar el programa en cualquier momento; los referidos en curso respetan las condiciones con las que iniciaron.</li>
        </ul>

        <p className="legal-cierre">¿Quieres referir a alguien? Escríbenos a <a href={`mailto:${CONTACTO}`}>{CONTACTO}</a>.</p>
      </div>
    </div>
  );
}
