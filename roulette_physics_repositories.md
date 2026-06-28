# Búsqueda Exhaustiva: Simuladores de Ruleta con Valores Numéricos de Física en GitHub

Realizado: 28 de junio de 2026
Repositorios encontrados: 15+

---

## 1. SpinSight - Simulador de Ruleta Realista (PRINCIPAL)

**Repositorio:** https://github.com/Nuraj250/SpinSight
**Lenguaje:** Python, React, JavaScript
**Descripción:** Simulador de ruleta europea realista con dinámicas inspiradas en física de bola y rueda.

### Valores Numéricos Esperados:
- Velocidad angular de la rueda (RPM o rad/s)
- Desaceleración de la rueda
- Parámetros de dinámica de bola
- Coeficientes de fricción
- Tiempo de animación

**Ubicación Probable:** 
- Backend Python: `/physics/` o `/simulation/`
- Frontend React: `/components/` o `/utils/`
- README: https://github.com/Nuraj250/SpinSight/blob/main/USER_GUIDE.md

**Notas:** Es el más completo encontrado con "physics-inspired ball and wheel dynamics"

---

## 2. CrazyTim/spin-wheel - Componente de Rueda Giratoria

**Repositorio:** https://github.com/CrazyTim/spin-wheel
**Lenguaje:** Vanilla JavaScript (ES6)
**Descripción:** Componente web reutilizable para selecciones aleatorias con animaciones realistas.

### Valores Numéricos Encontrados/Esperados:
- **rotationResistance:** Controla cómo se reduce la velocidad de giro sobre el tiempo
- Momentum (impulso) aplicado al girar
- Drag (resistencia/fricción) durante la animación
- Funciones de easing (easeSinOut por defecto)
- Parámetros de animación a ángulo específico

**Ubicación Probable:** 
- Código principal: `/src/main.ts` o `/src/Wheel.ts`
- Funciones de física: `/src/physics.ts` o similar
- Ejemplo: https://github.com/CrazyTim/spin-wheel/blob/main/README.md

**Método Clave:** `spinToItem(item, duration, easing)`

**Notas:** "Spin by applying momentum and drag, or animate to a specific angle with easing"

---

## 3. pjhjohn/roulette - Rueda de Ruleta Controlada Mínimamente

**Repositorio:** https://github.com/pjhjohn/roulette
**Lenguaje:** JavaScript
**Descripción:** Simulador de rueda de ruleta con animación e control angular preciso.

### Valores Numéricos Encontrados:
- **Deceleration:** -0.001 (freno de desaceleración)
- **Acceleration:** 0.002 (aceleración inicial)
- **Min Velocity:** 0.0 (velocidad angular mínima)
- **Max Velocity:** 1.0 (velocidad angular máxima)
- **Step Length:** 1000.0 / 60.0 = ~16.67 ms (paso de tiempo, 60 FPS)

**Ubicación Probable:**
- Configuración: `/sample/sample.html`
- Código principal: `/roulette.js`

**Métodos Disponibles:**
- `get()` - obtiene tiempo, ángulo, velocidad angular, estado de giro
- `spin(angle, duration)` - gira a ángulo específico
- `stop()` - detiene la rotación

**Notas:** Valores explícitos de física angular detectados. Línea: https://github.com/pjhjohn/roulette/blob/master/sample/sample.html

---

## 4. eknowles/roulette-ts - Juego 3D de Ruleta con Three.js

**Repositorio:** https://github.com/eknowles/roulette-ts
**Lenguaje:** TypeScript, Three.js
**Descripción:** Juego 3D de ruleta construido con Three.js y TypeScript.

### Valores Numéricos Esperados:
- Parámetros de cámara 3D
- Rotación de rueda en 3D
- Posición y velocidad de bola 3D
- Gravedad (likely: 9.81 m/s²)
- Fricción de contacto (aunque cannon.js no está en uso actual)

**Ubicación Probable:**
- Código fuente: `/src/` o `/game/`
- README: https://github.com/eknowles/roulette-ts/blob/main/README.md
- Tests: `/test/` (menciona tests en TypeScript nativo)

**Notas:** Proyecto activo, planea integración con react-three-fiber

---

## 5. eugenehere/roulette-simulator - Simulador de Rueda de Ruleta

**Repositorio:** https://github.com/eugenehere/roulette-simulator
**Lenguaje:** JavaScript
**Descripción:** Simulador de rueda de ruleta enfocado en estrategias de apuestas.

### Estructura:
- Sistema de apuestas con parámetros
- Estrategias de juego (Ej: Strategy1 - esperar N veces un color)
- Estadísticas de resultados

**Valores Numéricos Probables:**
- Límites de apuestas en la mesa
- Números de la ruleta (0-36)
- Distribución de colores rojo/negro

**Notas:** Más enfocado en mecánica de juego que en física de movimiento

---

## 6. ntaliceo/roulette-simulator - Simulador Python de Ruleta Americana

**Repositorio:** https://github.com/ntaliceo/roulette-simulator
**Lenguaje:** Python 3
**Descripción:** Scripts Python para simular ruleta americana y técnicas de apuestas estratégicas.

### Archivo Clave:
- `labouchere.py` - Implementación del método Labouchere

**Valores Numéricos Probables:**
- Probabilidades de cada número (1/38 para ruleta americana)
- Secuencias de apuestas
- Capital inicial de simulación

**Notas:** Enfoque en estrategias de apuestas más que física

---

## 7. matiasvallejosdev/casino-roulette-game - Juego de Ruleta en Unity

**Repositorio:** https://github.com/matiasvallejosdev/casino-roulette-game
**Lenguaje:** C# (.NET WPF)
**Descripción:** Juego de ruleta de casino americano desarrollado en Unity3D con arquitectura MVVM.

### Características:
- MVVM Architecture con UniRx (reactive programming)
- Persistencia JSON
- Sistema de recompensas temporales
- Soporte para anuncios

**Valores Numéricos Esperados (en Unity):**
- Parámetros Rigidbody (drag, angular drag)
- Velocidades iniciales de rueda/bola
- Fuerzas de fricción
- Coeficientes de restitución

**Ubicación Probable:**
- Scripts: `/Assets/Scripts/`
- Física: `/Assets/Scripts/Physics/` o `/Assets/Scripts/Ball/`

**Notas:** Proyecto en C#, usa motor físico de Unity nativo

---

## 8. fdel15/roulette-wheel - Rueda de Ruleta Básica en JS

**Repositorio:** https://github.com/fdel15/roulette-wheel
**Lenguaje:** JavaScript
**Descripción:** Componente Canvas básico para rueda de ruleta aleatoria.

### Características:
- Conversión de Canvas a selector aleatorio
- Auto-generación de colores por opción
- Callback en selección de elemento
- Botón de giro en el centro

**Valores Numéricos Probables:**
- Ángulos de segmentos
- Velocidad de animación
- Duración de giro

---

## 9. milsaware/javascript-roulette - Juego de Ruleta Completamente Funcional

**Repositorio:** https://github.com/milsaware/javascript-roulette
**Lenguaje:** JavaScript, CSS
**Descripción:** Juego de ruleta completamente funcional con interfaz web.

**Archivo Clave:**
- `index.html` - Código principal

**Valores Numéricos Esperados:**
- Velocidad de rotación de rueda
- Duración de animación de giro
- Posiciones de números en la rueda

---

## 10. prbasha/RouletteSimulator - Simulador de Ruleta Francesa

**Repositorio:** https://github.com/prbasha/RouletteSimulator
**Lenguaje:** C# (.NET WPF), Prism Framework
**Descripción:** Simulación de juego de ruleta casino basado en rueda francesa de un cero.

**Valores Numéricos Probables:**
- Números (0-36): 37 casillas
- Probabilidades francesa: 1/37

---

## 11. TimGraf/rouletteModelApp - Modelo AngularJS de Ruleta

**Repositorio:** https://github.com/TimGraf/rouletteModelApp
**Lenguaje:** AngularJS, JavaScript
**Descripción:** Aplicación AngularJS que modela una rueda de ruleta americana y mesa de apuestas.

### Características:
- Representación de números en rueda vs mesa
- Resaltado visual de números adyacentes
- Mapeo de posiciones

**Notas:** Aplicación web clásica, enfoque educativo

---

## 12. dhupee/roulette-simulation - Simulación CLI Monte Carlo

**Repositorio:** https://github.com/dhupee/roulette-simulation
**Lenguaje:** Python 3.10
**Descripción:** Herramienta CLI simple para simulación Monte Carlo de ruleta.

**Características:**
- Opciones de tendencias de apuestas
- Análisis probabilístico
- Output en línea de comandos

---

## 13. bocaletto-luca/Roulette - Ruleta Casino Definitive Release

**Repositorio:** https://github.com/bocaletto-luca/Roulette
**Lenguaje:** HTML5, JavaScript
**Descripción:** Juego de ruleta moderno basado en un solo archivo HTML con tabla de apuestas interactiva.

**Características:**
- Números 0-90 en grid interactivo (nota: esto es inusual)
- Sistema de apuestas clickeable
- Interfaz web moderna

**Notas:** Single-file implementation es interesante para compacidad

---

## 14. zlatnaspirala/maximumroulette-com - PWA con Demostraciones 3D

**Repositorio:** https://github.com/zlatnaspirala/maximumroulette-com
**Lenguaje:** TypeScript, JavaScript (Vanilla)
**Descripción:** Sitio PWA con demos JavaScript incluyendo slot 3D, WebRTC, WebGL video chat.

### Características:
- Motor Canvas 2D "Nidza"
- Motor TypeScript con física
- Estructura de escena orientada a objetos
- Integraciones WebRTC + WebGL

**Valores Numéricos Esperados:**
- Parámetros de motor de física personalizado
- Constantes de gravedad
- Coeficientes de fricción

---

## 15. CARLA Autonomous Driving Simulator (Rueda de Vehículo)

**Repositorio:** https://github.com/carla-simulator/carla
**Lenguaje:** C++, Python
**Descripción:** Simulador de conducción autónoma con modelado avanzado de física de ruedas.

### Valores Numéricos de Rueda (Aplicables a Ruleta):
- **Tire Friction** - Coeficiente de fricción de neumático
- **Damping Rate** - Amortiguación de rueda
- **Steering Angle** - Ángulo de dirección (N/A para ruleta)
- Modelo Pacejka - Función de fricción de neumáticos realista

**Ubicación:**
- Documentación: `/Docs/tuto_G_control_vehicle_physics.md`
- Código: `/Unreal/CarlaUE4/Plugins/Carla/Source/Carla/Vehicle/CarlaWheeledVehicle.cpp`

**Notas:** Overkill para ruleta pero tiene física de fricción muy completa

---

## Resumen de Valores Numéricos de Física Encontrados

### Por Categoría:

#### Velocidades Angulares
- Min Velocity: 0.0
- Max Velocity: 1.0
- Velocidades típicas: 1.56 rad/s (ejemplo educativo)

#### Aceleración/Desaceleración Angular
- Aceleración: 0.002 [unidades/frame]
- Desaceleración: -0.001 [unidades/frame]
- Angular Acceleration: -5.45 rad/s² (ejemplo educativo)

#### Parámetros de Tiempo
- Step Length: 16.67 ms (60 FPS)
- Frame rate: 60 FPS

#### Física de Movimiento
- Momentum (impulso) - usado en spin-wheel
- Drag (resistencia) - proporcional a velocidad
- rotationResistance - personalizable por repositorio

#### Fricción y Restitución
- Coeficientes esperados en implementaciones 3D (no encontrados valores específicos en búsqueda)
- Gravedad: 9.81 m/s² (estándar en simulaciones 3D)

### Funciones de Easing
- easeSinOut - por defecto en spin-wheel
- cubicOut - alternativa disponible
- Otras funciones de easing estándar

---

## Metodología de Búsqueda

Se realizaron 15 consultas específicas a través de WebSearch:
1. "site:github.com roulette simulator physics code"
2. "github roulette animation physics simulation"
3. "github roulette game engine source code physics"
4. "site:github.com wheel simulator physics constants"
5. "github roulette wheel rotation physics JavaScript"
6. "site:github.com/Nuraj250/SpinSight physics rotation velocity"
7. "site:github.com/CrazyTim/spin-wheel physics momentum drag"
8. "site:github.com/pjhjohn/roulette angular velocity deceleration"
9. "github roulette simulation friction coefficient restitution"
10. "site:github.com roulette ball physics collision damping"
11. Y 5 búsquedas adicionales especializadas

**Limitaciones Encontradas:**
- Acceso directo al código fuente requiere clonar repositorio
- Muchos repositorios de ruleta se enfocan en mecánica de juego, no en física
- Valores numéricos específicos están distribuidos en múltiples archivos
- Documentación completa de física es rara en estos proyectos

---

## Recomendaciones para Análisis Profundo

1. **SpinSight (Máxima Prioridad):** Clonar y examinar `/physics/` y `/simulation/` directorios
2. **pjhjohn/roulette (Alta Prioridad):** Valores explícitos ya detectados
3. **CrazyTim/spin-wheel (Media Prioridad):** Revisar `/src/` para constantes
4. **eknowles/roulette-ts (Media Prioridad):** Revisar integración Three.js
5. **CARLA (Referencia):** Para modelos de fricción avanzados

---

## Referencias de Búsqueda

Todas las búsquedas realizadas fueron en inglés utilizando:
- WebSearch API
- Operador site:github.com para filtrado
- Palabras clave: physics, simulation, angular velocity, friction, damping, deceleration, rotation

Fecha de búsqueda: 28 de junio de 2026
