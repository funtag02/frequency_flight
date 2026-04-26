const LEVEL_MEDIUM = {
  "name": "Medium Level",
  "difficulty": "medium",
  "waves": [
    {
      "id": 1,
      "name": "First contact",
      "startFrame": 60,
      "duration": 500,
      "spawnInterval": 100,
      "enemies": [{ "type": "hunter" }, { "type": "hunter" }]
    },
    {
      "id": 2,
      "name": "Asteroid drift",
      "startFrame": 500,
      "duration": 400,
      "spawnInterval": 120,
      "enemies": [{ "type": "asteroid" }]
    },
    {
      "id": 3,
      "name": "Hunter pack",
      "startFrame": 900,
      "duration": 500,
      "spawnInterval": 90,
      "enemies": [{ "type": "hunter" }, { "type": "hunter" }]
    },
    {
      "id": 4,
      "name": "Gunner introduced",
      "startFrame": 1200,
      "duration": 400,
      "spawnInterval": 150,
      "enemies": [{ "type": "gunner" }]
    },
    {
      "id": 5,
      "name": "Encirclers from above",
      "startFrame": 1500,
      "duration": 400,
      "spawnInterval": 120,
      "enemies": [{ "type": "encircler", "y": 80 }, { "type": "encircler" }]
    },
    {
      "id": 6,
      "name": "Shooter arrives",
      "startFrame": 1900,
      "duration": 400,
      "spawnInterval": 180,
      "enemies": [{ "type": "shooter" }]
    },
    {
      "id": 7,
      "name": "Mixed assault",
      "startFrame": 2300,
      "duration": 600,
      "spawnInterval": 80,
      "enemies": [
        { "type": "hunter" },
        { "type": "asteroid" },
        { "type": "encircler" },
        { "type": "gunner" }
      ]
    },
    {
      "id": 8,
      "name": "Formation wall",
      "startFrame": 2900,
      "duration": 500,
      "spawnInterval": 100,
      "enemies": [
        { "type": "formation", "y": 100 },
        { "type": "formation", "y": 200 },
        { "type": "formation", "y": 300 }
      ]
    },
    {
      "id": 9,
      "name": "Final gauntlet",
      "startFrame": 3400,
      "duration": 800,
      "spawnInterval": 60,
      "enemies": [
        { "type": "hunter" },
        { "type": "shooter" },
        { "type": "asteroid" },
        { "type": "gunner" }
      ]
    }
  ]
};

class LevelGenerator {
  constructor(customConfig = null) {
    this.levelConfig = customConfig || LEVEL_MEDIUM;
    this.waveIndex = 0;
    this.enemies = [];
  }

  update(frameCount) {
    if (!this.levelConfig) return;
    let waves = this.levelConfig.waves || [];
    if (this.waveIndex >= waves.length) return;

    let currentWave = waves[this.waveIndex];

    if (frameCount >= currentWave.startFrame &&
        frameCount < currentWave.startFrame + currentWave.duration) {
      if (frameCount % currentWave.spawnInterval === 0) {
        this.spawnWaveEnemies(currentWave);
      }
    } else if (frameCount >= currentWave.startFrame + currentWave.duration) {
      this.waveIndex++;
    }
  }

  spawnWaveEnemies(wave) {
    for (let enemyConfig of wave.enemies) {
      this.enemies.push(this.createEnemy(enemyConfig));
    }
  }

  createEnemy(config) {
    let x = width + 50;
    let y = config.y !== undefined ? config.y : random(50, height - 50);
    return new Enemy(x, y, config.type || 'hunter');
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