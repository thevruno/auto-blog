import "dotenv/config";
import { hashSync } from "bcryptjs";
import { count, eq } from "drizzle-orm";
import { db } from "./index";
import {
  credentials,
  mediaItems,
  messages,
  posts,
  siteProfile,
  users,
} from "./schema";
import { readingTimeMinutes, stripHtml } from "../lib/utils";

const HERO =
  "https://images.pexels.com/photos/5212321/pexels-photo-5212321.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800";

const IMG = {
  classroom: "https://images.pexels.com/photos/27093996/pexels-photo-27093996.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  teacher: "https://images.pexels.com/photos/8923036/pexels-photo-8923036.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  reading: "https://images.pexels.com/photos/14025659/pexels-photo-14025659.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  boy: "https://images.pexels.com/photos/5427827/pexels-photo-5427827.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  engaged: "https://images.pexels.com/photos/32094079/pexels-photo-32094079.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  hands: "https://images.pexels.com/photos/5428142/pexels-photo-5428142.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  board: "https://images.pexels.com/photos/5212329/pexels-photo-5212329.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  kids: "https://images.pexels.com/photos/5905514/pexels-photo-5905514.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  pod1: "https://images.pexels.com/photos/7598553/pexels-photo-7598553.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  mic: "https://images.pexels.com/photos/8046806/pexels-photo-8046806.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  pod2: "https://images.pexels.com/photos/7598549/pexels-photo-7598549.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  office: "https://images.pexels.com/photos/2041381/pexels-photo-2041381.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  radio: "https://images.pexels.com/photos/6878199/pexels-photo-6878199.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
};

async function main() {
  const existing = await db.select({ value: count() }).from(posts);
  if ((existing[0]?.value ?? 0) > 0) {
    console.log("✔ La base de datos ya tiene contenido. Seed omitido.");
    return;
  }

  // --- Usuario administrador -------------------------------------------------
  await db.insert(users).values({
    name: "Elena Kuchimpos",
    email: "admin@elenakuchimpos.com",
    passwordHash: hashSync("elena2026", 10),
  });
  console.log("✔ Usuario admin creado (admin@elenakuchimpos.com / elena2026)");

  // --- Perfil del sitio -------------------------------------------------------
  await db.insert(siteProfile).values({
    name: "Elena Kuchimpos",
    roleTitle: "Neuropsicoeducadora · Directora del IFOPAC",
    positioning:
      "La educación cambia cuando dejamos de etiquetar y empezamos a comprender cómo aprende cada persona.",
    heroPhoto: HERO,
    heroPhotoAlt:
      "Elena Kuchimpos, neuropsicoeducadora y directora del IFOPAC, en un aula",
    bio: "Licenciada en Educación, Neuropsicoeducadora y Magíster en Altas Capacidades y Educación Inclusiva. Doctoranda en Ciencias de la Educación y Diplomada en Comunicación Política. Directora General del Instituto de Formación Parlamentaria y Ciudadana (IFOPAC) del Concejo Deliberante de la Ciudad de Córdoba y asesora pedagógica para LATAM. Acompaño a familias, docentes e instituciones a educar desde la evidencia, con inclusión y mirada humana.",
    email: "contacto@elenakuchimpos.com",
    phone: "+54 9 351 000 0000",
    location: "Córdoba, Argentina",
    linkedin: "https://www.linkedin.com/in/elenakuchimpos",
    instagram: "https://www.instagram.com/elenakuchimpos",
    twitter: "https://x.com/elenakuchimpos",
    youtube: "https://www.youtube.com/@elenakuchimpos",
    facebook: "",
  });
  console.log("✔ Perfil del sitio creado");

  // --- Credenciales -----------------------------------------------------------
  await db.insert(credentials).values([
    {
      order: 1,
      icon: "🏛️",
      title: "Directora General",
      institution: "IFOPAC · Concejo Deliberante de la Ciudad de Córdoba",
      description:
        "Dirijo el Instituto de Formación Parlamentaria y Ciudadana, el espacio del Concejo Deliberante dedicado a la capacitación legislativa de concejales, equipos técnicos y a la formación ciudadana a través de programas como «Sembrando Valores».",
      highlight: true,
    },
    {
      order: 2,
      icon: "🎓",
      title: "Doctoranda en Ciencias de la Educación",
      institution: "Investigación y formación doctoral",
      description:
        "Investigo sobre trayectorias educativas, neurociencia aplicada al aprendizaje y políticas de inclusión, con foco en cómo transformar las aulas en espacios que respeten los tiempos y modos de aprender de cada estudiante.",
      highlight: false,
    },
    {
      order: 3,
      icon: "🧠",
      title: "Neuropsicoeducadora",
      institution: "Neurociencia aplicada a la educación",
      description:
        "Integro los aportes de las neurociencias cognitivas con la práctica pedagógica: atención, memoria, funciones ejecutivas y emoción como variables clave del proceso de enseñanza y aprendizaje.",
      highlight: false,
    },
    {
      order: 4,
      icon: "⭐",
      title: "Magíster en Altas Capacidades y Educación Inclusiva",
      institution: "Especialización de posgrado",
      description:
        "Me especializo en la detección, el acompañamiento y el desarrollo del potencial de estudiantes con altas capacidades, siempre desde un enfoque inclusivo que combate la exclusión y el estereotipo.",
      highlight: false,
    },
    {
      order: 5,
      icon: "🌎",
      title: "Asesora Pedagógica LATAM",
      institution: "Acompañamiento a escuelas y equipos de la región",
      description:
        "Asesoro a instituciones educativas de América Latina en proyectos de innovación pedagógica, evaluación de aprendizajes y formación docente continua.",
      highlight: false,
    },
    {
      order: 6,
      icon: "🗣️",
      title: "Diplomada en Comunicación Política",
      institution: "Universidad de Belgrano",
      description:
        "La formación en comunicación política fortalece mi tarea de tender puentes entre la gestión pública, la comunidad educativa y la construcción de políticas con legitimidad social.",
      highlight: false,
    },
  ]);
  console.log("✔ 6 credenciales creadas");

  // --- Posts -------------------------------------------------------------------
  const postsData: (typeof posts.$inferInsert)[] = [
    {
      title: "Altas capacidades: los mitos que frenan el talento",
      slug: "altas-capacidades-mitos-que-frenan-el-talento",
      excerpt:
        "No son genios ni «chicos perfectos». Derribamos los prejuicios más comunes y explicamos qué necesita realmente un estudiante con altas capacidades para desplegar su potencial.",
      content: `
<h2>Un término cargado de prejuicios</h2>
<p>Hablar de altas capacidades suele activar una imagen errónea: la del niño prodigio que saca diez en todo, toca el piano y resuelve ecuaciones antes de aprender a andar en bicicleta. Esa caricatura no solo es inexacta: es el principal obstáculo para que estos chicos y chicas reciban el acompañamiento que necesitan.</p>
<p>Las altas capacidades son una configuración particular del funcionamiento cognitivo y emocional. No es un logro académico, es una forma de procesar el mundo: mayor curiosidad, velocidad de razonamiento, intensidad emocional y, muchas veces, un profundo sentimiento de no encajar.</p>
<blockquote>«Etiquetar no acompaña. Comprender sí.»</blockquote>
<h2>Los tres mitos más comunes</h2>
<ul>
<li><strong>«Se destacan en todo.»</strong> Falso. Pueden tener rendimiento dispar y, sin estímulo, aburrirse y apagarse en el aula.</li>
<li><strong>«No necesitan ayuda.»</strong> Falso. Necesitan desafíos, contención emocional y docentes formados que no confundan intensidad con indisciplina.</li>
<li><strong>«Es un privilegio.»</strong> Falso. Sin detección, el talento se pierde y aparece el riesgo de fracaso escolar y malestar emocional.</li>
</ul>
<h3>Qué necesita un estudiante con altas capacidades</h3>
<p>Enriquecimiento curricular, agrupamientos flexibles, proyectos de interés y un adulto que lo escuche. No se trata de adelantarlo de grado por sistema, sino de ofrecerle profundidad allí donde su curiosidad lo pide.</p>
<figure><img src="${IMG.boy}" alt="Un niño lee concentrado en un aula tranquila" /><figcaption>La detección temprana permite acompañar antes de que el aburrimiento se convierta en desinterés.</figcaption></figure>
<h2>El rol de la escuela</h2>
<p>La escuela puede ser el lugar donde el talento florezca o donde se apague. Por eso la formación docente en altas capacidades es una deuda pendiente de nuestros sistemas educativos. Comprender la diversidad cognitiva es el primer paso hacia una educación verdaderamente inclusiva.</p>
`,
      coverImage: IMG.boy,
      coverImageAlt: "Niño leyendo concentrado en un aula con libros",
      tags: ["Altas Capacidades", "Inclusión"],
      status: "published",
      publishedAt: new Date("2026-01-28T09:00:00"),
      metaTitle: "Altas capacidades: mitos y verdades | Elena Kuchimpos",
      metaDescription:
        "Derribamos los mitos más comunes sobre las altas capacidades y explicamos qué necesita un estudiante para desarrollar su potencial. Por Elena Kuchimpos.",
    },
    {
      title: "Neuroeducación en el aula: así aprende el cerebro",
      slug: "neuroeducacion-en-el-aula-asi-aprende-el-cerebro",
      excerpt:
        "Atención, memoria, emoción y funciones ejecutivas: qué dice la neurociencia sobre cómo aprendemos y cómo aplicarlo en la práctica docente cotidiana.",
      content: `
<h2>Lo que la ciencia le dice a la pedagogía</h2>
<p>Durante décadas, la escuela y el laboratorio hablaron idiomas distintos. La neuroeducación tiende el puente: aplicar lo que sabemos del cerebro al diseño de experiencias de aprendizaje reales y verificables.</p>
<p>El principio es simple y revolucionario a la vez: <strong>no hay aprendizaje sin emoción</strong>. La información que llega teñida de curiosidad, relevancia o sorpresa tiene más probabilidades de consolidarse en la memoria de largo plazo.</p>
<h2>Cuatro ideas con evidencia para el aula</h2>
<ol>
<li><strong>Fragmentar y espaciar.</strong> Sesiones cortas y distribuidas en el tiempo superan al «atracón» previo al examen.</li>
<li><strong>Recuperación activa.</strong> Preguntar, evocar y explicar con las propias palabras fortalece más que releer.</li>
<li><strong>Dormir importa.</strong> El sueño consolida lo aprendido; es parte del proceso, no un lujo.</li>
<li><strong>El error es información.</strong> Un cerebro que se equivoca y se corrige está aprendiendo, no fracasando.</li>
</ol>
<blockquote>«Un aula que no deja espacio para el error es un aula que no deja espacio para el aprendizaje.»</blockquote>
<figure><img src="${IMG.teacher}" alt="Docente y estudiantes conversando en un aula luminosa" /><figcaption>El clima emocional del aula es una variable pedagógica de primer orden.</figcaption></figure>
<h2>Funciones ejecutivas: el director de orquesta</h2>
<p>Planificar, inhibir impulsos, sostener la atención y flexibilizar: las funciones ejecutivas predicen el desempeño académico tanto como el coeficiente intelectual. Y se entrenan, con propuestas progresivas y andamiaje docente.</p>
<p>La neuroeducación no viene a recetar fórmulas mágicas. Viene a devolverle al docente su lugar de profesional experto: alguien que decide con criterio, informado por la evidencia.</p>
`,
      coverImage: IMG.teacher,
      coverImageAlt: "Docente conversando con estudiantes en un aula colorida",
      tags: ["Neuroeducación", "Formación Docente"],
      status: "published",
      publishedAt: new Date("2026-01-12T09:00:00"),
      metaTitle: "Neuroeducación: cómo aprende el cerebro | Elena Kuchimpos",
      metaDescription:
        "Atención, memoria, emoción y funciones ejecutivas: ideas con evidencia científica para transformar la práctica docente. Por Elena Kuchimpos.",
    },
    {
      title: "Inclusión educativa: de la teoría al aula",
      slug: "inclusion-educativa-de-la-teoria-al-aula",
      excerpt:
        "Incluir no es sentar a todos en la misma aula. Es garantizar que todos puedan aprender en ella. Claves concretas para pasar del discurso a la práctica.",
      content: `
<h2>El punto de partida</h2>
<p>La inclusión educativa suele quedar atrapada entre el eslogan y la burocracia. Pero incluir es, antes que un trámite, una decisión pedagógica: diseñar aulas donde la diversidad no sea un problema a resolver sino la condición de partida.</p>
<p>Hablar de inclusión implica hablar de <strong>diseño universal del aprendizaje</strong>: ofrecer múltiples formas de representar la información, de expresar lo aprendido y de motivar la participación.</p>
<h2>Tres claves para empezar mañana</h2>
<ul>
<li><strong>Diversificar los formatos.</strong> Lo mismo puede presentarse en texto, audio, imagen o experiencia. La barrera suele estar en el formato, no en el estudiante.</li>
<li><strong>Evaluar el proceso, no solo el producto.</strong> Rúbricas, portafolios y autoevaluación permiten capturar aprendizajes que una prueba única no ve.</li>
<li><strong>Construir equipo.</strong> Docente de grado, docente de apoyo y familia son un equipo; la comunicación entre ellos no es opcional.</li>
</ul>
<figure><img src="${IMG.reading}" alt="Un grupo de niños lee libros juntos al aire libre" /><figcaption>La inclusión se construye en comunidad, dentro y fuera del aula.</figcaption></figure>
<h2>El riesgo del «incluir mal»</h2>
<p>La inclusión sin acompañamiento puede convertirse en una presencia vacía: el estudiante está en el aula pero no forma parte de la propuesta. Eso no es inclusión, es simulación. La verdadera meta es la participación genuina y el aprendizaje con sentido.</p>
<blockquote>«No se trata de que todos lleguen al mismo lugar por el mismo camino, sino de que todos tengan un camino posible.»</blockquote>
`,
      coverImage: IMG.reading,
      coverImageAlt: "Grupo de niños leyendo libros juntos al aire libre",
      tags: ["Inclusión", "Política Educativa"],
      status: "published",
      publishedAt: new Date("2025-12-15T09:00:00"),
      metaTitle: "Inclusión educativa: de la teoría al aula | Elena Kuchimpos",
      metaDescription:
        "Claves concretas para pasar del discurso inclusivo a la práctica docente: diseño universal, evaluación del proceso y trabajo en equipo.",
    },
    {
      title: "La formación docente como motor del cambio educativo",
      slug: "formacion-docente-motor-del-cambio",
      excerpt:
        "Ninguna reforma transforma un aula si no transforma antes a quienes la habitan. Por qué la formación docente continua es la inversión más rentable del sistema.",
      content: `
<h2>El eslabón que todo lo sostiene</h2>
<p>Cuando se discuten políticas educativas suele hablarse de presupuesto, currículum o infraestructura. Rara vez se pone en el centro al docente, que es quien finalmente traduce cualquier decisión en una experiencia de aprendizaje concreta.</p>
<p>Desde el IFOPAC trabajamos con la convicción de que <strong>la formación parlamentaria y la formación ciudadana</strong> comparten un mismo origen: la calidad de quienes enseñan y de quienes legislan la educación.</p>
<h2>Formación que cambia prácticas</h2>
<ul>
<li>Debe ser <strong>continua y situada</strong>: ligada a los problemas reales del aula, no a cursos genéricos.</li>
<li>Debe incluir <strong>acompañamiento</strong>: observación, devolución y comunidades de práctica entre pares.</li>
<li>Debe valorar la <strong>evidencia</strong>: formar en neuroeducación, evaluación formativa y alfabetización temprana.</li>
</ul>
<figure><img src="${IMG.board}" alt="Estudiantes levantan la mano para participar en clase" /><figcaption>Un docente formado transforma la dinámica de toda una institución.</figcaption></figure>
<h2>Una apuesta de largo plazo</h2>
<p>Los resultados educativos no se cambian por decreto. Se cambian invirtiendo sostenidamente en quienes enseñan. Esa es la única reforma que sobrevive a los cambios de gestión: la que ocurre dentro de cada aula.</p>
<blockquote>«La mejor política educativa es un docente bien formado y respaldado.»</blockquote>
`,
      coverImage: IMG.board,
      coverImageAlt: "Estudiantes levantando la mano para participar en clase",
      tags: ["Política Educativa", "Formación Docente"],
      status: "published",
      publishedAt: new Date("2025-11-20T09:00:00"),
      metaTitle: "Formación docente: motor del cambio | Elena Kuchimpos",
      metaDescription:
        "Por qué la formación docente continua es la inversión más rentable del sistema educativo. Una mirada desde el IFOPAC.",
    },
    {
      title: "Detección temprana de altas capacidades: señales a las que prestar atención",
      slug: "deteccion-temprana-altas-capacidades",
      excerpt:
        "Preguntas inesperadas, sensibilidad intensa, aburrimiento crónico. Cómo distinguir una chispa de talento de una conducta «problemática» y cuándo conviene consultar.",
      content: `
<h2>¿Señales o etiquetas?</h2>
<p>Detectar altas capacidades no es colocar una etiqueta: es <strong>abrir la puerta a un acompañamiento oportuno</strong>. La detección temprana reduce el riesgo de aburrimiento crónico, fracaso escolar y malestar emocional.</p>
<h2>Señales frecuentes en la infancia</h2>
<ul>
<li>Preguntas que «no corresponden a su edad» y un vocabulario sorprendentemente rico.</li>
<li>Memoria llamativa para temas de su interés y capacidad de relacionar ideas lejanas.</li>
<li>Intensidad emocional y un sentido del humor o de la justicia muy desarrollado.</li>
<li>Aburrimiento o desinterés en actividades que otros disfrutan; perfeccionismo que a veces paraliza.</li>
</ul>
<p>Ninguna de estas señales, por sí sola, confirma altas capacidades. La evaluación profesional integra entrevistas, observación y pruebas estandarizadas aplicadas por especialistas.</p>
<figure><img src="${IMG.classroom}" alt="Niña concentrada escribiendo en el aula" /><figcaption>La mirada atenta de la familia y del docente es el primer detector.</figcaption></figure>
<h2>Qué hacer (y qué no)</h2>
<p>No se trata de adelantar contenidos por adelantar, ni de presionar. Se trata de <strong>ofrecer profundidad, desafío y contención emocional</strong>. Ante dudas, consultar con un equipo de psicopedagogía o neurociencia aplicada a la educación.</p>
<blockquote>«El talento que no se acompaña se desvanece; el que se comprende, florece.»</blockquote>
`,
      coverImage: IMG.classroom,
      coverImageAlt: "Niña concentrada escribiendo en el aula",
      tags: ["Altas Capacidades", "Neuroeducación"],
      status: "published",
      publishedAt: new Date("2025-10-09T09:00:00"),
      metaTitle: "Detección temprana de altas capacidades | Elena Kuchimpos",
      metaDescription:
        "Señales a las que prestar atención y cuándo consultar a un especialista. Guía para familias y docentes por Elena Kuchimpos.",
    },
    {
      title: "Repensar el aula en la era de la inteligencia artificial",
      slug: "repensar-el-aula-en-la-era-de-la-ia",
      excerpt:
        "Entrevista sobre los resultados de las pruebas PISA: el aula tradicional quedó vieja y la IA obliga a discutir qué y cómo enseñar en la escuela de hoy.",
      content: `
<h2>Una foto incómoda</h2>
<p>Los resultados de las últimas pruebas PISA dejaron una conclusión que incomoda: los estudiantes no fallan en sumar, fallan en resolver problemas de la vida cotidiana. La escuela que memoriza y repite quedó desconectada de la escuela que razona y transfiere.</p>
<p>En esta entrevista conversamos sobre ese diagnóstico y sobre el rol que la inteligencia artificial puede jugar en la reinvención del aula.</p>
<blockquote>«Las aulas no deberían ser las que conocemos: un niño detrás de otro, mirando un pizarrón. Deberían ser aulas de debate, donde planteo una pregunta y entre todos resolvemos una situación problemática.»</blockquote>
<h2>Tres ejes para una escuela del presente</h2>
<ol>
<li><strong>Pensamiento crítico antes que acumulación.</strong> La información está a un clic; el valor está en saber qué hacer con ella.</li>
<li><strong>Aprendizaje por proyectos y problemas.</strong> Situaciones reales, colaboración y transferencia a la vida cotidiana.</li>
<li><strong>Uso ético de la IA.</strong> Como herramienta de amplificación, no como reemplazo del pensamiento propio.</li>
</ol>
<figure><img src="${IMG.hands}" alt="Estudiantes participando activamente en un aula moderna" /><figcaption>El aula del futuro ya llegó: debate, colaboración y resolución de problemas.</figcaption></figure>
<h2>El docente, más necesario que nunca</h2>
<p>Lejos de volver obsoleto al docente, la IA lo vuelve imprescindible: alguien tiene que diseñar buenas preguntas, acompañar procesos y formar criterio. Ese es el corazón de la tarea educativa.</p>
`,
      coverImage: IMG.hands,
      coverImageAlt: "Estudiantes participando activamente en un aula moderna",
      tags: ["Entrevistas", "Política Educativa"],
      status: "published",
      publishedAt: new Date("2026-02-18T09:00:00"),
      metaTitle: "El aula en la era de la IA | Entrevista a Elena Kuchimpos",
      metaDescription:
        "Qué dicen las pruebas PISA y cómo la inteligencia artificial obliga a repensar qué y cómo enseñamos. Entrevista a Elena Kuchimpos.",
    },
    {
      title: "Guía para familias: acompañar sin presionar (borrador)",
      slug: "guia-para-familias-acompanar-sin-presionar",
      excerpt:
        "Borrador de trabajo: claves para acompañar el desarrollo de los hijos respetando sus tiempos e intereses.",
      content: "<p>Contenido en preparación.</p>",
      coverImage: IMG.kids,
      coverImageAlt: "Niños trabajando en grupo cerca de un pizarrón",
      tags: ["Altas Capacidades"],
      status: "draft",
      publishedAt: new Date("2026-03-15T09:00:00"),
      metaTitle: "",
      metaDescription: "",
    },
  ];

  const withReadingTime = postsData.map((p) => ({
    ...p,
    readingTime: readingTimeMinutes(stripHtml(p.content ?? "")),
  }));

  await db.insert(posts).values(withReadingTime);
  console.log(`✔ ${withReadingTime.length} posts creados (6 publicados, 1 borrador)`);

  // --- Medios ------------------------------------------------------------------
  await db.insert(mediaItems).values([
    {
      title: "El desafío de educar mentes brillantes",
      type: "video",
      source: "El Doce TV",
      publishedAt: new Date("2026-02-05T10:00:00"),
      url: "https://www.youtube.com/watch?v=iG9CE55wbtY",
      embedUrl: "https://www.youtube.com/embed/iG9CE55wbtY",
      thumbnail: IMG.pod1,
      thumbnailAlt: "Elena Kuchimpos en un estudio de televisión",
      description:
        "Entrevista televisiva sobre altas capacidades, detección temprana y el rol de la escuela en el desarrollo del talento.",
    },
    {
      title: "Neurociencia y educación: el aula que viene",
      type: "video",
      source: "Conferencia · YouTube",
      publishedAt: new Date("2025-11-12T10:00:00"),
      url: "https://www.youtube.com/watch?v=H14bBuluwB8",
      embedUrl: "https://www.youtube.com/embed/H14bBuluwB8",
      thumbnail: IMG.mic,
      thumbnailAlt: "Micrófono de estudio sobre un atril",
      description:
        "Charla sobre cómo la neurociencia transforma la práctica docente: emoción, memoria y funciones ejecutivas.",
    },
    {
      title: "Educación en voz alta — Ep. 14",
      type: "podcast",
      source: "Podcast Educación en voz alta",
      publishedAt: new Date("2025-10-22T10:00:00"),
      url: "https://open.spotify.com/",
      embedUrl: "",
      thumbnail: IMG.pod2,
      thumbnailAlt: "Dos mujeres grabando un podcast en un estudio",
      description:
        "Conversación sobre inclusión educativa y los desafíos de llevar la teoría al aula en América Latina.",
    },
    {
      title: "Una cordobesa que piensa la educación del futuro",
      type: "article",
      source: "La Voz del Interior",
      publishedAt: new Date("2025-09-30T10:00:00"),
      url: "https://www.lavoz.com.ar/",
      embedUrl: "",
      thumbnail: IMG.office,
      thumbnailAlt: "Mujeres grabando una conversación en una oficina",
      description:
        "Nota de prensa sobre la trayectoria de Elena Kuchimpos y su mirada acerca de la formación docente y las altas capacidades.",
    },
    {
      title: "Pruebas PISA: qué nos dicen de la educación argentina",
      type: "article",
      source: "Radio Regional",
      publishedAt: new Date("2025-08-18T10:00:00"),
      url: "https://radioregional.com.ar/",
      embedUrl: "",
      thumbnail: IMG.radio,
      thumbnailAlt: "Persona preparando un programa de radio",
      description:
        "Análisis de los resultados de PISA: de la memorización a la resolución de problemas de la vida cotidiana.",
    },
  ]);
  console.log("✔ 5 ítems de medios creados");

  // --- Mensajes de ejemplo ------------------------------------------------------
  await db.insert(messages).values([
    {
      name: "María Fernández",
      email: "maria.fernandez@colegio.edu.ar",
      message:
        "Hola Elena, soy docente de nivel primario y me gustaría invitarte a dar una charla sobre altas capacidades en nuestro colegio. ¿Cómo podemos coordinar?",
      isRead: false,
    },
    {
      name: "Jorge Molina",
      email: "jmolina@gmail.com",
      message:
        "Buenas tardes, estoy buscando orientación para acompañar a mi hijo que tiene un diagnóstico reciente. ¿Trabajás con familias? Gracias.",
      isRead: false,
    },
  ]);
  console.log("✔ 2 mensajes de ejemplo creados");

  const tagCheck = await db.select({ value: count() }).from(posts).where(eq(posts.status, "published"));
  console.log("✔ Seed completado. Posts publicados:", tagCheck[0]?.value);
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error durante el seed:", err);
    process.exit(1);
  });
