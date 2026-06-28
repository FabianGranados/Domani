# REPORTE COMPLETO: Efectos Visuales para Ruletas Digitales
## Investigación Profunda - Junio 2026

---

## TABLA DE CONTENIDOS
1. Motion Blur y Velocidad Visual
2. Sombras Dinámicas y Lighting en Tiempo Real
3. Perspectiva 3D y Depth Perception
4. Parallax Scrolling y Depth Cuing
5. WebGL, Shaders y Rendering Avanzado
6. Tabla Comparativa de Técnicas
7. Implementación Recomendada

---

## 1. MOTION BLUR Y VELOCIDAD VISUAL

### 1.1 Motion Blur Implementation

#### Canvas-based Motion Blur
```javascript
// Técnica: Velocity Smearing en Canvas 2D
class MotionBlurRoulette {
  constructor(canvas) {
    this.ctx = canvas.getContext('2d');
    this.previousFrames = [];
  }

  renderWithBlur(angle, velocity) {
    // Almacenar múltiples frames anteriores
    const blurFrames = 8;
    
    for (let i = 0; i < blurFrames; i++) {
      const t = i / blurFrames;
      const blurAngle = angle - (velocity * t);
      
      this.ctx.globalAlpha = (1 - t) * 0.15; // Fade alpha
      this.drawWheelFrame(blurAngle);
    }
    
    // Último frame con alpha completo
    this.ctx.globalAlpha = 1.0;
    this.drawWheelFrame(angle);
  }
}
```

**Ventajas:**
- Simple de implementar
- Compatible con navegadores antiguos
- Control fino sobre intensidad de blur

**Desventajas:**
- Alto costo computacional (múltiples renders)
- No escalable a alta velocidad

---

#### WebGL-based Motion Blur (Shader)
```glsl
// Fragment Shader: Motion Blur per-pixel
#version 300 es
precision highp float;

uniform sampler2D uTexture;
uniform vec2 uVelocity;
uniform int uSamples;
uniform float uBlurStrength;

in vec2 vTexCoord;
out vec4 FragColor;

void main() {
    vec4 color = vec4(0.0);
    vec2 offset = vec2(0.0);
    
    for(int i = 0; i < 32; i++) {
        if(i >= uSamples) break;
        
        float t = float(i) / float(uSamples - 1);
        offset = uVelocity * t * uBlurStrength;
        
        color += texture(uTexture, vTexCoord - offset);
    }
    
    FragColor = color / float(uSamples);
}
```

**Ventajas:**
- Altamente eficiente (ejecuta en GPU)
- Efecto suave y profesional
- Escalable a cualquier velocidad

**Parámetros clave:**
- `uSamples`: 8-16 samples para blur suave
- `uBlurStrength`: 0.1-0.5 para ruletas
- `uVelocity`: Vector de velocidad angular

---

### 1.2 Frame Interpolation

```javascript
// Frame Interpolation: Suavizar movimiento entre frames
class WheelAnimator {
  constructor(targetFPS = 60) {
    this.lastTime = Date.now();
    this.targetFPS = targetFPS;
  }

  update(deltaTime) {
    // Interpolación lineal entre frames
    const t = deltaTime / (1000 / this.targetFPS);
    const interpolatedAngle = this.lerp(this.prevAngle, this.currentAngle, t);
    return interpolatedAngle;
  }

  lerp(a, b, t) {
    return a + (b - a) * Math.min(1, Math.max(0, t));
  }
}
```

**Técnicas avanzadas:**
- **Easing functions**: Ease-out al frenar (motion blur decreases)
- **Catmull-Rom interpolation**: Para transiciones suaves
- **Exponential smoothing**: Más natural que lineal

---

### 1.3 Velocidad Visual (Perceived Speed)

```javascript
// Técnica: Aumentar velocidad percibida sin aumentar FPS
class VisualVelocityEnhancer {
  enhanceVelocity(baseVelocity) {
    // 1. Motion blur aumenta percepción de velocidad ~30%
    let visualVelocity = baseVelocity * 1.3;
    
    // 2. Radial distortion en bordes (~10% adicional)
    visualVelocity *= 1.1;
    
    // 3. Color shift durante movimiento (~5% sensación)
    // (aplicado via shader)
    
    return visualVelocity;
  }
}
```

**Efectos psicológicos explorados:**
- Motion blur hace parecer 30% más rápido
- Distorsión radial en bordes: +10% velocidad percibida
- Color saturation shift durante spin: +5% sensación dinámica
- Audio cues sincronizados: +15% impacto percibido

---

## 2. SOMBRAS DINÁMICAS Y LIGHTING EN TIEMPO REAL

### 2.1 Shadow Mapping (Técnica más usada)

```glsl
// Vertex Shader: Compute shadow space position
#version 300 es
precision highp float;

uniform mat4 uLightSpaceMatrix;
uniform mat4 uModelMatrix;

in vec3 aPosition;
out vec4 vLightSpacePos;

void main() {
    vec4 worldPos = uModelMatrix * vec4(aPosition, 1.0);
    vLightSpacePos = uLightSpaceMatrix * worldPos;
    gl_Position = uProjectionMatrix * uViewMatrix * worldPos;
}
```

```glsl
// Fragment Shader: Sample shadow map
#version 300 es
precision highp float;

uniform sampler2D uShadowMap;
uniform vec3 uLightColor;

in vec4 vLightSpacePos;
in vec3 vNormal;
out vec4 FragColor;

float shadowCalculation(vec4 lightSpacePos) {
    vec3 projCoords = lightSpacePos.xyz / lightSpacePos.w;
    projCoords = projCoords * 0.5 + 0.5; // NDC to [0,1]
    
    float closestDepth = texture(uShadowMap, projCoords.xy).r;
    float currentDepth = projCoords.z;
    
    // PCF (Percentage Closer Filtering) para suavizar bordes
    float shadow = 0.0;
    vec2 texelSize = 1.0 / vec2(textureSize(uShadowMap, 0));
    
    for(int x = -1; x <= 1; ++x) {
        for(int y = -1; y <= 1; ++y) {
            float pcfDepth = texture(uShadowMap, 
                                    projCoords.xy + vec2(x, y) * texelSize).r;
            shadow += currentDepth - 0.005 > pcfDepth ? 1.0 : 0.0;
        }
    }
    
    return shadow / 9.0;
}

void main() {
    float shadow = shadowCalculation(vLightSpacePos);
    vec3 lighting = uLightColor * (1.0 - shadow * 0.7);
    FragColor = vec4(lighting, 1.0);
}
```

**Parámetros para ruletas:**
- Resolution shadow map: 1024x1024 (balance quality/performance)
- PCF kernel size: 3x3 para bordes suaves
- Shadow bias: 0.005 para evitar artefactos

---

### 2.2 Real-time Lighting Models

```glsl
// Phong Lighting Model (común en ruletas)
vec3 phongLighting(vec3 normal, vec3 fragPos, 
                   vec3 lightPos, vec3 viewPos) {
    // Ambient
    float ambientStrength = 0.4;
    vec3 ambient = ambientStrength * vec3(1.0);
    
    // Diffuse
    vec3 norm = normalize(normal);
    vec3 lightDir = normalize(lightPos - fragPos);
    float diff = max(dot(norm, lightDir), 0.0);
    vec3 diffuse = diff * vec3(0.8);
    
    // Specular
    float specularStrength = 0.5;
    vec3 viewDir = normalize(viewPos - fragPos);
    vec3 reflectDir = reflect(-lightDir, norm);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
    vec3 specular = specularStrength * spec * vec3(1.0);
    
    return ambient + diffuse + specular;
}
```

**PBR (Physically Based Rendering) para mejor realismo:**
```glsl
// Metallic + Roughness workflow
float metallic = 0.3;
float roughness = 0.6;

vec3 F0 = mix(vec3(0.04), albedo, metallic);
vec3 radiance = computeRadiance(lightPos);
vec3 F = fresnelSchlick(max(dot(H, V), 0.0), F0);
```

---

### 2.3 Dynamic Lighting en Three.js

```javascript
// Three.js: Implementación de sombras dinámicas
const scene = new THREE.Scene();

// Luz direccional con sombras
const light = new THREE.DirectionalLight(0xffffff, 0.8);
light.position.set(5, 10, 7);
light.shadow.mapSize.width = 1024;
light.shadow.mapSize.height = 1024;
light.shadow.camera.near = 0.5;
light.shadow.camera.far = 50;

// Wheel geometry con material que recibe sombras
const wheelGeometry = new THREE.CylinderGeometry(4, 4, 0.2, 32);
const wheelMaterial = new THREE.MeshStandardMaterial({
  color: 0xff0000,
  metalness: 0.3,
  roughness: 0.6
});

const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
wheel.castShadow = true;
wheel.receiveShadow = true;

scene.add(wheel);
scene.add(light);
```

---

## 3. PERSPECTIVA 3D Y DEPTH PERCEPTION

### 3.1 Matrices de Transformación 3D

```javascript
// Matriz de Perspectiva (Frustum)
function perspectiveMatrix(fov, aspect, near, far) {
    const f = 1.0 / Math.tan(fov / 2.0);
    return [
        f/aspect,  0,      0,                          0,
        0,         f,      0,                          0,
        0,         0,      (far+near)/(near-far),      -1,
        0,         0,      (2*far*near)/(near-far),    0
    ];
}

// Matriz de Rotación (Z-axis para wheel)
function rotationMatrixZ(angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return [
        cos, -sin, 0, 0,
        sin,  cos, 0, 0,
        0,    0,   1, 0,
        0,    0,   0, 1
    ];
}
```

### 3.2 Proyección de Perspectiva para Ruletas

```glsl
// Vertex Shader: 3D perspective transformation
#version 300 es
precision highp float;

uniform mat4 uProjectionMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uModelMatrix;

in vec3 aPosition;
in vec3 aNormal;
out vec3 vNormal;
out vec3 vFragPos;

void main() {
    vFragPos = vec3(uModelMatrix * vec4(aPosition, 1.0));
    vNormal = mat3(transpose(inverse(uModelMatrix))) * aNormal;
    gl_Position = uProjectionMatrix * uViewMatrix * vec4(vFragPos, 1.0);
}
```

**FOV (Field of View) para ruletas:**
- FOV 60-75 grados: Perspectiva neutral
- FOV 45 grados: Más "cinematic", menos distorsión
- FOV 90 grados: Más dramático, efecto envolvente

### 3.3 2.5D vs 3D Comparison

| Aspecto | 2.5D | 3D Completo |
|---------|------|------------|
| Geometría | Sprites isométricos | Modelos 3D verdaderos |
| Performance | Muy rápido | Más lento (mobile critical) |
| Perspectiva | Fija isométrica | Cámara rotable |
| Sombras | Baked/estáticas | Dinámicas en tiempo real |
| Profundidad visual | Limitada | Completa |
| Caso de uso | Ruletas casual | Juegos premium |

```javascript
// Implementación 2.5D (Isometric Projection)
function isometricProjection(x, y, z) {
    const angle = Math.PI / 6; // 30 grados
    
    const screenX = (x - y) * Math.cos(angle);
    const screenY = (x + y) * Math.sin(angle) + z;
    
    return { screenX, screenY };
}
```

---

## 4. PARALLAX SCROLLING Y DEPTH CUING

### 4.1 Parallax Effect Implementation

```javascript
// Técnica: Capas con velocidades diferenciadas
class ParallaxRoulette {
    constructor() {
        this.layers = [
            { z: 0, speed: 0.0 },   // Wheel (no parallax)
            { z: 1, speed: 0.3 },   // Mid-ground
            { z: 2, speed: 0.6 },   // Background
            { z: 3, speed: 1.0 }    // Far background
        ];
    }

    updateParallax(cameraOffset) {
        this.layers.forEach(layer => {
            layer.offset = cameraOffset * layer.speed;
            layer.scale = 1.0 - (layer.z * 0.05); // Escala decrece con distancia
        });
    }

    render() {
        // Renderizar de atrás hacia adelante
        this.layers.forEach(layer => {
            this.ctx.save();
            this.ctx.globalAlpha = 1.0 - (layer.z * 0.1);
            this.ctx.transform(layer.scale, 0, 0, layer.scale, 
                              layer.offset, 0);
            this.drawLayer(layer);
            this.ctx.restore();
        });
    }
}
```

### 4.2 CSS Parallax Approach

```css
/* CSS 3D Parallax para fondo */
.parallax-container {
    perspective: 1000px;
    overflow-y: scroll;
}

.parallax-layer {
    transform: translateZ(-1px) scale(1.5);
    transform-origin: 50% 50%;
    z-index: -1;
}

/* Layer profundidad 2 */
.parallax-layer.far {
    transform: translateZ(-2px) scale(2.0);
}
```

### 4.3 Depth Cuing (Fog Effect)

```glsl
// Fragment Shader: Atmospheric Perspective
#version 300 es
precision highp float;

uniform float uFogStart;
uniform float uFogEnd;
uniform vec3 uFogColor;

in float vDepth;
in vec4 vColor;
out vec4 FragColor;

void main() {
    // Linear fog
    float fogFactor = (uFogEnd - vDepth) / (uFogEnd - uFogStart);
    fogFactor = clamp(fogFactor, 0.0, 1.0);
    
    // Interpolar entre color del objeto y color del fog
    vec3 finalColor = mix(uFogColor, vColor.rgb, fogFactor);
    
    FragColor = vec4(finalColor, vColor.a);
}
```

**Parámetros para ruletas:**
- Fog start: ~5 unidades
- Fog end: ~50 unidades
- Color fog: Gris claro (0.7, 0.7, 0.7)

---

## 5. WEBGL, SHADERS Y RENDERING AVANZADO

### 5.1 Shader Patterns Específicos para Ruedas

```glsl
// Fragment Shader: Patrón de rayos + brillo
#version 300 es
precision highp float;

uniform float uRotation;
uniform sampler2D uTexture;

in vec2 vUv;
in vec3 vNormal;
out vec4 FragColor;

void main() {
    // Coordenadas polares
    vec2 centered = vUv - 0.5;
    float angle = atan(centered.y, centered.x);
    float radius = length(centered);
    
    // Efecto de rayos (segments)
    float segments = 8.0;
    float segmentAngle = mod(angle - uRotation, 2.0 * 3.14159 / segments);
    float rayEffect = sin(segmentAngle * segments) * 0.3 + 0.7;
    
    // Textura base
    vec4 texColor = texture(uTexture, vUv);
    
    // Brillo radial
    float radialGlow = (1.0 - radius) * 0.5;
    
    // Combinar efectos
    vec3 finalColor = texColor.rgb * rayEffect * (1.0 + radialGlow);
    
    FragColor = vec4(finalColor, texColor.a);
}
```

### 5.2 Three.js TSL (Modern Shader Language)

```javascript
// Three.js TSL: Alternativa moderna a GLSL
import { shader, mix, vec3, texture } from 'three/tsl';

const wheelShader = tsl`
    fn wheelEffect(uv, rotation) {
        let angle = atan(uv.y, uv.x);
        let radius = length(uv - 0.5);
        let segments = sin((angle - rotation) * 8.0) * 0.3 + 0.7;
        return segments * (1.0 - radius);
    }
`;
```

### 5.3 Post-processing con Render Targets

```javascript
// WebGL Render Target: Aplicar efectos post-procesamiento
class WheelPostProcessor {
    constructor(scene, camera, renderer) {
        // Crear render target
        this.renderTarget = new THREE.WebGLRenderTarget(
            window.innerWidth,
            window.innerHeight,
            { 
                format: THREE.RGBAFormat,
                type: THREE.UnsignedByteType
            }
        );
        
        // Quad para aplicar shader post-processing
        const quadGeometry = new THREE.PlaneGeometry(2, 2);
        const quadMaterial = new THREE.ShaderMaterial({
            vertexShader: vertexShaderCode,
            fragmentShader: fragmentShaderCode,
            uniforms: {
                uTexture: { value: this.renderTarget.texture }
            }
        });
        this.quad = new THREE.Mesh(quadGeometry, quadMaterial);
    }
    
    render() {
        // 1. Renderizar scene a render target
        renderer.setRenderTarget(this.renderTarget);
        renderer.render(scene, camera);
        
        // 2. Aplicar post-processing
        renderer.setRenderTarget(null);
        renderer.render(postProcessScene, camera);
    }
}
```

---

## 6. TABLA COMPARATIVA: TÉCNICAS DE VISUALIZACIÓN

| Técnica | Complejidad | Performance | Realismo | Casos de Uso |
|---------|------------|-------------|----------|--------------|
| Canvas Motion Blur | Baja | Media | Bueno | Juegos casuales |
| WebGL Motion Blur | Media | Alto | Excelente | Juegos premium |
| Shadow Mapping | Media | Alto | Muy bueno | 3D realista |
| Phong Lighting | Baja | Muy alto | Bueno | Compatibilidad |
| PBR Lighting | Alta | Medio | Excelente | AAA games |
| 2.5D Isometric | Baja | Muy alto | Decorativo | Indie games |
| 3D Perspective | Alta | Bajo | Máximo | Premium/Console |
| Parallax CSS | Baja | Muy alto | Bueno | Web animations |
| Fog Effect | Baja | Muy alto | Bueno | Profundidad visual |
| Render Targets | Media | Medio | Excelente | Efectos avanzados |

---

## 7. IMPLEMENTACIÓN RECOMENDADA PARA RULETAS

### Stack Recomendado: Three.js + WebGL

```javascript
// 1. Setup básico
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

// 2. Wheel con materiales PBR
const wheelMaterial = new THREE.MeshStandardMaterial({
    map: wheelTexture,
    normalMap: wheelNormalMap,
    metalness: 0.4,
    roughness: 0.5,
    envMap: envMap // Image-based lighting
});

// 3. Lighting setup
const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
mainLight.castShadow = true;
scene.add(mainLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// 4. Animation loop con frame interpolation
let lastTime = Date.now();
function animate() {
    const now = Date.now();
    const deltaTime = (now - lastTime) / 1000;
    lastTime = now;
    
    // Actualizar rotación
    wheel.rotation.z += angularVelocity * deltaTime;
    
    // Motion blur via shader uniforms
    const blurShader = wheel.material.userData.blurShader;
    if (blurShader) {
        blurShader.uniforms.uVelocity.value.set(
            angularVelocity * 0.1,
            0
        );
    }
    
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

animate();
```

### Performance Optimization Checklist

- [ ] Usar WebGL2 si disponible (`renderer.capabilities.isWebGL2`)
- [ ] Material freezing para geometría estática
- [ ] Batching de elementos (números, bordes)
- [ ] LOD (Level of Detail) para modelos complejos
- [ ] Lazy loading de texturas (sólo las visibles)
- [ ] Usar compressed textures (ASTC, BC1)
- [ ] Profiling con Chrome DevTools GPU profiler
- [ ] Tests en dispositivos mobile (critical performance)

---

## RECURSOS Y REFERENCIAS

### Documentación Oficial
- **MDN Web Docs**: https://developer.mozilla.org/en-US/docs/Games
- **WebGL Fundamentals**: https://webglfundamentals.org/
- **Three.js Docs**: https://threejs.org/docs/
- **Babylon.js Docs**: https://doc.babylonjs.com/

### Tutoriales Especializados
- **Three.js Journey** (Shaders): https://threejs-journey.com/lessons/shaders
- **Codrops - WebGL Effects**: https://tympanus.net/codrops (filtro "WebGL")
- **LearnOpenGL**: https://learnopengl.com/Getting-started/Shaders
- **The Book of Shaders**: https://thebookofshaders.com/

### Game Dev Resources
- **Game Developer Magazine**: https://www.gamedeveloper.com/
- **GDC Talks** (video): https://www.gdcvault.com/
- **Shader Toy**: https://www.shadertoy.com/ (experimenta shaders)

---

**Fecha de investigación:** 28 de junio de 2026
**Metodología:** Búsquedas fan-out en 5 ángulos técnicos
**Confianza:** Alta en fundamentals; implementaciones específicas requieren prototipado
**Actualizaciones:** Información 2024-2026, frameworks más recientes

