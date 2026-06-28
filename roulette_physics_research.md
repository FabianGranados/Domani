# INVESTIGACIÓN: FÍSICA TÉCNICA DE RULETAS
## Fuentes: Código abierto educativo y análisis técnico

---

## 1. VELOCIDAD Y DESACELERACIÓN DE LA BOLA

### Datos extraídos del simulador "Metaincognita Roulette" (MIT License)

**Revoluciones de la bola:**
- Rango típico: **7-13 revoluciones completas** (ballRevs = 7 + rng() * 6)
- Dato de regulación: Mínimo **≥4 revoluciones** (requerimiento regulatorio de Arizona/Colorado)
- Fuente: `physics.ts` línea: `const ballRevs = 7 + rng() * 6`

**Revoluciones de la rueda (rotor):**
- Rango típico: **3-8 revoluciones** (rotorRevs = 3 + rng() * 5)
- Fuente: `physics.ts` línea: `const rotorRevs = 3 + rng() * 5`

**Tipo de desaceleración:**
- Modelo: Lineal/uniforme en el espacio de "turns" (fracciones de revolución)
- La bola y rotor avanzan de forma lineal a velocidades constantes en el modelo
- No hay curva exponencial explícita en el modelo reducido
- Fuente: Modelo de reducción de orden en `physics.ts`

**Conclusión sobre desaceleración:**
- El modelo de Metaincognita usa desaceleración implícita mediante probabilidad
- No modela explícitamente la aceleración negativa (m/s²)
- La variabilidad viene de: rng() aleatorios, distribución de diamantes, scatter de frets

---

## 2. ROTACIÓN OPUESTA RUEDA VS BOLA

### Confirmación técnica

**Sí, la rueda gira en dirección opuesta:**
- Mencionado en README: "The ball is spun **opposite** the rotor by regulation"
- En el modelo: `dropTurn` y `rotorTurn` son valores separados que se restan
- Fuente: `physics.ts` línea: `const rel = frac(dropTurn - rotorTurn + scatter)`

**Implementación del modelo:**
```
drop_turn = fracción donde bola sale de pista (0-1)
rotor_turn = fracción de rotación de rueda (0-1)
relative_angle = drop_turn - rotor_turn (+ scatter)
pocket = floor(relative_angle * N) % N
```

**Independencia:**
- dropTurn y rotorTurn son **independientes**
- Cada uno es uniforme sobre [0,1]
- Su diferencia (modulo 1) produce distribución uniforme de bolsillos
- Esto es **verificado** mediante prueba χ² en 1,000,000 spins

---

## 3. REBOTES EN DIAMANTES (DEFLECTORES)

### Modelo de colisión

**Localización de diamantes:**
- 8 diamantes distribuidos alrededor de la pista
- Posición: `diamond = Math.round(dropTurn * 8) / 8`
- Esto coloca diamantes cada 45 grados (360°/8 = 45°)
- Fuente: `physics.ts`

**Efecto de colisión:**
```
dropTurn = diamond + (dropTurn - diamond) * 0.55 + (rng() - 0.5) * 0.05
```

- La bola es "atraída" hacia el diamante más cercano: `diamond + ...`
- Factor de atracción: **0.55** (55% de la distancia al diamante)
- Ruido post-rebote: ±0.05 turns (~±1 bolsillo de incertidumbre)
- Fuente: `physics.ts`

**Interpretación física:**
- El rebote es **inelástico** (no devuelve la bola al estado anterior)
- Coeficiente de restitución implícito: ~0.45 (la bola retiene 45% de "momentum" angular en dirección original)
- El rebote mueve la bola típicamente 1-2 bolsillos (scatter = 2.5/N)
- Fuente: `const scatter = (rng() - 0.5) * (2.5 / N)`

---

## 4. SEPARADORES (FRETS)

### Función en el asentamiento

**Scatter de frets:**
- Variación típica: **±1 bolsillo** (fret scatter)
- Cálculo: `scatter = (rng() - 0.5) * (2.5 / N)`
- Para ruleta de 37 bolsillos: ±2.5/37 = ±0.0676 turns ≈ ±1.35 bolsillos
- Para ruleta de 38 bolsillos: ±2.5/38 = ±0.0658 turns ≈ ±1.25 bolsillos

**Efecto en resultado:**
- Los frets introducen **variabilidad aleatoria** ~±1 bolsillo
- No es determinístico; es probabilístico
- Ayuda a mantener la uniformidad estadística
- Fuente: `physics.ts`

---

## 5. DESCENSO DE LA PISTA EXTERIOR

**No modelado explícitamente:**
- El simulador Metaincognita usa modelo de "reduced order"
- No simula la transición gradual de pista exterior a rueda interior
- Asume que una vez que dropTurn ocurre, la bola entra en la zona de bolsillos
- La realidad: proceso gradual de ralentización y transición

**En la realidad física:**
- La pista exterior tiene inclinación (varios grados)
- La bola desciende mediante fricción y gravedad
- Tiempo típico de descenso: variable, pero <1 segundo en total
- No hay datos específicos en el código

---

## 6. TIEMPOS DE RONDA

**Datos en el simulador:**
- No hay constantes de tiempo explícitas en `physics.ts`
- El modelo es **determinístico**, no basado en tiempo real
- Los tiempos se implementan en capa de animación (Vue/Canvas)

**Componentes típicos (basado en análisis de ruleta profesional):**
- **Fase 1: Lanzamiento**: 1-2 segundos
- **Fase 2: Giro principal** (bola + rueda): 3-8 segundos
- **Fase 3: Desaceleración + descenso**: 2-5 segundos
- **Fase 4: Asentamiento + rebotes**: 1-3 segundos
- **TOTAL típico**: 7-18 segundos

---

## 7. REBOTES FINALES

**Número de rebotes:**
- No modelado explícitamente en `physics.ts`
- El scatter de frets (~±1 bolsillo) es el único "rebote" modelado
- En la realidad: 2-5 rebotes en separadores (frets)

**Coeficiente de restitución en bolsillo:**
- No hay datos específicos en código
- La bola típicamente queda contenida tras 2-3 rebotes
- Coeficiente estimado: 0.3-0.5 (muy inelástico)

---

## 8. PRUEBAS DE FAIRNESS (χ²)

**Comprobación de uniformidad:**
- 1,000,000 spins en cada configuración
- Distribución esperada: Uniforme (1/37 o 1/38 por bolsillo)
- Resultado: χ² muy por debajo del valor crítico
- Conclusión: **La física es fair**

**Convergencia de house edge:**
- European (single-zero): **2.70%** teoría vs empírico ✓
- American (double-zero): **5.26%** teoría vs empírico ✓
- American First Five: **7.89%** teoría vs empírico ✓
- En Prison / La Partage: **1.35%** teoría vs empírico ✓

---

## RESUMEN TÉCNICO CUANTITATIVO

| Parámetro | Valor | Unidad | Fuente |
|-----------|-------|--------|--------|
| Revoluciones bola | 7-13 | revs | physics.ts |
| Revoluciones rotor | 3-8 | revs | physics.ts |
| Diamantes | 8 | unidades | physics.ts |
| Ángulo entre diamantes | 45 | grados | 360/8 |
| Factor atracción diamante | 0.55 | ratio | physics.ts |
| Ruido post-rebote | ±0.05 | turns | physics.ts |
| Scatter de frets | ±1.35 | bolsillos | 2.5/37 |
| Uniformidad χ² | <CV | - | sim.test.ts |
| House edge (EU) | 2.70 | % | Regulación AZ |
| House edge (US) | 5.26 | % | Regulación CO |
| Revoluciones mín (regl) | 4 | revs | AZ/CO rules |

---

## FUENTES PRIMARIAS

1. **cschweda/metaincognita-roulette** (MIT License)
   - Repositorio: https://github.com/cschweda/metaincognita-roulette
   - Archivo físicas: `app/engine/physics.ts`
   - Tests: `app/engine/physics.test.ts`, `app/engine/sim.test.ts`
   - Documentación: README.md

2. **Regulaciones citadas:**
   - Arizona: Appendix F(5), Tribal-State Gaming Compact
   - Colorado: Limited Gaming Rule 22
   - Victoria (Australia): Crown Melbourne Roulette Rules v10.0

3. **Proyecto educativo:**
   - Objetivo: Enseñar matemáticas y probabilidad de ruleta
   - Single-player, sin dinero real
   - Completamente de código abierto y transparent

---

## NOTAS IMPORTANTES

1. **Modelo reducido**: Metaincognita usa "reduced-order forward model", no simulación física detallada
   - Ignora: fricción explícita, fuerzas Coriolis, dinámicas 3D
   - Captura: independencia entre bola y rueda, distribución uniforme

2. **Validación estatística**: La uniformidad se valida mediante:
   - χ² test de bondad de ajuste
   - Convergencia de house edge a valores teóricos
   - 1,000,000 spins de prueba

3. **Propósito educativo**: El código es parte de suite de simuladores didácticos
   - No es herramienta de predicción
   - No es para advantage play
   - Es para aprender por qué el juego es "justo" pero tienes desventaja

