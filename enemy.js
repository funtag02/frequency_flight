/**
 * Enemy - extends Vehicle
 * 4 types: hunter, encircler, asteroid, formation
 * Each has a neural network for behavior decision
 */
class Enemy extends Vehicle {
  constructor(x, y, type = 'hunter', brain = null) {
    super(x, y);
    
    this.type = type; // 'hunter', 'encircler', 'asteroid', 'formation'
    this.isEnemy = true;
    
    // Neural network (if none provided, create random)
    if (brain) {
      this.brain = brain.clone();
    } else {
      // Default topology: 10 inputs -> 2 outputs
      this.brain = new NeuralNetwork([10, 8, 8, 2]);
    }
    
    // Type-specific parameters
    this.setupTypeParameters();
    
    // Fitness tracking
    this.fitnessTracker = new FitnessTracker();
    this.lastPlayerY = 0;
    
    // Visuals
    this.r_pourDessin = 10;
    this.r = this.r_pourDessin * 2.5;
    
    // Movement state
    this.targetY = y;
    this.predictedPlayerPos = null;
  }
  
  setupTypeParameters() {
    switch(this.type) {
      case 'hunter':
        this.color = color(255, 100, 100);  // Red
        this.maxSpeed = 4;
        this.maxForce = 0.25;
        this.seekWeight = 0.8;
        this.separationWeight = 0.3;
        break;
        
      case 'encircler':
        this.color = color(255, 150, 100); // Orange
        this.maxSpeed = 3.5;
        this.maxForce = 0.2;
        this.seekWeight = 0.6;
        this.separationWeight = 0.4;
        this.arriveSlowRadius = 80;
        break;
        
      case 'asteroid':
        this.color = color(150, 150, 150); // Gray
        this.maxSpeed = 2;
        this.maxForce = 0.15;
        this.wanderWeight = 0.7;
        this.separationWeight = 0.3;
        this.wanderAngle = 0;
        this.wanderRadius = 50;
        this.wanderDistance = 40;
        break;
        
      case 'formation':
        this.color = color(200, 100, 255); // Purple
        this.maxSpeed = 3.8;
        this.maxForce = 0.22;
        this.seekWeight = 0.6;
        this.separationWeight = 0.5;
        this.formationTargetY = random(100, height - 100);
        break;
    }
  }
  
  computeInputs(player, otherEnemies) {
    // Normalize all inputs to [-1, 1] before feeding NN
    let inputs = [];
    
    // 1-2: Player position (normalized)
    inputs.push(player.pos.x / width);
    inputs.push(player.pos.y / height);
    
    // 3: Player vertical velocity (normalized)
    inputs.push(constrain(player.vel.y / 5, -1, 1));
    
    // 4-5: Distance to player
    let distX = (player.pos.x - this.pos.x) / width;
    let distY = (player.pos.y - this.pos.y) / height;
    inputs.push(constrain(distX, -1, 1));
    inputs.push(constrain(distY, -1, 1));
    
    // 6-7: Nearest other enemies Y positions
    let nearbyEnemies = otherEnemies
      .filter(e => e !== this)
      .sort((a, b) => dist(this.pos.x, this.pos.y, a.pos.x, a.pos.y) - 
                      dist(this.pos.x, this.pos.y, b.pos.x, b.pos.y))
      .slice(0, 2);
    
    inputs.push(nearbyEnemies[0] ? nearbyEnemies[0].pos.y / height : 0);
    inputs.push(nearbyEnemies[1] ? nearbyEnemies[1].pos.y / height : 0);
    
    // 8-9: Distance to ceiling/floor (normalized)
    inputs.push(this.pos.y / height);                    // Distance to ceiling
    inputs.push((height - this.pos.y) / height);         // Distance to floor
    
    // 10: Player shield status
    inputs.push(player.shield1Active || player.shield2Active ? 1 : 0);
    
    return inputs;
  }
  
  applyBehaviors(player, otherEnemies, obstacles) {
    // Get inputs and feed to NN
    let inputs = this.computeInputs(player, otherEnemies);
    let nnOutput = this.brain.feedForward(inputs);
    
    // nnOutput[0] -> which behavior to emphasize (Y movement)
    // nnOutput[1] -> trigger action (unused in MVP, reserved for future)
    
    let force = createVector(0, 0);
    // Horizontal movement is handled automatically (vel.x = -enemyScrollSpeed in sketch.js)
    // The vertical movement is controlled by the neural network
    
    // Apply behaviors based on type and NN output
    switch(this.type) {
      case 'hunter':
        // Control vertical position, seek player's Y
        force.add(this.pursueVertical(player).mult(this.seekWeight * nnOutput[0]));
        force.add(this.separate(otherEnemies).mult(this.separationWeight));
        break;
        
      case 'encircler':
        // Try to intercept from above or below
        let targetY = player.pos.y + (nnOutput[0] * 50 - 25); // Intercept above/below
        let target = createVector(this.pos.x, constrain(targetY, 50, height - 50));
        force.add(this.arrive(target).mult(this.seekWeight * nnOutput[0]));
        force.add(this.separate(otherEnemies).mult(this.separationWeight));
        break;
        
      case 'asteroid':
        force.add(this.wander().mult(this.wanderWeight * nnOutput[0]));
        force.add(this.separate(otherEnemies).mult(this.separationWeight));
        break;
        
      case 'formation':
        // Drift toward formation position
        let formTarget = createVector(
          this.pos.x,
          this.formationTargetY
        );
        force.add(this.arrive(formTarget).mult(this.seekWeight * nnOutput[0]));
        force.add(this.separate(otherEnemies).mult(this.separationWeight));
        break;
    }
    
    // Avoid obstacles
    force.add(this.avoidObstacles(obstacles).mult(1.2));
    
    // Only apply vertical forces - horizontal is handled separately
    force.x = 0;
    
    this.applyForce(force);
  }
  
  pursue(vehicle) {
    // Predict where the player will be in ~10 frames
    let target = vehicle.pos.copy();
    let prediction = vehicle.vel.copy();
    prediction.mult(10);
    target.add(prediction);
    return this.seek(target);
  }
  
  pursueVertical(player) {
    // Only pursue the player vertically (Y position)
    // Horizontally, enemies approach via camera scroll
    let targetY = player.pos.y + (player.vel.y * 10); // Predict Y position
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
    // Continuous random direction variation
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
    if (!obstacles || obstacles.length === 0) {
      return createVector(0, 0);
    }
    
    // Look ahead
    let ahead = this.vel.copy();
    ahead.mult(20);
    let aheadPos = p5.Vector.add(this.pos, ahead);
    
    // Find closest obstacle
    let closestObstacle = null;
    let closestDistance = Infinity;
    
    for (let obstacle of obstacles) {
      let d = dist(aheadPos.x, aheadPos.y, obstacle.pos.x, obstacle.pos.y);
      if (d < closestDistance) {
        closestDistance = d;
        closestObstacle = obstacle;
      }
    }
    
    if (!closestObstacle) {
      return createVector(0, 0);
    }
    
    // If too close, steer away
    if (closestDistance < closestObstacle.r + this.r + 20) {
      let away = p5.Vector.sub(aheadPos, closestObstacle.pos);
      away.setMag(this.maxForce);
      return away;
    }
    
    return createVector(0, 0);
  }
  
  update(player) {
    // Physics update
    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed);
    this.pos.add(this.vel);
    this.acc.set(0, 0);
    
    // Track last player Y for evasion detection
    if (player) {
      let playerYVelocityChange = Math.abs(player.vel.y - this.lastPlayerY);
      this.lastPlayerY = player.vel.y;
      this.fitnessTracker.recordEvasion(playerYVelocityChange);
    }
  }
  
  show() {
    push();
    translate(this.pos.x, this.pos.y);
    
    stroke(this.color);
    strokeWeight(2);
    fill(this.color);
    
    // Different shapes per type
    switch(this.type) {
      case 'hunter':
        // Aggressive alien shape
        triangle(10, -5, 10, 5, -10, 0);
        circle(0, 0, 3);
        break;
        
      case 'encircler':
        // Encircling alien shape
        rect(-8, -8, 16, 16);
        line(-8, -8, 8, 8);
        line(8, -8, -8, 8);
        break;
        
      case 'asteroid':
        // Rough asteroid
        circle(0, 0, this.r_pourDessin);
        noFill();
        circle(0, 0, this.r_pourDessin + 3);
        break;
        
      case 'formation':
        // Formation marker
        line(-10, 0, 10, 0);
        line(0, -10, 0, 10);
        circle(0, 0, 7);
        break;
    }
    
    pop();
  }
  
  isOffscreen() {
    return this.pos.x < -100 || this.pos.x > width + 100 ||
           this.pos.y < -100 || this.pos.y > height + 100;
  }
}
