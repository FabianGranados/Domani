# DOMANI — El Mundo Vivo

> Documento de **visión conceptual** (no de código). Es la biblia del simulador de
> sociedad de Domani. Vive y se edita. La arquitectura técnica detallada se separará
> en su propio documento cuando haga falta.
>
> **Estado:** borrador 1 · **Última edición:** 2026-06-24

---

## 1. Visión

Domani no es un casino con bots: es un **mundo vivo**. Alguien entra y siente que está
en **otra vida** — compra un carro en un concesionario, monta un negocio, construye un
edificio y lo renta, juega póker o ajedrez, paga impuestos, y hasta recibe malas
noticias (un robo, un choque). Todo lo que pasa se siente **casi como en la vida real**.

El nombre lo dice todo: **Domani = mañana**. El "mañana" es convivir con **humanoides**
que piensan, sienten y toman decisiones propias — sin saber del todo si lo son. Esa
**duda (¿humano o robot?)** es un principio de diseño, no un truco: son "robots del
mañana" vestidos como personas de hoy. Eso nos da coherencia narrativa **y** una salida
ética elegante (el sistema siempre sabe quién es bot; la transparencia existe por
debajo).

Aspiración: que sea más profundo que Los Sims y que cualquier simulador de vida — no por
gráficos, sino por **vida emergente real**: una sociedad que se desarrolla sola.

---

## 2. Principios de diseño (innegociables)

1. **Mundo ≠ Alma.** El "mundo" (tiempo, economía, geografía) es una **simulación pura,
   barata y determinista que corre siempre**. El "alma" (cognición con IA/LLM) es una
   **capa cara y opcional** que se enciende solo cuando importa. Construimos todo el
   mundo primero; la IA real se enchufa después.
2. **Niveles de detalle (LOD).** No se simula a los 10.000 agentes con IA cara todo el
   tiempo. Detalle alto solo "en cámara" (cuando hay un humano o espectadores).
3. **Presupuesto de IA con límite diario duro.** Un "banco de tokens" por día; un
   *Director* decide dónde gastarlo. Si se agota, todos bajan de nivel cognitivo. **Nunca
   se excede el presupuesto.**
4. **Transparencia ética.** Los bots se comportan como humanos, pero el sistema sabe
   internamente quiénes son. Política clara para no cruzar líneas de confianza/regulación.
5. **Aurelios = moneda de fantasía.** Se *siente* como dinero real (tipo dólar/euro),
   pero es **+18, nunca dinero real, no canjeable**. Esto nos protege de la regulación de
   apuestas.
6. **Juego responsable.** Límites, piso anti-quiebra, señales de abuso. Aunque sea
   fantasía.

---

## 3. Las capas del motor

Pensado de abajo (sustrato) hacia arriba (presentación).

### Capa 0 — Sustrato del mundo
- **Tiempo & Tick:** un latido del mundo (cron) avanza la sociedad aunque nadie esté
  conectado. Ya existe un worker con cron en `apps/workers` → ese es el corazón. Entras y
  "pasaron cosas" mientras no estabas (rentas cobradas, torneos terminados, robos).
- **Geografía:** las 7 ciudades/Casas, distritos, locales, mesas, mercado.
- **Persistencia:** se guarda estado + **memorias resumidas** (no cada acción) en Supabase.

### Capa 1 — Ciudadanía & Identidad
- Cada ciudadano (humano o bot) tiene perfil único: nombre, Casa, historia, stats por
  juego, patrimonio, **Influencia**.
- **Niveles de ciudadano:** se sube por logros, riqueza y fama → desbloquea lugares,
  mesas y privilegios.
- **Identidad multijuego** y **búsqueda por nombre** (para invitar a jugar).
- **El bot indistinguible:** ante "¿eres robot?" responde en personaje ("descúbrelo tú
  mismo"); la transparencia vive en el sistema, no en la cara.

### Capa 2 — Cognición de agentes (IA por niveles / LOD)
- **Nivel 0 (fondo):** estadística barata. La mayoría solo "existe", mueve dinero,
  gana/pierde.
- **Nivel 1 (juega sin humano):** heurística ponderada por personalidad + lógica del juego.
- **Nivel 2 (hay humano/espectadores):** se enciende el **LLM** — piensan, hablan,
  tiltean, faroleo verbal.
- Componentes: **personalidad** (OCEAN + rasgos de juego), **motor de emoción/tilt**,
  **memoria** (estilo *Generative Agents*, Stanford 2023), **metas de vida**.
- **Presupuesto de cognición** con límite diario (Principio 3).

### Capa 3 — Economía
> Ver detalle en la sección **4. Economía**.
- Aurelios con **inflación leve gestionada**, grifos/sumideros, impuestos, rentas,
  salarios, precios.
- **Banco central** que vigila la masa monetaria.
- **Banco comercial:** ahorro + crédito hipotecario + embargo.
- **Mercado** donde humanos *y* bots publican y compran.

### Capa 4 — Propiedad, Negocios & Creación (UGC económico) — *el corazón*
- Inmuebles: comprar / **construir** / rentar / vender.
- **Negocios:** pones una tienda y *ya existe* en el mercado.
- **Premium = creadores:** quienes pagan pueden **crear torneos/locales** y cobran su
  **rake (~20%)**. (Inspiración: Roblox y Second Life — los usuarios crean y ganan.)
- **Los bots también crean** según sus metas → la economía respira sola.

### Capa 5 — Juegos & Salas (motor genérico)
- **Motor de juego por turnos reutilizable** (póker, ajedrez, parqués, dominó). Lo que
  pulimos en póker (estado puro + capa visual con animaciones) se reusa.
- **Matchmaking** por nivel/ELO por juego, **mesas privadas con invitación** (llamas a
  amigos), **torneos**, **espectar en vivo** ("Twitch de Domani").
- Ajedrez humano-realista: referencia **Maia Chess** (juega como humanos de cierto ELO).

### Capa 6 — Social & Relaciones
- Relaciones, **rivalidades que recuerdan** (inspiración en el *Nemesis System* de Shadow
  of Mordor — **patentado**, nos inspiramos sin copiar), **chismes/reputación**, chat,
  mesas entre amigos, comunidades por Casa.
- **Las Casas como gremios:** rivalidades, economías y torneos de Casa.

### Capa 7 — Presentación & "sentirse en otro mundo"
- UX inmersiva, ambiente, **feed de noticias** ("Domani Times"), la duda humano/bot,
  notificaciones de vida.

### Capa 8 — Gobernanza & Seguridad
- Anti-trampa/colusión, **anti-lavado** en la economía UGC, juego responsable +18,
  política de transparencia de bots, moderación (hay humanos + chat + contenido creado).

---

## 4. Economía (detalle)

### Filosofía
Los Aurelios son una **moneda nominal** (como dólar/euro): unidad de cuenta con poder
adquisitivo estable-pero-vivo. El patrimonio inicial fija la escala de precios.

### Patrimonio inicial
- El ciudadano nuevo entra con **~500.000 Aurelios** ≈ **2 casas**, o **casa + carro**.
- Eso ancla precios de referencia: casa ~250k, carro ~100–250k, etc.

### Inflación leve gestionada
- El banco central **apunta a ~2–4% de inflación** del mundo (no cero).
- Se equilibra con **grifos vs sumideros**:
  - **Grifos (entra dinero):** premios, salarios, rentas, dividendos, intereses,
    estipendio diario, negocios.
  - **Sumideros (sale dinero):** impuestos, rake, comisiones, mantenimiento de predios,
    intereses de crédito, seguros, embargos.
- Efecto: **las propiedades se valorizan**, el **efectivo quieto pierde valor** → empuja a
  invertir. Tu casa de hoy vale más mañana.

### El banco
- **Ahorro:** depósitos con interés.
- **Crédito con garantía (hipoteca):** prestas contra casa/carro/local (ej. hasta 60–70%
  del avalúo), con interés y cuotas.
- **Mora → embargo:** si no pagas, el banco te quita la garantía (se conecta con las
  "malas noticias").
- **Score = Influencia/historial:** mejor reputación, mejores tasas.
- Es el **salvavidas** cuando te quiebras en la mesa, con riesgo real.

### Límites de apuesta (que recuperarse NO sea fácil)
- **Niveles de stakes** (micro, baja, media, alta) con **topes de buy-in** atados a las
  ciegas. No puedes sentar todo tu patrimonio en una mesa.
- Mesas altas exigen **patrimonio/nivel de ciudadano** comprobado (aspiracional).
- Perder **duele** y recuperarse es un **grind**, pero los topes evitan perder los 500k de
  un solo golpe.

### Ingresos sin apostar (no obligar a jugar)
- Trabajos, negocios, rentas, dividendos, intereses, **estipendio diario** pequeño.

### Otros mecanismos
- **Impuestos / mantenimiento** de predios (sumidero + gameplay).
- **Seguros** contra robos/accidentes (mercado + sumidero; los bots pueden tener
  aseguradoras).
- **Mercado con oferta/demanda:** los precios fluctúan solos.
- **Piso anti-quiebra:** si lo pierdes todo, hay un mínimo (estipendio / vivienda pública)
  para volver a empezar — retención + juego responsable.

---

## 5. Sistema interno de personajes (la primera fase)

> Arrancamos por aquí: que los ciudadanos dejen de "sentirse bots".

- **Personalidad base (OCEAN / Big Five):** apertura, responsabilidad, extroversión,
  amabilidad, neuroticismo → gustos y conducta social.
- **Rasgos de juego:** agresión, faroleo, disciplina de bankroll, tolerancia al riesgo,
  paciencia, lectura de rivales, **tendencia a tiltearse**.
- **Motor de emoción/tilt:** estado que cambia con bad beats, bluffs sufridos y rachas; un
  agente tilteado juega más loose/agresivo y peor.
- **Memoria:** recuerda manos clave, quién lo faroleó, quién le hizo bad beat → base de
  rivalidades.
- **Metas/ambiciones de vida:** ser rico, campeón, casero… guían su conducta a largo
  plazo y generan historias solas.
- **Generación de 10.000 únicos:** 8–12 arquetipos (roca/nit, maníaco/LAG, estación de
  pago, pro/TAG, recreativo, tímido) × **variación aleatoria del vector** + nombre/historia.
- **No buscamos bots perfectos** (un solver tipo Pluribus sería aburrido): buscamos
  **humanos imperfectos, explotables y emocionales**, con habilidad **distinta por juego**.

---

## 6. Ideas vivas del mundo (más allá del juego)

- **Domani Times:** diario del mundo (torneos, ganadores, escándalos, robos, negocios
  nuevos) → fama y credibilidad.
- **El mundo nace y "muere":** llegan ciudadanos nuevos y otros se retiran (churn) → el
  mundo evoluciona y la economía se reequilibra. (Inspiración: *Dwarf Fortress*.)
- **Director de drama** (estilo *AI Director* de Left 4 Dead / narrador de RimWorld):
  orquesta mesas para maximizar la diversión del humano sin que se note.
- **Eventos y shocks:** temporadas, festivales, bonanzas, crisis del mercado.
- **Movilidad social:** subir de clase (bot o humano).
- **Mentor/coach NPC** que enseña cada juego (clave para juegos que el dueño no domina).
- **Salón de la fama / manos legendarias** para espectadores.

---

## 7. Glosario

- **Aurelio (⟡):** moneda de fantasía de Domani. +18, no canjeable, nunca dinero real.
- **Influencia:** reputación/estatus; afecta nivel de ciudadano, acceso y crédito.
- **Casa:** una de las 7 ciudades/comunidades; funciona también como gremio.
- **Ciudadano:** habitante de Domani (humano o bot), con identidad persistente.
- **Rake:** comisión que cobra quien organiza una mesa/torneo (premium ~20%).
- **Grifo / Sumidero (faucet/sink):** por donde entra / sale dinero de la economía.
- **LOD:** nivel de detalle de simulación (0 fondo, 1 conductual, 2 LLM "en cámara").
- **Tilt:** estado emocional que empeora y descontrola el juego de un agente.

---

## 8. Roadmap por fases

> Regla: **todo el mundo se construye SIN IA primero**; el LLM entra después, con límite
> diario duro.

- **Fase 0 — Cimientos:** modelo de datos de ciudadano, reloj/tick del mundo, persistencia.
- **Fase 1 — Sistema de personajes (AQUÍ ARRANCAMOS):** personalidad + emoción/tilt +
  memoria + metas, aplicados primero a que el **póker se sienta humano** (sin LLM, solo
  heurística + personalidad).
- **Fase 2 — Economía base:** Aurelios, patrimonio inicial, grifos/sumideros, banco
  (ahorro/crédito/embargo), límites de apuesta.
- **Fase 3 — Propiedad & mercado:** comprar/construir/rentar/vender; negocios; UGC y rake.
- **Fase 4 — Motor de juegos genérico:** reusar póker → ajedrez, parqués, dominó;
  matchmaking, mesas privadas, torneos, espectar.
- **Fase 5 — Vida & social:** noticias, eventos, rivalidades, churn, Casas como gremios.
- **Fase 6 — Cognición real (IA/LLM):** se enchufa por niveles, con presupuesto diario.

---

## 9. Riesgos & decisiones abiertas

- **Costo de IA:** sin LOD + presupuesto, 10.000 agentes pensantes son inviables.
- **Regulación/ética:** mantener "fantasía, no canjeable" y transparencia de bots.
- **Persistencia a escala:** memorias resumidas, no cada acción.
- **Anti-abuso UGC:** evitar lavado, colusión y negocios falsos.
- **Abiertas:** ¿exchange entre Casas? ¿impuestos progresivos? ¿un "banco central" en
  parte autónomo (IA)? ¿cómo se "construye" un edificio (mini-juego o compra directa)?

---

## Apéndice — Decisiones cerradas (24-jun-2026)

- [x] Mesa de póker: 9-max (motor soporta cualquier número).
- [x] Inflación **leve gestionada** (no cero, no hiper).
- [x] Banco con **ahorro + crédito hipotecario + embargo**.
- [x] Patrimonio inicial **~500.000 Aurelios** (≈ 2 casas o casa + carro).
- [x] Aurelios = **moneda nominal**, +18, **no canjeable**.
- [x] **Límites de buy-in por nivel** de stakes/ciudadano.
- [x] Arrancamos por el **sistema interno de personajes** (ciudadanía + cognición).
- [x] **Límite diario duro** de presupuesto de IA.
- [x] Principio **Mundo ≠ Alma** + **LOD** + transparencia ética.
