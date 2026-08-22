import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Aviso de Privacidad — Cursos InMath",
  description: "Aviso de privacidad de Cursos InMath: qué datos recabamos, para qué los usamos y cómo ejercer tus derechos ARCO.",
};

const CONTACTO = "cursosinmath@gmail.com";
const ACTUALIZADO = "22 de agosto de 2026";

export default function Privacidad() {
  return (
    <div className="legal">
      <div className="centrado legal-caja">
        <Link className="volver" href="/">← Volver al inicio</Link>
        <h1>Aviso de Privacidad</h1>
        <p className="legal-fecha">Última actualización: {ACTUALIZADO}</p>

        <p>
          En <b>Cursos InMath</b> (“nosotros”) valoramos y protegemos tus datos personales. Este
          Aviso de Privacidad describe qué información recabamos, con qué finalidad la usamos y
          cómo puedes ejercer tus derechos, en cumplimiento de la Ley Federal de Protección de
          Datos Personales en Posesión de los Particulares (México).
        </p>

        <h2>1. Responsable</h2>
        <p>
          El responsable del tratamiento de tus datos es Cursos InMath. Para cualquier asunto
          relacionado con tu privacidad puedes escribirnos a{" "}
          <a href={`mailto:${CONTACTO}`}>{CONTACTO}</a>.
        </p>

        <h2>2. Datos que recabamos</h2>
        <ul>
          <li><b>Datos de identificación y contacto:</b> nombre, correo electrónico y número de WhatsApp.</li>
          <li><b>Datos de tu cuenta:</b> usuario (tu correo), contraseña (almacenada de forma cifrada) y, si la activas, la verificación en dos pasos.</li>
          <li><b>Datos de tu curso:</b> avance, asesorías, reportes y material asociado a tu inscripción.</li>
          <li><b>Datos de pago:</b> el comprobante que subas o la referencia del pago. No almacenamos los datos completos de tu tarjeta; los pagos en línea se procesan a través de proveedores externos seguros.</li>
          <li><b>Inicio de sesión con Google:</b> si eliges entrar con Google, recibimos únicamente tu nombre y correo electrónico verificado para crear o identificar tu cuenta. No accedemos a tus contactos, archivos ni a otra información de tu cuenta de Google.</li>
        </ul>

        <h2>3. Finalidades del tratamiento</h2>
        <ul>
          <li>Crear y administrar tu cuenta y tu acceso al portal del alumno.</li>
          <li>Brindarte el curso, las asesorías y el seguimiento de tu avance.</li>
          <li>Procesar tu inscripción y tu pago.</li>
          <li>Enviarte comunicaciones relacionadas con tu cuenta, tu pago y tu curso (por correo y WhatsApp).</li>
          <li>Dar soporte y responder tus dudas.</li>
        </ul>

        <h2>4. Uso de la información de Google</h2>
        <p>
          El uso y la transferencia de la información recibida de las APIs de Google se apega a la{" "}
          <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener">
            Política de Datos de Usuario de los Servicios de API de Google
          </a>, incluyendo los requisitos de Uso Limitado. Solo usamos tu nombre y correo para
          autenticarte; no los compartimos ni los usamos con fines de publicidad.
        </p>

        <h2>5. Con quién compartimos tus datos</h2>
        <p>
          No vendemos ni rentamos tus datos. Podemos compartirlos únicamente con proveedores que
          nos ayudan a operar el servicio (por ejemplo, el procesador de pagos y el proveedor de
          correo), y solo en la medida necesaria para prestarte el servicio.
        </p>

        <h2>6. Tus derechos (ARCO)</h2>
        <p>
          Tienes derecho a Acceder, Rectificar, Cancelar u Oponerte al tratamiento de tus datos,
          así como a revocar tu consentimiento. Para ejercerlos, escríbenos a{" "}
          <a href={`mailto:${CONTACTO}`}>{CONTACTO}</a> indicando tu solicitud. También puedes
          editar buena parte de tus datos y tu seguridad desde <b>Mi cuenta</b> en el portal.
        </p>

        <h2>7. Conservación y seguridad</h2>
        <p>
          Conservamos tus datos mientras tu cuenta esté activa y el tiempo necesario para cumplir
          las finalidades anteriores u obligaciones legales. Aplicamos medidas de seguridad
          razonables (cifrado de contraseñas, conexiones seguras y control de acceso) para
          proteger tu información.
        </p>

        <h2>8. Cambios a este aviso</h2>
        <p>
          Podemos actualizar este Aviso de Privacidad. Publicaremos la versión vigente en esta
          página con su fecha de actualización.
        </p>

        <p className="legal-cierre">
          ¿Dudas sobre tu privacidad? Escríbenos a <a href={`mailto:${CONTACTO}`}>{CONTACTO}</a>.
        </p>
      </div>
    </div>
  );
}
