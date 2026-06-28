# Técnicas de Animación Realista de Objetos Giratorios en Game Development
## Investigación Exhaustiva: Fórmulas, Valores Numéricos y Parámetros Técnicos

---

## 1. FÓRMULAS MATEMÁTICAS FUNDAMENTALES

### 1.1 Easing Functions (Funciones de Suavizado)

#### Ease-Out Quadratic
**Fórmula:** `f(t) = 1 - (1-t)²`
- **Rango:** t ∈ [0, 1]
- **Comportamiento:** Comienza rápido, termina lento
- **Uso:** UI transitions, menús, objetos que llegan a pantalla
- **Aplicación:** Animaciones donde el objeto se "asienta" naturalmente

#### Ease-Out Cubic  
**Fórmula:** `f(t) = 1 - (1-t)³`
- **Rango:** t ∈ [0, 1]
- **Comportamiento:** Más desaceleración que Quadratic
- **Peso percibido:** Mayor sensación de "inercia"
- **Uso:** Movimientos de cámara, recogida de objetos, saltos

#### Ease-Out Exponential
**Fórmula:** `f(t) = 1 - 2^(-10t)`
- **Decaimiento:** Muy rápido al inicio, gradual al final
- **Uso:** Animaciones que requieren impacto visual inmediato

#### Ease-Out Sine
**Fórmula:** `f(t) = sin(t * π/2)`
- **Suavidad:** Transición muy suave
- **Uso:** Animaciones que requieren elegancia visual

### 1.2 Cubic Bézier Curves (Curvas de Bézier Cúbicas)

**Formato:** `cubic-bezier(x1, y1, x2, y2)`
- **Puntos fijos:** (0,0) inicio y (1,1) fin
- **Puntos de control:** Dos puntos intermedios personalizables
- **Rango permitido:** x1, x2 ∈ [0,1], y1, y2 pueden ser > 1

**Presets estándar:**
- **ease-in:** `cubic-bezier(0.42, 0, 1, 1)`
- **ease-out:** `cubic-bezier(0, 0, 0.58, 1)`
- **ease-in-out:** `cubic-bezier(0.42, 0, 0.58, 1)`
- **ease:** `cubic-bezier(0.25, 0.1, 0.25, 1)`

**Eje Y (velocidad):** Línea más vertical = mayor aceleración en ese punto

### 1.3 Exponential Decay (Decaimiento Exponencial)

#### Fórmula general
**N(t) = N₀ × e^(-λt)**
- **N₀:** Velocidad angular inicial
- **λ:** Constante de decaimiento (lambda)
- **t:** Tiempo transcurrido
- **Comportamiento:** Cuanto mayor λ, más rápido el decaimiento

#### Fórmula alternativa (iterativa)
**v(n+1) = v(n) × decay_factor**
- **decay_factor:** Rango típico [0.94, 0.99]
- **Equivalencia:** decay_factor = (1-r), donde r es la tasa de decaimiento
- **Ejemplo:** velocity *= 0.96 equivale a un decaimiento del 4% por iteración

#### Relación con fricción
**decay_factor = 1 - friction_coefficient**
- friction = 0.04 → decay_factor = 0.96
- friction = 0.05 → decay_factor = 0.95
- friction = 0.03 → decay_factor = 0.97

---

## 2. PARÁMETROS TÉCNICOS ESPECÍFICOS

### 2.1 Duración de Animación

| Caso de Uso | Duración (ms) | Duración (s) | Observaciones |
|-------------|---------------|--------------|---------------|
| UI rápida | 300-500 | 0.3-0.5 | Respuesta inmediata |
| Rueda giratoria | 5000 | 5.0 | Implementación Flutter estándar |
| DOTween básico | 500-2000 | 0.5-2.0 | Rango típico recomendado |
| Animación suave | 1000 | 1.0 | Punto medio comúnmente usado |

### 2.2 Decay Factors (Factores de Decaimiento)

#### Valores típicos para animaciones de spin
| Decay Factor | Fricción equivalente | Uso típico |
|--------------|-------------------|-----------|
| 0.94 | 6% por frame | Decaimiento muy rápido |
| 0.95 | 5% por frame | Fricción moderada-alta |
| 0.96 | 4% por frame | Equilibrio estándar |
| 0.97 | 3% por frame | Fricción moderada |
| 0.98 | 2% por frame | Fricción leve |
| 0.99 | 1% por frame | Muy poco damping |

**Nota:** A 60 FPS, cada "frame" = ~16.67ms

### 2.3 Damping (Amortiguamiento)

#### Unreal Engine - Angular Damping
| Valor | Efecto |
|-------|--------|
| 0.0 | Sin amortiguamiento, rotación infinita |
| 1.0-5.0 | Efecto sustancial (pequeños valores) |
| 10.0 | Reducción rápida de rotación |
| 30.0 | Decaimiento muy rápido |
| 100.0 | Detenimiento prácticamente inmediato |

**Nota:** Incluso valores pequeños (0.5-2.0) pueden producir cambios significativos

#### Unreal Engine - Linear Damping
| Valor | Efecto |
|-------|--------|
| 0.0 | Sin resistencia translacional |
| 1.0 | Efecto leve |
| 30.0 | Resiste caída bajo gravedad estándar (9.8 m/s²) |
| 100.0 | Mínimo para detener movimiento con fuerzas aplicadas |

### 2.4 Friction Coefficients (Coeficientes de Fricción)

#### Simulación de pelotas (Ball Physics)
| Superficie/Material | Rango de fricción | Ejemplos |
|-------------------|------------------|----------|
| Tenis de mesa | 0.05 | Tabla: 0.05, Raqueta: 1.0 |
| Discos | 0.05-0.25 | Rango para colisiones |
| Soccer | 0.25 | Coeficiente de arrastre |
| Voleibol | 0.25 | Coeficiente de arrastre |
| Baloncesto | 0.25 | Coeficiente de arrastre |
| Balón de playa | 0.5 | Alto coeficiente de arrastre |

#### Rolling Friction (Fricción de rodamiento)
| Tipo | Valor | Aplicación |
|------|-------|-----------|
| Contacto estándar (Coulomb) | 0.2 | Valor comúnmente usado en simulaciones |
| Simulación de cubos | 0.3 | Pruebas de fricción |
| Bajo (superficies lisas) | 0.01-0.05 | Hielo, superficies pulidas |
| Medio | 0.05-0.1 | Madera, asfalto |
| Alto | > 0.1 | Superficies ásperas |

### 2.5 Restitution Coefficient (Coeficiente de Restitución)

| Tipo de pelota | Rango COR | Notas |
|----------------|-----------|-------|
| Pelota de goma estándar | 0.85-0.95 | Rebota casi a altura inicial |
| Pelota de tenis de mesa | 0.93 | En superficie de azulejo |
| Pelota de alta calidad | ~0.98 | Mínima pérdida de energía |
| Perfectamente elástico | 1.0 | Teórico (no existe en realidad) |
| Perfectamente inelástico | 0.0 | Sin rebote |

**Relación con bounce:** COR más alto = decaimiento más lento = más rebotes

---

## 3. IMPLEMENTACIÓN EN GAME ENGINES

### 3.1 Unity - DOTween

```csharp
// Sintaxis básica
transform.DOMove(targetPosition, duration: 0.5f)
    .SetEase(Ease.OutQuad);

// Ejemplos de duración
Ease.OutQuad          // Default ease-out
Ease.OutCubic         // Más desaceleración
Ease.OutExpo          // Muy rápido → lento
Ease.OutSine          // Suave y elegante

// Escala con easing
transform.DOScale(Vector3.one * 1.5f, 0.5f)
    .SetEase(Ease.InOutBack);
```

### 3.2 Phaser - 32 Easing Functions

**Disponibles:**
- Linear
- Quad (In, Out, InOut)
- Cubic (In, Out, InOut)
- Quart (In, Out, InOut)
- Quint (In, Out, InOut)
- Sine (In, Out, InOut)
- Expo (In, Out, InOut)
- Circ (In, Out, InOut)
- Back (In, Out, InOut)
- Bounce (In, Out, InOut)

**Nomenclatura:** `Phaser.Math.Easing.Quad.easeOut` o simplemente `Ease.OutQuad`

### 3.3 Unreal Engine - Physics Settings

```ini
[Physics]
LinearDamping = 0.0
AngularDamping = 0.0

; Para ruedas giratorias:
AngularDamping = 2.0-5.0  ; Fricción moderada
LinearDamping = 0.5-1.0   ; Resistencia translacional
```

### 3.4 GameMaker

```gml
// Easing con decaimiento iterativo
angular_velocity *= 0.96; // Cada frame

// O usando animation_scale
image_angle += angular_velocity;
angular_velocity *= decay_factor;
```

---

## 4. RUEDAS GIRATORIAS (SPINNING WHEELS) - IMPLEMENTACIÓN ESPECÍFICA

### 4.1 Deceleration Formula para Ruedas

**Fórmula estándar:** `a = -v² / (2d)`
- **a:** Desaceleración (rad/s²)
- **v:** Velocidad angular inicial (rad/s)
- **d:** Distancia de parada (radianes)

### 4.2 Two-Phase Deceleration Model

**Fase 1:** Desaceleración rápida (primeros ~50% de rotación)
- Deceleration rate: Alto (ej. decay_factor = 0.94)

**Fase 2:** Desaceleración gradual (últimos ~50%)
- Deceleration rate: Más leve (ej. decay_factor = 0.97-0.98)

### 4.3 Parámetros Implementación Flutter

```dart
// Duración de spin
spinDuration: 5000; // 5 segundos

// Velocidad inicial
spinVelocity: 10.0; // radianes/segundo

// Fricción/Damping
rotationResistance: 0.05; // O usar decay_factor 0.95
```

### 4.4 Easing Selection para Ruedas

**Recomendado:**
- `EasingSinOut` (default en muchas implementaciones)
- `EaseOutQuad` para control más rápido
- `EaseOutCubic` para sensación de "peso"
- Customizable según necesidad

---

## 5. POPMOTION - DECAY MOTION

### 5.1 Implementación de Decay

**Concepto:** Inertial Animation
- Comienza con última velocidad conocida
- Decae suavemente a cero
- Simula momentum real

**Fórmula:**
```
v(t) = v₀ × decay_constant^t
```

**Valores típicos de decay_constant:** 0.95-0.98

### 5.2 Momentum Scrolling Use Case

Particularmente útil para:
- Arrastrar y soltar (drag & drop)
- Scroll inercial
- Objetos que "coasting to stop"

---

## 6. COMPARATIVA DE VALORES REALISTAS POR CONTEXTO

### 6.1 Simulación Realista de Pelotas

**Parámetros óptimos (según investigación):**
1. Static Friction: 0.05-0.1
2. Dynamic Friction: 0.04-0.08
3. Restitution: 0.8-0.95
4. Linear Damping: 0.05-0.2
5. Angular Damping: 0.1-0.5

### 6.2 Animación de Objetos Giratorios (Gaming)

**Configuración estándar:**
- Decay factor: 0.96 (4% fricción por frame)
- Duration: 1.0-3.0 segundos
- Easing: EaseOutQuad o EaseOutCubic
- Angular Damping: 0.5-2.0

### 6.3 Rueda de Premios (Spinning Wheel)

**Configuración típica:**
- Duration: 3.0-5.0 segundos
- Decay rate: Fase 1 (0.94), Fase 2 (0.97)
- Easing: EasingSinOut
- Rotations: 3-10 revoluciones completas

---

## 7. FUENTES DE INVESTIGACIÓN

### Recursos Técnicos Principales

1. **Easing Functions and Animation**
   - Blog: [Easing Functions for Game Animations](https://blog.febucci.com/2018/08/easing-functions/)
   - Reference: [Easings.net](https://easings.net/)
   - CSS: [MDN cubic-bezier()](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/easing-function/cubic-bezier)

2. **Physics and Damping (Unreal Engine)**
   - [Physics Damping Documentation](https://dev.epicgames.com/documentation/unreal-engine/physics-damping-in-unreal-engine)
   - [Damping and Friction UE 4.27](https://dev.epicgames.com/documentation/en-us/unreal-engine/damping-and-friction?application_version=4.27)

3. **Collision and Friction Physics**
   - [Collision Response and Coulomb Friction](https://gafferongames.com/post/collision_response_and_coulomb_friction/)
   - [Box2D Simulation](https://box2d.org/documentation/md_simulation.html)

4. **Game Framework Documentation**
   - [Phaser 3 Easing](https://phaser.io/examples/v3.85.0/tweens/eases/view/ease-equations)
   - [DOTween Documentation](https://dotween.demigiant.com/documentation.php)
   - [GameMaker Physics](https://manual.gamemaker.io/lts/en/The_Asset_Editors/Object_Properties/Physics_Objects.htm)

5. **Ball Physics Simulation**
   - [Physics of Bouncing Balls](https://physicshub.github.io/blog/physics-bouncing-ball-comprehensive-educational-guide)
   - [Bouncing Ball Physics Theory](https://www.real-world-physics-problems.com/bouncing-ball-physics.html)
   - [Physics of Pool/Billiards](https://ekiefl.github.io/2020/04/24/pooltool-theory/)

6. **Spinning Wheel Physics**
   - [Roulette Wheel Deceleration Physics](https://www.physicsforums.com/threads/how-to-calculate-deceleration-of-a-spinning-roulette-wheel-and-ball.78163/)
   - [Spinning Wheel Flutter Tutorial](https://medium.com/koahealth/spinning-the-wheel-in-flutter-6bd129e9873c)
   - [Spin Wheel Component](https://github.com/CrazyTim/spin-wheel)

7. **Exponential Decay**
   - [Exponential Decay Formula](https://www.cuemath.com/exponential-decay-formula/)
   - [Popmotion Decay](https://popmotion.io/api/decay/)

8. **Bezier Curves and Animation**
   - [Cubic Bézier Curves Deep Dive](https://blog.maximeheckel.com/posts/cubic-bezier-from-math-to-motion/)
   - [Bezier Easing Implementation](https://github.com/gre/bezier-easing)

9. **Coefficient of Restitution**
   - [Understanding Coefficient of Restitution](https://www.oreateai.com/blog/understanding-the-coefficient-of-restitution-the-science-behind-bouncing-balls)
   - [Coefficient of Restitution Overview](https://www.samaterials.com/content/coefficient-of-restitution.html)

---

## 8. RESUMEN EJECUTIVO - VALORES CRÍTICOS

### Decay Factors Recomendados (por iteración)
- **Muy alto damping:** 0.92-0.94 (8-6% fricción)
- **Alto damping:** 0.95-0.96 (5-4% fricción)
- **Damping moderado:** 0.97-0.98 (3-2% fricción)
- **Bajo damping:** 0.99+ (< 1% fricción)

### Duración Típica de Animaciones
- **Fast:** 0.3-0.5 segundos (300-500 ms)
- **Standard:** 1.0 segundo (1000 ms)
- **Slow/Emphasis:** 2.0-5.0 segundos (2000-5000 ms)

### Easing Functions - Elección Rápida
- **UI/Menus:** QuadOut o SineOut
- **Juegos:** CubicOut o ExpoOut
- **Suave:** SineOut
- **Impactante:** ExpoOut o CubicOut

### Friction Coefficients - Referencia Rápida
- **Superficie suave (hielo):** 0.01-0.05
- **Superficie estándar (madera):** 0.05-0.1
- **Superficie áspera:** 0.1+
- **Contacto estándar (game physics):** 0.2

---

**Fecha de investigación:** Junio 2026
**Metodología:** 5 búsquedas paralelas + validación multi-fuente
**Cobertura:** Unreal Engine, Unity, Phaser, GameMaker, Flutter, CSS animations
