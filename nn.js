/**
 * Feed-forward Neural Network
 * Simple implementation for MVP - no neuro-evolution yet
 * Each enemy has its own instance for predictions
 */
class NeuralNetwork {
  constructor(topology) {
    this.topology = topology; // [inputSize, ...hiddenSizes, outputSize]
    this.layers = [];
    this.biases = [];
    
    this.initializeRandomWeights();
  }
  
  initializeRandomWeights() {
    // Create weight matrices between layers
    for (let i = 0; i < this.topology.length - 1; i++) {
      let layer = [];
      for (let from = 0; from < this.topology[i]; from++) {
        let weights = [];
        for (let to = 0; to < this.topology[i + 1]; to++) {
          // Random weights in [-1, 1]
          weights.push(random(-1, 1));
        }
        layer.push(weights);
      }
      this.layers.push(layer);
      
      // Biases for each neuron in next layer
      let biasesMat = [];
      for (let j = 0; j < this.topology[i + 1]; j++) {
        biasesMat.push(random(-1, 1));
      }
      this.biases.push(biasesMat);
    }
  }
  
  feedForward(inputs) {
    let activations = inputs.slice(); // Start with inputs
    
    // Process through each layer
    for (let layerIdx = 0; layerIdx < this.layers.length; layerIdx++) {
      let nextActivations = [];
      let weights = this.layers[layerIdx];
      let biases = this.biases[layerIdx];
      
      // For each neuron in the next layer
      for (let toNeuron = 0; toNeuron < weights[0].length; toNeuron++) {
        let sum = biases[toNeuron];
        
        // Sum weighted inputs
        for (let fromNeuron = 0; fromNeuron < weights.length; fromNeuron++) {
          sum += activations[fromNeuron] * weights[fromNeuron][toNeuron];
        }
        
        // Apply activation function (tanh for MVP)
        nextActivations.push(tanh(sum));
      }
      
      activations = nextActivations;
    }
    
    return activations;
  }
  
  // MVP: static mutation for simple variation
  mutate(mutationRate = 0.1) {
    for (let layerIdx = 0; layerIdx < this.layers.length; layerIdx++) {
      // Mutate weights
      for (let i = 0; i < this.layers[layerIdx].length; i++) {
        for (let j = 0; j < this.layers[layerIdx][i].length; j++) {
          if (random() < mutationRate) {
            // Gaussian mutation
            this.layers[layerIdx][i][j] += randomGaussian(0, 0.3);
            this.layers[layerIdx][i][j] = constrain(this.layers[layerIdx][i][j], -1, 1);
          }
        }
      }
      
      // Mutate biases
      for (let j = 0; j < this.biases[layerIdx].length; j++) {
        if (random() < mutationRate) {
          this.biases[layerIdx][j] += randomGaussian(0, 0.3);
          this.biases[layerIdx][j] = constrain(this.biases[layerIdx][j], -1, 1);
        }
      }
    }
  }
  
  // Clone this network
  clone() {
    let newNN = new NeuralNetwork(this.topology);
    
    // Deep copy weights
    for (let i = 0; i < this.layers.length; i++) {
      newNN.layers[i] = [];
      for (let j = 0; j < this.layers[i].length; j++) {
        newNN.layers[i][j] = this.layers[i][j].slice();
      }
    }
    
    // Deep copy biases
    for (let i = 0; i < this.biases.length; i++) {
      newNN.biases[i] = this.biases[i].slice();
    }
    
    return newNN;
  }
  
  // Crossover: blend two parent networks
  crossover(otherNN) {
    let childNN = new NeuralNetwork(this.topology);
    
    // 50/50 crossover per weight
    for (let i = 0; i < this.layers.length; i++) {
      for (let j = 0; j < this.layers[i].length; j++) {
        for (let k = 0; k < this.layers[i][j].length; k++) {
          if (random() < 0.5) {
            childNN.layers[i][j][k] = this.layers[i][j][k];
          } else {
            childNN.layers[i][j][k] = otherNN.layers[i][j][k];
          }
        }
      }
    }
    
    // 50/50 crossover per bias
    for (let i = 0; i < this.biases.length; i++) {
      for (let j = 0; j < this.biases[i].length; j++) {
        if (random() < 0.5) {
          childNN.biases[i][j] = this.biases[i][j];
        } else {
          childNN.biases[i][j] = otherNN.biases[i][j];
        }
      }
    }
    
    return childNN;
  }
}

// Helper: sigmoid activation (optional)
function sigmoid(x) {
  return 1 / (1 + exp(-x));
}

// Helper: tanh activation (default for MVP)
function tanh(x) {
  return (exp(2 * x) - 1) / (exp(2 * x) + 1);
}
