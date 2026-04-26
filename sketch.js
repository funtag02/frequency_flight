/**
 * Frequency Flight — Main sketch
 * DOM handles menus/HUD, p5 handles game rendering
 */

const TRAINING_STEPS_PER_FRAME = 30; // 30× plus rapide

let player;
let levelGenerator;
let gameUI;
let gameState = 'start'; // 'start' | 'playing' | 'paused' | 'gameOver' | 'debug' | 'training'
let frameCounter = 0;

let worldScrollX = 0;
let enemyScrollSpeed = 3.5;

const BPM = 174;
const BEAT_FRAMES = (60 / BPM) * 60;

let playerMissiles = [];
let enemyMissiles  = [];

let keys = {};
let shootPressed = false;

// Sounds
let sndLaser, sndExplosion, sndShieldHit, sndDeath, sndBeat;
let soundReady = false;

// Custom level config (set by debug editor, or default)
let activeLevelConfig = null;
let activeGlobalConfig = { speed: 3.5, gravity: 0.08, upForce: 0.35 };

// ─── DOM SETUP ─────────────────────────────────────────────
function setupDOM() {
  // Start screen
  document.getElementById('btn-play').onclick  = () => startGame(false);
  document.getElementById('btn-debug').onclick = () => openDebugEditor();
  document.getElementById('btn-train').onclick = () => startTraining();

  // Pause
  document.getElementById('btn-resume').onclick = () => resumeGame();

  // Game over
  document.getElementById('btn-restart').onclick = () => startGame(false);
  document.getElementById('btn-tomenu').onclick  = () => goToMenu();

  // Debug editor
  document.getElementById('btn-launch').onclick   = () => launchFromDebug();
  document.getElementById('btn-backmenu').onclick = () => goToMenu();
  document.getElementById('btn-add-wave').onclick = () => addWave();
  document.getElementById('btn-save').onclick     = () => saveConfig();
  document.getElementById('btn-load').onclick     = () => loadConfig();
  document.getElementById('btn-reset').onclick    = () => resetConfig();

  // Training
  document.getElementById('btn-train-cancel').onclick = () => goToMenu();
}

function showScreen(id) {
  ['screen-start','screen-pause','screen-gameover','screen-debug','screen-training'].forEach(s => {
    document.getElementById(s).classList.add('hidden');
  });
  document.getElementById('hud').classList.add('hidden');

  if (id) document.getElementById(id).classList.remove('hidden');
  if (id === null) { /* canvas only, no overlay */ }
  if (id === null || id === 'screen-pause') {
    document.getElementById('hud').classList.remove('hidden');
  }
}

function startGame(fromDebug = false) {
  if (fromDebug && activeLevelConfig) {
    enemyScrollSpeed = activeGlobalConfig.speed;
  } else {
    enemyScrollSpeed = 3.5;
    activeLevelConfig = null;
  }

  player = new Player(100, height / 2);
  if (fromDebug) {
    player.gravity  = activeGlobalConfig.gravity;
    player.upForce  = activeGlobalConfig.upForce;
  }

  levelGenerator = new LevelGenerator(activeLevelConfig);
  playerMissiles = [];
  enemyMissiles  = [];
  frameCounter   = 0;
  worldScrollX   = 0;
  gameState      = 'playing';

  showScreen(null); // hide all overlays, show HUD
  document.getElementById('hud').classList.remove('hidden');
}

function resumeGame() {
  gameState = 'playing';
  showScreen(null);
  document.getElementById('hud').classList.remove('hidden');
}

function goToMenu() {
  gameState = 'start';
  showScreen('screen-start');
}

function startTraining() {
  gameState = 'training';
  showScreen('screen-training');
  
  // Initialize GA
  geneticAlgorithm = new GeneticAlgorithm(20, [10, 8, 8, 2]); // 20 individuals
  geneticAlgorithm.startTraining(10); // 10 generations
  
  // Set session limits
  geneticAlgorithm.maxSessionFrames = 1200; // 20 seconds at 60fps
  geneticAlgorithm.maxSessionDistance = 5000; // Stop early if distance exceeds this
  
  // Update max gen display
  document.getElementById('train-max-gen').textContent = '10';
  
  // Start first evaluation session
  startTrainingSession();
}

function startTrainingSession() {
  let individual = geneticAlgorithm.getCurrentIndividual();
  if (!individual) {
    if (geneticAlgorithm.advanceToNextGeneration()) {
      startTrainingSession();
    } else {
      finishTraining();
    }
    return;
  }

  enemyScrollSpeed = 3.5;
  player = new Player(100, height / 2);
  player.gravity = 0.08;
  player.upForce = 0.35;

  playerMissiles = [];
  enemyMissiles  = [];
  frameCounter   = 0;
  worldScrollX   = 0;

  // Spawn proche du joueur pour que la session soit utile
  let spawnX = width * 0.6; // ~60% de l'écran — atteint le joueur rapidement
  window.trainingEnemy = new Enemy(spawnX, height / 2, 'hunter', individual.brain);
  // Ne pas reset le fitnessTracker ici — il est neuf à chaque new Enemy()
}

function finishTraining() {
  gameState = 'start';
  let best = geneticAlgorithm.getBestBrain();
  localStorage.setItem('bestBrain_v1', JSON.stringify(best.toJSON()));

  let subtitle = document.querySelector('.start-subtitle');
  subtitle.textContent =
    `✓ TRAINING COMPLETE — BEST FITNESS: ${geneticAlgorithm.maxFitness.toFixed(2)}`;
  subtitle.style.color      = 'var(--neon-yellow)';
  subtitle.style.textShadow = '0 0 8px var(--neon-yellow)';

  showScreen('screen-start');
}

function triggerGameOver() {
  gameState = 'gameOver';
  document.getElementById('gameover-distance').textContent =
    `DISTANCE — ${frameCounter}`;
  showScreen('screen-gameover');
}

function updateTrainingUI() {
  if (!geneticAlgorithm) return;
  document.getElementById('train-gen').textContent      = geneticAlgorithm.generation + 1;
  document.getElementById('train-max-fit').textContent  = geneticAlgorithm.maxFitness.toFixed(2);
  document.getElementById('train-avg-fit').textContent  = geneticAlgorithm.avgFitness.toFixed(2);
  document.getElementById('train-gen-time').textContent   = geneticAlgorithm.getGenerationElapsedTime();
  document.getElementById('train-total-time').textContent = geneticAlgorithm.getTotalElapsedTime();
}
// ─── DEBUG EDITOR ──────────────────────────────────────────
const ENEMY_TYPES = ['hunter','encircler','asteroid','formation','shooter','gunner'];

function openDebugEditor() {
  gameState = 'debug';
  showScreen('screen-debug');

  // Load saved or default
  let cfg = loadSavedConfig() || buildDefaultConfig();
  applyConfigToEditor(cfg);
}

function buildDefaultConfig() {
  return {
    global: { speed: 3.5, gravity: 0.08, upForce: 0.35 },
    waves: JSON.parse(JSON.stringify(LEVEL_MEDIUM.waves))
  };
}

function applyConfigToEditor(cfg) {
  document.getElementById('cfg-speed').value   = cfg.global.speed;
  document.getElementById('cfg-gravity').value = cfg.global.gravity;
  document.getElementById('cfg-upforce').value = cfg.global.upForce;
  renderWaves(cfg.waves);
}

function readConfigFromEditor() {
  return {
    global: {
      speed:   parseFloat(document.getElementById('cfg-speed').value),
      gravity: parseFloat(document.getElementById('cfg-gravity').value),
      upForce: parseFloat(document.getElementById('cfg-upforce').value),
    },
    waves: readWavesFromDOM()
  };
}

// ── Wave rendering ──────────────────────────────────────────
let editorWaves = []; // live array of wave objects

function renderWaves(waves) {
  editorWaves = waves.map(w => ({...w, enemies: [...w.enemies]}));
  redrawWaveCards();
}

function redrawWaveCards() {
  let container = document.getElementById('waves-container');
  container.innerHTML = '';

  editorWaves.forEach((wave, wi) => {
    let card = document.createElement('div');
    card.className = 'wave-card';
    card.innerHTML = `
      <div class="wave-card-header">
        <span class="wave-title">WAVE ${wi + 1} — ${wave.name || ''}</span>
        <button class="btn btn-red btn-sm" onclick="removeWave(${wi})">✕ REMOVE</button>
      </div>
      <div class="wave-params">
        <div class="field-row">
          <span class="field-label">START&nbsp;F</span>
          <input class="neon-input" type="number" min="0" step="60"
            value="${wave.startFrame}"
            onchange="editorWaves[${wi}].startFrame = parseInt(this.value)">
        </div>
        <div class="field-row">
          <span class="field-label">DURATION</span>
          <input class="neon-input" type="number" min="60" step="60"
            value="${wave.duration}"
            onchange="editorWaves[${wi}].duration = parseInt(this.value)">
        </div>
        <div class="field-row">
          <span class="field-label">INTERVAL</span>
          <input class="neon-input" type="number" min="20" step="10"
            value="${wave.spawnInterval}"
            onchange="editorWaves[${wi}].spawnInterval = parseInt(this.value)">
        </div>
      </div>
      <div class="wave-enemies" id="enemies-${wi}">
        ${wave.enemies.map((e, ei) => enemyTagHTML(wi, ei, e.type)).join('')}
        <div class="add-enemy-row">
          <select class="neon-select" id="new-enemy-type-${wi}">
            ${ENEMY_TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}
          </select>
          <button class="btn btn-cyan btn-sm" onclick="addEnemy(${wi})">+ ADD</button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function enemyTagHTML(wi, ei, type) {
  return `<span class="enemy-tag">
    ${type}
    <button class="enemy-tag-remove" onclick="removeEnemy(${wi},${ei})">×</button>
  </span>`;
}

function addWave() {
  let lastFrame = editorWaves.length > 0
    ? editorWaves[editorWaves.length - 1].startFrame + 600
    : 60;
  editorWaves.push({
    id: editorWaves.length + 1,
    name: 'New Wave',
    startFrame: lastFrame,
    duration: 400,
    spawnInterval: 100,
    enemies: [{ type: 'hunter' }]
  });
  redrawWaveCards();
}

function removeWave(wi) {
  editorWaves.splice(wi, 1);
  redrawWaveCards();
}

function addEnemy(wi) {
  let sel = document.getElementById(`new-enemy-type-${wi}`);
  editorWaves[wi].enemies.push({ type: sel.value });
  redrawWaveCards();
}

function removeEnemy(wi, ei) {
  editorWaves[wi].enemies.splice(ei, 1);
  redrawWaveCards();
}

function readWavesFromDOM() {
  return editorWaves.map((w, i) => ({
    id: i + 1,
    name: w.name || `Wave ${i+1}`,
    startFrame:    w.startFrame,
    duration:      w.duration,
    spawnInterval: w.spawnInterval,
    enemies:       w.enemies.map(e => ({ type: e.type }))
  }));
}

// ── Storage ─────────────────────────────────────────────────
const LS_KEY = 'ff_level_config';

function saveConfig() {
  let cfg = readConfigFromEditor();
  localStorage.setItem(LS_KEY, JSON.stringify(cfg));
  flashBtn('btn-save', 'SAVED ✓');
}

function loadSavedConfig() {
  try {
    let raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch(e) { return null; }
}

function loadConfig() {
  let cfg = loadSavedConfig();
  if (cfg) {
    applyConfigToEditor(cfg);
    flashBtn('btn-load', 'LOADED ✓');
  } else {
    flashBtn('btn-load', 'NONE FOUND');
  }
}

function resetConfig() {
  localStorage.removeItem(LS_KEY);
  applyConfigToEditor(buildDefaultConfig());
  flashBtn('btn-reset', 'RESET ✓');
}

function flashBtn(id, txt) {
  let btn = document.getElementById(id);
  let orig = btn.textContent;
  btn.textContent = txt;
  setTimeout(() => { btn.textContent = orig; }, 1500);
}

function launchFromDebug() {
  let cfg = readConfigFromEditor();
  activeGlobalConfig = cfg.global;
  activeLevelConfig  = { name: 'Custom', difficulty: 'custom', waves: cfg.waves };
  startGame(true);
}

// ─── p5 SETUP ──────────────────────────────────────────────
function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(60);
  gameUI = new GameUI();
  setupDOM();
  initSounds();
  showScreen('screen-start');
}

function initSounds() {
  sndLaser = {
    play() {
      try {
        let osc = new p5.Oscillator('sawtooth');
        let env = new p5.Envelope();
        env.setADSR(0.001, 0.08, 0, 0);
        env.setRange(0.3, 0);
        osc.start(); osc.freq(900);
        env.play(osc);
        setTimeout(() => osc.stop(), 150);
      } catch(e) {}
    }
  };
  sndExplosion = {
    play() {
      try {
        let noise = new p5.Noise('white');
        let env = new p5.Envelope();
        env.setADSR(0.001, 0.15, 0, 0);
        env.setRange(0.4, 0);
        noise.start(); env.play(noise);
        setTimeout(() => noise.stop(), 250);
      } catch(e) {}
    }
  };
  sndShieldHit = {
    play() {
      try {
        let osc = new p5.Oscillator('triangle');
        let env = new p5.Envelope();
        env.setADSR(0.001, 0.2, 0, 0);
        env.setRange(0.25, 0);
        osc.start(); osc.freq(440);
        env.play(osc);
        setTimeout(() => osc.stop(), 300);
      } catch(e) {}
    }
  };
  sndDeath = {
    play() {
      try {
        let osc = new p5.Oscillator('sine');
        let env = new p5.Envelope();
        env.setADSR(0.01, 0.6, 0, 0);
        env.setRange(0.5, 0);
        osc.start(); osc.freq(300); osc.freq(80, 0.6);
        env.play(osc);
        setTimeout(() => osc.stop(), 700);
      } catch(e) {}
    }
  };
  sndBeat = {
    play() {
      try {
        let osc = new p5.Oscillator('sine');
        let env = new p5.Envelope();
        env.setADSR(0.001, 0.05, 0, 0);
        env.setRange(0.15, 0);
        osc.start(); osc.freq(60);
        env.play(osc);
        setTimeout(() => osc.stop(), 80);
      } catch(e) {}
    }
  };
  soundReady = true;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (player) player.floorThreshold = height - 30;
}

// ─── DRAW LOOP ──────────────────────────────────────────────
function draw() {
  background(15, 15, 30);

  if (gameState === 'playing') {
    updateGame();
    drawGame();
  } else if (gameState === 'paused') {
    drawGame(); // render frozen game behind overlay
  } else if (gameState === 'gameOver') {
    drawGame(); // render frozen game behind overlay
  } else if (gameState === 'training') {
    soundReady = false; // Coupe les sons pendant la simulation
    for (let step = 0; step < TRAINING_STEPS_PER_FRAME; step++) {
      if (gameState !== 'training') break; // session ended during loop
      updateTrainingGame();
    }
    soundReady = true; // Réactive après
    updateTrainingUI();
    // Canvas minimal — l'écran training DOM est par-dessus
    background(15, 15, 30);
  }
  // 'start' and 'debug' — canvas just shows dark background
}

function updateGame() {
  frameCounter++;

  if (frameCounter % Math.round(BEAT_FRAMES) === 0) {
    try { sndBeat.play(); } catch(e) {}
  }

  worldScrollX += enemyScrollSpeed;
  if (worldScrollX > 500000) {
    wrapWorldCoordinates();
    worldScrollX = 0;
  }

  player.applyInput(keys);
  player.update();
  player.checkBoundaries();

  if (!player.isAlive) {
    try { sndDeath.play(); } catch(e) {}
    triggerGameOver();
    return;
  }

  if (shootPressed) {
    let m = player.shoot();
    if (m) {
      playerMissiles.push(m);
      try { sndLaser.play(); } catch(e) {}
    }
    shootPressed = false;
  }

  levelGenerator.update(frameCounter);
  let activeEnemies = levelGenerator.getActiveEnemies();

  for (let enemy of activeEnemies) {
    enemy.vel.x = -enemyScrollSpeed;
    enemy.applyBehaviors(player, activeEnemies, []);
    enemy.update(player);
    let em = enemy.tryShoot(player);
    if (em) enemyMissiles.push(em);
  }

  // Player missiles vs enemies
  for (let i = playerMissiles.length - 1; i >= 0; i--) {
    let m = playerMissiles[i];
    m.update();
    for (let j = activeEnemies.length - 1; j >= 0; j--) {
      let enemy = activeEnemies[j];
      if (dist(m.pos.x, m.pos.y, enemy.pos.x, enemy.pos.y) < enemy.r + m.r) {
        let killed = enemy.hit();
        m.alive = false;
        try { sndExplosion.play(); } catch(e) {}
        if (killed) levelGenerator.enemies = levelGenerator.enemies.filter(e => e !== enemy);
        break;
      }
    }
    if (!m.alive) playerMissiles.splice(i, 1);
  }

  // Enemy missiles vs player
  for (let i = enemyMissiles.length - 1; i >= 0; i--) {
    let m = enemyMissiles[i];
    m.update();
    if (dist(m.pos.x, m.pos.y, player.pos.x + 20, player.pos.y) < player.r + m.r) {
      m.alive = false;
      if (player.takeDamage()) {
        try { sndDeath.play(); } catch(e) {}
        player.isAlive = false;
        triggerGameOver();
      } else {
        try { sndShieldHit.play(); } catch(e) {}
      }
    }
    if (!m.alive || m.isOffscreen()) enemyMissiles.splice(i, 1);
  }

  // Enemy body vs player
  for (let enemy of activeEnemies) {
    if (dist(player.pos.x + 20, player.pos.y, enemy.pos.x, enemy.pos.y) < player.r + enemy.r) {
      if (player.takeDamage()) {
        try { sndDeath.play(); } catch(e) {}
        player.isAlive = false;
        triggerGameOver();
      } else {
        try { sndShieldHit.play(); } catch(e) {}
      }
      enemy.fitnessTracker.recordImpact();
    }
  }

  levelGenerator.removeOffscreenEnemies();

  // Update DOM HUD
  gameUI.updateHUD(player, activeEnemies, frameCounter);
}

function updateTrainingGame() {
  frameCounter++;

  let testEnemy = window.trainingEnemy;

  // IA joueuse : esquive basée sur la position de l'ennemi ET des missiles
  if (testEnemy) {
    let force = createVector(0, 0);
    let dy = testEnemy.pos.y - player.pos.y;

    // Esquive l'ennemi
    if (dy > 30)       force.y -= player.upForce * 0.7;
    else if (dy < -30) force.y += player.downForce * 0.7;

    // Esquive le missile le plus proche
    let closestMissile = null;
    let closestDist = Infinity;
    for (let m of enemyMissiles) {
      let d = dist(m.pos.x, m.pos.y, player.pos.x, player.pos.y);
      if (d < closestDist) { closestDist = d; closestMissile = m; }
    }
    if (closestMissile && closestDist < 120) {
      let mdy = closestMissile.pos.y - player.pos.y;
      if (mdy > 0) force.y -= player.upForce * 0.5; // missile en dessous → monte
      else         force.y += player.downForce * 0.5;
    }

    force.y += player.gravity;
    player.applyForce(force);
  }

  player.update();
  player.checkBoundaries();

  // Wrap le joueur verticalement pour éviter la mort par boundary en training
  // (on veut mesurer la fitness, pas que le joueur meure bêtement)
  if (player.pos.y <= player.ceilingThreshold) {
    player.pos.y = player.ceilingThreshold + 1;
    player.vel.y = 0;
  }
  if (player.pos.y >= player.floorThreshold) {
    player.pos.y = player.floorThreshold - 1;
    player.vel.y = 0;
  }
  player.isAlive = true; // En training, le joueur ne meurt pas

  if (testEnemy) {
    testEnemy.vel.x = -enemyScrollSpeed;
    testEnemy.applyBehaviors(player, [testEnemy], []);
    testEnemy.update(player);

    // Tir
    let missile = testEnemy.tryShoot(player);
    if (missile) enemyMissiles.push(missile);

    // Missiles ennemis vs joueur
    for (let i = enemyMissiles.length - 1; i >= 0; i--) {
      let m = enemyMissiles[i];
      m.update();
      let d = dist(m.pos.x, m.pos.y, player.pos.x, player.pos.y);
      if (d < player.r + m.r) {
        m.alive = false;
        // Impact compté directement ici — pas via takeDamage (pas de shields en training)
        testEnemy.fitnessTracker.recordImpact();
      }
      if (!m.alive || m.isOffscreen()) enemyMissiles.splice(i, 1);
    }

    // Collision directe ennemi vs joueur
    let dEnemy = dist(player.pos.x, player.pos.y, testEnemy.pos.x, testEnemy.pos.y);
    if (dEnemy < player.r + testEnemy.r) {
      testEnemy.fitnessTracker.recordImpact();
    }

    // Wrap l'ennemi quand il sort à gauche — il repasse à droite
    if (testEnemy.pos.x < -50) {
      testEnemy.pos.x = width * 0.7;
      testEnemy.pos.y = random(80, height - 80);
      testEnemy.vel.set(0, 0);
    }
  }

  // Fin de session
  if (geneticAlgorithm.shouldEndSession(frameCounter, true)) {
    let hits     = testEnemy ? testEnemy.fitnessTracker.impacts : 0;
    let evasions = testEnemy ? testEnemy.fitnessTracker.evasionsDetected : 0;
    let brushes  = testEnemy ? testEnemy.fitnessTracker.playerBrushes : 0;

    geneticAlgorithm.recordSessionFitness(hits, evasions, brushes);

    if (!geneticAlgorithm.isEvaluationPhaseComplete()) {
      startTrainingSession();
    } else {
      if (geneticAlgorithm.advanceToNextGeneration()) {
        startTrainingSession();
      } else {
        finishTraining();
      }
    }
  }
}

function drawGame() {
  drawBackground();
  player.show();
  for (let m of playerMissiles) m.show();
  for (let m of enemyMissiles)  m.show();
  
  if (gameState === 'training') {
    // Draw only the training enemy
    if (window.trainingEnemy) window.trainingEnemy.show();
  } else {
    // Draw all active enemies
    let activeEnemies = levelGenerator.getActiveEnemies();
    for (let enemy of activeEnemies) enemy.show();
    gameUI.drawDebugInfo(player, activeEnemies);
  }
}

function wrapWorldCoordinates() {
  for (let e of levelGenerator.getActiveEnemies()) e.pos.x -= 500000;
}

function drawBackground() {
  push();
  let gridSize = 40;
  let offset = worldScrollX % gridSize;
  stroke(30, 30, 60);
  strokeWeight(1);
  for (let x = -offset; x < width; x += gridSize) line(x, 0, x, height);
  for (let y = 0; y < height; y += gridSize) line(0, y, width, y);
  strokeWeight(2);
  stroke(0, 180, 255, 120);
  line(0, 30, width, 30);
  stroke(255, 60, 60, 120);
  line(0, height - 30, width, height - 30);
  pop();
}

// ─── INPUT ──────────────────────────────────────────────────
function keyPressed() {
  let k = key.toLowerCase();
  keys[k] = true;
  keys[keyCode] = true;

  if (gameState === 'playing') {
    if (k === 'a') player.activateShield1();
    if (k === 'z') player.activateShield2();
    if (keyCode === 32) shootPressed = true;
  }

  if (k === 'd') gameUI.toggleDebug();

  if (k === 'p') {
    if (gameState === 'playing') {
      gameState = 'paused';
      showScreen('screen-pause');
      document.getElementById('hud').classList.remove('hidden');
    } else if (gameState === 'paused') {
      resumeGame();
    }
  }

  if (k === 'r' && (gameState === 'playing' || gameState === 'gameOver' || gameState === 'paused')) {
    startGame(activeLevelConfig !== null);
  }
}

function keyReleased() {
  keys[key.toLowerCase()] = false;
  keys[keyCode] = false;
}

function mousePressed() {
  if (gameState === 'playing') shootPressed = true;
}