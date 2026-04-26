/**
 * Enemy - extends Vehicle
 * Types: hunter, encircler, asteroid, formation, shooter (guided), gunner (straight)
 */
class Enemy extends Vehicle {
  constructor(x, y, type = 'hunter', brain = null) {
    super(x, y);

    this.type = type;
    this.isEnemy = true;
    this.hp = (type === 'shooter' || type === 'gunner') ? 2 : 1;

    if (brain) {
      this.brain = brain.clone();
    } else {
      this.brain = new NeuralNetwork([10, 8, 8, 2]);
    }

    this.setupTypeParameters();

    this.fitnessTracker = new FitnessTracker();
    this.lastPlayerY = 0;

    this.r_pourDessin = 10;
    this.r = this.r_pourDessin * 1.2; // était * 2.5

    this.targetY = y;
    this.predictedPlayerPos = null;

    // BPM pulsation (174 BPM = ~20.7 frames per beat at 60fps)
    this.beatPeriod = 60 / 174 * 60; // ~20.69 frames
    this.pulsePhase = random(TWO_PI); // offset so not all enemies pulse together

    // Shooting (shooter / gunner only)
    // Fire every 2 beats = ~41 frames
    this.shootInterval = this.beatPeriod * 8; // était * 2 → maintenant 1/8 BPM ~165 frames
    this.shootTimer = random(this.shootInterval); // stagger initial shot
    this.pendingMissile = null;
  }

  setupTypeParameters() {
    switch(this.type) {
      case 'hunter':
        this.color = color(255, 100, 100);
        this.maxSpeed = 4;
        this.maxForce = 0.25;
        this.seekWeight = 0.8;
        this.separationWeight = 0.3;
        break;
      case 'encircler':
        this.color = color(255, 150, 100);
        this.maxSpeed = 3.5;
        this.maxForce = 0.2;
        this.seekWeight = 0.6;
        this.separationWeight = 0.4;
        this.arriveSlowRadius = 80;
        break;
      case 'asteroid':
        this.color = color(150, 150, 150);
        this.maxSpeed = 2;
        this.maxForce = 0.15;
        this.wanderWeight = 0.7;
        this.separationWeight = 0.3;
        this.wanderAngle = 0;
        this.wanderRadius = 50;
        this.wanderDistance = 40;
        break;
      case 'formation':
        this.color = color(200, 100, 255);
        this.maxSpeed = 3.8;
        this.maxForce = 0.22;
        this.seekWeight = 0.6;
        this.separationWeight = 0.5;
        this.formationTargetY = random(100, height - 100);
        break;
      case 'shooter': // guided missile
        this.color = color(255, 50, 150);
        this.maxSpeed = 3;
        this.maxForce = 0.18;
        this.seekWeight = 0.5;
        this.separationWeight = 0.3;
        break;
      case 'gunner': // straight missile
        this.color = color(255, 180, 0);
        this.maxSpeed = 3.2;
        this.maxForce = 0.2;
        this.seekWeight = 0.5;
        this.separationWeight = 0.3;
        break;
    }
  }

  // Returns neon pulse alpha multiplier [0.4 .. 1.0] synced to 174 BPM
  getPulseAlpha(baseAlpha = 255) {
    let t = frameCount + this.pulsePhase;
    let pulse = 0.7 + 0.3 * sin((TWO_PI / this.beatPeriod) * t);
    return baseAlpha * pulse;
  }

  computeInputs(player, otherEnemies) {
    let inputs = [];
    inputs.push(player.pos.x / width);
    inputs.push(player.pos.y / height);
    inputs.push(constrain(player.vel.y / 5, -1, 1));
    let distX = (player.pos.x - this.pos.x) / width;
    let distY = (player.pos.y - this.pos.y) / height;
    inputs.push(constrain(distX, -1, 1));
    inputs.push(constrain(distY, -1, 1));

    let nearbyEnemies = otherEnemies
      .filter(e => e !== this)
      .sort((a, b) => dist(this.pos.x, this.pos.y, a.pos.x, a.pos.y) -
                      dist(this.pos.x, this.pos.y, b.pos.x, b.pos.y))
      .slice(0, 2);

    inputs.push(nearbyEnemies[0] ? nearbyEnemies[0].pos.y / height : 0);
    inputs.push(nearbyEnemies[1] ? nearbyEnemies[1].pos.y / height : 0);
    inputs.push(this.pos.y / height);
    inputs.push((height - this.pos.y) / height);
    inputs.push(player.shield1Active || player.shield2Active ? 1 : 0);
    return inputs;
  }

  applyBehaviors(player, otherEnemies, obstacles) {
    let inputs = this.computeInputs(player, otherEnemies);
    let nnOutput = this.brain.feedForward(inputs);

    let force = createVector(0, 0);

    switch(this.type) {
      case 'hunter':
        force.add(this.pursueVertical(player).mult(this.seekWeight * nnOutput[0]));
        force.add(this.separate(otherEnemies).mult(this.separationWeight));
        break;
      case 'encircler': {
        let targetY = player.pos.y + (nnOutput[0] * 50 - 25);
        let target = createVector(this.pos.x, constrain(targetY, 50, height - 50));
        force.add(this.arrive(target).mult(this.seekWeight * nnOutput[0]));
        force.add(this.separate(otherEnemies).mult(this.separationWeight));
        break;
      }
      case 'asteroid':
        force.add(this.wander().mult(this.wanderWeight * nnOutput[0]));
        force.add(this.separate(otherEnemies).mult(this.separationWeight));
        break;
      case 'formation': {
        let formTarget = createVector(this.pos.x, this.formationTargetY);
        force.add(this.arrive(formTarget).mult(this.seekWeight * nnOutput[0]));
        force.add(this.separate(otherEnemies).mult(this.separationWeight));
        break;
      }
      case 'shooter':
      case 'gunner':
        // Hover at player's Y level to aim
        force.add(this.pursueVertical(player).mult(this.seekWeight * nnOutput[0]));
        force.add(this.separate(otherEnemies).mult(this.separationWeight));
        break;
    }

    force.add(this.avoidObstacles(obstacles).mult(1.2));
    force.x = 0;
    this.applyForce(force);
  }

  // Returns a Missile if it's time to shoot, null otherwise
  tryShoot(player) {
    if (this.type !== 'shooter' && this.type !== 'gunner') return null;

    this.shootTimer--;
    if (this.shootTimer > 0) return null;

    // Reset on beat
    this.shootTimer = this.shootInterval;

    // Only shoot if on screen and roughly aligned with player
    if (this.pos.x > width || this.pos.x < 0) return null;

    let dir;
    let guided = false;

    if (this.type === 'shooter') {
      // Guided: aim toward player
      dir = p5.Vector.sub(player.pos, this.pos).normalize();
      guided = true;
    } else {
      // Gunner: straight left
      dir = createVector(-1, 0);
      guided = false;
    }

    return new Missile(this.pos.x, this.pos.y, dir, false, guided, guided ? player : null);
  }

  hit() {
    this.hp--;
    return this.hp <= 0; // returns true if dead
  }

  pursue(vehicle) {
    let target = vehicle.pos.copy();
    let prediction = vehicle.vel.copy();
    prediction.mult(10);
    target.add(prediction);
    return this.seek(target);
  }

  pursueVertical(player) {
    let targetY = player.pos.y + (player.vel.y * 10);
    let target = createVector(this.pos.x, targetY);
    return this.seek(target);
  }

  arrive(target) {
    let force = p5.Vector.sub(target, this.pos);
    let distance = force.mag();
    let slowRadius = this.arriveSlowRadius || 100;
    let desiredSpeed = this.maxSpeed;
    if (distance < slowRadius) {
      desiredSpeed = map(distance, 0, slowRadius, 0, this.maxSpeed);
    }
    force.setMag(desiredSpeed);
    force.sub(this.vel);
    force.limit(this.maxForce);
    return force;
  }

  wander() {
    this.wanderAngle += random(-0.3, 0.3);
    let wanderPos = p5.Vector.fromAngle(this.wanderAngle);
    wanderPos.mult(this.wanderRadius);
    wanderPos.add(this.vel.copy().setMag(this.wanderDistance));
    wanderPos.add(this.pos);
    return this.seek(wanderPos);
  }

  separate(others) {
    let desiredSeparation = this.r * 2;
    let steer = createVector(0, 0);
    let count = 0;
    for (let other of others) {
      if (other !== this) {
        let d = dist(this.pos.x, this.pos.y, other.pos.x, other.pos.y);
        if (d > 0 && d < desiredSeparation) {
          let diff = p5.Vector.sub(this.pos, other.pos);
          diff.normalize();
          diff.div(d);
          steer.add(diff);
          count++;
        }
      }
    }
    if (count > 0) {
      steer.div(count);
      steer.setMag(this.maxSpeed);
      steer.sub(this.vel);
      steer.limit(this.maxForce);
    }
    return steer;
  }

  avoidObstacles(obstacles) {
    if (!obstacles || obstacles.length === 0) return createVector(0, 0);
    let ahead = this.vel.copy().mult(20);
    let aheadPos = p5.Vector.add(this.pos, ahead);
    let closestObstacle = null;
    let closestDistance = Infinity;
    for (let obstacle of obstacles) {
      let d = dist(aheadPos.x, aheadPos.y, obstacle.pos.x, obstacle.pos.y);
      if (d < closestDistance) { closestDistance = d; closestObstacle = obstacle; }
    }
    if (!closestObstacle) return createVector(0, 0);
    if (closestDistance < closestObstacle.r + this.r + 20) {
      let away = p5.Vector.sub(aheadPos, closestObstacle.pos);
      away.setMag(this.maxForce);
      return away;
    }
    return createVector(0, 0);
  }

  update(player) {
    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed);
    this.pos.add(this.vel);
    this.acc.set(0, 0);

    if (player) {
      let playerYVelocityChange = Math.abs(player.vel.y - this.lastPlayerY);
      this.lastPlayerY = player.vel.y;
      this.fitnessTracker.recordEvasion(playerYVelocityChange);
    }
  }

  show() {
    push();
    translate(this.pos.x, this.pos.y);

    let pulseAlpha = this.getPulseAlpha(220);
    let c = this.color;
    let pulseColor = color(red(c), green(c), blue(c), pulseAlpha);

    // HP indicator: dim color on 1 HP left for shooter/gunner
    if ((this.type === 'shooter' || this.type === 'gunner') && this.hp === 1) {
      pulseColor = color(red(c) * 0.5, green(c) * 0.5, blue(c) * 0.5, pulseAlpha);
    }

    stroke(pulseColor);
    strokeWeight(2);
    fill(pulseColor);

    switch(this.type) {
      case 'hunter':
        triangle(10, -5, 10, 5, -10, 0);
        circle(0, 0, 3);
        break;
      case 'encircler':
        rect(-8, -8, 16, 16);
        line(-8, -8, 8, 8);
        line(8, -8, -8, 8);
        break;
      case 'asteroid':
        circle(0, 0, this.r_pourDessin);
        noFill();
        circle(0, 0, this.r_pourDessin + 3);
        break;
      case 'formation':
        line(-10, 0, 10, 0);
        line(0, -10, 0, 10);
        circle(0, 0, 7);
        break;
      case 'shooter':
        // Diamond shape with a "gun barrel" pointing left
        beginShape();
        vertex(0, -10);
        vertex(12, 0);
        vertex(0, 10);
        vertex(-12, 0);
        endShape(CLOSE);
        strokeWeight(3);
        line(-12, 0, -20, 0); // barrel
        // HP pips
        noStroke();
        fill(255, 255, 255, 180);
        for (let i = 0; i < this.hp; i++) circle(-8 + i * 8, -16, 4);
        break;
      case 'gunner':
        // Hexagon shape
        beginShape();
        for (let i = 0; i < 6; i++) {
          let angle = (TWO_PI / 6) * i - PI / 6;
          vertex(cos(angle) * 10, sin(angle) * 10);
        }
        endShape(CLOSE);
        strokeWeight(3);
        line(-10, 0, -18, 0); // barrel
        noStroke();
        fill(255, 255, 255, 180);
        for (let i = 0; i < this.hp; i++) circle(-6 + i * 8, -16, 4);
        break;
    }

    pop();
  }

  isOffscreen() {
    return this.pos.x < -100 || this.pos.x > width + 100 ||
           this.pos.y < -100 || this.pos.y > height + 100;
  }
}