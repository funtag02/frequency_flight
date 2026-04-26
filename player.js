/**
 * Player ship - extends Vehicle
 * - Advances automatically to the right at constant speed
 * - Player controls vertical position (up/down)
 * - Weak gravity pulls downward
 * - Two independent shields
 * - Trail rendering (visual only, not an entity)
 */
class Player extends Vehicle {
  constructor(x, y) {
    super(x, y);
    
    // Vertical controls (player stays fixed on X axis)
    this.upForce = 0.35;
    this.downForce = 0.15;
    this.gravity = 0.08;
    
    // Screen boundaries
    this.ceilingThreshold = 30;
    this.floorThreshold = height - 30;
    
    // Shields
    this.shield1Active = false;          // Temporary shield (invincibility)
    this.shield1Duration = 120;           // frames
    this.shield1Timer = 0;
    this.shield1RechargeTime = 200;      // frames
    this.shield1RechargeTimer = 0;
    
    this.shield2Active = false;          // Resistant shield (absorbs hits)
    this.shield2Health = 3;              // hits it can absorb
    this.shield2MaxHealth = 3;
    
    // Visuals
    this.color = color(0, 255, 200);     // Neon cyan
    this.r_pourDessin = 12;
    this.r = this.r_pourDessin * 2.5;
    
    // Trail
    this.trail = [];
    this.trailMaxLength = 50;
    
    // Collision detection
    this.isAlive = true;
  }
  
  applyInput(keys) {
    let force = createVector(0, 0);
    
    // Vertical movement (player controlled)
    // Support both arrow keys and WASD
    if (keys[38] || keys['w']) {  // 38 = UP arrow
      force.y -= this.upForce;
    }
    if (keys[40] || keys['s']) {  // 40 = DOWN arrow
      force.y += this.downForce;
    }
    
    // Apply gravity
    force.y += this.gravity;
    
    // Constrain vertical movement by boundaries
    if (this.pos.y < this.ceilingThreshold) {
      force.y = 0; // Block upward movement at ceiling
      this.pos.y = this.ceilingThreshold;
      this.vel.y = 0;
    }
    if (this.pos.y > this.floorThreshold) {
      this.isAlive = false; // Death at floor
    }
    
    this.applyForce(force);
  }
  
  activateShield1() {
    if (this.shield1RechargeTimer <= 0 && !this.shield1Active) {
      this.shield1Active = true;
      this.shield1Timer = this.shield1Duration;
    }
  }
  
  activateShield2() {
    if (!this.shield2Active && this.shield2Health > 0) {
      this.shield2Active = true;
    }
  }
  
  takeDamage() {
    if (this.shield1Active) {
      return false; // No damage while shield1 is active
    }
    if (this.shield2Active) {
      this.shield2Health--;
      if (this.shield2Health <= 0) {
        this.shield2Active = false;
      }
      return false; // Shield2 absorbed the hit
    }
    return true; // Took damage, player dies
  }
  
  update() {
    // Physics update (Vehicle.js model)
    // Player stays fixed on X axis - no horizontal movement
    this.vel.x = 0;
    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed);
    this.pos.add(this.vel);
    this.acc.set(0, 0);
    
    // Update shields
    if (this.shield1Active) {
      this.shield1Timer--;
      if (this.shield1Timer <= 0) {
        this.shield1Active = false;
        this.shield1RechargeTimer = this.shield1RechargeTime;
      }
    }
    
    if (this.shield1RechargeTimer > 0) {
      this.shield1RechargeTimer--;
    }
    
    // Update trail
    this.trail.push(this.pos.copy());
    if (this.trail.length > this.trailMaxLength) {
      this.trail.shift();
    }
  }
  
  show() {
    this.drawTrail();
    this.drawShields();
    this.drawVehicle();
  }
  
  drawTrail() {
    push();
    noFill();
    strokeWeight(2);
    
    for (let i = 0; i < this.trail.length - 1; i++) {
      let alpha = map(i, 0, this.trail.length, 50, 200);
      stroke(0, 255, 200, alpha);
      line(this.trail[i].x, this.trail[i].y, this.trail[i + 1].x, this.trail[i + 1].y);
    }
    pop();
  }
  
  drawShields() {
    push();
    noFill();
    strokeWeight(2);
    
    // Shield 1 (temporary, golden)
    if (this.shield1Active) {
      stroke(255, 200, 0);
      circle(this.pos.x, this.pos.y, this.r * 1.8);
    }
    
    // Shield 2 (resistant, cyan)
    if (this.shield2Active) {
      stroke(0, 200, 255);
      let angle = frameCount * 0.05;
      push();
      translate(this.pos.x, this.pos.y);
      rotate(angle);
      rect(-this.r * 1.5, -this.r * 1.5, this.r * 3, this.r * 3);
      pop();
    }
    
    pop();
  }
  
  drawVehicle() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.vel.heading());
    
    stroke(this.color);
    strokeWeight(2);
    fill(this.color);
    
    // Neon spaceship shape
    triangle(-this.r_pourDessin, -this.r_pourDessin / 2, 
             -this.r_pourDessin, this.r_pourDessin / 2, 
             this.r_pourDessin, 0);
    
    pop();
  }
}
