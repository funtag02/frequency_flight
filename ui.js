/**
 * UI - HUD, menus, and information display
 * Minimal MVP implementation
 */
class GameUI {
  constructor() {
    this.showDebug = false;
  }
  
  drawHUD(player, enemies, frameCount) {
    push();
    fill(255);
    textSize(16);
    textAlign(LEFT);
    
    // Score (distance)
    let distance = frameCount; // Simple: frames as distance
    text(`Distance: ${floor(distance)}`, 20, 30);
    
    // Health status
    let healthText = `Health: `;
    if (player.shield1Active) {
      healthText += `[Shield1: ${floor(player.shield1Timer)}] `;
    }
    if (player.shield2Active) {
      healthText += `[Shield2: ${player.shield2Health}/${player.shield2MaxHealth}]`;
    }
    if (!player.shield1Active && !player.shield2Active) {
      healthText += `VULNERABLE`;
    }
    text(healthText, 20, 50);
    
    // Enemy count
    text(`Enemies: ${enemies.length}`, 20, 70);
    
    // Controls hint
    textSize(12);
    text(`↑/↓: Move | A: Shield1 | Z: Shield2 | D: Debug | P: Pause | R: Restart`, 20, height - 20);
    
    pop();
  }
  
  drawDebugInfo(player, enemies) {
    if (!this.showDebug) return;
    
    push();
    fill(0, 255, 0);
    textSize(12);
    textAlign(LEFT);
    
    text(`Player Pos: (${floor(player.pos.x)}, ${floor(player.pos.y)})`, 20, 100);
    text(`Player Vel: (${player.vel.x.toFixed(2)}, ${player.vel.y.toFixed(2)})`, 20, 115);
    
    // Draw sensor points for first 2 enemies
    for (let i = 0; i < Math.min(2, enemies.length); i++) {
      let enemy = enemies[i];
      let inputs = enemy.computeInputs(player, enemies);
      text(`Enemy ${i} inputs[0-4]: ${inputs.slice(0, 4).map(x => x.toFixed(2)).join(', ')}`, 20, 130 + i * 15);
    }
    
    pop();
  }
  
  drawGameOver(player, frameCount) {
    push();
    fill(0, 0, 0, 200);
    rect(0, 0, width, height);
    
    fill(255);
    textSize(48);
    textAlign(CENTER, CENTER);
    text('GAME OVER', width / 2, height / 2 - 40);
    
    textSize(24);
    text(`Final Distance: ${frameCount}`, width / 2, height / 2 + 20);
    text(`Press R to Restart`, width / 2, height / 2 + 80);
    
    pop();
  }
  
  drawPause() {
    push();
    fill(0, 0, 0, 150);
    rect(0, 0, width, height);
    
    fill(255);
    textSize(48);
    textAlign(CENTER, CENTER);
    text('PAUSED', width / 2, height / 2);
    text('Press P to Resume', width / 2, height / 2 + 60);
    
    pop();
  }
  
  toggleDebug() {
    this.showDebug = !this.showDebug;
  }
}
