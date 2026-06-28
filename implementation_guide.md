# GUÍA DE IMPLEMENTACIÓN: Motion Blur para Ruletas Digitales

## PARTE 1: SETUP Y DETECCIÓN DE CAPABILITIES

```javascript
class RouletteMotionBlur {
    static detectCapabilities() {
        const capabilities = {
            webgl: this.hasWebGL(),
            canvas: this.hasCanvas2D(),
            cssFilters: this.hasCSSFilters(),
            requestAnimationFrame: typeof requestAnimationFrame !== 'undefined',
            webWorkers: typeof Worker !== 'undefined'
        };
        
        return capabilities;
    }
    
    static hasWebGL() {
        try {
            const canvas = document.createElement('canvas');
            return !!(
                window.WebGLRenderingContext && 
                (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
            );
        } catch(e) {
            return false;
        }
    }
    
    static hasCanvas2D() {
        try {
            const canvas = document.createElement('canvas');
            return !!(canvas.getContext('2d'));
        } catch(e) {
            return false;
        }
    }
    
    static hasCSSFilters() {
        const el = document.createElement('div');
        el.style.filter = 'blur(1px)';
        return el.style.filter !== '';
    }
}
```

---

## PARTE 2: IMPLEMENTACIÓN CANVAS 2D (RECOMENDADO)

### Clase Principal:
```javascript
class CanvasMotionBlurWheel {
    constructor(config) {
        this.canvas = config.canvas || document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.wheelImage = config.wheelImage;
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
        
        // Parámetros de animación
        this.rotation = 0;
        this.targetRotation = 0;
        this.angularVelocity = 0;
        this.duration = 0;
        this.startTime = null;
        
        // Motion blur config
        this.blurSamples = config.blurSamples || 5;
        this.blurStrength = config.blurStrength || 0.2;
        this.lastTime = performance.now();
        this.isAnimating = false;
    }
    
    spin(finalRotation, duration) {
        this.targetRotation = finalRotation;
        this.duration = duration;
        this.startTime = performance.now();
        this.isAnimating = true;
    }
    
    update(currentTime = performance.now()) {
        if (!this.isAnimating) return;
        
        const elapsed = currentTime - this.startTime;
        const progress = Math.min(elapsed / this.duration, 1);
        
        // Usar cubic-bezier ease-out: 1 - (1-t)^3
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        // Calcular rotación actual
        const prevRotation = this.rotation;
        this.rotation = this.targetRotation * easeProgress;
        
        // Calcular velocidad angular (rad/s)
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.angularVelocity = (this.rotation - prevRotation) / deltaTime;
        
        this.lastTime = currentTime;
        
        if (progress >= 1) {
            this.isAnimating = false;
            this.angularVelocity = 0;
        }
    }
    
    render() {
        // Limpiar canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Renderizar motion blur (frames históricos con opacidad decreciente)
        for (let i = 0; i < this.blurSamples; i++) {
            // Calcular opacidad: decreciente hacia atrás
            const opacity = (1 - (i / this.blurSamples)) * this.blurStrength;
            
            // Calcular ángulo en frame histórico
            // Usar ~16ms (1 frame a 60fps) como delta
            const frameDelay = (i * 16) / 1000;  // Convertir a segundos
            const blurRotation = this.rotation - (this.angularVelocity * frameDelay);
            
            this.ctx.globalAlpha = opacity;
            this.drawWheelAtRotation(blurRotation);
        }
        
        // Renderizar frame actual con opacidad completa
        this.ctx.globalAlpha = 1.0;
        this.drawWheelAtRotation(this.rotation);
    }
    
    drawWheelAtRotation(angle) {
        this.ctx.save();
        this.ctx.translate(this.centerX, this.centerY);
        this.ctx.rotate(angle);
        
        // Dibujar imagen centrada
        const w = this.wheelImage.width;
        const h = this.wheelImage.height;
        this.ctx.drawImage(this.wheelImage, -w/2, -h/2, w, h);
        
        this.ctx.restore();
    }
    
    animate() {
        this.update();
        this.render();
        
        if (this.isAnimating) {
            requestAnimationFrame(() => this.animate());
        }
    }
}
```

### Uso:
```javascript
// Inicializar
const wheel = new CanvasMotionBlurWheel({
    canvas: document.getElementById('roulette-canvas'),
    wheelImage: wheelImg,
    blurSamples: 6,
    blurStrength: 0.25
});

// Iniciar animación
wheel.spin(Math.PI * 4 + Math.PI/3, 4000);  // 4 vueltas + 60°, en 4 segundos
wheel.animate();
```

---

## PARTE 3: OPTIMIZACIONES CRÍTICAS

### 3.1 Lazy Blur (Solo aplicar si hay velocidad)
```javascript
render() {
    // Solo aplicar motion blur si la velocidad es significativa
    const velocityThreshold = 0.5;  // rad/s mínimo
    
    if (Math.abs(this.angularVelocity) > velocityThreshold) {
        this.renderWithMotionBlur();
    } else {
        // Renderizado simple sin blur
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.globalAlpha = 1.0;
        this.drawWheelAtRotation(this.rotation);
    }
}
```

### 3.2 Adaptive Blur Samples (Según dispositivo)
```javascript
constructor(config) {
    // ... código anterior ...
    
    // Detectar mobile vs desktop
    const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
    this.blurSamples = isMobile ? 3 : (config.blurSamples || 5);
}
```

### 3.3 OffScreen Canvas (Para rendimiento)
```javascript
constructor(config) {
    // Canvas principal para display
    this.canvas = config.canvas;
    this.ctx = this.canvas.getContext('2d');
    
    // OffScreen canvas para precalcular frames
    this.offscreenCanvas = new OffscreenCanvas(this.canvas.width, this.canvas.height);
    this.offCtx = this.offscreenCanvas.getContext('2d');
}

render() {
    // Usar offscreen para cálculos
    this.offCtx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
    
    for (let i = 0; i < this.blurSamples; i++) {
        const opacity = (1 - (i / this.blurSamples)) * this.blurStrength;
        const frameDelay = (i * 16) / 1000;
        const blurRotation = this.rotation - (this.angularVelocity * frameDelay);
        
        this.offCtx.globalAlpha = opacity;
        this.drawWheelAtRotation(blurRotation, this.offCtx);
    }
    
    // Transferir a canvas principal
    this.ctx.drawImage(this.offscreenCanvas, 0, 0);
}
```

---

## PARTE 4: FALLBACK PARA CSS FILTER

```javascript
class CSSMotionBlurWheel {
    constructor(config) {
        this.element = config.element || document.querySelector('.roulette');
        this.rotation = 0;
        this.angularVelocity = 0;
        this.blurRadius = 0;
        this.maxBlurRadius = config.maxBlurRadius || 8;
    }
    
    update(deltaTime) {
        // Actualizar rotación
        this.rotation += this.angularVelocity * deltaTime;
        
        // Calcular blur basado en velocidad angular
        // Mapear velocidad (rad/s) a blur radius (px)
        const blurFactor = 0.05;  // Ajustable
        this.blurRadius = Math.abs(this.angularVelocity) * blurFactor;
        this.blurRadius = Math.min(this.blurRadius, this.maxBlurRadius);
    }
    
    render() {
        this.element.style.transform = `rotate(${this.rotation}rad)`;
        this.element.style.filter = `blur(${this.blurRadius}px)`;
    }
    
    animate() {
        const startTime = performance.now();
        const duration = 4000;
        const targetRotation = Math.PI * 4;
        
        const step = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease-out cubic
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            this.angularVelocity = (targetRotation / duration) * 1000 * (1 - easeProgress * 3);
            
            this.update(elapsed / 1000);
            this.render();
            
            if (progress < 1) {
                requestAnimationFrame(step);
            }
        };
        
        requestAnimationFrame(step);
    }
}
```

---

## PARTE 5: SELECTOR AUTOMÁTICO (HYBRID)

```javascript
class AdaptiveRouletteWheel {
    static create(config) {
        const capabilities = RouletteMotionBlur.detectCapabilities();
        
        // Seleccionar mejor técnica disponible
        if (capabilities.canvas && navigator.hardwareConcurrency >= 4) {
            console.log('Using Canvas Motion Blur');
            return new CanvasMotionBlurWheel(config);
        } else if (capabilities.cssFilters) {
            console.log('Using CSS Filter Blur');
            return new CSSMotionBlurWheel(config);
        } else {
            console.log('Fallback: Simple rotation');
            return new SimpleRouletteWheel(config);
        }
    }
}

// Uso:
const wheel = AdaptiveRouletteWheel.create({
    canvas: document.getElementById('roulette'),
    wheelImage: wheelImg,
    blurSamples: 5
});

wheel.spin(Math.PI * 4 + Math.PI/3, 4000);
```

---

## PARTE 6: BENCHMARKING Y DEBUGGING

```javascript
class RoulettePerformanceMonitor {
    constructor(wheel) {
        this.wheel = wheel;
        this.frameCount = 0;
        this.fps = 0;
        this.startTime = performance.now();
    }
    
    monitor() {
        this.frameCount++;
        const elapsed = performance.now() - this.startTime;
        
        if (elapsed >= 1000) {
            this.fps = this.frameCount;
            console.log(`FPS: ${this.fps}`);
            console.log(`Angular Velocity: ${this.wheel.angularVelocity.toFixed(3)} rad/s`);
            console.log(`Blur Samples: ${this.wheel.blurSamples}`);
            
            this.frameCount = 0;
            this.startTime = performance.now();
        }
    }
}
```

---

## TABLA RÁPIDA: PARÁMETROS RECOMENDADOS

| Escenario | Técnica | Samples | BlurStrength | MaxFPS | Browser |
|-----------|---------|---------|--------------|--------|---------|
| Mobile | CSS Blur | - | - | 60 | All |
| Desktop CPU | Canvas | 5 | 0.2 | 48+ | All |
| Desktop GPU | WebGL | 8 | 0.3 | 60 | 95%+ |
| Prototipo | CSS Blur | - | - | 60 | All |

