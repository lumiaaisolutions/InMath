<?php
$estatico = require __DIR__ . '/_comun.php';
if ($estatico === false) {
    return false;
}

use App\Servicios\ProspectoServicio;

$curso = cursoActivo();
$precioNum = $curso !== null ? (int) round($curso['precio_centavos'] / 100) : 0;
$precio = $curso !== null ? '$' . number_format($precioNum, 0) : '';
$semanas = (int) ($curso['duracion_semanas'] ?? 12);

// Formulario de contacto del CTA final: crea/reutiliza el prospecto (mismo
// pipeline que pago.php / agenda.php), sin redirigir — confirma en la misma tarjeta.
$ctaError = null;
$ctaExito = null;
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['form']) && $_POST['form'] === 'cta') {
    if (!csrfValido()) {
        $ctaError = 'La sesión expiró, intenta de nuevo.';
    } elseif (!empty($_POST['sitio_web'])) {
        $ctaError = 'No pudimos procesar tu solicitud.';
    } else {
        $telefono = preg_replace('/\D+/', '', $_POST['telefono'] ?? '');
        $nombre = trim($_POST['nombre'] ?? '');
        if ($nombre === '' || strlen($telefono) < 10 || strlen($telefono) > 15) {
            $ctaError = 'Escribe tu nombre y un WhatsApp válido (10 dígitos).';
        } else {
            if (strlen($telefono) === 10) {
                $telefono = '521' . $telefono; // México: WhatsApp usa 521 + 10 dígitos
            }
            $resultado = ProspectoServicio::upsertPorTelefono($telefono, ['nombre' => $nombre, 'fuente' => 'organico']);
            if ($resultado['prospecto']['nombre'] === null && $nombre !== '') {
                App\Core\Database::ejecutar('UPDATE prospectos SET nombre = ? WHERE id = ?', [$nombre, $resultado['prospecto']['id']]);
            }
            $ctaExito = $nombre;
        }
    }
}

cabeceraSitio('Cursos Inmath — Aprende en línea a tu ritmo');
?>

<section class="heroe">
  <?= mallaSitio() ?>
  <div class="heroe-rej">
    <div class="heroe-texto reveal-mueve">
      <h1>Cursos en línea que <span class="marca-pino">sí terminas</span>, con <span class="marca">acompañamiento</span> de verdad.</h1>
      <p class="entrada">Clases para estudiar cuando puedas, un asesor que te guía por WhatsApp
        y un reporte de tu avance cada semana. Aprendes a tu ritmo, sin perder el hilo.</p>
      <div class="acciones">
        <a class="boton glow glow-halo grande" href="/pago">Inscribirme <?= icono('arrow', 'flecha') ?></a>
        <a class="boton pastel grande" href="/agenda">Agendar asesoría gratis</a>
      </div>
      <div class="respaldo">
        <span><?= icono('clock') ?> Acceso inmediato</span>
        <span><?= icono('user') ?> Asesoría 1 a 1</span>
        <span><?= icono('play') ?> Estudias a tu ritmo</span>
      </div>
    </div>

    <div class="demo-marco zoom-in">
      <div class="chip-flota arriba"><?= icono('check') ?> Cita agendada</div>
      <div class="chip-flota abajo"><?= icono('trend') ?> Avance 70%</div>
      <div class="scrub scrub-hero" aria-label="Estudiante acompañado por WhatsApp durante su curso">
        <img class="scrub-frame f1" src="/img/fotos/hero-1.jpg" alt="Persona sosteniendo su teléfono para escribir por WhatsApp" loading="eager">
        <img class="scrub-frame f2" src="/img/fotos/hero-2.jpg" alt="Estudiantes repasando juntos frente a una laptop" loading="lazy">
        <span class="tinte"></span>
        <a class="scrub-accion" href="/agenda" aria-label="Agendar una asesoría gratis"><?= icono('arrow') ?></a>
      </div>
    </div>
  </div>
</section>

<section class="proceso" id="como">
  <div class="centrado">
    <div class="cab-seccion reveal-mueve">
      <a class="eyebrow link" href="/agenda"><?= icono('route', 'ic-ey') ?> Cómo funciona <span class="mini-arrow"><?= icono('arrow') ?></span></a>
      <h2>De la primera duda a tu inscripción, sin salir de WhatsApp.</h2>
    </div>
    <div class="pasos">
      <div class="paso reveal-mueve">
        <div class="paso-ic"><?= icono('chat') ?></div>
        <div class="num">PASO 01</div><h3>Escríbenos</h3>
        <p>Nos mandas un mensaje y resolvemos tus dudas del curso al momento.</p>
      </div>
      <div class="paso reveal-mueve d1">
        <div class="paso-ic"><?= icono('video') ?></div>
        <div class="num">PASO 02</div><h3>Asesoría</h3>
        <p>Una videollamada breve para conocer tu meta y armar tu plan.</p>
      </div>
      <div class="paso reveal-mueve d2">
        <div class="paso-ic"><?= icono('card') ?></div>
        <div class="num">PASO 03</div><h3>Te inscribes</h3>
        <p>Pagas con un enlace seguro en el chat y tu acceso se activa solo.</p>
      </div>
      <div class="paso reveal-mueve d3">
        <div class="paso-ic"><?= icono('trend') ?></div>
        <div class="num">PASO 04</div><h3>Avanzas</h3>
        <p>Estudias a tu ritmo y cada semana te llega tu reporte de avance.</p>
      </div>
    </div>
  </div>
</section>

<section class="acompana">
  <div class="centrado">
    <div class="acompana-rej">
      <div class="grafica-wrap">
        <div class="scrub scrub-acompana" aria-label="De estudiar solo frente a varias laptops, a resolver dudas riendo con un asesor real">
          <img class="scrub-frame f1" src="/img/fotos/acompana-1.jpg" alt="Escritorio visto desde arriba con varias laptops y libretas abiertas" loading="lazy">
          <img class="scrub-frame f2" src="/img/fotos/acompana-2.jpg" alt="Grupo de personas riendo juntas mientras revisan una laptop en una biblioteca" loading="lazy">
          <span class="tinte"></span>
          <a class="scrub-accion" href="/agenda" aria-label="Conocer a tu asesor en una asesoría gratis"><?= icono('arrow') ?></a>
        </div>
      </div>
      <div>
        <div class="cab-seccion reveal-mueve" style="margin-bottom:24px">
          <span class="eyebrow"><?= icono('user', 'ic-ey') ?> Acompañamiento real</span>
          <h2>No es un curso que dejas a medias en una plataforma sola.</h2>
        </div>
        <div class="areas">
          <div class="area reveal"><span class="pt"><?= icono('chat') ?></span><div><h3>Dudas que sí se resuelven</h3><p>Le escribes a tu asesor por WhatsApp y te responde una persona, no un buzón.</p></div></div>
          <div class="area reveal d1"><span class="pt"><?= icono('trend') ?></span><div><h3>Tu avance, a la vista</h3><p>Sabes en qué semana vas y qué sigue, en vez de perderte en una plataforma sola.</p></div></div>
        </div>
      </div>
    </div>
  </div>
</section>

<section>
  <?= mallaSitio() ?>
  <div class="centrado">
    <div class="cab-seccion reveal-mueve">
      <span class="eyebrow"><?= icono('spark', 'ic-ey') ?> Por qué Inmath</span>
      <h2>Hecho para quien estudia o trabaja y necesita aprovechar cada minuto.</h2>
    </div>
    <div class="rejilla-3">
      <article class="card azul reveal">
        <span class="card-fav"><?= icono('plus') ?></span>
        <div class="card-tiles">
          <span class="tile-ic"><?= icono('play') ?></span>
          <span class="tile-ic alt"><?= icono('video') ?></span>
        </div>
        <h3>A tu ritmo</h3>
        <p class="cuerpo-card">Clases grabadas disponibles 24/7. Avanza cuando puedas y repite lo que necesites, las veces que necesites.</p>
        <div class="mock"><div class="mock-caja"><div class="mock-fila">
          <span class="mock-play"><?= icono('play') ?></span>
          <span class="mock-barra"><i style="width:64%"></i></span>
          <span class="mock-et">12/18</span>
        </div></div></div>
        <span class="tag-pill"><?= icono('clock') ?> Acceso 24/7</span>
      </article>
      <article class="card rosa reveal d1">
        <span class="card-fav"><?= icono('plus') ?></span>
        <div class="card-tiles">
          <span class="tile-ic"><?= icono('chat') ?></span>
          <span class="tile-ic alt"><?= icono('user') ?></span>
        </div>
        <h3>Asesoría de verdad</h3>
        <p class="cuerpo-card">Un asesor te acompaña por WhatsApp: resuelve dudas, te organiza y te empuja cuando hace falta.</p>
        <div class="mock"><div class="mock-caja">
          <div class="mock-mini-burbuja">¿Cómo repaso este tema?</div>
          <div class="mock-fila" style="margin-top:8px;justify-content:flex-end"><span class="mock-chip">Asesor respondió</span></div>
        </div></div>
        <span class="tag-pill"><?= icono('chat') ?> 1 a 1 por WhatsApp</span>
      </article>
      <article class="card menta reveal d2">
        <span class="card-fav"><?= icono('plus') ?></span>
        <div class="card-tiles">
          <span class="tile-ic"><?= icono('trend') ?></span>
          <span class="tile-ic alt"><?= icono('list') ?></span>
        </div>
        <h3>Ves tu avance</h3>
        <p class="cuerpo-card">Cada semana recibes un reporte con tu progreso. Sabes exactamente dónde estás y qué reforzar.</p>
        <div class="mock"><div class="mock-caja"><div class="mock-fila" style="justify-content:space-between">
          <span class="mock-num">70%</span>
          <span class="mock-chip"><?= icono('trend') ?> +8 esta semana</span>
        </div></div></div>
        <span class="tag-pill"><?= icono('trend') ?> Reporte semanal</span>
      </article>
    </div>
  </div>
</section>

<section class="incluye" id="incluye">
  <div class="centrado">
    <div class="incluye-rej">
      <div>
        <div class="cab-seccion reveal-mueve" style="margin-bottom:24px">
          <a class="eyebrow link" href="/pago"><?= icono('list', 'ic-ey') ?> Qué incluye <span class="mini-arrow"><?= icono('arrow') ?></span></a>
          <h2>Todo lo que tu inscripción incluye.</h2>
        </div>
        <div class="areas">
          <div class="area reveal"><span class="pt">01</span><div><h3>Clases grabadas</h3><p>Videos organizados por módulo, con acceso completo desde el primer día.</p></div></div>
          <div class="area reveal d1"><span class="pt">02</span><div><h3>Materiales descargables</h3><p>Guías, ejercicios y recursos para practicar a tu ritmo.</p></div></div>
          <div class="area reveal d2"><span class="pt">03</span><div><h3>Asesorías por videollamada</h3><p>Sesiones 1 a 1 con un asesor para resolver dudas y avanzar.</p></div></div>
          <div class="area reveal d3"><span class="pt">04</span><div><h3>Reporte de avance</h3><p>Cada semana, tu progreso resumido y enviado por WhatsApp.</p></div></div>
        </div>
      </div>
      <div class="grafica-wrap">
        <div class="scrub scrub-avance" aria-label="Alumnos avanzando en su curso: repasando notas y celebrando su progreso">
          <img class="scrub-frame f1" src="/img/fotos/avance-2.jpg" alt="Cuaderno abierto con notas de estudio sobre un escritorio" loading="lazy">
          <img class="scrub-frame f2" src="/img/fotos/avance-1.jpg" alt="Persona celebrando frente a su laptop tras completar un avance" loading="lazy">
          <span class="tinte"></span>
          <a class="scrub-accion" href="/pago" aria-label="Ver qué incluye tu inscripción"><?= icono('arrow') ?></a>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="precio" id="precios">
  <?= mallaSitio() ?>
  <div class="centrado" style="text-align:center;margin-bottom:36px">
    <span class="eyebrow"><?= icono('card', 'ic-ey') ?> Planes</span>
    <h2 style="font:700 clamp(1.7rem,3.6vw,2.6rem)/1.08 var(--display);letter-spacing:-.025em;margin-top:14px">Elige cómo quieres empezar.</h2>
  </div>
  <div class="precios-grid">
    <article class="plan gratis reveal">
      <span class="plan-tag">Gratis</span>
      <div class="plan-precio">$0 <small>/ sin costo</small></div>
      <p class="plan-sub">Conoce el método antes de decidir.</p>
      <ul>
        <li><?= icono('check') ?> Asesoría de diagnóstico por videollamada</li>
        <li><?= icono('check') ?> Acceso a la primera clase de cada módulo</li>
        <li><?= icono('check') ?> Plan de estudio personalizado</li>
      </ul>
      <a class="boton grande" href="/agenda">Empezar gratis</a>
    </article>
    <article class="plan destacado reveal d1">
      <span class="plan-tag">Recomendado</span>
      <div class="plan-precio"><?= e($precio) ?> <small>MXN</small></div>
      <p class="plan-sub"><?= e($curso['nombre'] ?? 'Curso completo') ?> · pago único</p>
      <ul>
        <li><?= icono('check') ?> Acceso completo por <?= e((string) $semanas) ?> semanas</li>
        <li><?= icono('check') ?> Todas las clases y materiales descargables</li>
        <li><?= icono('check') ?> Asesorías por videollamada incluidas</li>
        <li><?= icono('check') ?> Reporte de avance cada semana por WhatsApp</li>
      </ul>
      <a class="boton glow glow-halo grande" href="/pago">Inscribirme ahora</a>
    </article>
    <article class="plan custom reveal d2">
      <span class="plan-tag">Personalizado</span>
      <div class="plan-precio" style="font-size:2rem">Cotización</div>
      <p class="plan-sub">Para equipos, grupos o un plan hecho a tu medida.</p>
      <ul>
        <li><?= icono('check') ?> Contenido y ritmo ajustados a tu caso</li>
        <li><?= icono('check') ?> Más sesiones de asesoría incluidas</li>
        <li><?= icono('check') ?> Un asesor te cotiza por WhatsApp</li>
      </ul>
      <a class="boton grande" href="/agenda">Solicitar cotización</a>
    </article>
  </div>
</section>

<section style="padding-top:0">
  <div class="centrado">
    <div class="cab-seccion reveal-mueve"><span class="eyebrow"><?= icono('chat', 'ic-ey') ?> Dudas frecuentes</span><h2>Lo que casi todos preguntan antes de empezar.</h2></div>
    <div class="faq reveal-mueve">
      <details open><summary>¿Necesito conocimientos previos? <span class="mas"><?= icono('plus') ?></span></summary><p>No. El curso arranca desde lo básico y sube poco a poco. Tu asesor ajusta el plan a tu punto de partida.</p></details>
      <details><summary>¿Cuánto tiempo le dedico al día? <span class="mas"><?= icono('plus') ?></span></summary><p>Tú decides. Con 30–45 minutos diarios avanzas bien; como las clases quedan grabadas, estudias cuando puedas.</p></details>
      <details><summary>¿Y si tengo dudas mientras estudio? <span class="mas"><?= icono('plus') ?></span></summary><p>Nos escribes por WhatsApp cuando quieras. Si la duda es de fondo, tu asesor agenda una videollamada contigo.</p></details>
      <details><summary>¿Cómo pago? <span class="mas"><?= icono('plus') ?></span></summary><p>Con un enlace seguro que te llega en el mismo chat. Al confirmarse el pago, tu acceso se activa automáticamente.</p></details>
    </div>
  </div>
</section>

<section class="cta-final">
  <div class="cta-caja reveal zoom-in">
    <?= mallaSitio() ?>
    <div class="cta-rej">
      <div>
        <h2>Déjanos tus datos y te escribimos.</h2>
        <p>Un asesor te contacta por WhatsApp para resolver tus dudas y ayudarte a empezar.</p>
      </div>
      <?php $waDirecto = whatsappUrl('Hola, quiero información del curso Inmath.'); ?>
      <?php if ($ctaExito !== null): ?>
        <div class="form-cta">
          <div class="aviso-cta"><?= icono('check') ?> ¡Gracias, <?= e($ctaExito) ?>! Te escribimos por WhatsApp en breve.</div>
          <?php if ($waDirecto): ?>
            <a class="wa-directo" href="<?= e($waDirecto) ?>" target="_blank" rel="noopener"><?= icono('chat') ?> ¿Prefieres escribirnos tú? Abrir WhatsApp</a>
          <?php endif; ?>
        </div>
      <?php else: ?>
        <form method="post" class="form-cta">
          <input type="hidden" name="form" value="cta">
          <input type="hidden" name="csrf" value="<?= e(csrfSitio()) ?>">
          <input type="text" name="sitio_web" value="" style="display:none" tabindex="-1" autocomplete="off">
          <?php if ($ctaError): ?><div class="aviso-cta"><?= icono('plus') ?> <?= e($ctaError) ?></div><?php endif; ?>
          <input type="text" name="nombre" placeholder="Tu nombre" required value="<?= e($_POST['nombre'] ?? '') ?>">
          <input type="tel" name="telefono" placeholder="WhatsApp (10 dígitos)" required inputmode="numeric" value="<?= e($_POST['telefono'] ?? '') ?>">
          <button type="submit" class="boton glow glow-halo">Quiero que me escriban <?= icono('arrow', 'flecha') ?></button>
          <?php if ($waDirecto): ?>
            <a class="wa-directo" href="<?= e($waDirecto) ?>" target="_blank" rel="noopener"><?= icono('chat') ?> ¿Prefieres escribirnos tú? Abrir WhatsApp</a>
          <?php endif; ?>
          <p class="legal">Sin spam. Solo lo usamos para contactarte por WhatsApp.</p>
        </form>
      <?php endif; ?>
    </div>
  </div>
</section>

<?php pieSitio();
