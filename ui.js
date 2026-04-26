/**
 * UI — canvas-only effects (scanlines, debug overlay)
 * HUD, menus and overlays are handled in DOM (index.html + style.css)
 */
class GameUI {
  constructor() {
    this.showDebug = false;
  }

  // Called every frame during play — updates DOM HUD values
  updateHUD(player, enemies, frameCount) {
    // Distance
    document.getElementById('hud-distance').textContent = frameCount;

    // Enemies
    document.getElementById('hud-enemies').textContent = enemies.length;

    // Shield 1
    let s1El = document.getElementById('hud-shield1');
    if (player.shield1Active) {
      let pct = floor((player.shield1Timer / player.shield1Duration) * 100);
      s1El.textContent = `${pct}%`;
      s1El.style.color = 'var(--neon-yellow)';
    } else if (player.shield1RechargeTimer > 0) {
      let pct = floor((1 - player.shield1RechargeTimer / player.shield1RechargeTime) * 100);
      s1El.textContent = `CHG ${pct}%`;
      s1El.style.color = 'rgba(200,170,0,0.6)';
    } else {
      s1El.textContent = 'READY';
      s1El.style.color = 'rgba(150,130,0,0.8)';
    }

    // Shield 2
    let s2El = document.getElementById('hud-shield2');
    if (player.shield2Active) {
      s2El.textContent = `${player.shield2Health}/${player.shield2MaxHealth}`;
      s2El.style.color = 'var(--neon-cyan)';
    } else {
      s2El.textContent = 'OFF';
      s2El.style.color = 'rgba(0,100,80,0.6)';
    }

    // Missile
    let mEl = document.getElementById('hud-missile');
    if (player.missileCooldown > 0) {
      let pct = floor((1 - player.missileCooldown / player.missileCooldownTime) * 100);
      mEl.textContent = `${pct}%`;
      mEl.style.color = 'rgba(200,100,0,0.7)';
    } else {
      mEl.textContent = 'RDY';
      mEl.style.color = 'var(--neon-orange)';
    }
  }

  // Canvas debug overlay (D key)
  drawDebugInfo(player, enemies) {
    if (!this.showDebug) return;
    push();
    fill(0, 255, 100);
    noStroke();
    textSize(11);
    textAlign(LEFT);
    textFont('Orbitron');
    text(`POS (${floor(player.pos.x)}, ${floor(player.pos.y)})`, 20, 80);
    text(`VEL (${player.vel.x.toFixed(2)}, ${player.vel.y.toFixed(2)})`, 20, 96);
    for (let i = 0; i < Math.min(2, enemies.length); i++) {
      let inputs = enemies[i].computeInputs(player, enemies);
      text(`E${i} [${inputs.slice(0,4).map(x => x.toFixed(1)).join(', ')}]`, 20, 112 + i * 14);
    }
    pop();
  }

  toggleDebug() { this.showDebug = !this.showDebug; }
}