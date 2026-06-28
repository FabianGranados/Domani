# Ejemplos Prácticos de Código: Animación de Objetos Giratorios

## 1. JAVASCRIPT/CANVAS - Rueda Giratoria Básica

### Implementación con Exponential Decay

```javascript
class SpinningWheel {
  constructor(canvas, radius = 200) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.radius = radius;
    this.angle = 0;
    this.angularVelocity = 0;
    this.decayFactor = 0.96; // 4% fricción por frame
    this.isSpinning = false;
  }

  spin(initialVelocity) {
    this.angularVelocity = initialVelocity;
    this.isSpinning = true;
    this.animate();
  }

  animate = () => {
    if (this.isSpinning) {
      // Aplicar decaimiento exponencial
      this.angularVelocity *= this.decayFactor;
      
      // Actualizar ángulo
      this.angle += this.angularVelocity;
      
      // Detener si velocidad es insignificante
      if (Math.abs(this.angularVelocity) < 0.001) {
        this.isSpinning = false;
      }
      
      // Dibujar rueda
      this.draw();
      
      // Siguiente frame
      requestAnimationFrame(this.animate);
    }
  };

  draw() {
    // Limpiar canvas
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Dibujar rueda
    this.ctx.save();
    this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.rotate(this.angle);
    
    // Dibujar círculo base
    this.ctx.fillStyle = '#3498db';
    this.ctx.beginPath();
    this.ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Dibujar segmentos
    const segments = 8;
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      this.ctx.fillStyle = i % 2 === 0 ? '#2980b9' : '#3498db';
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.arc(0, 0, this.radius, angle, angle + Math.PI / segments);
      this.ctx.closePath();
      this.ctx.fill();
    }
    
    this.ctx.restore();
  }
}

// Uso
const canvas = document.getElementById('wheelCanvas');
const wheel = new SpinningWheel(canvas);

// Iniciar spin con velocidad angular (radianes/frame)
canvas.addEventListener('click', () => {
  wheel.spin(0.5); // Velocidad moderada
});
```

---

## 2. UNITY C# - Rotación con Damping

### Versión 1: Angular Damping Física

```csharp
using UnityEngine;

public class RotatingObject : MonoBehaviour {
    public float angularDamping = 0.5f;
    private Rigidbody rb;

    void Start() {
        rb = GetComponent<Rigidbody>();
    }

    public void Spin(Vector3 axis, float rotationSpeed) {
        // Aplicar velocidad angular
        rb.angularVelocity = axis.normalized * rotationSpeed;
        
        // El damping se aplica automáticamente por Unity
        rb.angularDrag = angularDamping;
    }
}
```

### Versión 2: Decay Manual (Mejor control)

```csharp
using UnityEngine;

public class ManualSpinningObject : MonoBehaviour {
    private float angularVelocity = 0f;
    private float decayFactor = 0.96f; // Configurable
    private float velocityThreshold = 0.001f;
    
    private Quaternion targetRotation;
    private bool isSpinning = false;

    public void StartSpin(float initialVelocity) {
        angularVelocity = initialVelocity;
        isSpinning = true;
    }

    void FixedUpdate() {
        if (!isSpinning) return;

        // Aplicar decaimiento exponencial
        angularVelocity *= decayFactor;

        // Actualizar rotación
        float rotationThisFrame = angularVelocity * Time.fixedDeltaTime * Mathf.Rad2Deg;
        transform.Rotate(Vector3.up, rotationThisFrame);

        // Detener si velocidad es baja
        if (Mathf.Abs(angularVelocity) < velocityThreshold) {
            isSpinning = false;
        }
    }

    public void SetDecayFactor(float factor) {
        // factor: 0.94 (rápido) a 0.99 (lento)
        decayFactor = Mathf.Clamp01(factor);
    }
}
```

### Versión 3: Con DOTween y Easing

```csharp
using UnityEngine;
using DG.Tweening;

public class DOTweenSpinner : MonoBehaviour {
    public void SpinWithEasing(float rotations, float duration) {
        // Rotar con ease-out
        transform.DOLocalRotate(
            new Vector3(0, rotations * 360f, 0),
            duration,
            RotateMode.FastBeyond360
        )
        .SetEase(Ease.OutQuad)
        .OnComplete(() => Debug.Log("Spin completed"));
    }

    public void SpinWithCubic(float rotations, float duration) {
        transform.DOLocalRotate(
            new Vector3(0, rotations * 360f, 0),
            duration,
            RotateMode.FastBeyond360
        )
        .SetEase(Ease.OutCubic);
    }
}
```

---

## 3. PHASER 3 - Rueda de Premios

### Implementación completa

```javascript
class SpinWheelScene extends Phaser.Scene {
    constructor() {
        super({ key: 'SpinWheelScene' });
    }

    preload() {
        // Cargar imagen de rueda si existe
    }

    create() {
        // Crear rueda (círculo con segmentos)
        this.wheel = this.add.graphics();
        this.drawWheel();
        
        // Posicionar
        this.wheelX = 400;
        this.wheelY = 300;
        this.wheelRadius = 150;
        
        // Estado
        this.wheelRotation = 0;
        this.wheelVelocity = 0;
        this.isSpinning = false;
        
        // Input
        this.input.on('pointerdown', () => this.spinWheel());
        
        // Texto de información
        this.infoText = this.add.text(400, 50, 'Click to spin', {
            fontSize: '24px',
            fill: '#000000'
        }).setOrigin(0.5);
    }

    drawWheel() {
        this.wheel.clear();
        this.wheel.fillStyle(0x2980b9);
        this.wheel.beginPath();
        this.wheel.arc(this.wheelX, this.wheelY, this.wheelRadius, 0, Math.PI * 2);
        this.wheel.closePath();
        this.wheel.fillPath();

        // Líneas divisoras
        const segments = 8;
        this.wheel.lineStyle(2, 0xffffff);
        
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const x1 = this.wheelX + Math.cos(angle) * this.wheelRadius;
            const y1 = this.wheelY + Math.sin(angle) * this.wheelRadius;
            this.wheel.lineBetween(this.wheelX, this.wheelY, x1, y1);
        }

        // Marcador superior
        this.wheel.fillStyle(0xff0000);
        this.wheel.beginPath();
        this.wheel.moveTo(this.wheelX - 10, this.wheelY - this.wheelRadius - 20);
        this.wheel.lineTo(this.wheelX + 10, this.wheelY - this.wheelRadius - 20);
        this.wheel.lineTo(this.wheelX, this.wheelY - this.wheelRadius + 10);
        this.wheel.closePath();
        this.wheel.fillPath();
    }

    spinWheel() {
        if (this.isSpinning) return;

        this.isSpinning = true;
        
        // Velocidad inicial aleatoria (8-12 rotaciones)
        const rotations = Phaser.Math.Between(8, 12);
        const duration = Phaser.Math.Between(3000, 5000); // 3-5 segundos

        // Usar tween con easing suave
        this.tweens.add({
            targets: this,
            wheelRotation: rotations * Math.PI * 2,
            duration: duration,
            ease: 'Sine.easeOut', // O 'Quad.easeOut'
            onComplete: () => {
                this.isSpinning = false;
                this.infoText.setText('Spin completed! Click again.');
            }
        });
    }

    update() {
        // Dibujar rueda rotada
        this.wheel.clear();
        
        this.wheel.save();
        this.wheel.translate(this.wheelX, this.wheelY);
        this.wheel.rotate(this.wheelRotation);
        this.wheel.translate(-this.wheelX, -this.wheelY);
        
        this.drawWheel();
        
        this.wheel.restore();
    }
}

// Lanzar escena
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    scene: SpinWheelScene
};

const game = new Phaser.Game(config);
```

---

## 4. THREE.JS - Objeto 3D Rotativo

```javascript
import * as THREE from 'three';

class RotatingObjectScene {
    constructor(container) {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        container.appendChild(this.renderer.domElement);

        this.camera.position.z = 5;

        // Crear objeto giratorio
        const geometry = new THREE.SphereGeometry(2, 32, 32);
        const material = new THREE.MeshPhongMaterial({ color: 0x3498db });
        this.sphere = new THREE.Mesh(geometry, material);
        this.scene.add(this.sphere);

        // Luz
        const light = new THREE.PointLight(0xffffff, 1, 100);
        light.position.set(10, 10, 10);
        this.scene.add(light);

        // Estado de rotación
        this.angularVelocity = { x: 0, y: 0.05, z: 0 };
        this.decayFactor = 0.96;
        
        // Iniciar animación
        this.animate();
    }

    startSpin(velocityY = 0.1) {
        this.angularVelocity.y = velocityY;
    }

    animate = () => {
        requestAnimationFrame(this.animate);

        // Aplicar rotación con decay
        this.sphere.rotation.x += this.angularVelocity.x;
        this.sphere.rotation.y += this.angularVelocity.y;
        this.sphere.rotation.z += this.angularVelocity.z;

        // Aplicar decaimiento
        this.angularVelocity.x *= this.decayFactor;
        this.angularVelocity.y *= this.decayFactor;
        this.angularVelocity.z *= this.decayFactor;

        this.renderer.render(this.scene, this.camera);
    };
}

// Uso
const scene = new RotatingObjectScene(document.body);
document.addEventListener('click', () => scene.startSpin(0.15));
```

---

## 5. FLUTTER - Rueda Giratoria Animada

```dart
import 'package:flutter/material.dart';

class SpinningWheelPage extends StatefulWidget {
  @override
  _SpinningWheelPageState createState() => _SpinningWheelPageState();
}

class _SpinningWheelPageState extends State<SpinningWheelPage> 
    with TickerProviderStateMixin {
  late AnimationController _controller;
  double _rotationAngle = 0.0;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: Duration(seconds: 3),
      vsync: this,
    );
  }

  void _spinWheel() {
    // Generar velocidad aleatoria
    final Random random = Random();
    final double rotations = random.nextInt(8) + 8; // 8-15 rotaciones
    
    _controller.forward(from: 0.0);

    // Tween con easing
    Tween(begin: 0.0, end: rotations * 2 * pi)
        .animate(
          CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic),
        )
        .addListener(() {
          setState(() {
            _rotationAngle = (Tween(begin: 0.0, end: rotations * 2 * pi)
                .evaluate(CurvedAnimation(
                  parent: _controller,
                  curve: Curves.easeOutCubic,
                )));
          });
        });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Spinning Wheel')),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Transform.rotate(
              angle: _rotationAngle,
              child: Container(
                width: 300,
                height: 300,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.blue,
                  border: Border.all(color: Colors.white, width: 2),
                ),
                child: Center(
                  child: Text('SPIN ME!'),
                ),
              ),
            ),
            SizedBox(height: 50),
            ElevatedButton(
              onPressed: _spinWheel,
              child: Text('SPIN'),
              style: ElevatedButton.styleFrom(
                padding: EdgeInsets.symmetric(horizontal: 40, vertical: 20),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }
}
```

---

## 6. GSAP (JavaScript) - Animación con Easing

```javascript
// Requiere: <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>

class GSAPSpinner {
    constructor(elementSelector) {
        this.element = document.querySelector(elementSelector);
        this.isSpinning = false;
    }

    spin() {
        if (this.isSpinning) return;
        this.isSpinning = true;

        // Generar rotaciones aleatorias
        const rotations = gsap.utils.random(8, 12);
        const duration = gsap.utils.random(2, 4);

        gsap.to(this.element, {
            rotation: rotations * 360,
            duration: duration,
            ease: "power1.out", // O "sine.out", "quad.out"
            onComplete: () => {
                this.isSpinning = false;
            }
        });
    }

    // Con Bezier personalizado
    spinWithBezier() {
        gsap.to(this.element, {
            rotation: 10 * 360,
            duration: 3,
            ease: "cubic-bezier(0, 0, 0.58, 1)", // ease-out cúbica
            onComplete: () => {
                this.isSpinning = false;
            }
        });
    }
}

// Uso
const spinner = new GSAPSpinner('.wheel');
document.querySelector('.spin-btn').addEventListener('click', 
    () => spinner.spin()
);
```

---

## 7. CSS + JavaScript - Animación Pura CSS

```html
<!DOCTYPE html>
<html>
<head>
<style>
    .wheel {
        width: 300px;
        height: 300px;
        background: conic-gradient(
            from 0deg,
            #3498db 0deg 45deg,
            #2980b9 45deg 90deg,
            #3498db 90deg 135deg,
            #2980b9 135deg 180deg,
            #3498db 180deg 225deg,
            #2980b9 225deg 270deg,
            #3498db 270deg 315deg,
            #2980b9 315deg 360deg
        );
        border-radius: 50%;
        cursor: pointer;
        transition: transform 0.1s linear;
    }

    .wheel.spinning {
        animation: spin 3s cubic-bezier(0, 0, 0.58, 1) forwards;
    }

    @keyframes spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(3600deg);
        }
    }

    .marker {
        position: absolute;
        width: 20px;
        height: 20px;
        background: #ff0000;
        border-radius: 50%;
        top: -10px;
        left: 50%;
        transform: translateX(-50%);
    }
</style>
</head>
<body>

<div class="wheel-container">
    <div class="marker"></div>
    <div class="wheel" id="wheel"></div>
</div>

<script>
    const wheel = document.getElementById('wheel');
    
    wheel.addEventListener('click', () => {
        if (wheel.classList.contains('spinning')) return;
        
        wheel.classList.add('spinning');
        
        // Remover clase después de animación
        setTimeout(() => {
            wheel.classList.remove('spinning');
        }, 3000);
    });
</script>

</body>
</html>
```

---

## 8. FÓRMULA DE DECAY - Cálculo Temporal

```javascript
// Calcular cuántos frames se necesitan para que la velocidad sea insignificante

function calculateDecayFrames(decayFactor, threshold = 0.001) {
    // decay_factor^n = threshold
    // n * log(decay_factor) = log(threshold)
    // n = log(threshold) / log(decay_factor)
    
    const frames = Math.log(threshold) / Math.log(decayFactor);
    return Math.ceil(frames);
}

// Ejemplos:
console.log('0.94 factor -> Frames:', calculateDecayFrames(0.94)); // ~69
console.log('0.96 factor -> Frames:', calculateDecayFrames(0.96)); // ~102
console.log('0.98 factor -> Frames:', calculateDecayFrames(0.98)); // ~203

// A 60 FPS (16.67ms per frame):
// 0.94: 69 frames = 1.15 segundos
// 0.96: 102 frames = 1.70 segundos
// 0.98: 203 frames = 3.38 segundos

function calculateTimeToStop(decayFactor, fps = 60) {
    const frames = calculateDecayFrames(decayFactor);
    const ms = (frames / fps) * 1000;
    return {
        frames: frames,
        milliseconds: ms.toFixed(0),
        seconds: (ms / 1000).toFixed(2)
    };
}

console.log(calculateTimeToStop(0.96));
// { frames: 102, milliseconds: "1700", seconds: "1.70" }
```

---

## Notas de Implementación

1. **Threshold de parada:** Usar 0.001 radianes/segundo o similar
2. **FPS:** Ajustar decay_factor según FPS (móvil puede ser 30-60 FPS)
3. **Suavidad:** decay_factor más cercano a 1.0 = animación más larga
4. **Respuesta visual:** Probar valores 0.94-0.98 para encontrar el equilibrio
5. **Performance:** Usar decay iterativo es más eficiente que tweens complejos

