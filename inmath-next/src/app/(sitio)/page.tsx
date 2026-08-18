import Link from "next/link";
import { prisma } from "@/lib/db";
import { Icono, Malla } from "@/components/Icono";
import { CtaForm } from "@/components/ClienteSitio";
import { Planes } from "@/components/Planes";
import { AlertasLanding, AlertaEmergenteLanding } from "@/components/AlertasLanding";

export const dynamic = "force-dynamic";

export default async function Landing() {
  const curso = await prisma.cursos.findFirst({ where: { activo: true }, orderBy: { id: "asc" } });
  const precio = curso ? `$${Math.round(curso.precio_centavos / 100).toLocaleString("en-US")}` : "";
  const semanas = curso?.duracion_semanas ?? 12;

  return (
    <>
      <AlertaEmergenteLanding precio={precio} curso={curso?.nombre ?? ""} />
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
              <span className="respaldo-oferta"><Icono n="card" /> Hoy con $500 de descuento</span>
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

      <AlertasLanding posicion="arriba" />

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

      <section className="interludio" style={{ backgroundImage: "url(/img/fotos/full-estudio.jpg)" }} aria-label="Estudiar acompañado">
        <div className="interludio-in">
          <span className="interludio-kicker"><Icono n="user" /> Acompañamiento real</span>
          <h2>Estudiar acompañado <span className="resalte">se siente diferente</span>.</h2>
          <p>No vas a estar solo frente a una plataforma: un asesor te conoce, te guía y celebra tu avance contigo.</p>
          <div className="acciones-int">
            <Link className="boton glow glow-halo grande" href="/agenda">Conocer a mi asesor gratis</Link>
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

      <AlertasLanding posicion="precios" />

      <section className="precio" id="precios">
        <Malla />
        <div className="centrado" style={{ textAlign: "center", marginBottom: 36 }}>
          <span className="eyebrow"><Icono n="card" cls="ic-ey" /> Planes</span>
          <h2 style={{ font: "700 clamp(1.7rem,3.6vw,2.6rem)/1.08 var(--display)", letterSpacing: "-.025em", marginTop: 14 }}>Elige cómo quieres empezar.</h2>
        </div>
        <Planes precio={precio} semanas={semanas} nombre={curso?.nombre ?? ""} />
      </section>

      <section style={{ paddingTop: 0 }}>
        <div className="centrado">
          <div className="cab-seccion reveal-mueve"><span className="eyebrow"><Icono n="chat" cls="ic-ey" /> Dudas frecuentes</span><h2>Lo que casi todos preguntan antes de empezar.</h2></div>
          <div className="faq reveal-mueve">
            <details open><summary>¿Necesito conocimientos previos? <span className="mas"><Icono n="plus" /></span></summary><p>No. El curso arranca desde lo básico y sube poco a poco. Tu asesor ajusta el plan a tu punto de partida.</p></details>
            <details><summary>¿Cuánto tiempo le dedico al día? <span className="mas"><Icono n="plus" /></span></summary><p>Tú decides. Con 30–45 minutos diarios avanzas bien; como las clases quedan grabadas, estudias cuando puedas.</p></details>
            <details><summary>¿Y si tengo dudas mientras estudio? <span className="mas"><Icono n="plus" /></span></summary><p>Nos escribes por WhatsApp cuando quieras. Si la duda es de fondo, tu asesor agenda una videollamada contigo.</p></details>
            <details><summary>¿Hasta cuándo dura el descuento de $500? <span className="mas"><Icono n="plus" /></span></summary><p>Es una oferta por tiempo limitado: al completar tu inscripción hoy aseguras el precio de $4,000. Cuando la oferta termine, el precio regresa a $4,500.</p></details>
            <details><summary>¿Cómo pago? <span className="mas"><Icono n="plus" /></span></summary><p>Con un enlace seguro que te llega en el mismo chat. Al confirmarse el pago, tu acceso se activa automáticamente.</p></details>
          </div>
        </div>
      </section>

      <section className="interludio" style={{ backgroundImage: "url(/img/fotos/full-meta.jpg)" }} aria-label="Tu lugar te espera">
        <div className="interludio-in">
          <span className="interludio-kicker"><Icono n="clock" /> Oferta por tiempo limitado</span>
          <h2>Tu lugar en el curso <span className="resalte">te está esperando</span>.</h2>
          <p>Inscríbete hoy con $500 de descuento y empieza a avanzar desde tu primera semana.</p>
          <div className="acciones-int">
            <Link className="boton glow glow-halo grande" href="/pago">Inscribirme con descuento</Link>
            <Link className="boton pastel grande" href="/agenda">Primero quiero una asesoría</Link>
          </div>
        </div>
      </section>

      <AlertasLanding posicion="final" />

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
