/**
 * Level Generation and Enemy Spawning
 * For MVP: level config embedded directly (no async loading)
 */

// Medium level configuration (MVP)
const LEVEL_MEDIUM = {
  "name": "Medium Level",
  "difficulty": "medium",
  "waves": [
    {
      "id": 1,
      "name": "Warm-up hunters",
      "startFrame": 300,
      "duration": 600,
      "spawnInterval": 120,
      "enemies": [
        { "type": "hunter" },
        { "type": "hunter" }
      ]
    },
    {
      "id": 2,
      "name": "Asteroid drift",
      "startFrame": 900,
      "duration": 400,
      "spawnInterval": 150,
      "enemies": [
        { "type": "asteroid" }
      ]
    },
    {
      "id": 3,
      "name": "Hunter pack",
      "startFrame": 1300,
      "duration": 500,
      "spawnInterval": 100,
      "enemies": [
        { "type": "hunter" },
        { "type": "hunter" }
      ]
    },
    {
      "id": 4,
      "name": "Encirclers from above",
      "startFrame": 1800,
      "duration": 400,
      "spawnInterval": 120,
      "enemies": [
        { "type": "encircler", "y": 80 },
        { "type": "encircler" }
      ]
    },
    {
      "id": 5,
      "name": "Mixed assault",
      "startFrame": 2200,
      "duration": 600,
      "spawnInterval": 80,
      "enemies": [
        { "type": "hunter" },
        { "type": "asteroid" },
        { "type": "encircler" },
        { "type": "formation" }
      ]
    },
    {
      "id": 6,
      "name": "Formation wall",
      "startFrame": 2800,
      "duration": 500,
      "spawnInterval": 100,
      "enemies": [
        { "type": "formation", "y": 100 },
        { "type": "formation", "y": 200 },
        { "type": "formation", "y": 300 }
      ]
    },
    {
      "id": 7,
      "name": "Final gauntlet",
      "startFrame": 3300,
      "duration": 800,
      "spawnInterval": 60,
      "enemies": [
        { "type": "hunter" },
        { "type": "encircler" },
        { "type": "asteroid" }
      ]
    }
  ]
};

class LevelGenerator {
  constructor() {
    this.levelConfig = LEVEL_MEDIUM;
    this.frameCounter = 0;
    this.waveIndex = 0;
    this.enemies = [];
  }
  
  update(frameCount) {
    if (!this.levelConfig) return; // Wait for level to load
    
    let waves = this.levelConfig.waves || [];
    if (this.waveIndex >= waves.length) {
      return; // All waves spawned
    }
    
    let currentWave = waves[this.waveIndex];
    
    // Check if it's time to spawn this wave
    if (frameCount >= currentWave.startFrame && 
        frameCount < currentWave.startFrame + currentWave.duration) {
      
      // Spawn enemies at configured interval
      if (frameCount % currentWave.spawnInterval === 0) {
        this.spawnWaveEnemies(currentWave);
      }
    } else if (frameCount >= currentWave.startFrame + currentWave.duration) {
      // Move to next wave
      this.waveIndex++;
    }
  }
  
  spawnWaveEnemies(wave) {
    for (let enemyConfig of wave.enemies) {
      let enemy = this.createEnemy(enemyConfig);
      this.enemies.push(enemy);
    }
  }
  
  createEnemy(config) {
    // Spawn off-screen to the right
    let x = width + 50;
    let y = random(50, height - 50);
    
    if (config.y !== undefined) {
      // Fixed Y if specified
      y = config.y;
    }
    
    let type = config.type || 'hunter';
    let enemy = new Enemy(x, y, type);
    
    return enemy;
  }
  
  getActiveEnemies() {
    return this.enemies.filter(e => !e.isOffscreen());
  }
  
  removeOffscreenEnemies() {
    this.enemies = this.enemies.filter(e => !e.isOffscreen());
  }
  
  getGameProgress() {
    if (!this.levelConfig) return 0;
    let totalDuration = 0;
    for (let wave of this.levelConfig.waves) {
      totalDuration += wave.startFrame + wave.duration;
    }
    return totalDuration;
  }
}
