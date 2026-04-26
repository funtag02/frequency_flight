/**
 * Missile - extends Vehicle
 * Player missiles: straight right (SPACE / click)
 * Enemy missiles: guided (shooter) or straight (gunner)
 */
class Missile extends Vehicle {
  constructor(x, y, direction, isPlayerMissile = true, guided = false, target = null) {
    super(x, y);

    this.isPlayerMissile = isPlayerMissile;
    this.guided = guided;
    this.target = target; // Enemy or player reference for guided missiles

    this.maxSpeed = isPlayerMissile ? 10 : 5;  // était 6 pour ennemis
    this.maxForce = guided ? 0.01 : 0;         // était 0.3 — beaucoup plus doux
    this.r_pourDessin = 4;
    this.r = 8;
    this.alive = true;

    // Direction vector
    this.vel = direction.copy().setMag(this.maxSpeed);

    // Neon colors
    this.color = isPlayerMissile ? color(0, 255, 200) : color(255, 80, 80);
    this.trailPositions = [];
    this.trailMaxLength = 12;
  }

  update() {
    // Guided missiles steer toward target
    if (this.guided && this.target && this.target.isAlive !== false) {
      let steer = this.seek(this.target.pos);
      this.applyForce(steer);
    }

    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed);
    this.pos.add(this.vel);
    this.acc.set(0, 0);

    // Trail
    this.trailPositions.push(this.pos.copy());
    if (this.trailPositions.length > this.trailMaxLength) {
      this.trailPositions.shift();
    }

    // Out of bounds
    if (this.pos.x > width + 50 || this.pos.x < -50 ||
        this.pos.y < -50 || this.pos.y > height + 50) {
      this.alive = false;
    }
  }

  show() {
    push();
    // Trail
    noFill();
    for (let i = 1; i < this.trailPositions.length; i++) {
      let alpha = map(i, 0, this.trailPositions.length, 0, 200);
      let w = map(i, 0, this.trailPositions.length, 0.5, 2);
      stroke(red(this.color), green(this.color), blue(this.color), alpha);
      strokeWeight(w);
      line(this.trailPositions[i-1].x, this.trailPositions[i-1].y,
           this.trailPositions[i].x,   this.trailPositions[i].y);
    }

    // Missile body
    translate(this.pos.x, this.pos.y);
    rotate(this.vel.heading());
    stroke(this.color);
    strokeWeight(1.5);
    fill(this.color);
    ellipse(0, 0, 10, 3);
    pop();
  }

  isOffscreen() {
    return !this.alive;
  }
}