# 🛸 COPILOT-INSTRUCTIONS.md — Frequency Flight (p5.js + ML5.js)

## 🎯 Purpose

This repository implements **Frequency Flight**, a 2D neon space runner where enemies are autonomous agents driven by steering behaviors and trained neural networks.

The goal is to produce **emergent, threatening enemy behavior** using:

* local rules and vector-based forces (steering behaviors)
* feed-forward neural networks per enemy
* neuro-evolutionary training (NEAT-like)

NOT scripted enemy movement.

---

## 🧱 Core Principles (NON-NEGOTIABLE)

### 1. Vehicle Model

All entities are **vehicles**:

* position (p5.Vector)
* velocity (p5.Vector)
* acceleration (p5.Vector)
* maxSpeed
* maxForce

Movement is controlled via forces, NOT direct position changes.

---

### 2. Steering Law (FUNDAMENTAL)

All behaviors MUST follow:

```
steering = desired_velocity - current_velocity
```

* desired_velocity is direction × maxSpeed
* steering is limited by maxForce

👉 This rule is the foundation of ALL behaviors.

---

### 3. Layered Architecture

System MUST respect:

1. Action Selection → WHAT to do (NN output)
2. Steering → HOW to move (steering behaviors)
3. Locomotion → APPLY movement (vehicle physics)

---

### 4. Emergence over scripting

* No hardcoded enemy paths
* No direct motion logic
* Enemy behavior emerges from force composition + NN decisions

👉 Threatening patterns = sum of simple behaviors guided by NN

---

## 🚨 HARD CONSTRAINTS

### 🔒 vehicle.js is IMMUTABLE

* NEVER modify `vehicle.js`
* NEVER duplicate its behaviors
* NEVER override its internal logic

---

### 🧬 EVERYTHING IS A VEHICLE

* EVERY visible entity MUST extend `Vehicle`
* NO exceptions

✅ Valid:

```js
class Player extends Vehicle {}
class Enemy extends Vehicle {}
class Obstacle extends Vehicle {}
```

❌ Invalid:

```js
class Bullet {}        // ❌ forbidden
class Particle {}      // ❌ forbidden
class Trail {}         // ❌ forbidden (trail is visual only, not an entity)
```

---

### ⚙️ Behavior Rules

* NEVER create monolithic movement logic
* NEVER bypass `applyForce`
* NEVER directly mutate position

❌ Forbidden:

```js
this.position.add(this.velocity)  // ❌ direct mutation
this.position.y = targetY         // ❌ teleportation
```

---

### 🧩 Composition Rule

All behaviors must be:

* independent
* reusable
* combinable

Example:

```js
let force = createVector(0, 0);

force.add(this.pursue(player).mult(nnOutput[0]));
force.add(this.separation(others).mult(0.8));
force.add(this.wander().mult(0.3));

this.applyForce(force);
```

👉 Behaviors must NOT be fused into one function.

---

## ⚙️ Steering Behaviors Reference

### Seek / Flee

* base behaviors
* seek toward player, flee away

---

### Pursue

* predict future player position
* then apply seek toward predicted position
* used by hunter aliens and encircler aliens

---

### Arrive

* identical to seek when far
* slows down near target
* used when an enemy locks onto a blocking position

---

### Wander

* continuous random direction variation
* NEVER random per frame (no jitter)
* must preserve direction continuity
* used by drifting asteroids

---

### Separation

* avoid crowding between enemies
* ensures enemies spread across vertical space
* used by all enemy types

---

### Avoid

* steer around fixed obstacles placed by the player (mouse click)
* based on ray-casting or radius detection

---

## 🧠 Neural Network Rules

### One NN per enemy instance

Each `Enemy` instance owns its own `NeuralNetwork` instance.

```js
class Enemy extends Vehicle {
  constructor(...) {
    super(...);
    this.brain = new NeuralNetwork(topology);
  }
}
```

### NN inputs are normalized

All inputs to the NN MUST be normalized to [-1, 1] or [0, 1] before being fed in.

❌ Forbidden:

```js
inputs = [player.x, player.y, ...]  // raw pixel values
```

✅ Valid:

```js
inputs = [player.x / width, player.y / height, ...]
```

### NN outputs drive force weights, not positions

NN outputs are used as **multipliers on steering forces**, not as direct movement instructions.

```js
const output = this.brain.feedForward(inputs);
force.add(this.pursue(player).mult(output[0]));   // output[0] ∈ [-1, 1]
force.add(this.wander().mult(output[1]));
```

### Topology is configurable at runtime

Topology parameters are exposed via UI sliders and passed to `NeuralNetwork` at construction time. Changing topology requires restarting training.

---

## 🏋️ Neuro-Evolution Rules

### Fitness is computed externally

`fitness.js` computes fitness — never inside `enemy.js` or `nn.js`.

```js
// fitness.js
function computeFitness(enemy, player, history) {
  ...
}
```

### Mutation must be bounded

Mutations apply gaussian noise to weights, bounded by a configurable mutation rate.

### Crossover mixes two parent weight arrays

```js
// 50/50 crossover per weight
childWeights[i] = random() < 0.5 ? parentA.weights[i] : parentB.weights[i];
```

### Elite preservation

Top 20% of population (by fitness) are carried over unchanged to the next generation.

---

## 🎮 Game Rules

### Player

* advances automatically to the right at constant speed
* controls only vertical position (up / down force)
* weak gravity pulls downward continuously
* ceiling at top of screen: blocks movement, no damage
* floor at bottom of screen: instant death
* has two independent shields (see below)

### Shields

* **Temporary shield** — full invincibility for a few seconds, then recharges
* **Resistant shield** — absorbs a fixed number of hits before breaking, no time limit
* both can be active simultaneously
* each is assignable to keyboard or ML5 gesture, configurable before the game starts

### Enemies

* spawn from the right side of the screen
* move left toward the player
* four types: hunter alien, encircler alien, drifting asteroid, alien formation
* obstacles can be added by clicking on the canvas — enemies must avoid them

---

## 🤖 ML5.js Rules

* ML5 is OPTIONAL — game must be fully playable without webcam
* ML5 mode is toggled via `M` key at runtime
* each ML5 control (shield 1, shield 2, up/down) is individually enabled/disabled in the pre-game config menu
* keyboard fallback is ALWAYS active regardless of ML5 state

### Allowed ML5 models

* `ml5.handPose` — hand height for up/down control, fist gesture for resistant shield
* `ml5.faceMesh` — mouth open for temporary shield

### ML5 must not block the game loop

All ML5 inference runs asynchronously. Game loop MUST NOT wait for ML5 results.

---

## 🗂️ Code Architecture

### Required Structure

```
frequency-flight/
├── index.html
├── sketch.js               # setup() & draw() — main game loop at 60fps
├── src/
│   ├── vehicle.js          # IMMUTABLE — base vehicle model
│   ├── player.js           # extends Vehicle — player ship
│   ├── enemy.js            # extends Vehicle — all enemy types (type param)
│   ├── nn.js               # NeuralNetwork class (feed-forward)
│   ├── evolution.js        # population management, selection, crossover, mutation
│   ├── fitness.js          # fitness computation (external, never in enemy.js)
│   ├── ml5controller.js    # ML5 inference, gesture detection, input mapping
│   ├── levelgen.js         # level loading from JSON, enemy spawning
│   └── ui.js               # sliders, HUD, config menu, fitness graph
├── levels/
│   ├── medium/
│   │   └── level.json      # only level implemented in V1
│   ├── easy/               # reserved for future versions
│   ├── hard/               # reserved for future versions
│   └── killer/             # reserved for future versions
├── brains/                 # saved trained brains as JSON
└── assets/
    ├── music/
    └── fonts/
```

### File responsibilities

| File | Responsibility |
|---|---|
| `vehicle.js` | Physics, force application, base steering methods — IMMUTABLE |
| `player.js` | Player input handling, shield logic, trail rendering |
| `enemy.js` | Enemy steering composition, NN integration, type-based behavior |
| `nn.js` | Feed-forward pass, weight storage, clone/mutate/crossover |
| `evolution.js` | Population loop, generation management, elitism, mutation |
| `fitness.js` | Fitness scoring only — reads game state, outputs a number |
| `ml5controller.js` | All ML5 logic — no game logic here |
| `levelgen.js` | Reads `level.json`, spawns enemies at correct intervals |
| `ui.js` | All DOM/canvas UI — sliders, buttons, HUD overlays |
| `sketch.js` | Wires everything together — no game logic defined here |

---

## 🧪 Validation Checklist

Before outputting any code, ALWAYS verify:

* [ ] Is movement using forces only?
* [ ] Is steering following `desired - current`?
* [ ] Does every visible entity extend `Vehicle`?
* [ ] Are behaviors independent and composable?
* [ ] Is `vehicle.js` untouched?
* [ ] Are NN inputs normalized?
* [ ] Is fitness computed in `fitness.js` only?
* [ ] Does the game run without ML5/webcam?
* [ ] Is only `levels/medium/` implemented?

If ANY answer is NO → fix before responding.

---

## 🔁 Failure Conditions

Any generated solution is INVALID if:

* it modifies `vehicle.js`
* it creates non-Vehicle entities
* it uses direct position mutation instead of forces
* it merges multiple behaviors into one function
* it puts fitness logic inside `enemy.js`
* it makes ML5 block the game loop
* it hardcodes enemy paths or movement
* it implements levels other than medium in V1

---

## 🧠 Philosophy

> Simple rules + local perception + learned weights → emergent threat

Enemies should **feel intelligent**, not scripted.  
The player should **feel the pressure**, not read a pattern.

---

## 📌 Final Rules

When in doubt:

👉 reuse existing steering behaviors from `vehicle.js`
👉 combine forces weighted by NN outputs
👉 NEVER break the vehicle model
👉 NEVER implement what is marked as future work