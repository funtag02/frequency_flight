/**
 * UI - HUD, menus, information display
 * Neon theme — Orbitron font
 */
class GameUI {
  constructor() {
    this.showDebug = false;

    // Neon palette
    this.neonCyan   = color(0, 255, 200);
    this.neonPink   = color(255, 50, 150);
    this.neonPurple = color(180, 0, 255);
    this.neonYellow = color(255, 220, 0);
    this.neonRed    = color(255, 60, 60);
    this.neonOrange = color(255, 140, 0);
  }

  _neonText(txt, x, y, size, col, glow = true) {
    push();
    textFont('Orbitron');
    textSize(size);
    textAlign(LEFT, TOP);
    if (glow) {
      // Glow layer
      let g = color(red(col), green(col), blue(col), 60);
      fill(g);
      noStroke();
      text(txt, x - 1, y - 1);
      text(txt, x + 1, y + 1);
      text(txt, x - 1, y + 1);
      text(txt, x + 1, y - 1);
    }
    fill(col);
    noStroke();
    text(txt, x, y);
    pop();
  }

  drawHUD(player, enemies, frameCount) {
    push();

    // Top bar background
    fill(0, 0, 20, 180);
    noStroke();
    rect(0, 0, width, 60);

    // Distance score
    this._neonText(`DIST  ${floor(frameCount)}`, 20, 14, 14, this.neonCyan);

    // Enemies count
    this._neonText(`ENEMIES  ${enemies.length}`, 220, 14, 14, this.neonPurple);

    // Shield status
    let shieldX = 450;
    if (player.shield1Active) {
      let pct = player.shield1Timer / player.shield1Duration;
      this._neonText(`S1 ${floor(pct * 100)}%`, shieldX, 14, 14, this.neonYellow);
    } else if (player.shield1RechargeTimer > 0) {
      let pct = 1 - player.shield1RechargeTimer / player.shield1RechargeTime;
      this._neonText(`S1 CHRG ${floor(pct * 100)}%`, shieldX, 14, 14, color(150, 130, 0));
    } else {
      this._neonText(`S1 READY`, shieldX, 14, 14, color(100, 100, 0));
    }

    if (player.shield2Active) {
      this._neonText(`S2 ${player.shield2Health}/${player.shield2MaxHealth}`, shieldX + 180, 14, 14, this.neonCyan);
    } else {
      this._neonText(`S2 OFF`, shieldX + 180, 14, 14, color(0, 80, 80));
    }

    // Missile cooldown indicator
    if (player.missileCooldown > 0) {
      let pct = 1 - player.missileCooldown / player.missileCooldownTime;
      this._neonText(`MISSILE ${floor(pct * 100)}%`, shieldX + 340, 14, 14, this.neonOrange);
    } else {
      this._neonText(`MISSILE RDY`, shieldX + 340, 14, 14, this.neonOrange);
    }

    // Controls hint at bottom
    fill(0, 0, 20, 160);
    noStroke();
    rect(0, height - 30, width, 30);
    this._neonText(
      `↑/↓ MOVE   A SHIELD1   Z SHIELD2   SPACE/CLICK FIRE   D DEBUG   P PAUSE   R RESTART`,
      20, height - 22, 9, color(80, 80, 120), false
    );

    pop();
  }

  drawDebugInfo(player, enemies) {
    if (!this.showDebug) return;
    push();
    textFont('Orbitron');
    textSize(11);
    fill(0, 255, 100);
    noStroke();
    textAlign(LEFT);
    text(`POS (${floor(player.pos.x)}, ${floor(player.pos.y)})`, 20, 80);
    text(`VEL (${player.vel.x.toFixed(2)}, ${player.vel.y.toFixed(2)})`, 20, 96);
    for (let i = 0; i < Math.min(2, enemies.length); i++) {
      let inputs = enemies[i].computeInputs(player, enemies);
      text(`E${i} [${inputs.slice(0,4).map(x => x.toFixed(1)).join(', ')}]`, 20, 112 + i * 14);
    }
    pop();
  }

  drawGameOver(player, frameCount) {
    push();
    // Dark overlay
    fill(0, 0, 15, 210);
    noStroke();
    rect(0, 0, width, height);

    // Scanlines effect
    stroke(255, 255, 255, 8);
    strokeWeight(1);
    for (let y = 0; y < height; y += 4) line(0, y, width, y);

    textAlign(CENTER, CENTER);

    // GAME OVER glitch
    this._neonText('GAME OVER', width / 2 - 2, height / 2 - 70, 52, this.neonPink);
    this._neonText('GAME OVER', width / 2 + 1, height / 2 - 68, 52, this.neonCyan);
    this._neonText('GAME OVER', width / 2,     height / 2 - 69, 52, color(255, 255, 255));

    // Score
    textAlign(CENTER);
    this._neonText(`DISTANCE  ${frameCount}`, width / 2 - 80, height / 2 + 10, 18, this.neonYellow);

    // Restart
    this._neonText('PRESS  R  TO  RESTART', width / 2 - 130, height / 2 + 60, 14, this.neonCyan);

    pop();
  }

  drawPause() {
    push();
    fill(0, 0, 15, 180);
    noStroke();
    rect(0, 0, width, height);

    textAlign(CENTER);
    this._neonText('PAUSED', width / 2 - 60, height / 2 - 40, 48, this.neonPurple);
    this._neonText('PRESS  P  TO  RESUME', width / 2 - 120, height / 2 + 20, 14, this.neonCyan);
    pop();
  }

  toggleDebug() {
    this.showDebug = !this.showDebug;
  }
}