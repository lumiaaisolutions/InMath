import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Información Regulatoria — Cursos InMath", alternates: { canonical: "/informacion-regulatoria" } };
const CONTACTO = "cursosinmath@gmail.com";

export default function InformacionRegulatoria() {
  return (
    <div className="legal">
      <div className="centrado legal-caja">
        <Link className="volver" href="/">← Volver al inicio</Link>
        <span className="eyebrow" style={{ marginBottom: 14 }}>Transparencia</span>
        <h1>Información Regulatoria</h1>
        <p className="legal-fecha">Última actualización: 22 de agosto de 2026</p>
        <p>En esta página reunimos la información sobre la naturaleza de nuestros servicios y el marco legal aplicable.</p>

        <h2>1. Naturaleza del servicio</h2>
        <p>Cursos InMath ofrece cursos de preparación y formación en línea con acompañamiento (asesorías 1 a 1). Nuestros programas son de carácter <b>preparatorio/propedéutico</b> y no constituyen, por sí mismos, un título o grado oficial.</p>

        <h2>2. Protección de datos personales</h2>
        <p>Tratamos tus datos conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (México). Consulta el detalle en nuestro <Link href="/privacidad">Aviso de Privacidad</Link>, incluidos tus derechos ARCO.</p>

        <h2>3. Pagos</h2>
        <p>Los pagos en línea se procesan a través de proveedores externos especializados; no almacenamos los datos completos de tarjetas. Las condiciones de pago y vigencia se describen en los <Link href="/terminos">Términos de uso</Link>.</p>

        <h2>4. Publicidad y promociones</h2>
        <p>Las promociones (por ejemplo, descuentos por tiempo limitado) aplican bajo las condiciones vigentes al momento de la inscripción, mismas que se muestran de forma clara en el sitio.</p>

        <h2>5. Contacto</h2>
        <p>Para solicitudes de información regulatoria o quejas, escríbenos a <a href={`mailto:${CONTACTO}`}>{CONTACTO}</a>.</p>

        <p className="legal-cierre">Esta página se actualizará conforme cambien nuestros servicios o el marco aplicable.</p>
      </div>
    </div>
  );
}
