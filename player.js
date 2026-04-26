/**
 * Player ship - extends Vehicle
 */
class Player extends Vehicle {
  constructor(x, y) {
    super(x, y);

    this.upForce = 0.35;
    this.downForce = 0.15;
    this.gravity = 0.08;

    this.ceilingThreshold = 30;
    this.floorThreshold = height - 30;

    // Shields
    this.shield1Active = false;
    this.shield1Duration = 120;
    this.shield1Timer = 0;
    this.shield1RechargeTime = 200;
    this.shield1RechargeTimer = 0;

    this.shield2Active = false;
    this.shield2Health = 3;
    this.shield2MaxHealth = 3;

    // Visuals
    this.color = color(0, 255, 200);
    this.r_pourDessin = 12;
    this.r = this.r_pourDessin * 2.5;

    // Trail
    this.trail = [];
    this.trailMaxLength = 80;

    // Missiles
    this.missiles = [];
    this.missileCooldown = 0;
    this.missileCooldownTime = 15; // frames between shots
    this.canShoot = true;

    this.isAlive = true;

    this._keyboardEverUsed = false;
  }

  applyML5Input(ml5) {
    if (!ml5.isActive) return;
    let force = createVector(0, 0);
    if (ml5.moveUp)   force.y -= this.upForce;
    if (ml5.moveDown) force.y += this.downForce;
    // Pas de gravité ici — déjà appliquée dans applyInput()
    this.applyForce(force);
  }

  applyInput(keys) {
    let force = createVector(0, 0);
    let anyKey = keys[38] || keys['w'] || keys[40] || keys['s'];

    if (keys[38] || keys['w']) force.y -= this.upForce;
    if (keys[40] || keys['s']) force.y += this.downForce;

    // Gravité toujours appliquée ici — ML5 ne l'applique pas si clavier actif
    force.y += this.gravity;
    this.applyForce(force);
  }

  checkBoundaries() {
    if (this.pos.y <= this.ceilingThreshold) this.isAlive = false;
    if (this.pos.y >= this.floorThreshold)   this.isAlive = false;
  }

  shoot() {
    if (this.missileCooldown > 0) return null;
    this.missileCooldown = this.missileCooldownTime;
    let spawnX = this.pos.x + 20 + this.r_pourDessin;
    let spawnY = this.pos.y;
    let dir = createVector(1, 0);
    return new Missile(spawnX, spawnY, dir, true, false, null);
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
    if (this.shield1Active) return false;
    if (this.shield2Active) {
      this.shield2Health--;
      if (this.shield2Health <= 0) this.shield2Active = false;
      return false;
    }
    return true;
  }

  update() {
    this.vel.x = 0;
    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed);
    this.pos.add(this.vel);
    this.acc.set(0, 0);

    // Shields
    if (this.shield1Active) {
      this.shield1Timer--;
      if (this.shield1Timer <= 0) {
        this.shield1Active = false;
        this.shield1RechargeTimer = this.shield1RechargeTime;
      }
    }
    if (this.shield1RechargeTimer > 0) this.shield1RechargeTimer--;

    // Missile cooldown
    if (this.missileCooldown > 0) this.missileCooldown--;

    // Trail — record arrière du sprite avec tilt
    let tiltAngle = map(this.vel.y, -this.maxSpeed, this.maxSpeed, -0.5, 0.5);
    tiltAngle = constrain(tiltAngle, -0.5, 0.5);
    let tailX = this.pos.x + 20 + (-this.r_pourDessin) * cos(tiltAngle);
    let tailY = this.pos.y      + (-this.r_pourDessin) * sin(tiltAngle);
    this.trail.push(createVector(tailX, tailY));
    if (this.trail.length > this.trailMaxLength) this.trail.shift();
  }

  show() {
    this.drawTrail();
    this.drawShields();
    this.drawVehicle();
  }

  drawTrail() {
    push();
    noFill();
    let currentTail = this.trail[this.trail.length - 1];
    if (!currentTail) { pop(); return; }

    for (let i = 1; i < this.trail.length; i++) {
      let alpha = map(i, 0, this.trail.length, 0, 180);
      let w     = map(i, 0, this.trail.length, 0.5, 2.5);
      stroke(0, 255, 200, alpha);
      strokeWeight(w);

      let age1 = this.trail.length - (i - 1);
      let age2 = this.trail.length - i;
      let x1 = currentTail.x - age1 * 1.5;
      let x2 = currentTail.x - age2 * 1.5;

      line(x1, this.trail[i-1].y, x2, this.trail[i].y);
    }
    pop();
  }

  drawShields() {
    push();
    noFill();
    strokeWeight(2);
    if (this.shield1Active) {
      stroke(255, 200, 0);
      circle(this.pos.x + 20, this.pos.y, this.r * 1.8);
    }
    if (this.shield2Active) {
      stroke(0, 200, 255);
      let angle = frameCount * 0.05;
      push();
      translate(this.pos.x + 20, this.pos.y);
      rotate(angle);
      rect(-this.r * 1.5, -this.r * 1.5, this.r * 3, this.r * 3);
      pop();
    }
    pop();
  }

  drawVehicle() {
    let tiltAngle = map(this.vel.y, -this.maxSpeed, this.maxSpeed, -0.5, 0.5);
    tiltAngle = constrain(tiltAngle, -0.5, 0.5);

    push();
    translate(this.pos.x + 20, this.pos.y);
    rotate(tiltAngle);
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
}