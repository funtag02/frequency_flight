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
    this.trailMaxLength = 80; // plus longue pour l'effet fusée
    this.trailOffset = 20; // décalage arrière du sprite pour le point de départ trail
    
    // Collision detection
    this.isAlive = true;
  }
  
  applyInput(keys) {
  let force = createVector(0, 0);

  if (keys[38] || keys['w']) {
    force.y -= this.upForce;
  }
  if (keys[40] || keys['s']) {
    force.y += this.downForce;
  }

  force.y += this.gravity;
  this.applyForce(force);
}

  checkBoundaries() {
    if (this.pos.y <= this.ceilingThreshold) {
      this.isAlive = false;
    }
    if (this.pos.y >= this.floorThreshold) {
      this.isAlive = false;
    }
  }

  drawTrail() {
    push();
    noFill();

    let currentTail = this.trail[this.trail.length - 1];

    for (let i = 1; i < this.trail.length; i++) {
      let alpha = map(i, 0, this.trail.length, 0, 180);
      let w = map(i, 0, this.trail.length, 0.5, 2.5);
      stroke(0, 255, 200, alpha);
      strokeWeight(w);

      let age1 = this.trail.length - (i - 1);
      let age2 = this.trail.length - i;

      let x1 = currentTail.x - age1 * 1.5;
      let x2 = currentTail.x - age2 * 1.5;

      line(x1, this.trail[i - 1].y, x2, this.trail[i].y);
    }
    pop();
  }

  drawVehicle() {
    // Angle basé sur la vitesse verticale, limité pour rester lisible
    let tiltAngle = map(this.vel.y, -this.maxSpeed, this.maxSpeed, -0.5, 0.5);
    tiltAngle = constrain(tiltAngle, -0.5, 0.5);

    push();
    translate(this.pos.x + 20, this.pos.y); // décalé vers la droite
    rotate(tiltAngle);                       // inclinaison dynamique

    stroke(this.color);
    strokeWeight(2);
    fill(this.color);

    triangle(
      -this.r_pourDessin, -this.r_pourDessin / 2,
      -this.r_pourDessin,  this.r_pourDessin / 2,
      this.r_pourDessin,  0
    );
    pop();
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
    // Calcule le point arrière en tenant compte du tilt
    let tiltAngle = map(this.vel.y, -this.maxSpeed, this.maxSpeed, -0.5, 0.5);
    tiltAngle = constrain(tiltAngle, -0.5, 0.5);

    let tailX = this.pos.x + 20 + (-this.r_pourDessin) * cos(tiltAngle);
    let tailY = this.pos.y      + (-this.r_pourDessin) * sin(tiltAngle);

    this.trail.push(createVector(tailX, tailY));
    if (this.trail.length > this.trailMaxLength) {
      this.trail.shift();
    }
  }
  
  show() {
    this.drawTrail();
    this.drawShields();
    this.drawVehicle();
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

}
