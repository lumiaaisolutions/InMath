import type { Avance } from "@/lib/avance";

/** Tarjeta de avance del alumno: barra global + desglose de exámenes y
 *  fases. Se usa en Práctica y en Reportes. */
export function AvanceCard({ avance }: { avance: Avance }) {
  if (!avance.hayContenido) {
    return (
      <div className="av-card av-vacio">
        <span className="av-card-tit">Tu avance</span>
        <p>Aún no hay exámenes ni fases para tu modalidad. En cuanto haya contenido, tu avance aparecerá aquí conforme lo completes.</p>
      </div>
    );
  }
  const nivel = avance.global >= 80 ? "alto" : avance.global >= 40 ? "medio" : "bajo";
  return (
    <div className="av-card">
      <div className="av-card-cab">
        <span className="av-card-tit">Tu avance del curso</span>
        <span className={`av-badge ${nivel}`}>{avance.global}%</span>
      </div>
      <div className="av-barra"><i style={{ width: `${avance.global}%` }} className={nivel} /></div>
      <div className="av-desglose">
        {avance.examenes && (
          <div className="av-item">
            <span className="av-item-n">{avance.examenes.conIntento}<i>/{avance.examenes.total}</i></span>
            <span className="av-item-etq">exámenes resueltos</span>
            <span className="av-item-sub">{avance.examenes.porcentaje}% de aciertos</span>
          </div>
        )}
        {avance.fases && (
          <div className="av-item">
            <span className="av-item-n">{avance.fases.aprobadas}<i>/{avance.fases.total}</i></span>
            <span className="av-item-etq">fases aprobadas</span>
            <span className="av-item-sub">{avance.fases.porcentaje}% completado</span>
          </div>
        )}
      </div>
    </div>
  );
}
