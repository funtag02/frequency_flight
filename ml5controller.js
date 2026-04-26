/**
 * ML5Controller — handPose gesture detection
 * Gestures:
 *   open hand      → move up/down (Y relative to screen center)
 *   gunfinger      → shoot (index + thumb extended, orthogonal)
 *   fist           → shield 1
 *   V sign         → pause
 *   middle finger  → restart
 *
 * Rules:
 *   - Activated/deactivated with M key
 *   - Disabled for current game session if keyboard/mouse input detected
 *   - Re-enabled on next game start or M key press
 */
class ML5Controller {
  constructor() {
    this.enabled    = false;
    this.ready      = false;
    this.handPose   = null;
    this.hands      = [];
    this.videoEl    = null;

    // Current detected gesture
    this.gesture    = 'none'; // 'open','gunfinger','fist','v','middle','none'
    this.gestureLabel = '— —';

    // Gesture outputs (read by sketch.js each frame)
    this.moveUp     = false;
    this.moveDown   = false;
    this.shoot      = false;  // rising edge only
    this.shield1    = false;
    this.pauseGest  = false;  // rising edge
    this.restartGest= false;  // rising edge

    // Rising edge tracking
    this._prevGesture = 'none';

    // Shoot debounce — one shot per gesture hold
    this._shootFired  = false;
    this._pauseFired  = false;
    this._restartFired= false;
  }

  // ── Lifecycle ──────────────────────────────────────────────

  async enable() {
    if (this.enabled) return;
    this.enabled = true;

    document.getElementById('webcam-container').style.display = 'flex';

    // Get webcam stream
    this.videoEl = document.getElementById('webcam-video');
    try {
      let stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      this.videoEl.srcObject = stream;
      await this.videoEl.play();
    } catch(e) {
      console.warn('ML5: webcam access denied', e);
      this.enabled = false;
      document.getElementById('webcam-container').style.display = 'none';
      return;
    }

    // Init handPose
    this.handPose = ml5.handPose(this.videoEl, { flipped: true }, () => {
      this.ready = true;
      document.getElementById('webcam-status').textContent = '● ML5';
      document.getElementById('webcam-status').style.color = 'var(--neon-cyan)';
      this.handPose.on('predict', results => {
        this.hands = results;
        this._processHands();
      });
    });
  }

  disable() {
    this.enabled  = false;
    this.ready    = false;
    this.gesture  = 'none';
    this._resetOutputs();

    document.getElementById('webcam-container').style.display = 'none';

    if (this.videoEl && this.videoEl.srcObject) {
      this.videoEl.srcObject.getTracks().forEach(t => t.stop());
      this.videoEl.srcObject = null;
    }

    if (this.handPose) {
      this.handPose = null;
    }
  }

  toggle() {
    if (this.enabled) this.disable();
    else              this.enable();
  }

  // Called at start of each game session — resets override flag
  resetForNewSession() {
    this._keyboardOverride = false;
  }

  // Called by sketch.js when keyboard/mouse input is detected
  notifyKeyboardUsed() {
    this._keyboardOverride = true;
  }

  get isActive() {
    return this.enabled && this.ready && !this._keyboardOverride;
  }

  // ── Gesture detection ──────────────────────────────────────

  _processHands() {
    if (!this.hands || this.hands.length === 0) {
      this.gesture = 'none';
      this.gestureLabel = '— —';
      this._resetOutputs();
      this._updateUI();
      return;
    }

    let hand = this.hands[0]; // Use first hand only
    let kp   = hand.keypoints; // Array of {x, y, name}

    // ── Finger extension helpers ──────────────────────────────
    // Returns true if a finger tip is significantly above its MCP (extended)
    // "above" = lower Y value (screen coords)
    const extended = (tipName, mcpName) => {
      let tip = this._kp(kp, tipName);
      let mcp = this._kp(kp, mcpName);
      if (!tip || !mcp) return false;
      return tip.y < mcp.y - 20; // tip must be 20px above mcp
    };

    const thumbExtended = () => {
      // Thumb: tip should be significantly to the side of IP joint
      let tip = this._kp(kp, 'thumb_tip');
      let ip  = this._kp(kp, 'thumb_ip');
      if (!tip || !ip) return false;
      return Math.abs(tip.x - ip.x) > 15 || tip.y < ip.y - 15;
    };

    let indexExt  = extended('index_finger_tip',  'index_finger_mcp');
    let middleExt = extended('middle_finger_tip', 'middle_finger_mcp');
    let ringExt   = extended('ring_finger_tip',   'ring_finger_mcp');
    let pinkyExt  = extended('pinky_tip',         'pinky_mcp');
    let thumbExt  = thumbExtended();

    // ── Gesture classification ────────────────────────────────

    let g = 'none';

    // FIST: all fingers closed (none extended)
    if (!indexExt && !middleExt && !ringExt && !pinkyExt) {
      g = 'fist';
    }
    // OPEN HAND: all 4 fingers extended
    else if (indexExt && middleExt && ringExt && pinkyExt) {
      g = 'open';
    }
    // MIDDLE FINGER: only middle extended
    else if (!indexExt && middleExt && !ringExt && !pinkyExt) {
      g = 'middle';
    }
    // V SIGN: index + middle extended, ring + pinky closed
    else if (indexExt && middleExt && !ringExt && !pinkyExt) {
      // Distinguish from gunfinger: check angle between index and middle tips
      let iTip = this._kp(kp, 'index_finger_tip');
      let mTip = this._kp(kp, 'middle_finger_tip');
      let iMcp = this._kp(kp, 'index_finger_mcp');
      if (iTip && mTip && iMcp) {
        // V: both fingers spread (tips apart horizontally)
        let spread = Math.abs(iTip.x - mTip.x);
        g = spread > 20 ? 'v' : 'v'; // both cases = V (gunfinger needs thumb)
      } else {
        g = 'v';
      }
    }
    // GUNFINGER: index + thumb extended, middle/ring/pinky closed
    // + orthogonal check: thumb vertical, index horizontal
    else if (indexExt && !middleExt && !ringExt && !pinkyExt && thumbExt) {
      let iTip = this._kp(kp, 'index_finger_tip');
      let iMcp = this._kp(kp, 'index_finger_mcp');
      let tTip = this._kp(kp, 'thumb_tip');
      let tIp  = this._kp(kp, 'thumb_ip');

      if (iTip && iMcp && tTip && tIp) {
        let indexDx = Math.abs(iTip.x - iMcp.x);
        let indexDy = Math.abs(iTip.y - iMcp.y);
        let thumbDx = Math.abs(tTip.x - tIp.x);
        let thumbDy = Math.abs(tTip.y - tIp.y);

        // Index more horizontal than vertical (parallel X axis)
        // Thumb more vertical than horizontal (parallel Y axis)
        let indexHoriz = indexDx > indexDy;
        let thumbVert  = thumbDy > thumbDx;

        g = (indexHoriz && thumbVert) ? 'gunfinger' : 'none';
      }
    }

    this.gesture = g;
    this._applyGesture(hand, kp);
    this._updateUI();
    this._prevGesture = g;
  }

  _applyGesture(hand, kp) {
    this._resetOutputs();
    if (!this.isActive) return;

    switch(this.gesture) {

      case 'open': {
        // Move up/down based on wrist Y vs screen center
        let wrist = this._kp(kp, 'wrist');
        if (wrist) {
          // videoEl is 160px wide displayed, but actual video res may differ
          // Use normalized y: wrist.y is in video coords (~480px tall typically)
          let centerY = this.videoEl.videoHeight / 2 || 240;
          let deadzone = centerY * 0.12; // 12% deadzone around center
          let dy = wrist.y - centerY;
          if (dy < -deadzone)       this.moveUp   = true;
          else if (dy > deadzone)   this.moveDown  = true;
        }
        break;
      }

      case 'gunfinger': {
        // One shot per gesture — reset when gesture changes
        if (!this._shootFired) {
          this.shoot     = true;
          this._shootFired = true;
        }
        break;
      }

      case 'fist': {
        this.shield1 = true;
        break;
      }

      case 'v': {
        if (!this._pauseFired) {
          this.pauseGest = true;
          this._pauseFired = true;
        }
        break;
      }

      case 'middle': {
        if (!this._restartFired) {
          this.restartGest = true;
          this._restartFired = true;
        }
        break;
      }
    }

    // Reset one-shot flags when gesture changes
    if (this.gesture !== this._prevGesture) {
      this._shootFired   = false;
      this._pauseFired   = false;
      this._restartFired = false;
    }
  }

  _resetOutputs() {
    this.moveUp      = false;
    this.moveDown    = false;
    this.shoot       = false;
    this.shield1     = false;
    this.pauseGest   = false;
    this.restartGest = false;
  }

  _updateUI() {
    const labels = {
      'open':      '✋ MOVE',
      'gunfinger': '🤙 SHOOT',
      'fist':      '✊ SHIELD',
      'v':         '✌️ PAUSE',
      'middle':    '🖕 RESTART',
      'none':      '— —'
    };
    let el = document.getElementById('webcam-gesture');
    if (el) el.textContent = labels[this.gesture] || '— —';
  }

  // ── Keypoint helper ────────────────────────────────────────
  _kp(keypoints, name) {
    return keypoints.find(k => k.name === name) || null;
  }
}

// Global instance
let ml5Controller = new ML5Controller();