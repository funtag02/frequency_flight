/**
 * Frequency Flight - Main Game Loop
 */

let player;
let levelGenerator;
let gameUI;
let gameState = 'playing';
let frameCounter = 0;

let worldScrollX = 0;
let enemyScrollSpeed = 3.5; // faster base speed

// BPM clock — 174 BPM at 60fps = 20.69 frames/beat
const BPM = 174;
const BEAT_FRAMES = (60 / BPM) * 60; // ~20.69

// Missiles (player + enemy)
let playerMissiles = [];
let enemyMissiles  = [];

// Input
let keys = {};
let shootPressed = false; // debounce space/click

// Sounds (synthesized via p5.Oscillator / p5.Env)
let sndLaser, sndExplosion, sndShieldHit, sndDeath, sndBeat;
let soundReady = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(60);

  player = new Player(100, height / 2);
  levelGenerator = new LevelGenerator();
  gameUI = new GameUI();

  initSounds();
}

function initSounds() {
  // All sounds are synthesized — no audio files needed

  // Laser: short high-pitched blip
  sndLaser = {
    play() {
      let osc = new p5.Oscillator('sawtooth');
      let env = new p5.Envelope();
      env.setADSR(0.001, 0.08, 0, 0);
      env.setRange(0.3, 0);
      osc.start();
      osc.freq(900);
      env.play(osc);
      setTimeout(() => { osc.stop(); }, 150);
    }
  };

  // Explosion: noise burst
  sndExplosion = {
    play() {
      let noise = new p5.Noise('white');
      let env = new p5.Envelope();
      env.setADSR(0.001, 0.15, 0, 0);
      env.setRange(0.4, 0);
      noise.start();
      env.play(noise);
      setTimeout(() => { noise.stop(); }, 250);
    }
  };

  // Shield hit: metallic ping
  sndShieldHit = {
    play() {
      let osc = new p5.Oscillator('triangle');
      let env = new p5.Envelope();
      env.setADSR(0.001, 0.2, 0, 0);
      env.setRange(0.25, 0);
      osc.start();
      osc.freq(440);
      env.play(osc);
      setTimeout(() => { osc.stop(); }, 300);
    }
  };

  // Death: downward sweep
  sndDeath = {
    play() {
      let osc = new p5.Oscillator('sine');
      let env = new p5.Envelope();
      env.setADSR(0.01, 0.6, 0, 0);
      env.setRange(0.5, 0);
      osc.start();
      osc.freq(300);
      osc.freq(80, 0.6); // sweep down
      env.play(osc);
      setTimeout(() => { osc.stop(); }, 700);
    }
  };

  // Beat pulse: subtle sub-bass click synced to BPM
  sndBeat = {
    play() {
      let osc = new p5.Oscillator('sine');
      let env = new p5.Envelope();
      env.setADSR(0.001, 0.05, 0, 0);
      env.setRange(0.15, 0);
      osc.start();
      osc.freq(60);
      env.play(osc);
      setTimeout(() => { osc.stop(); }, 80);
    }
  };

  soundReady = true;
}

function playSafe(snd) {
  try { if (soundReady) snd.play(); } catch(e) {}
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (player) player.floorThreshold = height - 30;
}

function draw() {
  background(15, 15, 30);

  switch(gameState) {
    case 'playing':
      updateGame();
      drawGame();
      break;
    case 'paused':
      drawGame();
      gameUI.drawPause();
      break;
    case 'gameOver':
      drawGame();
      gameUI.drawGameOver(player, frameCounter);
      break;
  }
}

function updateGame() {
  frameCounter++;

  // BPM beat tick
  if (frameCounter % Math.round(BEAT_FRAMES) === 0) {
    playSafe(sndBeat);
  }

  // World scroll
  worldScrollX += enemyScrollSpeed;
  if (worldScrollX > 500000) {
    wrapWorldCoordinates();
    worldScrollX = 0;
  }

  // Player
  player.applyInput(keys);
  player.update();
  player.checkBoundaries();

  if (!player.isAlive) {
    playSafe(sndDeath);
    gameState = 'gameOver';
    return;
  }

  // Shoot input (space held or mouse held — one missile per press)
  if (shootPressed) {
    let m = player.shoot();
    if (m) {
      playerMissiles.push(m);
      playSafe(sndLaser);
    }
    shootPressed = false; // consume the press
  }

  // Level / enemies
  levelGenerator.update(frameCounter);
  let activeEnemies = levelGenerator.getActiveEnemies();

  for (let enemy of activeEnemies) {
    enemy.vel.x = -enemyScrollSpeed;
    enemy.applyBehaviors(player, activeEnemies, []);
    enemy.update(player);

    // Enemy shooting
    let em = enemy.tryShoot(player);
    if (em) enemyMissiles.push(em);
  }

  // --- Player missiles vs enemies ---
  for (let i = playerMissiles.length - 1; i >= 0; i--) {
    let m = playerMissiles[i];
    m.update();

    for (let j = activeEnemies.length - 1; j >= 0; j--) {
      let enemy = activeEnemies[j];
      let d = dist(m.pos.x, m.pos.y, enemy.pos.x, enemy.pos.y);
      if (d < enemy.r + m.r) {
        let killed = enemy.hit();
        m.alive = false;
        playSafe(sndExplosion);
        if (killed) {
          // Remove from level generator
          levelGenerator.enemies = levelGenerator.enemies.filter(e => e !== enemy);
        }
        break;
      }
    }

    if (!m.alive) { playerMissiles.splice(i, 1); }
  }

  // --- Enemy missiles vs player ---
  for (let i = enemyMissiles.length - 1; i >= 0; i--) {
    let m = enemyMissiles[i];
    m.update();

    let d = dist(m.pos.x, m.pos.y, player.pos.x + 20, player.pos.y);
    if (d < player.r + m.r) {
      m.alive = false;
      let died = player.takeDamage();
      if (died) {
        playSafe(sndDeath);
        player.isAlive = false;
        gameState = 'gameOver';
      } else {
        playSafe(sndShieldHit);
      }
    }

    if (!m.alive || m.isOffscreen()) { enemyMissiles.splice(i, 1); }
  }

  // --- Enemy body collision vs player ---
  for (let enemy of activeEnemies) {
    let d = dist(player.pos.x + 20, player.pos.y, enemy.pos.x, enemy.pos.y);
    if (d < player.r + enemy.r) {
      if (player.takeDamage()) {
        playSafe(sndDeath);
        player.isAlive = false;
        gameState = 'gameOver';
      } else {
        playSafe(sndShieldHit);
      }
      enemy.fitnessTracker.recordImpact();
    }
  }

  levelGenerator.removeOffscreenEnemies();
}

function drawGame() {
  drawBackground();
  player.show();

  // Draw missiles
  for (let m of playerMissiles) m.show();
  for (let m of enemyMissiles)  m.show();

  let activeEnemies = levelGenerator.getActiveEnemies();
  for (let enemy of activeEnemies) enemy.show();

  gameUI.drawHUD(player, activeEnemies, frameCounter);
  gameUI.drawDebugInfo(player, activeEnemies);
}

function wrapWorldCoordinates() {
  for (let e of levelGenerator.getActiveEnemies()) e.pos.x -= 500000;
}

function drawBackground() {
  push();
  let gridSize = 40;
  let gridOffsetX = worldScrollX % gridSize;

  // Deep grid
  stroke(30, 30, 60);
  strokeWeight(1);
  for (let x = -gridOffsetX; x < width; x += gridSize) line(x, 0, x, height);
  for (let y = 0; y < height; y += gridSize) line(0, y, width, y);

  // Neon boundary lines
  strokeWeight(2);
  stroke(0, 180, 255, 120);
  line(0, 30, width, 30);           // ceiling
  stroke(255, 60, 60, 120);
  line(0, height - 30, width, height - 30); // floor

  pop();
}

function keyPressed() {
  let keyChar = key.toLowerCase();
  keys[keyChar] = true;
  keys[keyCode] = true;

  if (keyChar === 'a' && gameState === 'playing') player.activateShield1();
  if (keyChar === 'z' && gameState === 'playing') player.activateShield2();
  if (keyChar === 'd') gameUI.toggleDebug();
  if (keyChar === 'p') {
    gameState = gameState === 'playing' ? 'paused' : 'playing';
  }
  if (keyChar === 'r') restartGame();

  // Space = shoot
  if (keyCode === 32 && gameState === 'playing') {
    shootPressed = true;
  }
}

function keyReleased() {
  let keyChar = key.toLowerCase();
  keys[keyChar] = false;
  keys[keyCode] = false;
}

function mousePressed() {
  if (gameState === 'playing') shootPressed = true;
}

function restartGame() {
  player = new Player(100, height / 2);
  levelGenerator = new LevelGenerator();
  playerMissiles = [];
  enemyMissiles  = [];
  gameState = 'playing';
  frameCounter = 0;
  worldScrollX = 0;
}