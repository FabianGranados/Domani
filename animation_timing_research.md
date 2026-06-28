# Animation Timing Functions and Easing Curves Research
## Comprehensive Reference for Game Animations

### 1. CSS CUBIC-BEZIER VALUES FOR EASING FUNCTIONS

#### Standard Easing Keywords with Exact Values:

**ease-in** (Accelerating)
- `cubic-bezier(0.42, 0, 1.0, 1.0)`
- Behavior: Starts off slowly, accelerates toward completion
- Use case: Elements leaving the screen or fading out

**ease-out** (Decelerating)
- `cubic-bezier(0, 0, 0.58, 1.0)`
- Behavior: Starts quickly, slows down as animation ends
- Use case: Elements entering the screen or appearing

**ease-in-out** (Accelerate then Decelerate)
- `cubic-bezier(0.42, 0, 0.58, 1.0)`
- Behavior: Slow start, fast middle, slow end (perfectly symmetrical)
- Use case: Looping animations or elements that remain on screen

**ease** (Default - Cubic)
- `cubic-bezier(0.25, 0.1, 0.25, 1.0)`
- Behavior: Increases velocity toward middle, slows at end
- Use case: General purpose animations

#### Cubic-Bezier Parameter Structure:
- Format: `cubic-bezier(x1, y1, x2, y2)`
- P0 (start): Fixed at (0, 0) - represents time 0, progress 0
- P1 (control point 1): (x1, y1) - defines start tangent
- P2 (control point 2): (x2, y2) - defines end tangent
- P3 (end): Fixed at (1, 1) - represents time 1, progress 1

#### Valid Ranges:
- X-axis (time): Must be in [0, 1] range for both control points
- Y-axis (progress): Can exceed [0, 1] range to create overshoot/bounce effects
- Overshoot/bounce: Y values > 1 = overshoot effect; Y values < 0 = reverse/bounce effect

---

### 2. FRAME COUNT SPECIFICATIONS FOR ANIMATION PHASES

#### Walk Cycles:
- **16×16 sprites**: 4 frames minimum
- **32×32+ sprites**: 6-8 frames
- **Standard setup**: 8 FPS for casual walking
- **Brisk walk**: 10-12 FPS
- **Cycle duration**: One complete stride = 0.75 seconds

#### Idle Animations:
- **Standard**: 2-4 frames
- **Playback rate**: 8 FPS

#### Jump Animations:
- **Frame count**: 3-5 frames
  - Crouch/launch frame
  - Ascent frame
  - Peak frame
  - Descent frame
  - Landing frame
- **Playback rate**: 8-12 FPS

#### Attack/Combat Animations:
- **Wind-up phase**: 1-2 frames (slow display time)
- **Action phase**: 1 frame (shortest duration)
- **Recovery phase**: 2-3 frames (medium-slow display time)
- **Total frames**: 3-6 frames typical

#### Critical Design Principle:
**Frame timing beats frame count** - Four well-timed frames always look better than twelve frames at uniform speed.

#### Animation Playback Guidelines:
- Vary frame duration for realism: slow on anticipation, fast on action, slow on recovery
- Don't use uniform timing across all frames
- Action frames should be shortest (80ms)
- Impact frames: 150-200ms (vs 80ms for others)

---

### 3. MILLISECOND DURATIONS FOR STANDARD ANIMATIONS

#### Standard Animation Ranges:
- **Short microinteractions**: 100ms (e.g., Material Design toggles with color changes)
- **Fast interactions**: 150-250ms (recommended range)
- **Standard range**: 200-500ms (most common for UI animations)
- **Optimal desktop**: 150-200ms

#### Animation Phase Durations:

**Anticipation Phase:**
- Short anticipation (sharp, confident characters): 50-100ms
- Medium anticipation (neutral): 100-150ms
- Long anticipation (clumsy/cautious): 150-200ms

**Main Action Phase:**
- Shortest duration: 80-100ms
- Impact frame hold: 120-150ms (for visual weight/feedback)
- Standard action: 80-150ms

**Recovery Phase:**
- Medium-slow: 100-200ms
- Ease back to normal: 150-250ms

#### Attack Animation Example (4-frame):
- **Poor timing** (all uniform): 100ms each = mushy feel
- **Recommended approach**:
  - Wind-up: 150-200ms (slow)
  - Peak/Action: 80-100ms (fast)
  - Strike: 120ms (holds for impact)
  - Recovery: 150-200ms (slow settle)

#### Material Design Duration Standards:
- **Small transition areas** (icons, controls): 150ms
- **Medium transition areas** (chips, selections): 200-300ms
- **Large transition areas** (bottom sheets, full-screen): 300-500ms
- **Wearable adjustment**: ~70% of mobile duration (e.g., 210ms for wearable vs 300ms mobile)

#### Interactive Response Times:
- **Critical game actions** (precise combat, pixel-perfect platforming): < 100ms
- **General UI interactions**: 200-500ms
- **Player reaction time baseline**: ~250ms (0.25 seconds)
  - 60fps: 15 frames reaction time
  - 30fps: 8 frames reaction time

---

### 4. ACCELERATION AND DECELERATION CURVES

#### Mathematical Approach:
- **Linear (no easing)**: Constant speed throughout
- **Acceleration**: Start slow, speed up → quadratic/cubic functions
- **Deceleration**: Start fast, slow down → quadratic/cubic functions
- **Combined**: Accelerate then decelerate → quartic or composite functions

#### GSAP Power Easing System:
- **power0** (linear): No acceleration/deceleration - constant velocity
- **power1**: Subtle easing
- **power2**: Sweet spot - strong enough to feel polished but not exaggerated
- **power3**: Noticeable easing
- **power4**: Maximum easing - very pronounced

#### GSAP Easing Directions:
- **EaseIn**: `power1.in` - starts slow, accelerates
- **EaseOut**: `power1.out` - starts fast, decelerates
- **EaseInOut**: `power1.inOut` - combines both

#### GSAP Default:
- **Default ease**: `power1.out` (subtle ease-out recommended for most animations)

#### Frame-Based Acceleration Formula:
- Calculate dt (change in time) = 1.0 / total_animation_frames
- For smooth acceleration: increase dt variation based on frames to accelerate
- Linear acceleration: dt_start = 0, dt_end = max_speed
- Smooth curves: Use quadratic or cubic interpolation for dt values

#### Babylon.js EasingMode Options:
1. **EASINGMODE_EASEIN**: Follows mathematical formula (accelerating)
2. **EASINGMODE_EASEOUT**: Follows 100% interpolation minus formula (decelerating)
3. **EASINGMODE_EASEINOUT**: EaseIn for first half, EaseOut for second half

---

### 5. JAVASCRIPT/WEBGL ANIMATION TIMING PARAMETERS

#### requestAnimationFrame Fundamentals:
- **Target frame rate**: 60 FPS (standard for most displays)
- **Frame budget**: ~16.67ms per frame (1000ms / 60)
- **Typical deltaTime at 60fps**: ~16ms between frames
- **Callback timing**: `requestAnimationFrame(callback)` fires before next browser repaint

#### Delta Time Calculations:
```javascript
// Calculate deltaTime (elapsed time since last frame)
deltaTime = (timestamp - previousTimestamp) / 1000  // Convert to seconds
previousTimestamp = timestamp

// Example: Moving at 100 pixels per second
pixelsPerSecond = 100
pixelsPerMs = pixelsPerSecond / 1000  // 0.1 pixels/ms
positionChange = pixelsPerMs * deltaTime  // Frame-rate independent movement
```

#### Frame-Rate Independence:
- **60 Hz display**: ~16.67ms interval, 60 calls/second
- **120 Hz display**: ~8.33ms interval, 120 calls/second
- **144 Hz display**: ~6.94ms interval, 144 calls/second
- **Never assume fixed frame rate** - always use deltaTime

#### Animation Parameter Patterns:

**Constant Speed Animation:**
- Calculate total frames needed
- dt (change in t) = 1.0 / number_of_discrete_positions
- If dt values are equal, motion is at constant speed

**Time-Based Animation:**
- Parameter t varies from 0.0 to 1.0 over animation duration
- Current progress = t_current / t_total
- Calculate elapsed_time in milliseconds or seconds
- Map elapsed_time to progress parameter

#### WebGL-Specific Timing:
- Use high-resolution timestamp (milliseconds precision)
- Calculate elapsed time for frame-rate independent animation
- Apply easing curves to progress parameter (0.0 to 1.0)
- Multiply progress by total animation distance

#### Babylon.js Animation Timing:
```javascript
// BezierCurveEase parameters
new BABYLON.BezierCurveEase(x1, y1, x2, y2)
// Example: new BABYLON.BezierCurveEase(0.32, -0.73, 0.69, 1.59)

// EasingMode affects interpolation across animation duration
animation.easingMode = BABYLON.EasingFunction.EASINGMODE_EASEINOUT
```

#### Three.js Animation Loop Pattern:
- Use requestAnimationFrame callback
- Calculate deltaTime from timestamp
- Apply deltaTime to animation speed: `distance * deltaTime`
- Sync with 60fps target but adapt to actual display refresh rate

---

### 6. ANIMATION LIBRARY SPECIFICATIONS

#### Babylon.js:
- **EasingFunction base class**: Extendable for custom easing
- **Built-in easing modes**: EaseIn, EaseOut, EaseInOut
- **Bezier support**: BezierCurveEase(x1, y1, x2, y2)
- **Animation curve editor**: Built-in tool for visual curve design
- **Reference**: http://cubic-bezier.com

#### Three.js:
- **Animation approach**: Use multiple easing curves for different properties
- **Properties animatable**: Position, scale, rotation, emission color
- **Time sampling**: Compute values between 0-1 from time samples
- **requestAnimationFrame integration**: Standard 60fps target

#### GSAP (GreenSock Animation Platform):
- **Duration units**: Seconds (e.g., `duration: 1` = 1 second)
- **Default easing**: `power1.out` (recommended for general use)
- **Power easing range**: power0 to power4 (0 = linear, 4 = maximum)
- **Easing functions**: Optimized for web animation performance
- **Timeline support**: Sequence animations with precise timing

#### Material Design Animation Framework:
- **Small controls**: 150ms
- **Standard UI**: 200-300ms
- **Large/traverse elements**: 300-500ms
- **Easing preference**: Symmetrical curves for predictable motion

---

### 7. PRACTICAL TIMING EXAMPLES

#### Quick Toggle/Microinteraction:
- Duration: 100-150ms
- Easing: `power2.out` or `cubic-bezier(0, 0, 0.58, 1.0)` (ease-out)
- Deltatime: Single frame at 60fps = 16ms

#### Standard UI Transition:
- Duration: 250-300ms
- Easing: `power1.out` or `cubic-bezier(0.25, 0.1, 0.25, 1.0)` (ease)
- Frames: ~4-5 frames at 60fps

#### Game Attack Animation:
- Wind-up: 150ms (frames: 2-3 at slow speed)
- Action: 100ms (frame: 1)
- Recovery: 200ms (frames: 3-4 at slow speed)
- Total: 450ms (relatively quick combat feel)

#### Anticipation Example:
- Small character flinch: 50-80ms anticipation
- Jump setup: 100-150ms crouch duration
- Impact hold: 120-150ms for visual feedback

---

## Sources and References

### CSS and Web Standards:
- [MDN: Easing Functions](https://developer.mozilla.org/en-US/docs/Web/CSS/easing-function)
- [MDN: cubic-bezier()](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/easing-function/cubic-bezier)
- [W3C: CSS Easing Functions Level 1](https://www.w3.org/TR/css-easing-1/)
- [CSS-Tricks: cubic-bezier()](https://css-tricks.com/almanac/functions/c/cubic-bezier/)

### Animation Principles and Game Timing:
- [Timing in Animation: Game-Ready Guide 2026](https://sunstrikestudios.com/en/blog/timing_in_animation/)
- [Animation Fundamentals: Easing, Anticipation, Follow Through](https://www.premiumbeat.com/blog/animation-easing-anticipation-follow-through/)
- [Sprite Animation Frames Analysis](https://www.sprite-ai.art/blog/sprite-animation-frames)
- [NN/G: Executing UX Animations](https://www.nngroup.com/articles/animation-duration/)

### Material Design:
- [Material Design: Duration & Easing](https://m3.material.io/styles/motion/easing-and-duration)
- [Material Design v1: Duration & Easing](https://m1.material.io/motion/duration-easing.html)

### JavaScript and WebGL Timing:
- [MDN: requestAnimationFrame()](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
- [WebGL Fundamentals: Animation](https://webglfundamentals.org/webgl/lessons/webgl-animation.html)
- [RequestAnimationFrame vs setTimeout](https://blog.openreplay.com/requestanimationframe-settimeout-use/)
- [Time-Based Animation with RequestAnimationFrame](https://dr-nick-nagel.github.io/blog/raf-time.html)

### Game Engine Libraries:
- [Babylon.js: Advanced Animation Methods](https://endoc.cnbabylon.com/babylon101/animations)
- [GSAP: Timeline Documentation](https://gsap.com/docs/v3/GSAP/Timeline/)
- [GSAP: Easing Functions Guide](https://gsapify.com/gsap-ease/)

### Reference Tools:
- [Easings.net: Easing Functions Reference](https://easings.net/)
- [Cubic-Bezier Generator](https://cubic-bezier.com/)

---

## Key Takeaways

1. **Cubic-bezier values are standard across platforms**: Use `(0.42, 0, 1.0, 1.0)` for ease-in consistently
2. **Frame timing matters more than frame count**: 4 well-timed frames > 12 uniform frames
3. **200-500ms is the goldilocks zone**: Avoid animations that feel sluggish or jarring
4. **Always use deltaTime**: Frame-rate independence is essential for consistent gameplay
5. **Match animation type to easing**: Anticipation gets ease-in, recovery gets ease-out
6. **60fps is the target**: 16ms per frame budget, but adapt to actual display refresh rate
7. **Material Design is a great reference**: 150-500ms durations scale by animation scope
