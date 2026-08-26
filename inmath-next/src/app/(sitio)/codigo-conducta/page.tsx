import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Código de Conducta — Cursos InMath", alternates: { canonical: "/codigo-conducta" } };
const CONTACTO = "cursosinmath@gmail.com";

export default function CodigoConducta() {
  return (
    <div className="legal">
      <div className="centrado legal-caja">
        <Link className="volver" href="/">← Volver al inicio</Link>
        <span className="eyebrow" style={{ marginBottom: 14 }}>Comunidad InMath</span>
        <h1>Código de Conducta</h1>
        <p className="legal-fecha">Última actualización: 22 de agosto de 2026</p>
        <p>Queremos que Cursos InMath sea un espacio respetuoso y seguro para aprender. Al usar nuestros servicios y participar en asesorías, chats y materiales, aceptas estas normas de convivencia.</p>

        <h2>1. Respeto ante todo</h2>
        <p>Trata a asesores, personal y compañeros con respeto. No se tolera lenguaje ofensivo, discriminación, acoso ni cualquier conducta que haga sentir mal a otra persona.</p>

        <h2>2. Uso adecuado del material</h2>
        <p>El contenido del curso es para tu aprendizaje personal. No compartas tus credenciales ni redistribuyas el material sin autorización.</p>

        <h2>3. Honestidad académica</h2>
        <p>Aprende de verdad: evita hacer pasar como tuyo el trabajo de otros. Tu asesor está para ayudarte a entender, no para hacer el trabajo por ti.</p>

        <h2>4. Comunicación por WhatsApp y asesorías</h2>
        <p>Usa los canales de contacto para temas del curso. Sé puntual en tus asesorías y avisa con tiempo si necesitas reprogramar.</p>

        <h2>5. Reporte de conductas</h2>
        <p>Si presencias o vives una conducta que rompe estas normas, escríbenos a <a href={`mailto:${CONTACTO}`}>{CONTACTO}</a>. Lo revisamos con seriedad y confidencialidad.</p>

        <h2>6. Consecuencias</h2>
        <p>El incumplimiento puede derivar en advertencias o, en casos graves, en la suspensión del acceso, conforme a nuestros <Link href="/terminos">Términos de uso</Link>.</p>

        <p className="legal-cierre">¿Dudas? Escríbenos a <a href={`mailto:${CONTACTO}`}>{CONTACTO}</a>.</p>
      </div>
    </div>
  );
}
