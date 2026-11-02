/**
 * Tactile Polyhedral Physics Dice Roller & Sound Synthesizer
 * Provides authentic SVG polyhedral dice rendering (d20, d6, d8, d10),
 * Web Audio procedural clatter/impact sounds, and inline non-blocking animation.
 */
import { state, rollShipWeapon, getEntropyStatus } from '../state.js';

// Procedural Web Audio API sound synthesizer
let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Synthesize organic dice clatter
export function playDiceClatterSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const impacts = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < impacts; i++) {
      const time = now + (i * 0.055) + (Math.random() * 0.02);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220 + Math.random() * 260, time);
      osc.frequency.exponentialRampToValueAtTime(70, time + 0.035);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(900 + Math.random() * 700, time);
      filter.Q.value = 4;

      gain.gain.setValueAtTime(0.22 - (i * 0.04), time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.045);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + 0.05);
    }
  } catch (e) {}
}

// Synthesize solid landing thud
export function playDiceImpactSound(isCrit = false) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (isCrit) {
      // Harmonic chime on critical hit
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    } else {
      // Solid table thud
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(130, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.07);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    }

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + (isCrit ? 0.45 : 0.12));
  } catch (e) {}
}

// Active Inline Animation State
export const diceAnimationState = {
  isRolling: false,
  weaponKey: null,
  currentStage: 0,
  animatedDisplayVals: {},
  animTimer: null
};

// Trigger inline roll with physics rattle and sound
export function triggerInlineWeaponRoll(weaponKey, options = {}) {
  // Clear any existing animation timer
  if (diceAnimationState.animTimer) {
    clearInterval(diceAnimationState.animTimer);
    diceAnimationState.animTimer = null;
  }

  // Generate authentic outcome using True Cryptographic/Quantum Engine
  const result = rollShipWeapon(weaponKey, options);
  
  diceAnimationState.isRolling = true;
  diceAnimationState.weaponKey = weaponKey;
  diceAnimationState.currentStage = 0;
  diceAnimationState.animatedDisplayVals = {};

  playDiceClatterSound();

  // Subtle console recoil vibration
  if (typeof document !== 'undefined') {
    const consoleEl = document.querySelector('.ship-vitals-grid') || document.querySelector('.vagrant-weapons-grid');
    if (consoleEl) {
      consoleEl.classList.add('salvo-recoil');
      setTimeout(() => consoleEl.classList.remove('salvo-recoil'), 400);
    }
  }

  // Smooth scroll to recent salvo card
  setTimeout(() => {
    const salvoEl = document.getElementById('shipRecentSalvoCard');
    if (salvoEl) {
      salvoEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, 50);

  // Multi-beam staging for 4 Eldritch Blasters
  if (weaponKey === 'eldritch-blaster-all') {
    let stage = 0;
    diceAnimationState.animTimer = setInterval(() => {
      stage++;
      diceAnimationState.currentStage = stage;
      playDiceClatterSound();

      if (stage >= 4) {
        clearInterval(diceAnimationState.animTimer);
        diceAnimationState.animTimer = null;
        setTimeout(() => {
          diceAnimationState.isRolling = false;
          playDiceImpactSound(result.attacks?.some(a => a.isCrit));
          window.refreshApp();
        }, 200);
      }
      window.refreshApp();
    }, 140);

  } else {
    // Single attack, silos, or ram
    setTimeout(() => {
      diceAnimationState.isRolling = false;
      const isCrit = result.attack?.isCrit || false;
      playDiceImpactSound(isCrit);
      window.refreshApp();
    }, 450);
  }

  window.refreshApp();
}

// Render authentic faceted polyhedral SVG die
export function renderPolyhedralDieSVG(sides, value, isCrit = false, isNat1 = false, isRolling = false) {
  const displayVal = isRolling ? Math.floor(Math.random() * sides) + 1 : (value ?? '?');
  const critClass = isCrit ? 'die-crit' : (isNat1 ? 'die-nat1' : '');
  const rollingClass = isRolling ? 'die-rattling' : 'die-settled';

  if (sides === 20) {
    // 20-Sided Icosahedron Faceted Geometry
    return `
      <div class="svg-die-wrap d20-wrap ${critClass} ${rollingClass}" title="d20 Polyhedral Die">
        <svg class="polyhedral-svg d20-svg" viewBox="0 0 100 100">
          <defs>
            <linearGradient id="d20Grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="${isCrit ? '#785412' : (isNat1 ? '#5a1215' : '#1e293b')}" />
              <stop offset="100%" stop-color="${isCrit ? '#2c1e05' : (isNat1 ? '#20080a' : '#0a101d')}" />
            </linearGradient>
          </defs>
          <!-- Outer pentagonal silhouette -->
          <polygon points="50,6 94,26 78,82 22,82 6,26" class="die-base-poly" fill="url(#d20Grad)" />
          <!-- Central triangle facet -->
          <polygon points="50,18 25,74 75,74" class="die-facet die-facet-center" />
          <!-- Top edge facets -->
          <polygon points="50,6 6,26 50,18" class="die-facet die-facet-topleft" />
          <polygon points="50,6 94,26 50,18" class="die-facet die-facet-topright" />
          <!-- Side facets -->
          <polygon points="6,26 22,82 25,74" class="die-facet die-facet-left" />
          <polygon points="94,26 78,82 75,74" class="die-facet die-facet-right" />
          <!-- Bottom facet -->
          <polygon points="22,82 78,82 50,74" class="die-facet die-facet-bottom" />
          <!-- Face Value -->
          <text x="50" y="55" class="die-svg-val ${isCrit ? 'text-crit' : (isNat1 ? 'text-nat1' : '')}">${displayVal}</text>
        </svg>
      </div>
    `;
  } else if (sides === 6) {
    // 6-Sided Cube Faceted Geometry
    return `
      <div class="svg-die-wrap d6-wrap ${rollingClass}" title="d6 Force Die">
        <svg class="polyhedral-svg d6-svg" viewBox="0 0 100 100">
          <polygon points="50,8 90,30 90,75 50,96 10,75 10,30" class="die-base-poly" fill="#1e293b" />
          <polygon points="50,8 90,30 50,54 10,30" class="die-facet die-facet-top" fill="#334155" />
          <polygon points="10,30 50,54 50,96 10,75" class="die-facet die-facet-left" fill="#1e293b" />
          <polygon points="90,30 90,75 50,96 50,54" class="die-facet die-facet-right" fill="#0f172a" />
          <text x="50" y="60" class="die-svg-val">${displayVal}</text>
        </svg>
      </div>
    `;
  } else if (sides === 8) {
    // 8-Sided Octahedron Geometry
    return `
      <div class="svg-die-wrap d8-wrap ${rollingClass}" title="d8 Silo Die">
        <svg class="polyhedral-svg d8-svg" viewBox="0 0 100 100">
          <polygon points="50,6 92,50 50,94 8,50" class="die-base-poly" fill="#1e293b" />
          <polygon points="50,6 92,50 50,50" class="die-facet" fill="#334155" />
          <polygon points="50,6 8,50 50,50" class="die-facet" fill="#243044" />
          <polygon points="50,94 92,50 50,50" class="die-facet" fill="#0f172a" />
          <polygon points="50,94 8,50 50,50" class="die-facet" fill="#152033" />
          <text x="50" y="56" class="die-svg-val">${displayVal}</text>
        </svg>
      </div>
    `;
  } else {
    // 10-Sided Trapezohedron Geometry
    return `
      <div class="svg-die-wrap d10-wrap ${rollingClass}" title="d10 Ram Die">
        <svg class="polyhedral-svg d10-svg" viewBox="0 0 100 100">
          <polygon points="50,6 90,35 50,94 10,35" class="die-base-poly" fill="#1e293b" />
          <polygon points="50,6 90,35 50,52" class="die-facet" fill="#334155" />
          <polygon points="50,6 10,35 50,52" class="die-facet" fill="#243044" />
          <polygon points="50,94 90,35 50,52" class="die-facet" fill="#0f172a" />
          <polygon points="50,94 10,35 50,52" class="die-facet" fill="#152033" />
          <text x="50" y="56" class="die-svg-val">${displayVal}</text>
        </svg>
      </div>
    `;
  }
}

// Global window attachment
if (typeof window !== 'undefined') {
  window.triggerInlineWeaponRoll = triggerInlineWeaponRoll;
}
