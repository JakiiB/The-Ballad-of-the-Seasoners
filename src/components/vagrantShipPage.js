/**
 * The Vagrant - Spelljammer Stat Block & Tactical Console
 * Word-for-word reproduction of THE VAGRANT Spelljammer Stat Block.pdf
 */
import { state } from '../state.js';
import { renderPolyhedralDieSVG, triggerInlineWeaponRoll, diceAnimationState } from './diceRoller.js';

window.handleShipHpQuick = function(delta) {
  if (delta < 0) {
    const chk = document.getElementById('shipBypassDtChk');
    const bypassDt = chk ? chk.checked : false;
    if (typeof window.applyShipDamage === 'function') {
      window.applyShipDamage(Math.abs(delta), 'hull', bypassDt);
    }
  } else {
    if (typeof window.applyShipRepair === 'function') {
      window.applyShipRepair(delta, 'hull');
    }
  }
};

window.handleShipHpCustom = function(isHeal) {
  const input = document.getElementById('shipCustomHpInput');
  if (!input) return;
  const val = parseInt(input.value, 10);
  if (isNaN(val) || val <= 0) return;

  if (isHeal) {
    if (typeof window.applyShipRepair === 'function') {
      window.applyShipRepair(val, 'hull');
    }
  } else {
    const chk = document.getElementById('shipBypassDtChk');
    const bypassDt = chk ? chk.checked : false;
    if (typeof window.applyShipDamage === 'function') {
      window.applyShipDamage(val, 'hull', bypassDt);
    }
  }
  input.value = '';
};

window.handleShipFullRepair = function() {
  if (typeof window.resetShipHp === 'function') {
    window.resetShipHp('hull');
  }
};

window.handleShipWeaponRoll = function(key, opts = {}) {
  if (typeof triggerInlineWeaponRoll === 'function') {
    triggerInlineWeaponRoll(key, opts);
  } else if (typeof window.triggerInlineWeaponRoll === 'function') {
    window.triggerInlineWeaponRoll(key, opts);
  } else if (typeof window.rollShipWeapon === 'function') {
    window.rollShipWeapon(key, opts);
  }
};

export function renderVagrantShipPage() {
  const shipData = state.partyState?.ship || {};
  const hullCurrent = shipData.hull?.currentHp ?? 450;
  const hullMax = shipData.hull?.maxHp ?? 450;
  const hullAc = shipData.hull?.ac ?? 17;
  const dt = shipData.hull?.damageThreshold ?? 30;
  const hullPct = Math.max(0, Math.min(100, Math.round((hullCurrent / hullMax) * 100)));

  const hullStatusClass = hullPct > 50 ? 'status-green' : (hullPct > 25 ? 'status-amber' : 'status-red');
  const lastRoll = state.lastShipRoll;

  return `
    <div class="vagrant-page-container">
      
      <!-- Top Ship Header Banner -->
      <div class="vagrant-hero-card">
        <div class="vagrant-hero-content">
          <div class="vagrant-badge-row">
            <span class="vagrant-badge badge-gold">Spelljammer Stat Block</span>
            <span class="vagrant-badge badge-planar">Keel/Beam 155 ft. / 25 ft.</span>
            <span class="vagrant-badge badge-origin">Crew 30 - Cargo 20 tons</span>
          </div>
          <h1 class="vagrant-title">THE VAGRANT</h1>
        </div>
        <div class="vagrant-quick-actions">
          <button class="btn btn-secondary" onclick="window.switchTab('party')">← Return to Party Vitals</button>
        </div>
      </div>

      <!-- STATS (Verbatim from PDF) -->
      <div class="vagrant-stats-grid">
        
        <div class="vagrant-stat-card card-hull active-target-card">
          <div class="stat-card-header">
            <span class="stat-label">HIT POINTS & ARMOR CLASS</span>
            <span class="stat-badge-small">Damage Threshold: ${dt}</span>
          </div>
          <div class="stat-main-val">
            <span class="hp-num ${hullStatusClass}">${hullCurrent}</span>
            <span class="hp-sep">/</span>
            <span class="hp-max">${hullMax} HP</span>
          </div>
          <div class="vagrant-bar-track">
            <div class="vagrant-bar-fill ${hullStatusClass}" style="width: ${hullPct}%;"></div>
          </div>
          <div class="stat-subtext">
            <span><strong>Armor Class:</strong> ${hullAc} (wood & copper plating)</span>
            <span><strong>Damage Threshold:</strong> ${dt}</span>
          </div>
        </div>

        <div class="vagrant-stat-card">
          <div class="stat-card-header">
            <span class="stat-label">STATS</span>
          </div>
          <div class="stat-speed-entries">
            <div class="speed-row">
              <span class="speed-name">Speed:</span>
              <strong class="speed-val text-accent">fly 50 ft. (5 1/2 mph)</strong>
            </div>
            <div class="speed-row">
              <span class="speed-name">Keel/Beam:</span>
              <strong class="speed-val">155 ft. / 25 ft.</strong>
            </div>
            <div class="speed-row">
              <span class="speed-name">Crew / Cargo:</span>
              <strong class="speed-val">Crew 30 - Cargo 20 tons</strong>
            </div>
          </div>
        </div>

        <div class="vagrant-stat-card">
          <div class="stat-card-header">
            <span class="stat-label">ACTIONS SUMMARY</span>
          </div>
          <div class="stat-speed-entries" style="font-size: 0.86rem; line-height: 1.45; color: var(--text);">
            <p style="margin: 0 0 0.35rem 0;">On its turn, the spelljammer can take 3 actions, choosing from the options below.</p>
            <div><strong>Fire Eldritch Blasters.</strong> The Vagrant can fire its Eldritch Blasters.</div>
            <div><strong>Fire Magic Missile Silos.</strong> The Vagrant can fire its Magic Missile Silos.</div>
            <div><strong>Move.</strong> The spelljammer can use the helm to move the Vagrant up to its speed, with one 90 degree turn. As part of this move, it can use its piercing ram.</div>
          </div>
        </div>

        <div class="vagrant-stat-card">
          <div class="stat-card-header">
            <span class="stat-label">CREW ROLES</span>
          </div>
          <div class="stat-speed-entries">
            <div class="speed-row">
              <span class="speed-name">Captain & Spelljammer:</span>
              <strong class="speed-val text-accent">Pasquale Étienne</strong>
            </div>
            <div class="speed-row">
              <span class="speed-name">First Mate & Spelljammer:</span>
              <strong class="speed-val text-emerald">Sister Agnes</strong>
            </div>
            <div class="speed-row">
              <span class="speed-name">Ship's Doctor:</span>
              <strong class="speed-val">Ethelred</strong>
            </div>
            <div class="speed-row">
              <span class="speed-name">Ship's Cook / Deckhand:</span>
              <strong class="speed-val">Uncle Alvy / Bucket</strong>
            </div>
          </div>
        </div>

      </div>

      <!-- HULL HP & DAMAGE CONTROL -->
      <div class="vagrant-console-card">
        <div class="console-header-row">
          <div class="console-title-group">
            <h3 class="console-title">🛠️ Hull HP Tracker</h3>
            <span class="console-target-badge"><strong>Hit Points: ${hullCurrent} / ${hullMax} - Armor Class ${hullAc} - Damage Threshold ${dt}</strong></span>
          </div>
        </div>

        <div class="console-controls-grid">
          <div class="console-control-group">
            <div class="control-label">DAMAGE</div>
            <div class="hp-quick-buttons">
              <button class="btn-quick dmg" onclick="window.handleShipHpQuick(-10)">-10 HP</button>
              <button class="btn-quick dmg" onclick="window.handleShipHpQuick(-30)">-30 HP</button>
              <button class="btn-quick dmg" onclick="window.handleShipHpQuick(-50)">-50 HP</button>
            </div>
          </div>

          <div class="console-control-group">
            <div class="control-label">REPAIR</div>
            <div class="hp-quick-buttons">
              <button class="btn-quick heal" onclick="window.handleShipHpQuick(10)">+10 HP</button>
              <button class="btn-quick heal" onclick="window.handleShipHpQuick(30)">+30 HP</button>
              <button class="btn-quick heal" onclick="window.handleShipHpQuick(50)">+50 HP</button>
            </div>
          </div>

          <div class="console-control-group custom-group">
            <div class="control-label">CUSTOM AMOUNT</div>
            <div class="custom-hp-row">
              <input type="number" id="shipCustomHpInput" class="hp-num-input" placeholder="Amount..." min="1" max="500" onkeydown="if(event.key==='Enter') window.handleShipHpCustom(false)" />
              <button class="btn btn-danger btn-sm" onclick="window.handleShipHpCustom(false)">💥 Damage</button>
              <button class="btn btn-success btn-sm" onclick="window.handleShipHpCustom(true)">💚 Repair</button>
            </div>
          </div>

          <div class="console-control-group options-group">
            <div class="control-label">OPTIONS</div>
            <div class="options-row">
              <label class="dt-toggle-label" title="Bypass Damage Threshold 30">
                <input type="checkbox" id="shipBypassDtChk" />
                <span>Bypass DT 30</span>
              </label>
              <button class="btn btn-secondary btn-sm" onclick="window.handleShipFullRepair()">🔄 Reset to 450 HP</button>
            </div>
          </div>
        </div>
      </div>

      <!-- RECENT SALVO / DICE ROLLER DISPLAY -->
      ${lastRoll ? `
        <div class="ship-dice-card ${diceAnimationState.isRolling ? 'salvo-card-rolling' : ''}" id="shipRecentSalvoCard">
          <div class="dice-card-header">
            <div class="dice-header-left">
              <span class="dice-icon">🎲</span>
              <strong class="dice-weapon-name">${lastRoll.weaponName}</strong>
              <span class="dice-time">${lastRoll.timestamp}</span>
              ${lastRoll.entropySource ? `
                <span class="dice-entropy-pill" title="Hardware Entropy / 0 Modulo Bias">
                  ${lastRoll.entropySource.includes('Quantum') ? '⚛' : '⚡'} ${lastRoll.entropySource}
                </span>
              ` : ''}
            </div>
            <button class="btn-dismiss-roll" onclick="window.clearShipRoll()" title="Clear Roll Result">✕</button>
          </div>

          <div class="dice-result-body">
            <p class="dice-summary">${lastRoll.summary}</p>

            ${lastRoll.attack ? `
              <div class="inline-single-attack">
                ${renderPolyhedralDieSVG(20, lastRoll.attack.d20, lastRoll.attack.isCrit, lastRoll.attack.isNat1, diceAnimationState.isRolling)}
                <div class="single-attack-info">
                  <div class="single-attack-top">
                    <span class="attack-formula">d20 (${diceAnimationState.isRolling ? '...' : lastRoll.attack.d20}) + ${lastRoll.attack.mod} to hit =</span>
                    <strong class="attack-total-num ${lastRoll.attack.isCrit ? 'text-crit' : (lastRoll.attack.isNat1 ? 'text-nat1' : '')}">
                      ${diceAnimationState.isRolling ? '...' : lastRoll.attack.total}
                    </strong>
                    ${!diceAnimationState.isRolling && lastRoll.attack.isCrit ? '<span class="dice-badge-crit">★ CRITICAL HIT!</span>' : ''}
                    ${!diceAnimationState.isRolling && lastRoll.attack.isNat1 ? '<span class="dice-badge-nat1">⚠️ CRITICAL MISS!</span>' : ''}
                  </div>
                  <div class="single-attack-sub">
                    <span class="meta-pill pill-range">Range: ${lastRoll.range}</span>
                    <span class="meta-pill">Damage: ${lastRoll.damage.total} ${lastRoll.damage.type} (${lastRoll.damage.diceCount}d${lastRoll.damage.diceSides})</span>
                  </div>
                </div>
              </div>
            ` : ''}

            ${lastRoll.attacks ? `
              <div class="inline-beams-grid">
                ${lastRoll.attacks.map((atk, idx) => {
                  const beamNum = atk.beamIndex || atk.siloIndex || (idx + 1);
                  const isPending = diceAnimationState.isRolling && lastRoll.weaponKey === 'eldritch-blaster-all' && beamNum > diceAnimationState.currentStage;
                  const isCurrentRolling = diceAnimationState.isRolling && lastRoll.weaponKey === 'eldritch-blaster-all' && beamNum === diceAnimationState.currentStage;
                  const isSettled = !isPending && !isCurrentRolling;

                  return `
                    <div class="inline-beam-card ${atk.isCrit && isSettled ? 'beam-crit' : ''} ${isPending ? 'beam-pending' : ''} ${isCurrentRolling ? 'beam-active' : ''}">
                      ${atk.autoHit ? `
                        ${renderPolyhedralDieSVG(8, 8, false, false, false)}
                        <div class="beam-info">
                          <span class="beam-label">Silo ${beamNum}</span>
                          <span class="beam-attack-val text-auto">AUTO-HIT</span>
                          <span class="beam-damage-val">${atk.damage} Force</span>
                        </div>
                      ` : `
                        ${renderPolyhedralDieSVG(20, atk.d20, atk.isCrit, atk.d20 === 1, isCurrentRolling || (diceAnimationState.isRolling && isPending))}
                        <div class="beam-info">
                          <span class="beam-label">Beam ${beamNum}</span>
                          <span class="beam-attack-val ${atk.isCrit && isSettled ? 'text-crit' : ''}">
                            ${isPending ? '...' : `${atk.total}${atk.isCrit ? ' ★' : ''}`}
                          </span>
                          <span class="beam-damage-val">${isPending ? '...' : `${atk.damage} Force`}</span>
                        </div>
                      `}
                    </div>
                  `;
                }).join('')}
              </div>
            ` : ''}

            <div class="dice-damage-banner">
              <div class="damage-total-display">
                <span class="damage-num">${diceAnimationState.isRolling ? '...' : lastRoll.damage.total}</span>
                <span class="damage-type">${lastRoll.damage.type.toUpperCase()} DAMAGE</span>
                ${lastRoll.damage.selfDamage ? `
                  <span class="recoil-pill">⚠️ Vagrant Takes Half: -${lastRoll.damage.selfDamage} HP</span>
                ` : ''}
              </div>
              <div class="dice-tray">
                ${(lastRoll.damage.dice || []).slice(0, 40).map(d => `
                  <span class="die-face die-d${lastRoll.damage.diceSides || 6}">${d}</span>
                `).join('')}
                ${(lastRoll.damage.dice || []).length > 40 ? `<span class="die-overflow">+${lastRoll.damage.dice.length - 40} more</span>` : ''}
              </div>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- WEAPONS (Word-for-Word from PDF) -->
      <div class="vagrant-section">
        <div class="section-header-row">
          <h2 class="section-title">💥 Weapons</h2>
          <span class="section-tag">Click to roll attacks</span>
        </div>

        <div class="vagrant-weapons-grid">
          
          <!-- ELDRITCH BLASTERS (4) -->
          <div class="weapon-card">
            <div class="weapon-card-header">
              <div class="weapon-title-group">
                <strong class="weapon-name">ELDRITCH BLASTERS (4)</strong>
              </div>
              <span class="weapon-range-tag">400/1,200 ft.</span>
            </div>
            <p class="weapon-desc">
              This weapon appears as a series of swirling magical glyphs on the ship's hull. The spelljammer can use an action to aim, and another action to make four of the following attacks.<br><br>
              <strong><em>Eldritch Blaster (Requires Aim).</em></strong> <em>Ranged Spell Attack:</em> +10 to hit, range 400/1,200 ft., one target. <em>Hit:</em> 35 (10d6) force damage.
            </p>
            <div class="weapon-action-buttons">
              <button class="btn btn-accent weapon-roll-btn" onclick="window.handleShipWeaponRoll('eldritch-blaster-single')">
                🎯 Roll 1 Attack (+10 - 10d6)
              </button>
              <button class="btn btn-secondary weapon-roll-btn" onclick="window.handleShipWeaponRoll('eldritch-blaster-all')">
                ⚡ Roll All 4 Attacks (40d6)
              </button>
            </div>
          </div>

          <!-- MAGIC MISSILE SILOS (2) -->
          <div class="weapon-card">
            <div class="weapon-card-header">
              <div class="weapon-title-group">
                <strong class="weapon-name">MAGIC MISSILE SILOS (2)</strong>
              </div>
              <span class="weapon-range-tag">1,000/3,000 ft.</span>
            </div>
            <p class="weapon-desc">
              The spelljammer can use an action to make two of the following attacks. If the spelljammer does not move on its turn, these attacks hit automatically.<br><br>
              <strong><em>Magic Missile Silo.</em></strong> <em>Ranged Spell Attack:</em> +10, range 1,000/3,000 ft. <em>Hit:</em> 49 (11d8) force damage.
            </p>
            <div class="weapon-action-buttons">
              <button class="btn btn-accent weapon-roll-btn" onclick="window.handleShipWeaponRoll('magic-missile-silos', { stationary: true })">
                🚀 Stationary (Auto-Hit - 22d8)
              </button>
              <button class="btn btn-secondary weapon-roll-btn" onclick="window.handleShipWeaponRoll('magic-missile-silos', { stationary: false })">
                🎯 Moving (+10 to Hit)
              </button>
            </div>
          </div>

          <!-- PIERCING RAM -->
          <div class="weapon-card">
            <div class="weapon-card-header">
              <div class="weapon-title-group">
                <strong class="weapon-name">PIERCING RAM</strong>
              </div>
              <span class="weapon-range-tag">range 0 ft.</span>
            </div>
            <p class="weapon-desc">
              The ship's spelljammer can make the following attack when the ship runs into another object or into a Gargantuan creature (see "Crashing" in chapter 2 of Astral Adventurer's Guide).<br><br>
              <strong><em>Piercing Ram.</em></strong> <em>Melee Weapon Attack:</em> +10 to hit, range 0 ft., one object or Gargantuan creature. <em>Hit:</em> 88 (16d10) piercing damage. The Vagrant takes half as much damage and comes to a dead stop. <em>Miss:</em> The attack deals no damage, the target moves into the nearest unoccupied space that isn't in the Vagrant's path, and the shrike ship can continue moving if it has any movement left.
            </p>
            <div class="weapon-action-buttons">
              <button class="btn btn-danger weapon-roll-btn" onclick="window.handleShipWeaponRoll('piercing-ram')">
                💥 Roll Piercing Ram (+10 - 16d10)
              </button>
            </div>
          </div>

        </div>
      </div>

      <!-- MOVEMENT & OTHER FEATURES (Word-for-Word from PDF) -->
      <div class="vagrant-section">
        <div class="section-header-row">
          <h2 class="section-title">⚙️ Movement & Other Features</h2>
        </div>

        <div class="systems-cards-grid">
          
          <div class="system-box" style="grid-column: 1 / -1;">
            <div class="system-box-header">
              <strong class="system-name text-accent">MOVEMENT: Spelljammer Helm</strong>
            </div>
            <div class="system-text">
              <p style="margin: 0 0 0.5rem 0;">
                <strong><em>Spelljammer Helm.</em></strong> The function of this ornate chair is to propel and maneuver a ship on which it has been installed through space and air up to its speed. It can also propel and maneuver a ship on water. In order to use the helm, a creature must first attune to it (only a creature with the Spellcasting or Pact Magic features can attune to the helm). While attuned to a spelljamming helm and sitting in it, you gain the following abilities for as long as you maintain concentration (as if concentrating on a spell):
              </p>
              <ul style="margin: 0; padding-left: 1.25rem;">
                <li>You can use the spelljamming helm to move the ship through space, air, or water up to the ship's speed. If the ship is in space and no other objects weighing 1 ton or more are within 1 mile of it, you can use the spelljamming helm to move the vessel fast enough to travel 100 million miles in 24 hours.</li>
                <li>You can steer the vessel, albeit in a somewhat clumsy fashion, in much the way that a rudder or oars can be used to maneuver a seafaring ship.</li>
                <li>At any time, you can see and hear what's happening on and around the vessel as though you were standing in a location of your choice aboard it.</li>
                <li>You can make attacks using the ships weaponry (see "Actions")</li>
                <li>You can use the ship's Immovable Anchors and Portal Conflux features.</li>
              </ul>
            </div>
          </div>

          <div class="system-box">
            <div class="system-box-header">
              <strong class="system-name text-accent">Storm Drive</strong>
            </div>
            <div class="system-text">
              <p style="margin: 0 0 0.5rem 0;">
                <strong><em>Storm Drive.</em></strong> Excess planar energy can be diverted from the portal conflux to charge the ship's copper hull, resulting in changes to the atmosphere surrounding the ship. While attuned to the spelljammer helm, the spelljammer can cast the <em>fog cloud</em> spell at will with the following modifications:
              </p>
              <ul style="margin: 0; padding-left: 1.25rem;">
                <li>The fog fills a cylinder that is 30 feet tall with a 120-foot radius. The top of the cylinder is centred on the lowest point of the ship's hull, and moves with the ship.</li>
                <li>The fog cannot be dispersed by strong winds.</li>
                <li>A creature attuned to the spelljammer helm can see through the fog created by the spell when cast in this manner.</li>
              </ul>
            </div>
          </div>

          <div class="system-box">
            <div class="system-box-header">
              <strong class="system-name text-accent">Immovable Anchors</strong>
            </div>
            <p class="system-text">
              <strong><em>Immovable Anchors.</em></strong> The ship has four anchors; a set of two located at the bow and another set of two at the stern. Each anchor has been magically enchanted to act like an immovable rod. The anchors require no crew to deploy; instead, a creature attuned to the ship's Spelljammer Helm can activate and deactivate the anchors at will. The anchors can hold enough weight to suspend the ship in mid-air; however, activating them when moving will result in damage to the hull.
            </p>
          </div>

          <div class="system-box">
            <div class="system-box-header">
              <strong class="system-name text-accent">Portal Conflux</strong>
            </div>
            <p class="system-text">
              <strong><em>Portal Conflux.</em></strong> The Vagrant has been outfitted with a portal conflux. As an action, a creature attuned to the ship's spelljamming helm and in physical contact with the ship can immediately cast <em>plane shift</em> and transport the Vagrant and all creatures and objects aboard it to a different plane of existence, at or near a destination envisioned by the spelljammer (or to a random location on the plane if no destination is envisioned). Once this feature has been used, it can't be used again for 24 hours, unless the spelljammer knows the <em>plane shift</em> spell and expends a spell slot of 7th level or greater to cast it.<br><br>
              The portal conflux cannot be used if any creatures are inside the Special Quarters.
            </p>
          </div>

          <div class="system-box">
            <div class="system-box-header">
              <strong class="system-name text-accent">Special Quarters</strong>
            </div>
            <p class="system-text">
              <strong><em>Special Quarters.</em></strong> The officers' mess and quarters are located in a specially constructed demiplane, accessible only from a door next to the Spelljammer's quarters. This demiplane, and any creatures within it, cannot be targeted by any divination magic.
            </p>
          </div>

        </div>
      </div>

    </div>
  `;
}
