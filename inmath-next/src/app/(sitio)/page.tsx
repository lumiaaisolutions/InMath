import Link from "next/link";
import { prisma } from "@/lib/db";
import { Icono, Malla } from "@/components/Icono";
import { CtaForm } from "@/components/ClienteSitio";

export const dynamic = "force-dynamic";

export default async function Landing() {
  const curso = await prisma.cursos.findFirst({ where: { activo: true }, orderBy: { id: "asc" } });
  const precio = curso ? `$${Math.round(curso.precio_centavos / 100).toLocaleString("en-US")}` : "";
  const semanas = curso?.duracion_semanas ?? 12;

  return (
    <>
      <section className="heroe">
        <Malla />
        <div className="heroe-rej">
          <div className="heroe-texto reveal-mueve">
            <h1>Cursos en línea que <span className="marca-pino">sí terminas</span>, con <span className="marca">acompañamiento</span> de verdad.</h1>
            <p className="entrada">Clases para estudiar cuando puedas, un asesor que te guía por WhatsApp y un reporte de tu avance cada semana. Aprendes a tu ritmo, sin perder el hilo.</p>
            <div className="acciones">
              <Link className="boton glow glow-halo grande" href="/pago">Inscribirme <Icono n="arrow" cls="flecha" /></Link>
              <Link className="boton pastel grande" href="/agenda">Agendar asesoría gratis</Link>
            </div>
            <div className="respaldo">
              <span><Icono n="clock" /> Acceso inmediato</span>
              <span><Icono n="user" /> Asesoría 1 a 1</span>
              <span><Icono n="play" /> Estudias a tu ritmo</span>
            </div>
          </div>
          <div className="demo-marco zoom-in">
            <div className="chip-flota arriba"><Icono n="check" /> Cita agendada</div>
            <div className="chip-flota abajo"><Icono n="trend" /> Avance 70%</div>
            <div className="scrub scrub-hero" aria-label="Estudiante acompañado por WhatsApp durante su curso">
              <img className="scrub-frame f1" src="/img/fotos/hero-1.jpg" alt="Persona escribiendo por WhatsApp" />
              <img className="scrub-frame f2" src="/img/fotos/hero-2.jpg" alt="Estudiantes repasando frente a una laptop" loading="lazy" />
              <span className="tinte" />
              <Link className="scrub-accion" href="/agenda" aria-label="Agendar una asesoría gratis"><Icono n="arrow" /></Link>
            </div>
          </div>
        </div>
      </section>

      <section className="proceso" id="como">
        <div className="centrado">
          <div className="cab-seccion reveal-mueve">
            <Link className="eyebrow link" href="/agenda"><Icono n="route" cls="ic-ey" /> Cómo funciona <span className="mini-arrow"><Icono n="arrow" /></span></Link>
            <h2>De la primera duda a tu inscripción, sin salir de WhatsApp.</h2>
          </div>
          <div className="pasos">
            {[
              ["chat", "PASO 01", "Escríbenos", "Nos mandas un mensaje y resolvemos tus dudas del curso al momento."],
              ["video", "PASO 02", "Asesoría", "Una videollamada breve para conocer tu meta y armar tu plan."],
              ["card", "PASO 03", "Te inscribes", "Pagas con un enlace seguro en el chat y tu acceso se activa solo."],
              ["trend", "PASO 04", "Avanzas", "Estudias a tu ritmo y cada semana te llega tu reporte de avance."],
            ].map(([ic, num, t, p], i) => (
              <div key={num} className={`paso reveal-mueve${i ? ` d${i}` : ""}`}>
                <div className="paso-ic"><Icono n={ic} /></div>
                <div className="num">{num}</div><h3>{t}</h3><p>{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="acompana">
        <div className="centrado">
          <div className="acompana-rej">
            <div className="grafica-wrap">
              <div className="scrub scrub-acompana" aria-label="De estudiar solo a resolver dudas con un asesor real">
                <img className="scrub-frame f1" src="/img/fotos/acompana-1.jpg" alt="Escritorio con laptops y libretas" loading="lazy" />
                <img className="scrub-frame f2" src="/img/fotos/acompana-2.jpg" alt="Grupo revisando una laptop en una biblioteca" loading="lazy" />
                <span className="tinte" />
                <Link className="scrub-accion" href="/agenda" aria-label="Conocer a tu asesor"><Icono n="arrow" /></Link>
              </div>
            </div>
            <div>
              <div className="cab-seccion reveal-mueve" style={{ marginBottom: 24 }}>
                <span className="eyebrow"><Icono n="user" cls="ic-ey" /> Acompañamiento real</span>
                <h2>No es un curso que dejas a medias en una plataforma sola.</h2>
              </div>
              <div className="areas">
                <div className="area reveal"><span className="pt"><Icono n="chat" /></span><div><h3>Dudas que sí se resuelven</h3><p>Le escribes a tu asesor por WhatsApp y te responde una persona, no un buzón.</p></div></div>
                <div className="area reveal d1"><span className="pt"><Icono n="trend" /></span><div><h3>Tu avance, a la vista</h3><p>Sabes en qué semana vas y qué sigue, en vez de perderte en una plataforma sola.</p></div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="incluye" className="incluye">
        <div className="centrado">
          <div className="incluye-rej">
            <div>
              <div className="cab-seccion reveal-mueve" style={{ marginBottom: 24 }}>
                <Link className="eyebrow link" href="/pago"><Icono n="list" cls="ic-ey" /> Qué incluye <span className="mini-arrow"><Icono n="arrow" /></span></Link>
                <h2>Todo lo que tu inscripción incluye.</h2>
              </div>
              <div className="areas">
                {[
                  ["01", "Clases grabadas", "Videos organizados por módulo, con acceso completo desde el primer día."],
                  ["02", "Materiales descargables", "Guías, ejercicios y recursos para practicar a tu ritmo."],
                  ["03", "Asesorías por videollamada", "Sesiones 1 a 1 con un asesor para resolver dudas y avanzar."],
                  ["04", "Reporte de avance", "Cada semana, tu progreso resumido y enviado por WhatsApp."],
                ].map(([n, t, p], i) => (
                  <div key={n} className={`area reveal${i ? ` d${i}` : ""}`}><span className="pt">{n}</span><div><h3>{t}</h3><p>{p}</p></div></div>
                ))}
              </div>
            </div>
            <div className="grafica-wrap">
              <div className="scrub scrub-avance" aria-label="Alumnos avanzando en su curso">
                <img className="scrub-frame f1" src="/img/fotos/avance-2.jpg" alt="Cuaderno con notas de estudio" loading="lazy" />
                <img className="scrub-frame f2" src="/img/fotos/avance-1.jpg" alt="Persona celebrando frente a su laptop" loading="lazy" />
                <span className="tinte" />
                <Link className="scrub-accion" href="/pago" aria-label="Ver qué incluye tu inscripción"><Icono n="arrow" /></Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="precio" id="precios">
        <Malla />
        <div className="centrado" style={{ textAlign: "center", marginBottom: 36 }}>
          <span className="eyebrow"><Icono n="card" cls="ic-ey" /> Planes</span>
          <h2 style={{ font: "700 clamp(1.7rem,3.6vw,2.6rem)/1.08 var(--display)", letterSpacing: "-.025em", marginTop: 14 }}>Elige cómo quieres empezar.</h2>
        </div>
        <div className="precios-grid">
          <article className="plan gratis reveal">
            <div className="plan-cab">
              <span className="plan-tag">Gratis</span>
              <div className="plan-precio">$0 <small>/ sin costo</small></div>
            </div>
            <p className="plan-sub">Conoce el método antes de decidir.</p>
            <Link className="boton grande plan-cta" href="/agenda">Empezar gratis</Link>
            <ul>
              <li><Icono n="check" /> Asesoría de diagnóstico por videollamada</li>
              <li><Icono n="check" /> Acceso a la primera clase de cada módulo</li>
              <li><Icono n="check" /> Plan de estudio personalizado</li>
            </ul>
          </article>
          <article className="plan destacado reveal d1">
            <span className="plan-badge-oferta">⏳ Oferta por tiempo limitado</span>
            <div className="plan-cab">
              <span className="plan-tag">Recomendado</span>
              <div className="plan-precio">{precio} <small>MXN</small></div>
              <span className="plan-oferta"><s>$4,500</s> · ahorras $500 si te inscribes hoy</span>
            </div>
            <p className="plan-sub">{curso?.nombre ?? "Curso completo"} · pago único</p>
            <Link className="boton grande plan-cta" href="/pago">Inscribirme ahora</Link>
            <ul>
              <li><Icono n="check" /> Acceso completo por {semanas} semanas</li>
              <li><Icono n="check" /> Todas las clases y materiales descargables</li>
              <li><Icono n="check" /> Asesorías por videollamada incluidas</li>
              <li><Icono n="check" /> Reporte de avance cada semana por WhatsApp</li>
            </ul>
          </article>
          <article className="plan custom reveal d2">
            <div className="plan-cab">
              <span className="plan-tag">Personalizado</span>
              <div className="plan-precio" style={{ fontSize: "2rem" }}>Cotización</div>
            </div>
            <p className="plan-sub">Para equipos, grupos o un plan hecho a tu medida.</p>
            <Link className="boton grande plan-cta" href="/agenda">Solicitar cotización</Link>
            <ul>
              <li><Icono n="check" /> Contenido y ritmo ajustados a tu caso</li>
              <li><Icono n="check" /> Más sesiones de asesoría incluidas</li>
              <li><Icono n="check" /> Un asesor te cotiza por WhatsApp</li>
            </ul>
          </article>
        </div>
      </section>

      <section style={{ paddingTop: 0 }}>
        <div className="centrado">
          <div className="cab-seccion reveal-mueve"><span className="eyebrow"><Icono n="chat" cls="ic-ey" /> Dudas frecuentes</span><h2>Lo que casi todos preguntan antes de empezar.</h2></div>
          <div className="faq reveal-mueve">
            <details open><summary>¿Necesito conocimientos previos? <span className="mas"><Icono n="plus" /></span></summary><p>No. El curso arranca desde lo básico y sube poco a poco. Tu asesor ajusta el plan a tu punto de partida.</p></details>
            <details><summary>¿Cuánto tiempo le dedico al día? <span className="mas"><Icono n="plus" /></span></summary><p>Tú decides. Con 30–45 minutos diarios avanzas bien; como las clases quedan grabadas, estudias cuando puedas.</p></details>
            <details><summary>¿Y si tengo dudas mientras estudio? <span className="mas"><Icono n="plus" /></span></summary><p>Nos escribes por WhatsApp cuando quieras. Si la duda es de fondo, tu asesor agenda una videollamada contigo.</p></details>
            <details><summary>¿Cómo pago? <span className="mas"><Icono n="plus" /></span></summary><p>Con un enlace seguro que te llega en el mismo chat. Al confirmarse el pago, tu acceso se activa automáticamente.</p></details>
          </div>
        </div>
      </section>

      <section className="cta-final">
        <div className="cta-caja reveal zoom-in">
          <Malla />
          <div className="cta-rej">
            <div>
              <h2>Déjanos tus datos y te escribimos.</h2>
              <p>Un asesor te contacta por WhatsApp para resolver tus dudas y ayudarte a empezar.</p>
            </div>
            <CtaForm />
          </div>
        </div>
      </section>
    </>
  );
}
