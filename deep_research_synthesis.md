# INVESTIGACIÓN PROFUNDA: Perspectiva 3D, Depth Perception y Técnicas Visuales para Ruletas

## FASE 3: EXTRACCIÓN DE CLAIMS TÉCNICOS VERIFICABLES

### 1. MATRICES Y TRANSFORMACIONES MATEMÁTICAS

#### Perspective Projection Matrix (Claims Verificables)

**Claim 1: Composición de la matriz de perspectiva**
- Parámetros fundamentales: `left`, `right`, `bottom`, `top`, `near`, `far`
- Fuente: WebSearch Results - Mauricio Poppe / MDN WebGL
- Verificación: Confirmado en múltiples fuentes sobre graphics pipeline

**Claim 2: Pipeline de transformación 3D-a-2D**
- Orden de transformación: Model Matrix → View Matrix → Projection Matrix
- Propósito de cada matriz:
  - **Model Matrix**: Transforma de espacio local (object space) a espacio mundial (world space)
  - **View Matrix**: Transforma de world space a camera space
  - **Projection Matrix**: Transforma de camera space a clip space
- Fuente: MDN WebGL Documentation
- Falsabilidad: Específico (orden importa)

**Claim 3: Coordenada W y perspectiva**
- Almacena información de perspectiva en coordenada W
- Operación: Dividir coordenadas X,Y por Z (perspective division)
- Valor Z se preserva mediante componente W para operaciones posteriores
- Falsabilidad: Técnica específica de graphics pipeline

**Claim 4: Matrices 4x4 vs 3x3**
- Se requieren matrices 4x4 (no 3x3) para transformaciones afines con translación en 3D
- Las matrices 3x3 solo sirven para transformaciones lineales
- Fuente: Verificado en pipeline estándar de OpenGL/WebGL

---

### 2. Z-BUFFER Y DEPTH RENDERING

#### Z-Buffer (Depth Buffer) Claims

**Claim 5: Mecanismo de funcionamiento del Z-buffer**
- El Z-buffer es una textura oculta que almacena valor de profundidad por píxel
- Profundidad medida desde la cámara
- Algoritmo: Cuando se dibuja píxel nuevo:
  1. Se verifica profundidad actual en buffer
  2. Se compara con valor existente
  3. Si nuevo píxel está más cerca → reemplaza
  4. Si está más lejos → se descarta (ocluded)
- Fuente: ServerSpace Depth Buffer + Wikipedia Z-buffering
- Falsabilidad: Procedimiento específico y verificable

**Claim 6: Depth Testing en OpenGL**
- Funciones clave: `glDepthTest()`, `glDepthFunc()`, `glDepthMask()`
- Rangos de z-value: Normalizados a [0, 1] después de transformación
- Modos de comparación: LESS, LEQUAL, EQUAL, GEQUAL, GREATER, NOTEQUAL, NEVER, ALWAYS
- Fuente: LearnOpenGL Depth Testing documentation
- Falsabilidad: Nombres de funciones y parámetros específicos

**Claim 7: Precisión del Z-buffer**
- Precision depende de rango near-far plane
- Valores muy cercanos (near) y lejanos (far) pueden causar z-fighting
- Uso de Early-Z optimization en GPUs modernas
- Fuente: ServerSpace + optimizaciones de rendering

---

### 3. PARALLAX Y DEPTH PERCEPTION EN JUEGOS

#### Parallax Effect Claims

**Claim 8: Definición técnica de Parallax**
- Fenómeno visual: objetos cercanos se mueven más rápido que objetos lejanos
- Concepto originario de cinematografía, adoptado en gaming
- En 3D: múltiples capas (layers) en profundidad, cada una se mueve independientemente
- Efecto: Ilusión de profundidad mediante diferencia de velocidad de movimiento
- Fuente: Renderhub "Depth in Motion: The Parallax Effect in Games"
- Falsabilidad: Relación específica entre velocidad y distancia

**Claim 9: Implementación de parallax en capas**
- Cada capa tiene velocidad diferente basada en profundidad relativa
- Fórmula conceptual: `velocidad_capa = velocidad_base * (1 / profundidad_relativa)`
- Aplicable a backgrounds, elementos de juego, objetos
- Fuente: Game development parallax documentation

---

### 4. ISOMETRIC PROJECTION Y 2.5D RENDERING

#### Isometric Projection Technical Claims

**Claim 10: Ángulo de inclinación isométrica**
- Ángulo de cámara: ~30 grados (o 26.565° en variante común)
- Transformación: Square grid tiles → Diamond shapes
- Efecto visual: Ilusión de profundidad 3D en 2D screen
- Fuente: Pikuma + Wikipedia Isometric Projection
- Falsabilidad: Ángulo específico verificable

**Claim 11: Variante de pixel ratio 2:1**
- Más común en pixel art que la isometría "pura"
- Proporción: Por cada 2 pixeles horizontales, 1 pixel vertical
- Ángulo resultante: ~26.565° (no exactamente 30°)
- Fuente: Pikuma isometric blog post
- Falsabilidad: Ratio específico y medible

**Claim 12: Elevación (Z-coordinate) en isométrico**
- Cada tile tiene coordenada Z
- Renderizado: Tile se desplaza hacia arriba en pantalla por `z * altura_tile`
- Tiles con mayor Z se renderizan más altos en pantalla
- Profundidad sorting: Crítico para correcta visualización
- Fuente: Phaser Isometric Game Tutorial + IndieDB
- Falsabilidad: Fórmula específica de offset vertical

**Claim 13: Transformación cartesiana a isométrica**
- Conversión de coordenadas cartesianas (x, y) a isométricas
- Procesos clave: cartesian-to-isometric transform, tile rendering, depth sorting
- Movimiento isométrico: Requiere considerar 3 dimensiones (x, y, z)
- Aplicaciones: SimCity 2000, Diablo, Age of Empires, Stardew Valley
- Falsabilidad: Implementación específica en juegos nombrados

---

### 5. THREE.JS Y BABYLON.JS IMPLEMENTACIÓN

#### Three.js PerspectiveCamera Claims

**Claim 14: Parámetros de PerspectiveCamera**
- Constructor: `new PerspectiveCamera(fov, aspect, near, far)`
- Parámetros:
  - `fov` (Field of View): Ángulo vertical visible (típicamente 45-75 grados)
  - `aspect`: Relación ancho/alto (típicamente window.innerWidth/window.innerHeight)
  - `near`: Plano cercano (típicamente 0.1)
  - `far`: Plano lejano (típicamente 1000 o 10000)
- Definición: Describe una Frustum (pirámide truncada de visión)
- Fuente: Three.js Official Documentation + Medium article
- Falsabilidad: Nombres de parámetros y valores típicos

**Claim 15: Simulación de perspectiva real**
- PerspectiveCamera imita perspectiva de cámaras reales
- Busca crear sentido de profundidad y realismo en escena
- Implementa proyección de perspectiva estándar de computergráfica
- Fuente: Three.js framework design + Medium tutorials
- Falsabilidad: Comparación con cámaras ópticas reales

#### Framework Comparison Claims

**Claim 16: Three.js vs Babylon.js arquitectura**
- **Three.js**:
  - Engine ligero
  - Mayor control y flexibilidad
  - Requiere add-ons de terceros para física, animaciones complejas
  - Integración fácil con otros frameworks web
  
- **Babylon.js**:
  - Engine 3D completo
  - Sistemas built-in: física, animaciones, GUI
  - Más funcionalidad lista para usar (out of the box)
  - Menos necesidad de extensiones externas

- Fuente: SitePoint + LogRocket comparativos
- Falsabilidad: Características específicas de arquitectura

---

### 6. EFECTOS VISUALES DE DISTORSIÓN PERSPECTIVA

#### CSS 3D & Perspective Distortion Claims

**Claim 17: CSS 3D Transforms**
- Propiedades: `perspective`, `rotateX()`, `rotateY()`, `rotateZ()`
- Propiedad adicional: `transform-origin` (controla punto de rotación)
- Efecto: Simula profundidad de objeto y perspectiva
- Aplicaciones: animaciones 3D, mockups perspectivos, flip interactions
- Fuente: Smashing Magazine CSS 3D effects
- Falsabilidad: Nombres de propiedades CSS exactos

**Claim 18: Perspective Origin**
- `perspective-origin`: Controla desde dónde se aplica perspectiva (típicamente centro de elemento)
- Afecta cómo se ve la rotación 3D
- Modificar origin = cambiar punto de fuga perspectivo
- Fuente: Adobe XD documentation + Smashing Magazine
- Falsabilidad: Parámetro específico con efecto visual

**Claim 19: Distorsión perspectiva en movimiento de cámara**
- Al mover cámara alrededor de capa 3D, ocurre distorsión perspectiva
- Viewing on edge: Imagen aparece con perspectiva acortada
- Image degradation: Algunas imágenes se degradan al rotar en 3D
- Aplicaciones: Puertas abriéndose, efectos de profundidad dinámica
- Fuente: After Effects + Adobe documentation
- Falsabilidad: Descripción de fenómeno óptico verificable

---

## FASE 4: SÍNTESIS TEMÁTICA

### A. MATRICES Y TRANSFORMACIONES MATEMÁTICAS

**Componentes Críticos:**
1. Model Matrix: objeto local → mundo
2. View Matrix: mundo → cámara
3. Projection Matrix: cámara → pantalla (clip space)
4. Perspectiva Division: dividir x,y por z usando coordenada W
5. Matrices 4x4: requeridas para transformaciones afines 3D

**Valores Típicos:**
- FOV (Field of View): 45-75 grados
- Near plane: 0.1
- Far plane: 1000-10000
- Z-buffer range: [0, 1] normalizado

---

### B. TÉCNICAS 2.5D vs 3D PURO

**Isometric (2.5D):**
- Ángulo: 30° o 26.565° (según variante)
- Pixel ratio: 2:1 en variantes comunes
- Profundidad: Calculada, no rendered (z-ordering)
- Ventajas: Performance, control visual preciso
- Ejemplos: SimCity 2000, Diablo, Stardew Valley

**3D Puro:**
- Verdaderas transformaciones 3D en todos los ejes
- Z-buffer para manejo automático de profundidad
- Mayor flexibilidad de cámara y rotación
- Mayor costo computacional
- Ideal para: Juegos AAA, visualización científica

**2.5D Híbrido:**
- Combine elementos: algunos objetos full 3D + base isométrica
- Parallax layers con profundidad
- Transformaciones 3D aplicadas a assets 2D

---

### C. HERRAMIENTAS PRINCIPALES

**Three.js:**
- API: `PerspectiveCamera(fov, aspect, near, far)`
- Ligero, flexible, extensible
- Ideal para: proyectos web interactivos, control fino
- Requiere: custom code para sistemas complejos

**Babylon.js:**
- API: Complete framework con physics/animations/GUI built-in
- Robusto, feature-complete
- Ideal para: aplicaciones producción-ready, juegos complejos
- Menos configuración requerida

**WebGL (Base):**
- API: `glDepthTest()`, `glDepthFunc()`, `glDepthMask()`
- Bajo nivel, máximo control
- Profundidad testing modes: LESS, LEQUAL, GEQUAL, etc.

---

### D. EFECTOS VISUALES DE PROFUNDIDAD

**Parallax Effect:**
- Objetos cercanos se mueven más rápido
- Múltiples capas con velocidades diferentes
- Factor: `1 / profundidad_relativa`

**Z-Buffer Algorithm:**
1. Almacena profundidad por píxel
2. Compara profundidad de píxel nuevo vs existente
3. Reemplaza si más cercano (closest to camera)
4. Descarta si más lejano (occluded)

**Perspective Distortion:**
- Ocurre al rotar objetos en 3D
- Intensidad aumenta con ángulo de rotación
- Degradación de imagen en rotaciones extremas

**Height-based Offset:**
- Isométrico: `y_offset = z * tile_height`
- CSS 3D: `transform: rotateX/Y/Z(angle)`
- WebGL: Aplicar transformaciones via matrices

---

### E. URLS DE REFERENCIA Y TUTORIALES

#### Documentación Oficial

1. **Three.js PerspectiveCamera**
   - https://threejs.org/docs/#api/en/cameras/PerspectiveCamera
   - Official API reference

2. **MDN WebGL Model-View-Projection**
   - https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_model_view_projection
   - WebGL transformation pipeline documentation

3. **LearnOpenGL Depth Testing**
   - https://learnopengl.com/Advanced-OpenGL/Depth-testing
   - OpenGL depth testing comprehensive guide

4. **Adobe XD 3D Transforms**
   - https://helpx.adobe.com/xd/help/design-in-perspective-using-3D-transforms.html
   - Design perspective tools documentation

#### Tutoriales Técnicos

5. **Three.js Scene, Camera, Renderer**
   - https://sbcode.net/threejs/scene-camera-renderer/
   - Fundamental Three.js setup tutorial

6. **Phaser Isometric Game Tutorial**
   - https://generalistprogrammer.com/tutorials/phaser-isometric-game-tutorial
   - 2.5D tile rendering & depth sorting for games

7. **Isometric Projection in Games (Pikuma)**
   - https://pikuma.com/blog/isometric-projection-in-games
   - Comprehensive isometric techniques guide

8. **Isometric Rotation**
   - https://a5huynh.github.io/posts/2019/isometric-rotation/
   - Advanced: rotating isometric projections

9. **Demystifying Isometric Projection (Medium)**
   - https://medium.com/@kavierim/demystifying-isometric-projection-in-2d-games-with-python-bbcc2038a620
   - Python-based isometric coordinate transformations

#### Frameworks & Tools

10. **Three.js vs Babylon.js Comparison**
    - https://www.sitepoint.com/three-js-babylon-js-comparison-webgl-frameworks/
    - Comprehensive framework comparison

11. **Three.js vs Babylon.js (LogRocket)**
    - https://blog.logrocket.com/three-js-vs-babylon-js/
    - Performance and feature analysis

12. **Three.js vs Babylon.js (Modelfy)**
    - https://modelfy.art/blog/web-3d-performance-guide
    - Performance implementation strategies

#### Técnicas Avanzadas

13. **CSS 3D Effects for Images**
    - https://www.smashingmagazine.com/2023/07/shines-perspective-rotations-css-3d-effects-images/
    - Advanced CSS 3D transformation techniques

14. **Parallax Effect in Games**
    - https://www.renderhub.com/blog/depth-in-motion-the-parallax-effect-in-games
    - Parallax depth perception implementation

15. **After Effects Distort Effects**
    - https://helpx.adobe.com/after-effects/using/distort-effects.html
    - Professional perspective distortion tools

#### Referencias Académicas & Wikipedia

16. **Z-buffering**
    - https://en.wikipedia.org/wiki/Z-buffering
    - Algorithm history and implementation details

17. **Isometric Projection**
    - https://en.wikipedia.org/wiki/Isometric_projection
    - Mathematical foundations and variants

---

## VERIFICACIÓN ADVERSARIAL: CLAIMS CLAVE

### Claim 1: "Perspectiva Division divide x,y por z"
- **Fuentes Pro**: MDN WebGL, computer graphics textbooks
- **Verificación**: Estándar en graphics pipeline, falsable mediante testing
- **Confianza**: ALTA (standard de la industria)

### Claim 2: "Z-buffer reemplaza si nuevo píxel está más cerca"
- **Fuentes Pro**: Wikipedia, OpenGL docs, ServerSpace
- **Verificación**: Implementación directa en GPU
- **Confianza**: ALTA (algoritmo fundamental)

### Claim 3: "Isometric ángulo es 30° o 26.565°"
- **Fuentes Pro**: Pikuma, Wikipedia, game dev resources
- **Variación**: 30° (matemático) vs 26.565° (pixel art común)
- **Confianza**: ALTA (medible visualmente)

### Claim 4: "Three.js PerspectiveCamera(fov, aspect, near, far)"
- **Fuente**: Documentación oficial Three.js
- **Verificación**: Código accesible en repositorio oficial
- **Confianza**: MAXIMA (oficial)

### Claim 5: "Parallax: objetos cercanos se mueven más rápido"
- **Fuentes Pro**: Múltiples tutoriales de juegos, cinematografía
- **Verificación**: Observable en cualquier juego con parallax
- **Confianza**: ALTA (fenómeno visual verificable)

---

## CONCLUSIONES

### Información Técnica Verificable Obtenida:

1. **Matrices**: Composición 4x4, orden M→V→P, perspective division
2. **Depth**: Z-buffer algorithm, OpenGL depth testing functions
3. **Isometric**: Ángulos específicos (30°/26.565°), pixel ratios (2:1)
4. **Frameworks**: Three.js API specifics, Babylon.js features
5. **Técnicas**: Parallax factors, perspective transforms, CSS 3D

### Recursos Más Confiables:

- **Oficial**: Three.js docs, MDN WebGL, OpenGL documentation
- **Académico**: Wikipedia articles, research papers
- **Práctica**: Pikuma, game dev blogs, tutorials específicos

### Aplicabilidad para Ruletas Visuales:

- **3D Approach**: Usar Three.js PerspectiveCamera + Z-buffer para manejo automático de profundidad
- **2.5D Approach**: Isometric projection con proper depth sorting, parallax para ilusión de profundidad
- **Híbrido**: Combine elementos isométricos base con efectos 3D para altura/inclinación
- **Effectos Críticos**: Perspective distortion on tilt, height-based offset rendering, parallax layering

