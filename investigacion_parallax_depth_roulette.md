# Investigación Exhaustiva: Parallax Scrolling y Depth Cuing para Ruletas Digitales

## 1. IMPLEMENTACIÓN DE PARALLAX EFFECT

### 1.1 Principios Fundamentales

El parallax scrolling es una técnica que crea ilusión de profundidad moviendo capas de fondo a velocidades diferentes. Cada capa más cercana al observador se desplaza más rápido que las capas más alejadas, replicando cómo percibimos la profundidad en el mundo real.

### 1.2 Fórmulas Matemáticas para Cálculo de Posiciones

**Fórmula Básica de Parallax:**
```
offset = progress × speed × range
```

**Fórmula con ScrollY:**
```
element.style.top = (fixedOffset + speedFactor × scrollY) + 'px'
```
- speedFactor típico: 0.5 (hace que el elemento se desplace 2 veces más lentamente)

**Velocidades Progresivas de Capas:**
- Capa 1: 10% (velocidad: 1/10)
- Capa 2: 30% (velocidad: 1/10 + 2/10)
- Capa 3: 70% (velocidad: 1/10 + 2/10 + 4/10)
- Capa 4: 100% (velocidad: 1)

**Regla de Velocidad Doblante:**
Cada capa más cercana al observador se mueve el doble de rápido que la capa detrás de ella.

**Fórmula de Profundidad Percibida:**
```
posiciónFinal = posiciónBase + (offsetScroll × factorProfundidad × 0.001)
```
donde factorProfundidad varía de 0.1 (lejano) a valores mayores para elementos cercanos.

**Para Rotación de Ruleta (Angular):**
```
ángulo = (2π / númeroDeSecciones) × índice
```
Ejemplo para ruleta con 38 espacios: `ángulo = (2π / 38) × índice`

### 1.3 Implementación en Canvas con JavaScript

**Estructura Básica:**
1. Crear múltiples capas de imagen
2. Asignar velocidades diferenciadas a cada capa
3. Actualizar posiciones en función del scroll/rotación
4. Usar drawImage() para renderizar cada capa con offset calculado

**Código de Ejemplo - Parallax Básico:**
```javascript
// Obtener contexto de canvas
const canvas = document.getElementById('parallaxCanvas');
const ctx = canvas.getContext('2d');

// Variables de capas
const layers = [
  { image: bgImage1, speed: 0.1, offsetX: 0 },
  { image: bgImage2, speed: 0.3, offsetY: 0 },
  { image: bgImage3, speed: 0.7, offsetY: 0 }
];

// Variables de scroll
let scrollY = 0;

// Listener para scroll
window.addEventListener('scroll', () => {
  scrollY = window.scrollY;
});

// Función de renderizado
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Renderizar cada capa
  layers.forEach(layer => {
    const offsetY = scrollY * layer.speed;
    // Si la imagen se sale de pantalla, reubicarla
    const position = offsetY % canvas.height;
    
    ctx.drawImage(layer.image, 0, position);
    ctx.drawImage(layer.image, 0, position - canvas.height);
  });
}

// Animar con requestAnimationFrame
function animate() {
  draw();
  requestAnimationFrame(animate);
}

animate();
```

---

## 2. DEPTH CUING TECHNIQUES (TÉCNICAS DE PROFUNDIDAD)

### 2.1 Perspectiva Atmosférica (Aerial Perspective)

La perspectiva atmosférica es una técnica artística donde objetos más lejanos tienen:
- **Color**: Más débil, desaturado, tendiendo hacia el color del cielo
- **Contraste**: Reducido debido a dispersión de luz
- **Claridad**: Menor nitidez/enfoque

**Implementación en Capas:**
- Capas alejadas: Aplicar blur ligero (2-4px Gaussian)
- Capas alejadas: Desaturación 10-20%
- Capas alejadas: Opacidad 0.8-0.9
- Capas cercanas: Sin blur, colores vibrantes, opacidad 1.0

### 2.2 Técnicas de Fog y Niebla

**Fog Lineal (Canvas/WebGL):**
```
fog_color = mix(objeto_color, fog_color_base, densidad_fog)
```
donde densidad varía linealmente entre near y far distances.

**Propiedades para CSS/Canvas:**
- `opacity`: 0.7 (máxima opacidad del fog 1.0)
- `filter: blur(40px)` (para efecto suave)
- `MaxFogFactor`: valor que controla opacidad máxima (0.0-1.0)

**Implementación Canvas para Fog:**
```javascript
// Aplicar fog a una capa
ctx.globalAlpha = 0.3; // 30% de opacidad para efecto fog
ctx.fillStyle = 'rgba(150, 150, 150, 0.5)'; // Color fog grisáceo
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.globalAlpha = 1.0; // Restaurar
```

### 2.3 Z-Index Layering Strategies

**Mejores Prácticas:**
1. **Orden de Renderizado**: De fondo a frente
   - Fondo (z-index: -3 o -100)
   - Capas medias (z-index: 0-50)
   - Frente (z-index: 100+)

2. **En Canvas**: El orden de drawImage() determina qué aparece enfrente
3. **En CSS 3D**: Usar `transform: translateZ()` para profundidad

**Estrategia para Ruleta:**
- Base de ruleta: z-index -1
- Capas de parallax de fondo: z-index -5 a -10
- Ruleta principal: z-index 0
- Elementos de UI: z-index 100+

---

## 3. IMPLEMENTACIONES CON CANVAS

### 3.1 Parallax Canvas Avanzado

**Características Clave:**
- Uso de múltiples capas de imagen
- Cálculo dinámico de posiciones basado en scroll/rotación
- Renderizado suave con requestAnimationFrame
- Optimización mediante offscreen canvas

### 3.2 Código Completo - Ruleta con Parallax

```javascript
class RoulettParallax {
  constructor(canvasId, layers) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.layers = layers;
    this.scrollY = 0;
    this.rotation = 0;
    
    // Offscreen canvas para caché
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = this.canvas.width;
    this.offscreenCanvas.height = this.canvas.height;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d');
    
    this.setupListeners();
  }
  
  setupListeners() {
    window.addEventListener('scroll', () => {
      this.scrollY = window.scrollY;
    });
  }
  
  drawLayer(layer, index) {
    // Calcular offset basado en profundidad
    const offset = this.scrollY * layer.speed;
    const scaleFactor = 1 + (layer.depth * 0.1); // Escalar según profundidad
    
    // Calcular posición
    const x = (this.canvas.width - layer.image.width * scaleFactor) / 2;
    const y = offset % this.canvas.height;
    
    // Aplicar depth cuing
    this.ctx.globalAlpha = layer.alpha || 1.0;
    if (layer.blur) {
      this.ctx.filter = `blur(${layer.blur}px)`;
    }
    
    // Renderizar
    this.ctx.save();
    this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.rotate(this.rotation);
    this.ctx.scale(scaleFactor, scaleFactor);
    this.ctx.drawImage(layer.image, x, y);
    this.ctx.restore();
    
    // Resetear propiedades
    this.ctx.globalAlpha = 1.0;
    this.ctx.filter = 'none';
  }
  
  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Renderizar capas de atrás a adelante
    this.layers.forEach((layer, index) => {
      this.drawLayer(layer, index);
    });
    
    requestAnimationFrame(() => this.animate());
  }
}

// Uso:
const layers = [
  {
    image: bgImage1,
    speed: 0.1,
    depth: -2,
    alpha: 0.7,
    blur: 4
  },
  {
    image: bgImage2,
    speed: 0.3,
    depth: -1,
    alpha: 0.85,
    blur: 2
  },
  {
    image: rouletteWheel,
    speed: 0.7,
    depth: 0,
    alpha: 1.0,
    blur: 0
  }
];

const roulette = new RoulettParallax('canvas', layers);
roulette.animate();
```

### 3.3 Optimizaciones de Canvas

**Caché con Offscreen Canvas:**
```javascript
// Pre-renderizar capas estáticas en offscreen canvas
this.offscreenCtx.drawImage(layer.image, 0, 0);
// Luego solo copiar a canvas principal
this.ctx.drawImage(this.offscreenCanvas, 0, 0);
```

**Layered Canvas Approach:**
```html
<!-- Usar múltiples canvas: uno para cada capa -->
<canvas id="bgCanvas" style="position: fixed; z-index: -1;"></canvas>
<canvas id="parallaxCanvas" style="position: relative; z-index: 0;"></canvas>
<canvas id="uiCanvas" style="position: relative; z-index: 100;"></canvas>
```

---

## 4. IMPLEMENTACIONES CON CSS

### 4.1 CSS Parallax con Perspective 3D

**Propiedades Esenciales:**
```css
.parallax-container {
  height: 100vh;
  overflow-y: auto;
  perspective: 1px; /* Clave para efecto 3D */
  transform-style: preserve-3d; /* Habilita renderizado 3D */
}

.parallax-layer {
  /* Layers más alejados usan translateZ negativo y scale */
  transform: translateZ(-2px) scale(3); /* Factor: (1 / (1 - (px / perspective))) */
}
```

**Fórmula de Scale para Layers:**
```
scale = 1 / (1 - (translateZ / perspective))
```
Ejemplo: translateZ(-2px) con perspective(1px) → scale(3)

### 4.2 Código CSS Completo

```css
/* Contenedor principal */
.roulette-parallax {
  height: 100vh;
  overflow-y: auto;
  perspective: 1px;
  transform-style: preserve-3d;
  position: relative;
}

/* Capas de parallax */
.parallax-back {
  /* Fondo muy lejano */
  transform: translateZ(-3px) scale(4);
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  opacity: 0.6;
  filter: blur(3px);
}

.parallax-middle {
  /* Capa media */
  transform: translateZ(-1px) scale(2);
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  opacity: 0.8;
  filter: blur(1px);
}

.parallax-front {
  /* Frente - ruleta principal */
  transform: translateZ(0px) scale(1);
  position: relative;
  z-index: 10;
}

/* Efecto de fog/profundidad */
.parallax-fog {
  transform: translateZ(-0.5px) scale(1.5);
  position: fixed;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0),
    rgba(150, 150, 150, 0.3)
  );
  pointer-events: none;
}
```

**HTML Correspondiente:**
```html
<div class="roulette-parallax">
  <div class="parallax-back">
    <img src="background-distant.jpg" alt="Fondo">
  </div>
  <div class="parallax-fog"></div>
  <div class="parallax-middle">
    <img src="background-mid.jpg" alt="Capa Media">
  </div>
  <div class="parallax-front">
    <canvas id="rouletteCanvas"></canvas>
  </div>
</div>
```

### 4.3 Parallax Basado en Scroll con CSS y JavaScript

```javascript
// Detectar scroll y aplicar parallax dinámico
const parallaxLayers = document.querySelectorAll('[data-parallax-speed]');

window.addEventListener('scroll', () => {
  const scrollY = window.scrollY;
  
  parallaxLayers.forEach(layer => {
    const speed = parseFloat(layer.dataset.parallaxSpeed);
    const offset = scrollY * speed;
    
    layer.style.transform = `translateY(${offset}px)`;
  });
});
```

```html
<div class="parallax-front" data-parallax-speed="0.1">Front Layer</div>
<div class="parallax-middle" data-parallax-speed="0.3">Middle Layer</div>
<div class="parallax-back" data-parallax-speed="0.7">Back Layer</div>
```

---

## 5. TÉCNICAS DE GAME DEVELOPMENT

### 5.1 Rotación de Ruleta con Parallax

**Fórmula de Rotación Acelerada:**
```
ángulo(t) = ω₀ × t - 0.5 × α × t²
```
donde:
- ω₀ = velocidad angular inicial (rad/s)
- α = aceleración angular negativa (desaceleración)
- t = tiempo (segundos)

**Fórmula de Desaceleración:**
```
α_wheel = -v_wheel² / (2 × d_wheel)
```
donde:
- v_wheel = velocidad inicial de la rueda
- d_wheel = distancia de parada

**Implementación JavaScript:**
```javascript
class RouletteWheel {
  constructor(canvas, numSlots = 38) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.numSlots = numSlots;
    this.anglePerSlot = (2 * Math.PI) / numSlots;
    
    this.currentRotation = 0;
    this.angularVelocity = 0;
    this.angularDeceleration = 0;
    this.isSpinning = false;
  }
  
  spin(targetSlot) {
    const targetAngle = targetSlot * this.anglePerSlot;
    const totalRotation = (10 * Math.PI * 2) + targetAngle; // 10 rotaciones + target
    
    // Calcular velocidad inicial para decelerar en la distancia calculada
    const decelerationRate = 0.02; // rad/s²
    this.angularVelocity = Math.sqrt(2 * decelerationRate * totalRotation);
    this.angularDeceleration = decelerationRate;
    this.isSpinning = true;
  }
  
  update() {
    if (!this.isSpinning) return;
    
    // Aplicar desaceleración
    this.angularVelocity -= this.angularDeceleration;
    
    if (this.angularVelocity <= 0) {
      this.angularVelocity = 0;
      this.isSpinning = false;
    }
    
    // Actualizar rotación
    this.currentRotation += this.angularVelocity;
  }
  
  draw() {
    this.ctx.save();
    this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.rotate(this.currentRotation);
    
    // Dibujar rueda
    this.drawSlots();
    
    this.ctx.restore();
  }
  
  drawSlots() {
    // Dibujar cada sección de la ruleta
    for (let i = 0; i < this.numSlots; i++) {
      const angle = i * this.anglePerSlot;
      
      // Guardar contexto
      this.ctx.save();
      this.ctx.rotate(angle);
      
      // Dibujar sección
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.arc(0, 0, 150, 0, this.anglePerSlot);
      this.ctx.lineTo(0, 0);
      
      // Color alternado
      this.ctx.fillStyle = i % 2 === 0 ? '#FF0000' : '#000000';
      this.ctx.fill();
      
      // Número
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = 'bold 14px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(i, 0, -120);
      
      this.ctx.restore();
    }
  }
}

// Uso
const roulette = new RouletteWheel(canvas, 38);

document.getElementById('spinButton').addEventListener('click', () => {
  const targetSlot = Math.floor(Math.random() * 38);
  roulette.spin(targetSlot);
});

function animate() {
  roulette.update();
  roulette.draw();
  requestAnimationFrame(animate);
}

animate();
```

### 5.2 Capas Parallax Dinámicas en Ruleta

```javascript
class RoulettWithParallax extends RouletteWheel {
  constructor(canvas, parallaxLayers, numSlots = 38) {
    super(canvas, numSlots);
    this.parallaxLayers = parallaxLayers;
  }
  
  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Renderizar capas de parallax primero
    this.parallaxLayers.forEach(layer => {
      // Calcular offset basado en rotación de la ruleta
      const layerRotation = this.currentRotation * layer.speed;
      
      this.ctx.save();
      this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
      this.ctx.rotate(layerRotation);
      this.ctx.globalAlpha = layer.alpha;
      this.ctx.filter = layer.blur ? `blur(${layer.blur}px)` : 'none';
      
      // Dibujar capa
      this.ctx.drawImage(layer.image, -layer.image.width/2, -layer.image.height/2);
      
      this.ctx.restore();
    });
    
    // Renderizar ruleta principal
    super.draw();
  }
}
```

---

## 6. OPTIMIZACIONES DE PERFORMANCE

### 6.1 Técnicas para Canvas

**1. Usar requestAnimationFrame:**
```javascript
// Bueno: Sincroniza con ciclo de renderizado del navegador
function animate() {
  update();
  draw();
  requestAnimationFrame(animate);
}

// Evitar: setInterval causa desincronización
setInterval(animate, 16); // NO hacer esto
```

**2. Offscreen Canvas:**
```javascript
// Para elementos estáticos, pre-renderizar en offscreen
const offscreenCanvas = document.createElement('canvas');
const offscreenCtx = offscreenCanvas.getContext('2d');

// Pre-renderizar fondo
offscreenCtx.drawImage(bgImage, 0, 0);

// En loop de animación: solo copiar
ctx.drawImage(offscreenCanvas, 0, 0);
```

**3. Layered Canvas:**
```html
<!-- Canvas para fondos (bajo Z-index) -->
<canvas id="bgCanvas" style="position: fixed; z-index: -1;"></canvas>

<!-- Canvas para parallax dinámica -->
<canvas id="parallaxCanvas" style="position: fixed; z-index: 0;"></canvas>

<!-- Canvas para ruleta -->
<canvas id="rouletteCanvas" style="position: relative; z-index: 50;"></canvas>

<!-- Canvas para UI -->
<canvas id="uiCanvas" style="position: fixed; z-index: 100;"></canvas>
```

**4. Minimizar Cambios de State:**
```javascript
// Malo: Cambiar fillStyle múltiples veces
ctx.fillStyle = '#FF0000'; ctx.fillRect(0, 0, 100, 100);
ctx.fillStyle = '#00FF00'; ctx.fillRect(110, 0, 100, 100);

// Bueno: Agrupar por color
ctx.fillStyle = '#FF0000';
ctx.fillRect(0, 0, 100, 100);
ctx.fillRect(200, 0, 100, 100);

ctx.fillStyle = '#00FF00';
ctx.fillRect(110, 0, 100, 100);
ctx.fillRect(310, 0, 100, 100);
```

**5. Solo Usar Propiedades Acelerables:**
```css
/* Bueno: Acelerado por GPU */
transform: translate3d(x, y, z);
transform: scale(n);
transform: rotate(θ);
opacity: n;

/* Evitar: Requiere repaint completo */
top: npx;
left: npx;
width: npx;
height: npx;
```

### 6.2 Rendimiento en Móvil

**Estrategias de Optimización:**
1. **Canvas > DOM**: Canvas es mucho más eficiente que renderizar cientos de divs
2. **Throttling**: Limitar eventos de scroll
3. **Resolución Adapativa**: Ajustar resolución de canvas según dispositivo
4. **Respeto a Preferencias**: Detectar `prefers-reduced-motion`

```javascript
// Throttle scroll events
let lastScroll = 0;
const throttleDelay = 16; // ~60fps

window.addEventListener('scroll', () => {
  const now = Date.now();
  if (now - lastScroll > throttleDelay) {
    // Actualizar parallax
    updateParallax();
    lastScroll = now;
  }
});

// Detectar preferencia de movimiento reducido
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
if (prefersReducedMotion.matches) {
  // Desactivar animaciones o usar versión simplificada
  disableParallax();
}

// Resolución adaptativa
function setCanvasResolution() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.scale(dpr, dpr);
}

setCanvasResolution();
window.addEventListener('resize', setCanvasResolution);
```

**Resultados Antes/Después:**
- Antes: 20-30 fps en móvil con caídas frecuentes
- Después: 60 fps consistente en móvil, 60-120 fps en desktop

### 6.3 Efectos de Blur: CPU vs GPU

**ADVERTENCIA: Blur en Canvas es MUY Lento**
```javascript
// Malo: Causa extreme lag (5-10 fps)
ctx.filter = 'blur(4px)';
ctx.drawImage(image, 0, 0);

// Mejor: Usar fog/opacity en lugar de blur
ctx.globalAlpha = 0.7; // Más rápido
ctx.drawImage(image, 0, 0);
ctx.globalAlpha = 1.0;
```

**Alternativa con Shaders (WebGL):**
```javascript
// Para blur real, usar WebGL en lugar de Canvas 2D
const gl = canvas.getContext('webgl');
// ... implementar Gaussian blur con shaders
```

---

## 7. LIBRERÍAS RECOMENDADAS

### 7.1 Canvas
- **Canvallax** (5.8kb minified, 2.1kb gzipped)
  - URL: https://github.com/shshaw/Canvallax
  - Características: Parallax, distance/scaling, shapes, layering
  - Ejemplo:
    ```javascript
    var myCanvallax = Canvallax();
    var img = Canvallax.Image('image.jpg');
    myCanvallax.add(img);
    ```

- **Konva.js**
  - URL: https://konvajs.org
  - Características: Shape caching, performance optimization

### 7.2 3D / WebGL
- **Three.js**
  - Para ruletas 3D complejas con física
  - Repositorio ejemplo: https://github.com/eknowles/roulette-ts (Three.js + TypeScript)
  - Integración con bibliotecas de física (Cannon.js)

- **Babylon.js**
  - Parallax Mapping built-in
  - Documentación: https://doc.babylonjs.com/features/featuresDeepDive/materials/using/parallaxMapping

- **Pixi.js**
  - Optimizado para parallax scrolling en juegos 2D
  - URL: https://www.pixijs.com
  - TillingSprite para parallax eficiente

### 7.3 Frameworks y Utilidades
- **Motion/Framer Motion**: Para animaciones scroll-linked
- **GSAP**: Timeline animations con parallax
- **Rive**: Animaciones interactivas

---

## 8. BEST PRACTICES CONSOLIDADAS

### 8.1 Arquitectura de Proyecto

```
proyecto-ruleta/
├── js/
│   ├── core/
│   │   ├── canvas-parallax.js (clase base)
│   │   └── roulette-wheel.js (lógica de ruleta)
│   ├── effects/
│   │   ├── depth-cuing.js (perspectiva atmosférica)
│   │   └── fog-effect.js (efecto niebla)
│   └── utils/
│       ├── performance.js (throttle, rAF)
│       └── math.js (fórmulas de parallax/rotación)
├── css/
│   ├── parallax-3d.css
│   └── layers.css
└── assets/
    └── layers/ (imágenes de parallax)
```

### 8.2 Checklist de Implementación

- [ ] **Parallax**: Asignar velocidades diferentes (0.1, 0.3, 0.7, 1.0)
- [ ] **Depth Cuing**: Aplicar blur progresivo y desaturación
- [ ] **Z-Index**: Ordenar capas correctamente (negativo a positivo)
- [ ] **Canvas**: Usar offscreen para caché de elementos estáticos
- [ ] **Optimización**: Implementar requestAnimationFrame y throttling
- [ ] **Móvil**: Probar en dispositivos reales, respetar prefers-reduced-motion
- [ ] **Performance**: Evitar blur en canvas, usar GPU acceleration
- [ ] **Accesibilidad**: Alternativa sin parallax para usuarios con problemas de movimiento

### 8.3 Recursos Técnicos Clave

**MDN Web Docs:**
- Canvas API: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas
- CSS 3D Transforms: https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Transforms/Using
- CanvasRenderingContext2D.filter: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/filter

**Web.dev (Google):**
- Canvas Performance: https://web.dev/canvas-performance/
- OffscreenCanvas: https://developers.google.com/web/updates/2018/08/offscreen-canvas

**W3C Standards:**
- CSS 3D Transforms: https://www.w3schools.com/css/css3_3dtransforms.asp
- transform-style: preserve-3d

---

## 9. FÓRMULAS COMPLETAS DE REFERENCIA

### Parallax
```
offset = progress × speed × range
element.top = fixedOffset + speedFactor × scrollY
finalPosition = basePosition + (scrollOffset × depthFactor × 0.001)
scale = 1 / (1 - (translateZ / perspective))
```

### Rotación de Ruleta
```
ángulo = (2π / numSlots) × índiceSlot
ángulo(t) = ω₀ × t - 0.5 × α × t²
α = -v² / (2 × d)
deceleration₁ = (X₂ - B₂) / (2 × Y)
```

### Profundidad
```
fog_opacity = 1.0 - (distancia / maxDistancia)
blur_amount = distancia × blur_factor
opacity = 0.7 + (0.3 × (1 - normalized_depth))
```

---

## 10. CONCLUSIONES Y RECOMENDACIONES

**Para Ruletas Digitales con Parallax Avanzado:**

1. **Arquitectura Recomendada**: Canvas + CSS 3D híbrida
   - Canvas para ruleta principal (mejor control)
   - CSS 3D para capas de parallax estáticas (eficiencia)
   - Separar capas en múltiples canvas si es necesario

2. **Performance Priority**:
   - Móvil: Canvas > DOM, offscreen caching obligatorio
   - Desktop: Puedes permitirte más complejidad

3. **Depth Cuing**: Prioridad en:
   - Blur progresivo (Gaussian preferible en shaders/WebGL)
   - Desaturación de capas lejanas
   - Opacidad variable
   - Evitar blur en Canvas 2D (usar fog/opacity en su lugar)

4. **Rotación Suave**: Implementar desaceleración gradual con fórmulas de cinemática

5. **Librerías**: Considerar Three.js si necesitas 3D compleja, sino Canvas puro + CSS

