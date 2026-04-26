/**
 * Genetic Algorithm for Neuro-Evolution
 * Trains enemy brains across multiple generations
 * Uses callback system to integrate with p5.js game loop
 */
class GeneticAlgorithm {
  constructor(populationSize = 20, topologyNN = [10, 8, 8, 2]) {
    this.populationSize = populationSize;
    this.topology = topologyNN;
    this.generation = 0;
    this.currentIndividualIndex = 0;
    this.evaluationSession = 0; // Track session in evaluation
    this.sessionsPerIndividual = 3; // Evaluate each brain 3 times for consistency

    // Initialize random population
    this.population = [];
    for (let i = 0; i < populationSize; i++) {
      this.population.push({
        brain: new NeuralNetwork(this.topology),
        fitness: 0,
        totalFitness: 0,
        sessionCount: 0,
        id: i
      });
    }

    // Stats tracking
    this.maxFitness = 0;
    this.avgFitness = 0;
    this.generationStats = [];
    
    // Training state
    this.isTraining = false;
    this.totalGenerations = 0;
    
    // Timers
    this.trainingStartTime = 0;
    this.generationStartTime = 0;
    
    // Session limits
    this.maxSessionFrames = 1200; // 20 seconds at 60fps
    this.maxSessionDistance = 5000; // Stop early if distance exceeds this
  }

  /**
   * Get current individual being evaluated
   */
  getCurrentIndividual() {
    if (this.currentIndividualIndex >= this.population.length) {
      return null;
    }
    return this.population[this.currentIndividualIndex];
  }

  /**
   * Check if we should end this evaluation session
   * Called every frame during training game
   */
  shouldEndSession(frameCount, playerAlive) {
    // End session if:
    // - maxSessionFrames have passed (usually 1200 = 20 sec at 60fps)
    // - Distance limit exceeded (frameCount as proxy for distance)
    // - Player died
    return frameCount >= this.maxSessionFrames || 
           frameCount >= this.maxSessionDistance || 
           !playerAlive;
  }

  /**
   * Record session results for current individual
   */
  recordSessionFitness(enemyMissileHits, playerEvasions, playerBrushes) {
    let individual = this.getCurrentIndividual();
    if (!individual) return;
    
    // Simple fitness: hits + evasion credit
    let sessionFitness = enemyMissileHits * 10 + playerEvasions * 0.5 + playerBrushes * 0.2;
    individual.totalFitness += sessionFitness;
    individual.sessionCount++;
    
    // Move to next session or next individual
    this.evaluationSession++;
    if (this.evaluationSession >= this.sessionsPerIndividual) {
      // Finalize this individual's fitness
      individual.fitness = individual.totalFitness / this.sessionsPerIndividual;
      
      // Move to next individual
      this.currentIndividualIndex++;
      this.evaluationSession = 0;
    }
  }

  /**
   * Check if evaluation phase is complete
   */
  isEvaluationPhaseComplete() {
    return this.currentIndividualIndex >= this.population.length;
  }

  /**
   * Selection: keep top 20% (elitism)
   */
  selectParents() {
    // Sort by fitness descending
    this.population.sort((a, b) => b.fitness - a.fitness);
    
    // Keep top 20%
    const eliteCount = Math.max(2, Math.floor(this.populationSize * 0.2));
    return this.population.slice(0, eliteCount);
  }

  /**
   * Create new generation via mutation + crossover
   */
  breedNewGeneration(elite) {
    let newPopulation = [];
    
    // Keep all elite (unchanged)
    for (let i = 0; i < elite.length; i++) {
      newPopulation.push({
        brain: elite[i].brain.clone(),
        fitness: 0,
        totalFitness: 0,
        sessionCount: 0,
        id: newPopulation.length
      });
    }
    
    // Fill rest with mutations and crossovers
    while (newPopulation.length < this.populationSize) {
      let parent1 = random(elite);
      let parent2 = random(elite);
      
      // 50% mutation, 50% crossover
      let child;
      if (random() < 0.5) {
        // Mutation: clone + mutate
        child = {
          brain: parent1.brain.clone(),
          fitness: 0,
          totalFitness: 0,
          sessionCount: 0,
          id: newPopulation.length
        };
        child.brain.mutate(0.15); // 15% mutation rate
      } else {
        // Crossover: blend two parents
        child = {
          brain: parent1.brain.crossover(parent2.brain),
          fitness: 0,
          totalFitness: 0,
          sessionCount: 0,
          id: newPopulation.length
        };
        child.brain.mutate(0.1); // Small mutation on child
      }
      
      newPopulation.push(child);
    }
    
    // Replace population
    this.population = newPopulation;
  }

  /**
   * Compute stats for current generation
   */
  computeStats() {
    if (this.population.length === 0) return;
    
    let fitnesses = this.population.map(ind => ind.fitness);
    this.maxFitness = Math.max(...fitnesses);
    this.avgFitness = fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length;
    
    let best = this.population.reduce((a, b) => a.fitness > b.fitness ? a : b);
    
    this.generationStats.push({
      generation: this.generation,
      maxFitness: this.maxFitness,
      avgFitness: this.avgFitness,
      bestIndividual: best.brain.clone()
    });
    
    console.log(`GEN ${this.generation} — Max: ${this.maxFitness.toFixed(2)} | Avg: ${this.avgFitness.toFixed(2)}`);
  }

  /**
   * Start next generation
   * Returns true if more generations to train, false if done
   */
  /**
   * Start next generation
   * Returns true if more generations to train, false if done
   */
  advanceToNextGeneration() {
    this.generation++;
    
    if (this.generation >= this.totalGenerations) {
      console.log(`✅ Training complete! Best fitness: ${this.maxFitness.toFixed(2)}`);
      return false; // Training done
    }
    
    // Compute stats and breed new generation
    this.computeStats();
    let elite = this.selectParents();
    this.breedNewGeneration(elite);
    
    // Reset for evaluation
    this.currentIndividualIndex = 0;
    this.evaluationSession = 0;
    this.generationStartTime = Date.now(); // Reset generation timer
    
    return true; // More generations to train
  }

  /**
   * Start training loop
   * Returns best brain when complete
   */
  startTraining(numGenerations = 10) {
    this.isTraining = true;
    this.totalGenerations = numGenerations;
    this.generation = 0;
    this.currentIndividualIndex = 0;
    this.evaluationSession = 0;
    this.trainingStartTime = Date.now();
    this.generationStartTime = Date.now();
    console.log(`🧬 Starting neuro-evolution: ${numGenerations} generations`);
  }

  /**
   * Get formatted time string (mm:ss)
   */
  static formatTime(ms) {
    let seconds = Math.floor(ms / 1000);
    let minutes = Math.floor(seconds / 60);
    seconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  /**
   * Get elapsed time for current generation
   */
  getGenerationElapsedTime() {
    return GeneticAlgorithm.formatTime(Date.now() - this.generationStartTime);
  }

  /**
   * Get total elapsed time since training start
   */
  getTotalElapsedTime() {
    return GeneticAlgorithm.formatTime(Date.now() - this.trainingStartTime);
  }

  /**
   * Get best brain from current population
   */
  getBestBrain() {
    let best = this.population.reduce((a, b) => a.fitness > b.fitness ? a : b);
    return best.brain;
  }

  /**
   * Export history to JSON
   */
  toJSON() {
    return {
      generation: this.generation,
      populationSize: this.populationSize,
      topology: this.topology,
      stats: this.generationStats,
      bestBrain: this.getBestBrain().toJSON()
    };
  }
}

// Global GA instance
let geneticAlgorithm = null;
