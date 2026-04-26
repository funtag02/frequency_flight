/**
 * Frequency Flight - Main Game Loop
 * p5.js + steering behaviors + neural networks
 */

// Global game state
let player;
let levelGenerator;
let gameUI;
let gameState = 'playing'; // 'playing', 'paused', 'gameOver', 'menu'
let frameCounter = 0;

// World scroll (enemies move left, player stays fixed at x=100)
let worldScrollX = 0; // Tracks how far the world has scrolled
let enemyScrollSpeed = 2; // pixels per frame - enemies move left

// Key input tracking
let keys = {};

function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(60);
  
  // Initialize game
  player = new Player(100, height / 2);
  levelGenerator = new LevelGenerator(); // Embedded level config
  gameUI = new GameUI();
}

function windowResized() {
  // Adapt canvas to window size
  if (gameState !== undefined) { // Only resize if game is initialized
    resizeCanvas(windowWidth, windowHeight);
    // Update player boundaries
    if (player) {
      player.floorThreshold = height - 30;
    }
  }
}

function draw() {
  background(15, 15, 30); // Dark space background
  
  // Handle keyboard input
  updateKeys();
  
  // Game state machine
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
  
  // World scrolls left (enemies move left toward player)
  worldScrollX += enemyScrollSpeed;
  
  // Wrap world scroll to prevent number overflow
  // Every 500000 pixels, reset all positions
  if (worldScrollX > 500000) {
    wrapWorldCoordinates();
    worldScrollX = 0;
  }
  
  // Update player
  player.applyInput(keys);
  player.update();

  player.applyInput(keys);
  player.update();
  player.checkBoundaries();   // ← ajoute cette ligne

  if (!player.isAlive) {      // ← ajoute ce bloc
    gameState = 'gameOver';
  }
  
  // Generate level (spawn enemies)
  levelGenerator.update(frameCounter);
  let activeEnemies = levelGenerator.getActiveEnemies();
  
  // Update enemies - they move left naturally
  for (let enemy of activeEnemies) {
    // Enemies move left toward player
    enemy.vel.x = -enemyScrollSpeed;
    
    let obstacles = []; // TODO: Add obstacle support
    enemy.applyBehaviors(player, activeEnemies, obstacles);
    enemy.update(player);
  }
  
  // Collision detection: enemies vs player
  for (let enemy of activeEnemies) {
    let d = dist(player.pos.x, player.pos.y, enemy.pos.x, enemy.pos.y);
    if (d < player.r + enemy.r) {
      // Collision detected
      if (player.takeDamage()) {
        // Player died
        gameState = 'gameOver';
      }
      enemy.fitnessTracker.recordImpact();
    }
  }
  
  // Remove offscreen enemies
  levelGenerator.removeOffscreenEnemies();
  
  // Check if level is complete (all waves done and no enemies left)
  if (frameCounter > levelGenerator.getGameProgress() && activeEnemies.length === 0) {
    gameState = 'gameOver'; // Level complete / win (same screen for MVP)
  }
}

function drawGame() {
  // Draw background grid (scrolls with worldScrollX)
  drawBackground();
  
  // Draw player
  player.show();
  
  // Draw enemies
  let activeEnemies = levelGenerator.getActiveEnemies();
  for (let enemy of activeEnemies) {
    enemy.show();
  }
  
  // Draw HUD (not affected by scroll)
  gameUI.drawHUD(player, activeEnemies, frameCounter);
  gameUI.drawDebugInfo(player, activeEnemies);
}

function wrapWorldCoordinates() {
  // Reset all positions when world has scrolled too far
  // This prevents number overflow while keeping gameplay identical
  let activeEnemies = levelGenerator.getActiveEnemies();
  for (let enemy of activeEnemies) {
    enemy.pos.x -= 500000;
  }
}

function drawBackground() {
  // Infinite grid that scrolls with worldScrollX
  push();
  stroke(60, 60, 100);
  strokeWeight(1);
  
  let gridSize = 40;
  
  // Calculate starting position for seamless wrapping
  let gridOffsetX = worldScrollX % gridSize;
  let startX = -gridOffsetX;
  
  // Draw vertical lines (infinite scroll)
  for (let x = startX; x < width; x += gridSize) {
    line(x, 0, x, height);
  }
  
  // Draw horizontal lines
  for (let y = 0; y < height; y += gridSize) {
    line(0, y, width, y);
  }
  
  // Ceiling marker
  stroke(100, 50, 50);
  strokeWeight(2);
  line(0, 30, width, 30);
  
  // Floor marker
  line(0, height - 30, width, height - 30);
  
  pop();
}

function updateKeys() {
  // Keyboard handlers are in keyPressed/keyReleased
}

function keyPressed() {
  // Store by key character (lowercase) and key code
  let keyChar = key.toLowerCase();
  keys[keyChar] = true;
  keys[keyCode] = true;
  
  // Special keys
  if (keyChar === 'a') {
    if (gameState === 'playing') {
      player.activateShield1();
    }
  }
  
  if (keyChar === 'z') {
    if (gameState === 'playing') {
      player.activateShield2();
    }
  }
  
  if (keyChar === 'd') {
    gameUI.toggleDebug();
  }
  
  if (keyChar === 'p') {
    if (gameState === 'playing') {
      gameState = 'paused';
    } else if (gameState === 'paused') {
      gameState = 'playing';
    }
  }
  
  if (keyChar === 'r') {
    restartGame();
  }
}

function keyReleased() {
  let keyChar = key.toLowerCase();
  keys[keyChar] = false;
  keys[keyCode] = false;
}

function restartGame() {
  player = new Player(100, height / 2);
  levelGenerator = new LevelGenerator();
  gameState = 'playing';
  frameCounter = 0;
  cameraOffset = 0;  // Reset camera offset
}

// Mouse support for obstacles (future feature)
function mousePressed() {
  // TODO: Add obstacle creation on click
}
