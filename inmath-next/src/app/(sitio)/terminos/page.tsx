import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Términos y Condiciones — Cursos InMath",
  description: "Términos y condiciones de uso de Cursos InMath: inscripción, pagos, acceso al portal y responsabilidades.",
};

const CONTACTO = "cursosinmath@gmail.com";
const ACTUALIZADO = "22 de agosto de 2026";

export default function Terminos() {
  return (
    <div className="legal">
      <div className="centrado legal-caja">
        <Link className="volver" href="/">← Volver al inicio</Link>
        <h1>Términos y Condiciones</h1>
        <p className="legal-fecha">Última actualización: {ACTUALIZADO}</p>

        <p>
          Al inscribirte y usar los servicios de <b>Cursos InMath</b> aceptas los siguientes
          términos. Te pedimos leerlos con atención.
        </p>

        <h2>1. El servicio</h2>
        <p>
          Cursos InMath ofrece cursos en línea con clases grabadas, material de estudio,
          asesorías 1 a 1 y seguimiento de tu avance a través de un portal del alumno.
        </p>

        <h2>2. Inscripción y cuenta</h2>
        <p>
          Para inscribirte creas una cuenta con tu correo (que será tu usuario) y una contraseña.
          Eres responsable de mantener la confidencialidad de tu contraseña y de la actividad de
          tu cuenta. Puedes activar la verificación en dos pasos para mayor seguridad.
        </p>

        <h2>3. Precios y pagos</h2>
        <ul>
          <li>Los precios se muestran en pesos mexicanos (MXN) e incluyen lo indicado en cada paquete.</li>
          <li>El pago puede realizarse en línea o por transferencia, subiendo tu comprobante.</li>
          <li>Tu acceso completo al contenido se activa al confirmarse el pago.</li>
          <li>Las promociones (por ejemplo, descuentos por tiempo limitado) aplican bajo las condiciones vigentes al momento de la inscripción.</li>
        </ul>

        <h2>4. Vigencia del registro de pago</h2>
        <p>
          Un registro de pago pendiente tiene una vigencia limitada; si no se confirma dentro del
          plazo indicado, puede cancelarse automáticamente. Podrás volver a intentarlo cuando
          quieras.
        </p>

        <h2>5. Uso adecuado</h2>
        <p>
          El material del curso es para tu uso personal. No está permitido compartir tus
          credenciales, ni copiar, redistribuir o revender el contenido sin autorización.
        </p>

        <h2>6. Asesorías</h2>
        <p>
          Las asesorías se agendan según la disponibilidad publicada. Te pedimos avisar con
          anticipación si necesitas reprogramar.
        </p>

        <h2>7. Disponibilidad del servicio</h2>
        <p>
          Procuramos mantener el servicio disponible de forma continua, pero puede haber
          interrupciones por mantenimiento o causas ajenas a nosotros. Haremos lo posible por
          minimizarlas.
        </p>

        <h2>8. Cambios</h2>
        <p>
          Podemos actualizar estos términos. La versión vigente se publica en esta página con su
          fecha de actualización.
        </p>

        <p className="legal-cierre">
          ¿Dudas? Escríbenos a <a href={`mailto:${CONTACTO}`}>{CONTACTO}</a>. Consulta también
          nuestro <Link href="/privacidad">Aviso de Privacidad</Link>.
        </p>
      </div>
    </div>
  );
}
