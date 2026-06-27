# Domani — Diseño de la IA: Cerebros, Sociedad y los Pioneros

> Documento **vivo**. Aquí anotamos todo el diseño de la inteligencia de los
> ciudadanos de Domani conforme iteramos. Nada de esto es código final todavía;
> es la "biblia" de la que sale la implementación.
>
> Regla suprema: **el cerebro de los ciudadanos es DETERMINISTA (sin LLM).**
> La IA generativa solo entra, en el futuro y de forma acotada, para la capa de
> **lenguaje libre**, y solo a través de los **Pioneros** (ver §10).

---

## 1. Visión y principios
- Domani es una **civilización digital** de ~10.000 ciudadanos-bot que **conviven**:
  juegan, comercian, trabajan, informan, socializan, ascienden — todo lo que haría
  un humano conectado. Un humano que entra debe sentir que llegó a un mundo vivo.
- **Autosostenible:** corre solo en el servidor (cron). Si el dueño no entra 9 días,
  vuelve y el mundo **creció** sin él.
- **El dinero, el respeto y el ascenso** son el motor: vivir como en la vida real,
  con matices, hasta llegar a tener gobiernos por ciudad y más.
- **Sin IA generativa en el cerebro.** Determinismo, evaluable, sin alucinaciones,
  sin latencia de red, barato a escala.

## 2. Arquitectura en 3 capas (Domani-first)
Los arquetipos **NO** son de un juego; son **formas de ser ciudadano de Domani**.
Un ciudadano = **un solo cerebro** que vive a nivel plataforma.

1. **El Cerebro (nivel Domani):** decide *qué hacer* cada tick (jugar, invertir,
   comprar, trabajar, socializar, descansar) — Utility AI + matrices.
2. **Las Habilidades (subsistemas que el cerebro invoca):** ajedrez (Minimax),
   póker (Nash/regret), bolsa, voz del chat, oficio. La **misma matriz** parametriza
   todas → una personalidad, muchas habilidades.
3. **El Mundo (donde caen los resultados):** economía, DDN News, escalafón, ciudades.

Consecuencia: el mismo "Tortox" juega ajedrez **y** póker **y** invierte **y** chatea,
y se comporta igual contra otro bot que contra un humano.

## 3. El Cerebro — Utility AI (IAUS)
Cada acción posible tiene **consideraciones** (ejes) que se normalizan a [0,1] y
pasan por **curvas de respuesta** (lineal / logística / gaussiana), se combinan con
**media geométrica** (regla del cero: si un eje es 0, la acción se poda).

Matrices por ciudadano (lo que define la personalidad):
- **Gustos:** afinidad a juego/casino, trabajo/invertir, social; juego favorito.
- **Fortalezas:** cognitivo (profundidad Minimax 2→7 en ajedrez, fuerza póker),
  financiero (spread/negociación), percepción.
- **Debilidades:** tilt, impaciencia, ludopatía/riesgo, fatiga.
- **Firma de tiempo:** rápido en lo obvio, se *tanquea* en lo crítico, pausas largas
  ocasionales. (Arregla el "todos contestan al instante".)
- **Voz + apodo:** banco de frases y estilo de nombre propio.
- **Oficio-ready:** un hueco para enchufar profesión (§7) sin reescribir nada.

Optimización: puntuación **aplazada** (cálculos baratos primero; los caros solo si
vale la pena) y procesamiento **entrelazado** (~1.000 ciudadanos por tick) para que
10.000 sea viable.

## 4. Los 10 arquetipos = "Los Pioneros"
Son **10 plantillas maestras**. Cada uno de los 10.000 hereda una **+ variación**.
Borrador de los 10:
1. **El Tiburón** — agresivo, listo, farolea, rápido y filoso.
2. **El Veterano / Abuelo** — lento, ajedrez profundo, paciente, se clava en lo difícil.
3. **El Pollo / Novato** — débil, impulsivo, cuelga piezas, charla ingenua.
4. **El Tilteado** — juega bien hasta que pierde y se descontrola.
5. **El Frío / Calculador** — metódico, posicional, parco.
6. **El Fanfarrón / Galán** — medio, farolea y enseña cartas, flashy.
7. **La Ludópata** — sobre-apuesta, persigue, nunca se retira.
8. **La Roca / Tacaño** — ultra-conservador, se retira mucho, cauto.
9. **El Errático / Loco** — impredecible, ritmos raros.
10. **El Don / Maestro** — élite (solo arriba), casi perfecto, pocas palabras.

Opcional: **10 personajes "estrella" con nombre propio** (uno por arquetipo) que la
gente reconoce, mientras el resto hereda el arquetipo con variación.

## 5. ¿Hasta dónde se humanizan? (el techo honesto)
- 🟢 **Conducta** (juego, economía, decisiones, ritmo): casi indistinguible, sin LLM.
  Minimax por fuerza + imperfección deliberada + timing humano + emergencia (tilt,
  fatiga, persecución, horarios).
- 🟡 **Lenguaje libre** (conversación abierta, prosa larga): con reglas llega a
  "banter convincente"; el salto fino es con IA generativa puntual — vía Pioneros.

## 6. Memoria y relaciones (¡desde el día 1!)
Lo que cuesta carísimo añadir tarde. Referente: **Nemesis System** (Shadow of Mordor).
- **Registro de eventos significativos** por ciudadano ("este me ganó", "le debo",
  "me humilló en la mesa").
- **Grafo de relaciones:** puntaje con otros ciudadanos **y con el humano** →
  rencores, revanchas, alianzas, lealtades. Con **decaimiento** en el tiempo.
- **El humano es especial:** te notan, recuerdan sus partidas contigo, tu riqueza,
  tu ciudad → trato personal.

## 7. Profesiones / oficios (capa sobre el cerebro)
Personalidad (cómo) y oficio (qué función) **se combinan**.
- 🟢 **Servicio:** cajeros del banco, vendedores del Mall, crupieres, meseros.
  Roles transaccionales con **salario** (lado de ingresos de la economía).
- 🟢 **Periodistas (alto impacto en DDN):** asignados a **secciones/beats**
  (deportes/juegos, economía, sociedad/farándula, legales/Hacienda). Cada uno mira
  los datos de su sección y **escribe el titular con su firma** ("Por Tortox").
- 🟡 **Universidad / desarrollo:** sistema de **progresión** — "estudian" y su matriz
  de fortalezas sube con el tiempo. Es progresión creíble, **no** aprendizaje abierto
  (eso es frontera de ML, lejano).
- El **dueño** controla desde la Sala de Control **cuántos** de cada oficio.

## 8. Checklist "que no se nos escape"
- Memoria + grafo de relaciones (§6).
- Metas de largo plazo (arco, no solo reaccionar) + estado emocional (ánimo/tilt).
- Ritmo de vida (husos, fatiga, sueño) + **ciclo de vida y relevo** (Sugarscape:
  se retiran/mueren y entran nuevos, con **herencia**).
- Tejido social: familias/clanes, amistades/rivalidades, **reputación** (cómo lo ven
  los demás vs cómo se ve él).
- Creíbilidad: varianza, imperfección, **nada de periodicidad perfecta** (anti-detección).
- Cimientos: **determinismo + semillas**, rendimiento entrelazado, **observabilidad
  desde la Sala de Control** (abrir un ciudadano y ver su cerebro/memoria/relaciones),
  seguridad económica (bucle cerrado + sumideros), marco legal/+18 (bots marcados
  internamente; juego limpio).

## 9. Referencias reales (probadas, sin hype)
- **Nemesis System (Shadow of Mordor, 2014):** memoria personal + rencores + ascenso.
- **Red Dead Redemption 2 (Rockstar):** NPC que recuerdan/reconocen/reaccionan.
- **Dwarf Fortress / RimWorld:** simulación emergente, relaciones, recuerdos, crisis.
- **Crusader Kings (Paradox):** rasgos, opiniones, intrigas, dinastías.
- **Sugarscape (Epstein & Axtell):** metabolismo, visión, max-age, regla de relevo.
- **Subasta Doble Continua (CDA):** precios emergentes (NYSE/NASDAQ) → economía.
- **Minimax + poda alfa-beta** (info perfecta) / **Nash + regret-matching** (póker).
- **Stanford Generative Agents (2023):** memoria + reflexión + planificación — frontera,
  **usa LLM** → es la "fase futura", no ahora.
- **EVE Online:** economía dirigida por agentes a escala masiva.

## 10. Los Pioneros = "El Círculo" — el puente a la IA generativa  ⭐ idea nueva
Los 10 arquetipos son **Los Pioneros**. Idea: que, en el futuro, **solo ellos**
(o algunos) sean los **únicos con acceso a la IA generativa**. Patrón clásico de
arquitectura: **agentes "oráculo / puente"**.

Cómo funciona:
- El **enjambre (10.000) sigue siendo determinista y barato**. Nunca llama al LLM.
- **Los Pioneros** (pocos) "viajan" al LLM ocasionalmente: traen **conocimiento**
  (estrategias nuevas, contenido, prosa, líneas de diálogo) y lo **destilan** en
  **artefactos deterministas** (bancos de frases, libros de aperturas, tablas de
  estrategia, plantillas de noticias, ajustes de config) que **propagan** al resto
  ("instalan" en los demás).
- En la ficción: **El Círculo** = la élite que "sabe cosas" y las reparte. Metáfora
  in-game perfecta de "actualizamos a los bots".
- También como **consejo al dueño:** los Pioneros **proponen mover los botones**
  (subir la renta, abrir una sala, lanzar un evento) en la Sala de Control, para que
  TÚ apruebes. "El Círculo recomienda…".

Guardarraíles (clave):
- Todo lo generativo pasa por **validación** antes de instalarse (nada que rompa la
  economía o el determinismo del cerebro).
- **Cambios grandes los aprueba el dueño**; límites de costo/frecuencia; **todo auditado**.
- El **cerebro nunca** depende del LLM en tiempo real; solo se alimentan las capas de
  **lenguaje/estrategia/contenido**, ya destiladas.

Beneficios: control de costo (10 que llaman al LLM, no 10.000), determinismo intacto,
seguridad/auditoría, y una **narrativa** poderosa (El Círculo como casta que trae el
fuego del conocimiento a la ciudad).

## 11. Fases de construcción (propuesta)
- **Fase 1 — El Cerebro:** 10 arquetipos (matrices) + **memoria/relaciones** +
  timing humano + nombres con apodos + voz; ajedrez y póker **leen el cerebro**;
  el motor de vida usa el cerebro (no azar). Observable desde la Sala de Control.
- **Fase 2 — Oficios:** profesiones, empezando por **periodistas** (alma de DDN) y
  roles de servicio (banco/Mall). Universidad/progresión.
- **Fase 3 — Economía profunda + Pioneros:** CDA / mercado, y el puente generativo de
  **El Círculo** (cuando haya humanos suficientes).

## 12. Decisiones tomadas
- Cerebro **Domani-first**, uno por ciudadano (no por juego).
- Sin LLM en el cerebro; LLM solo futuro, acotado, vía Pioneros.
- Memoria + relaciones desde la Fase 1.
- Personalidad (arquetipo) y oficio se **componen**.
- Parámetros del cerebro = **perillas de la Sala de Control** ("entrenar" = afinar y ver).
