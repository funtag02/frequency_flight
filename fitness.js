/**
 * Fitness computation - EXTERNAL only, never inside enemy.js
 * For MVP: simple impact-based fitness
 */
class FitnessTracker {
  constructor() {
    this.resetBatch();
  }
  
  resetBatch() {
    this.impacts = 0;
    this.evasionsDetected = 0;
    this.playerBrushes = 0; // Close calls without collision
  }
  
  recordImpact() {
    this.impacts++;
  }
  
  recordEvasion(playerYVelocityChange) {
    // Detect sudden Y velocity change (player avoiding)
    if (Math.abs(playerYVelocityChange) > 0.3) {
      this.evasionsDetected++;
    }
  }
  
  recordBrush() {
    this.playerBrushes++;
  }
  
  computeFitness() {
    // MVP formula (simplified):
    // fitness = impacts + (0.5 * evasions) + (0.3 * brushes)
    let fitness = this.impacts * 1.0;
    fitness += this.evasionsDetected * 0.5;
    fitness += this.playerBrushes * 0.3;
    return fitness;
  }
  
  // For future: coordination bonus
  computeCoordinationBonus(activeEnemies) {
    if (activeEnemies.length < 2) {
      return 0;
    }
    // Would check if multiple enemies triggered actions simultaneously
    // For MVP: always 0
    return 0;
  }
}

// Global fitness tracking (one per enemy during a game session)
let fitnessTrackers = {}; // Maps enemyId -> FitnessTracker
