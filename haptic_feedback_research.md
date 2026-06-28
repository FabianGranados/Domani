# Haptic Feedback & Vibration Patterns in Game Design - Research Report

## Executive Summary

This comprehensive research synthesizes findings from game development documentation, mobile platform specifications, controller APIs, and industry standards to provide concrete timing, intensity, and pattern specifications for haptic feedback implementation in games.

---

## 1. HAPTIC RUMBLE PATTERNS - TIMING SPECIFICATIONS (milliseconds)

### 1.1 Standard Pulse Durations

**Target Range: 50-200ms pulses** (as specified in initial research parameters)

| Pattern Type | Duration | Use Case |
|---|---|---|
| Quick tap/click | 50ms | Button press, UI interaction |
| Short pulse | 50-100ms | Light feedback, collision detection |
| Medium pulse | 100-150ms | Standard impact, moderate feedback |
| Strong pulse | 150-200ms | Heavy impact, explosion, significant event |
| Double tap | 50ms + 50ms gap + 50ms | Rapid confirmation, quick feedback |
| Long rumble | 200-400ms | Engine sound, sustained effect |

### 1.2 Motor Response Times

**Eccentric Rotating Mass (ERM) Motors:**
- Spin-up time: ~50ms (to reach full intensity)
- Stop time: ~50ms (from full to off)
- Total response window: 100ms
- Best for: Long, powerful rumbles (explosions, engines, heavy impacts)
- Limitation: Cannot produce sharp "clicks" due to inertia

**Linear Resonant Actuators (LRA) Motors:**
- Rise time: ~5ms (to reach full intensity)
- Fall time: ~5-20ms (from full to off)
- Total response window: 5-20ms
- Rise time specification: 50ms max (industry standard)
- Best for: Sharp clicks, rapid patterns, texture simulation, subtle ticks
- Advantage: "High Definition Haptics" with millisecond precision

### 1.3 Critical Timing Windows for User Perception

- **Haptic-to-visual sync**: Within 50ms after visual contact = optimal perception
- **Pre-visual haptic**: Tolerance window shrinks to 15ms (if haptic arrives BEFORE visual cue)
- **Sub-threshold gap**: 5-10ms between pulses = too short to detect as separate events
- **Discernible gap**: 50ms or longer = clearly perceived as separate vibrations
- **Pattern cohesion**: Gaps exceeding 100ms begin feeling like individual effects rather than unified pattern

### 1.4 Gap Spacing for Pattern Effects

**Spinning Sensation (Android Spin Primitive):**
- 0ms gap between spins = tight spinning feeling
- 10-50ms gap = looser spinning sensation
- >100ms gap = begins feeling like individual effects

---

## 2. INTENSITY LEVELS & PERCENTAGES

### 2.1 Amplitude Scale Specifications

**Android Vibration API (0-255 scale):**
- 0: Vibrator "off state"
- 33-100: Low intensity range
- 100-200: Medium intensity range
- 200-255: High intensity range
- Typical range used: 33-255

**Normalized Intensity Scale (0-1.0):**
- 0.0: Minimum perceivable vibration (NOT off)
- 0.5: Low intensity version
- 0.7: Medium intensity version
- 1.0: High intensity version (maximum)
- **Perceptual ratio requirement**: Use scales differing by 1.4x or more for distinct perception
- **Practical limit**: Only 3 distinct levels (low/medium/high) are perceptually distinct

**Apple iOS Impact Feedback Classes:**
- Light: Subtle vibration (minor errors, gentle feedback)
- Medium: Noticeable vibration (prominent actions)
- Heavy: Strong vibration (critical interactions)

### 2.2 Application-Specific Intensity Percentages

**Environmental Haptics:**
- Background vibration: 10-20% intensity

**Medical/Clinical Settings (Research-Based):**
- Low intensity: 25% of maximum tactor amplitude
- Medium intensity: 50% of maximum tactor amplitude
- High intensity: 75% of maximum tactor amplitude
- **Critical finding**: Maximum intensity (100%) triggers sensory saturation and overstimulation

### 2.3 Pattern Intensity Sequences

**Success Pattern:**
- Pulse 1: Light vibration (0.3-0.5 intensity)
- Pulse 2: Heavy vibration (0.8-1.0 intensity)
- Gap between: 50-100ms

**Failure Pattern:**
- Android: Medium (0.5) → Heavy (0.8) → Heavy (0.8) → Light (0.3)
- iOS: Failure impact feedback
- Typical duration: 150-300ms total

---

## 3. TIMING PATTERNS FOR DIFFERENT GAME EVENTS

### 3.1 Impact/Collision Events

**Light Impact (Small collision, weak impact):**
- Duration: 50-75ms
- Intensity: 0.3-0.5 (light to low)
- Pattern: Single pulse
- Motor: LRA preferred (sharp definition)

**Medium Impact (Standard collision):**
- Duration: 100-150ms
- Intensity: 0.6-0.75 (medium)
- Pattern: Single pulse, optional slight decay
- Motor: LRA or dual-motor (ERM+LRA)

**Heavy Impact (Explosion, major collision):**
- Duration: 150-300ms
- Intensity: 0.8-1.0 (heavy)
- Pattern: Initial sharp hit (5-20ms) + sustained rumble (100-200ms)
- Motor: ERM for sustained, LRA for sharp attack

**Extended Impact (Earthquake, continuous effect):**
- Duration: 400-1000ms
- Intensity: 0.4-0.7 (sustained)
- Pattern: Variable intensity over time (envelope control)
- Motor: ERM (sustained vibration)

### 3.2 Success Events

**Confirmation/Success:**
- Total duration: 100-200ms
- Pattern: Light tap (0.3, 50ms) + medium hit (0.7, 50-100ms)
- Alternative: Single crisp pulse (0.7-0.8, 100-150ms)

**Level Complete/Achievement:**
- Duration: 200-400ms
- Pattern: Double pulse with increasing intensity
  - Pulse 1: 0.5 intensity, 100ms
  - Gap: 50ms
  - Pulse 2: 0.8 intensity, 100ms
- Motor: LRA for definition, ERM for power

**Purchase/Payment Success:**
- Duration: 150-250ms
- Pattern: Three short taps (0.6, 50ms each with 30ms gaps)
- Characteristic feel: Distinct "ticking" sensation

### 3.3 Failure Events

**Error/Negative Feedback:**
- Duration: 100-200ms
- Pattern: Single strong vibration with quick cutoff
- Intensity: 0.8-1.0
- Motor: LRA for sharp definition

**Invalid Action/Button Press:**
- Duration: 75-150ms
- Pattern: Longer, more sustained buzz
- Intensity: 0.6-0.8
- Motor: ERM or dual-motor

**Failure/Penalty:**
- Duration: 200-400ms
- Pattern: Four-phase sequence
  - Phase 1: Medium (0.5, 50ms)
  - Phase 2: Heavy (0.8, 75ms)
  - Phase 3: Heavy (0.8, 75ms)
  - Phase 4: Light (0.3, 50ms)
- Motor: Dual-motor for variation

### 3.4 User Interface Events

**Button Press:**
- Duration: 50-75ms
- Intensity: 0.4-0.6
- Pattern: Single sharp tap

**Toggle/Switch:**
- Duration: 100ms
- Intensity: 0.5-0.7
- Pattern: Crisp, clear pulse

**Menu Navigation:**
- Duration: 30-50ms
- Intensity: 0.3-0.4
- Pattern: Subtle feedback (optional)

**Notification/Alert:**
- Duration: 200-300ms
- Intensity: 0.6-0.8
- Pattern: Variable (notification-specific)

---

## 4. MOBILE AND CONTROLLER HAPTIC STANDARDS

### 4.1 iOS (Apple) Standards

**Hardware:**
- **Taptic Engine**: Precise linear actuator available on all modern iPhones
- **Resonant frequency**: ~160 Hz
- **Precision**: Millisecond-level control

**Core Haptics API (iOS 13+):**
- **Event Types**: Continuous (up to 30 seconds max) and Transient
- **Control Parameters**:
  - Intensity: 0-1.0 scale
  - Sharpness: 0-1.0 scale (0.0 = smooth, 1.0 = crisp)
  - Duration: Measured in milliseconds
- **Format**: AHAP (Apple Haptic Audio Pattern) - JSON-based pattern description
- **Pattern array**: (duration, amplitude) pairs in milliseconds
- **Preferred library**: Core Haptics for rich patterns; UIFeedbackGenerator for simple cues

**UIFeedbackGenerator Classes:**
- UIImpactFeedbackGenerator (light, medium, heavy)
- UINotificationFeedbackGenerator (success, warning, error)
- UISelectionFeedbackGenerator (subtle selection feedback)

### 4.2 Android Standards

**Hardware:**
- **Modern phones**: VibratorManager + LRA actuators
- **Shift**: Moving from ERM to LRA (Linear Resonant Actuators)
- **Resonant frequency**: Queryable via `vibrator.resonantFrequency`

**Vibration API Hierarchy (Priority):**

**Priority 1: Haptic Primitives (Android 12+)**
```
PRIMITIVE_LOW_TICK: ~50ms sharp pulse
PRIMITIVE_SPIN: Rotating sensation (gap-configurable)
PRIMITIVE_THUD: Deep impact
PRIMITIVE_CLICK: Sharp click
```

**Priority 2: Amplitude Control (Android 8+)**
- VibrationEffect.createWaveform() with amplitude array
- Amplitude scale: 0-255
- Timing array: LongArray of milliseconds

**Priority 3: Basic Vibration (Android 5+)**
- On/off only (no amplitude variation)
- Binary fallback when amplitude control unavailable

**Envelope Effects (Android 16+):**
- BasicEnvelopeBuilder: Intensity + sharpness control
- WaveformEnvelopeBuilder: Frequency-aware patterns
- Parameters: intensity (0-1), sharpness (0-1), duration (ms)

**Minimum Output Acceleration**: 0.1 G (gravitational)

### 4.3 PlayStation 5 DualSense Controller

**Hardware:**
- **Dual linear haptic motors** in left and right grips
- **Technology**: Voice-coil-actuator-based haptic feedback (precision actuators)
- **Audio-based**: Uses channels 3-4 of quad-channel audio device
- **Limitation**: No Bluetooth support (requires USB audio exposure)

**Haptic Intensity Control:**
- Configurable haptic intensity (range not publicly specified, typically 0-100%)
- Variable resistance simulation (unlike Xbox's binary resistance)
- Platform: DualSenseX tool for adjustment and testing

**Adaptive Triggers:**
- Variable resistance (unlike Xbox's binary)
- Simulates physical sensations (gun resistance, acceleration pressure, etc.)

### 4.4 Xbox Series X|S Controller

**Haptic Features:**
- **Binary triggers**: Full resistance or none (not variable)
- **Standard rumble**: No precision haptic feedback like DualSense
- **Vibration intensity**: Adjustable across spectrum (games like Sea of Thieves, Ori)
- **Accessibility**: Must allow intensity adjustment for players with sensory limitations

### 4.5 Nintendo Switch Joy-Con

**Motor Type:**
- **Linear Resonant Actuators (LRA)** instead of ERM
- **Advantage**: Much finer control than ERM motors
- **Precision**: Can produce detailed vibration patterns and textures

### 4.6 Cross-Platform Best Practices

**Universal Principles:**
1. Always check device capability before using precision haptics
2. Provide intensity adjustment (0-100%) for accessibility
3. Fallback to basic vibration on unsupported devices
4. Test on actual hardware (simulator behavior differs)
5. Synchronize haptic feedback with audio (within 50ms window)
6. Avoid sensory saturation (100% intensity causes overstimulation)

---

## 5. ROULETTE AND SPINNING WHEEL MECHANICS

### 5.1 Roulette-Specific Haptic Patterns

**Spinning Wheel Simulation:**
- **Base vibration**: Increases as wheel speed increases
- **Synchronization**: Successive actuations of multiple motors to simulate spinning
- **Frequency components**: 
  - Some simulate spinning movement
  - Others simulate ball tumbling at wheel periphery

**Roulette Ball Release:**
- **Pop sensation**: Clear jolt when ball released into wheel
- **Bounce effects**: Additional pops each time ball bounces before settling
- **Duration**: 50-200ms per pop
- **Intensity**: 0.6-0.9 (prominent but not maximum)

### 5.2 Betting Interaction Haptics

**Betting Slider Feedback:**
- **Low-magnitude pulse**: For every 10 chips bet
- **Duration**: 30-50ms per pulse
- **Intensity**: 0.2-0.3 (subtle, background)
- **Frequency**: Repeating at intervals (every 10-chip increment)

**Bet Confirmation:**
- **Pop/jolt**: Clear haptic feedback
- **Duration**: 100-150ms
- **Intensity**: 0.7-0.9

**Rocker Switch Activation:**
- **Increasing vibration**: Corresponds to wheel speed increase
- **Intensity range**: 0.3 (start) → 0.8 (max speed)
- **Duration**: 100-500ms (continuous increase)

### 5.3 Roulette Outcome Haptics

**Winning Number Hit:**
- **Pattern**: Strong pulse sequence
  - Initial impact: 0.9 intensity, 150-200ms
  - Follow-up pulses: 0.6 intensity, 100ms (2-3 additional)
  - Gaps: 50-100ms between pulses

**Close Miss:**
- **Pattern**: Medium intensity, shorter duration
  - Intensity: 0.5-0.6
  - Duration: 100-150ms total

**Wheel Deceleration:**
- **Decreasing intensity**: Mirrors acceleration
- **Duration**: 200-500ms (continuous decrease)
- **Pattern**: ERM motor ideal for sustained deceleration feel

---

## 6. TECHNICAL SPECIFICATIONS BY PLATFORM

### 6.1 Custom Haptic Pattern Timing Example (Android Waveform)

```
Timings: [50ms, 50ms, 50ms, 50ms, 50ms, 100ms, 350ms, 25ms, 25ms, 25ms, 25ms, 200ms]
Amplitudes: [100, 0, 100, 0, 100, 0, 200, 0, 150, 0, 150, 0]
```
- Alternating on/off pattern for variation
- Progressive intensity changes
- Ends at 0 amplitude for active braking

### 6.2 Frequency Specifications

**Taptic Engine (iOS):**
- Resonant frequency: ~160 Hz
- Optimal for: Sharpness control (0-1.0 scale)

**Android Vibrator:**
- Device-specific resonant frequency
- Queryable: `vibrator.resonantFrequency`
- Range: Device dependent
- Frequency profile: `vibrator.frequencyProfile?.getFrequencyRange(outputAccelerationGs)`

**Game Industry Standards:**
- LRA preferred resonance: 30-500 Hz range
- ERM typical: Lower frequency range (broader spectrum)

### 6.3 Envelope Control (Advanced Pattern Building)

**Duration Control Points:**
- **Minimum duration**: Defined per device
- **Typical fast transition**: ~20ms
- **Typical ramp**: 50-500ms
- **Critical rule**: Always start and end at zero amplitude (prevents resonance)

---

## 7. GAME DESIGN BEST PRACTICES

### 7.1 Pattern Design Process

1. **Assign patterns to events**: Each in-game action gets distinct vibration
2. **Match intensity to action**: Light feedback for minor events, strong for major
3. **Test on real hardware**: Simulator behavior differs significantly
4. **Consider motor type**: ERM vs. LRA capabilities
5. **Provide user control**: Allow intensity adjustment (0-100%)
6. **Avoid saturation**: Don't exceed 75-80% maximum intensity sustained
7. **Create haptic vocabulary**: Users should recognize feedback types

### 7.2 Motor Capabilities Summary

| Motor Type | Start/Stop Time | Best Use | Precision |
|---|---|---|---|
| ERM | ~100ms total | Long rumbles, explosions, engines | Low (mushy) |
| LRA | ~5-20ms total | Clicks, impacts, textures | High (crisp) |
| Dual (ERM+LRA) | Mixed | Complex patterns with depth | High |

### 7.3 Key Findings: Durations by Action

- **UI interactions**: 50-100ms
- **Collision/impact**: 75-300ms
- **Success feedback**: 100-200ms
- **Failure feedback**: 100-400ms
- **Continuous effects**: 200-1000ms+
- **Spinning/rotation**: Variable (0-100ms gaps)
- **Roulette events**: 50-500ms depending on component

---

## Sources & References

- [Rumble Device: The Definitive Guide to Modern Haptic Technology](https://www.harrisonjack.co.uk/rumble-device/)
- [Android Haptics: Create custom haptic effects](https://developer.android.com/develop/ui/views/haptics/custom-haptic-effects)
- [Stop the Buzz, Start the Symphony: Controller Vibration Guide](https://www.wayline.io/blog/responsible-controller-vibration)
- [TITAN Haptics: From Rumble to Refinement](https://titanhaptics.com/from-rumble-to-refinement-responsive-haptics-and-when-to-use-it/)
- [Using Haptics in Mobile Apps](https://newly.app/articles/haptics-mobile-apps)
- [Haptic Design for Video Games - WYVRN Docs](https://doc.wyvrn.com/docs/interhaptics-sdk/guides-and-tutorials/haptic-design-for-video-games/)
- [Decoding the Feeling: VR Sim Racing Steering Wheel Haptic Feedback Study](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12694510/)
- [PCGamingWiki: DualSense Controller](https://www.pcgamingwiki.com/wiki/Controller:DualSense)
- [Material Design: Android Haptics](https://m2.material.io/design/platform-guidance/android-haptics.html)
- [The Science of Haptics: How Vibration Enhances Immersion](https://www.geniuscrate.com/the-science-of-haptics-how-vibration-enhances-immersion-in-games)
- [Online Vibration Pattern Designer & Haptic Test](https://toolkitgen.com/tool/haptic_rhythm_designer)
- [Nice Vibrations Documentation](https://nice-vibrations-docs.moremountains.com/adding_nice_vibrations.html)
- [Controller Vibration Problems: Haptic Sync Audit](https://gamepadtest.app/guides/vibration-problems)
- [LRA Vibration Motors: Essential Component for Haptic Feedback](https://blog.ineedmotors.com/lra-vibration-motors-haptic-feedback/)
- [ERM vs LRA Motors: Practical Differences](https://blog.ineedmotors.com/erm-vs-lra-motors-practical-differences-oem-haptics/)
- [Portable wagering game with vibrational cues (Roulette)](https://image-ppubs.USPTO.gov/dirsearch-public/print/downloadPdf/8210942)
- [Systems and methods for casino gaming haptics](https://image-ppubs.USPTO.gov/dirsearch-public/print/downloadPdf/8721416)
- [GitHub: Nice Vibrations / Lofelt SDK](https://github.com/Lofelt/NiceVibrations)
- [Apple Core Haptics Documentation](https://developer.apple.com/videos/play/wwdc2019/520/)
