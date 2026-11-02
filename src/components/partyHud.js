/**
 * Pure Spectator / Live Observer Party HUD Component
 * Displays the authoritative truth directly from D&D Beyond.
 */
import { state } from '../state.js';

export function renderPartyHud() {
  // Ordered by roster order, filtered to active session characters
  const activeEntries = state.roster.filter(entry => entry.enabled !== false);
  const orderedChars = activeEntries
    .map(entry => state.characters[entry.dndBeyondId])
    .filter(Boolean);

  if (orderedChars.length === 0) {
    if (activeEntries.length === 0) {
      return `
        <div class="empty-state">
          <p style="font-size:1.1rem; font-weight:700; color:var(--text);">All party members are currently deactivated.</p>
          <p class="muted">Click "⚙ Party URLs" in the header to activate characters or add new ones for this session.</p>
          <button class="btn btn-primary" style="margin-top:1rem;" onclick="window.openRosterModal()">⚙ Manage Party URLs</button>
        </div>
      `;
    }
    return `
      <div class="empty-state">
        <div class="spinner"></div>
        <p>Connecting to D&D Beyond live feeds...</p>
      </div>
    `;
  }

  // Calculate highest HP pool across party to scale vertical gauges proportionally
  const partyMaxHp = Math.max(
    1,
    ...orderedChars.map(c => Math.max(c.hp.max || 1, (c.hp.current || 0) + (c.hp.temp || 0)))
  );

  const isCompact = state.displayMode === 'compact';

  return `
    <div class="party-view-wrapper">
      <!-- Tabletop Mode Switcher Toolbar -->
      <div class="party-hud-toolbar">
        <div class="hud-toolbar-left">
          <span class="active-count-tag">⚔ Active Adventurers (${orderedChars.length})</span>
        </div>
        <div class="display-mode-toggle">
          <button class="mode-btn ${!isCompact ? 'active' : ''}" onclick="window.setDisplayMode('full')" title="Show detailed character cards">
            ⊞ Full Vitals
          </button>
          <button class="mode-btn ${isCompact ? 'active' : ''}" onclick="window.setDisplayMode('compact')" title="Show slim horizontal battle deck (zero scrolling for iPad / tabletop)">
            ⊟ Battle Deck
          </button>
        </div>
      </div>

      ${isCompact ? renderCompactBattleDeck(orderedChars, partyMaxHp) : `
        <div class="party-grid">
          ${orderedChars.map(c => renderCharacterCard(c, partyMaxHp)).join('')}
        </div>
      `}
    </div>
  `;
}

function renderCharacterCard(c, partyMaxHp = 180) {
  const currHp = Math.max(0, c.hp.current || 0);
  const maxHp = Math.max(1, c.hp.max || 1);
  const tempHp = Math.max(0, c.hp.temp || 0);

  // Health % of character's own max (liquid level inside their bar)
  const hpPercent = Math.max(0, Math.min(100, Math.round((currHp / maxHp) * 100)));
  const hpColorClass = hpPercent > 50 ? 'hp-high' : (hpPercent > 20 ? 'hp-mid' : 'hp-low');

  // Physical spine height relative to party tank max (Tang: 100%, Petrus: 63%)
  const spineHeightPct = Math.min(100, Math.round((maxHp / partyMaxHp) * 100));

  // Temp HP height relative to character's own bar
  const tempPercent = Math.min(100 - hpPercent, Math.round((tempHp / maxHp) * 100));

  // Damage taken
  const dmgTaken = Math.max(0, maxHp - currHp);
  const damagePercent = Math.max(0, 100 - (hpPercent + tempPercent));

  // Status Badge
  let statusBadge = '';
  if (currHp === 0) {
    statusBadge = '<span class="status-pill status-down">DOWN</span>';
  } else if (hpPercent <= 50) {
    statusBadge = '<span class="status-pill status-bloodied">BLOODIED</span>';
  } else if (dmgTaken > 0) {
    statusBadge = `<span class="status-pill status-injured">-${dmgTaken} HP</span>`;
  } else {
    statusBadge = '<span class="status-pill status-full">FULL</span>';
  }
  
  const standardSlots = Object.values(c.spellcasting.slots || {});
  const pact = c.spellcasting.pactSlots;
  const isUnconscious = c.hp.current === 0;
  const isOpen = Boolean(state.openDrawers && state.openDrawers.has(c.id));
  const conc = state.concentration && state.concentration[c.id];

  return `
    <div class="party-card ${state.activeCharacterId === c.id ? 'selected' : ''}" onclick="window.inspectCharacter('${c.id}')">
      <!-- Left Life Spine (Physically Scaled Bar - Chopped to Max HP) -->
      <div class="card-spine-col" title="${c.name}: ${currHp}/${maxHp} HP (${hpPercent}%)${tempHp > 0 ? ` +${tempHp} Temp` : ''} - Scaled to ${spineHeightPct}% of party tank">
        <div class="spine-track" style="height: ${spineHeightPct}%;">
          <!-- Damage zone inside character's own bar -->
          ${dmgTaken > 0 && damagePercent > 0 ? `
            <div class="spine-damage" style="bottom: ${hpPercent + tempPercent}%; height: ${damagePercent}%;"></div>
          ` : ''}

          <!-- Temp HP Shield (Stacks directly on top of current HP) -->
          ${tempHp > 0 ? `
            <div class="spine-temp" style="bottom: ${hpPercent}%; height: ${tempPercent}%;"></div>
          ` : ''}

          <!-- Current HP Fill (bottom-up) -->
          <div class="spine-fill ${hpColorClass}" style="height: ${hpPercent}%;"></div>
        </div>
      </div>

      <!-- Right Content Body -->
      <div class="card-content-col">
        <!-- Header -->
        <div class="card-header">
          <div class="avatar-box ${conc ? 'concentrating-avatar' : ''}" title="${conc ? `Concentrating on ${escapeHtml(conc.spellName)}` : c.name}">
            <img src="${c.avatarUrl || 'https://www.dndbeyond.com/avatars/17/214/636377841114911601.jpeg'}" alt="${c.name}" class="avatar-img"/>
            ${c.frameAvatarUrl ? `<img src="${c.frameAvatarUrl}" class="avatar-frame"/>` : ''}
            ${conc ? `<span class="conc-sparkle-pip" title="Concentrating on ${escapeHtml(conc.spellName)}">✦</span>` : ''}
          </div>
          <div class="char-title">
            <div class="name-row">
              <h3>${c.name}</h3>
            </div>
            <div class="char-subtitle">${c.race} // ${c.classSummary}</div>

            ${conc ? `
              <div class="card-conc-tag" onclick="window.breakConcentration('${c.id}', event)" title="Concentrating on ${escapeHtml(conc.spellName)} - Click to break">
                <span class="conc-star">✦</span>
                <span class="conc-name">${escapeHtml(conc.spellName)}</span>
                <span class="conc-close">✕</span>
              </div>
            ` : ''}
          </div>
          ${c.inspiration ? `
            <div class="inspiration-coin" title="Heroic Inspiration (Has Advantage)">
              <span class="coin-star">★</span>
            </div>
          ` : ''}
        </div>

        <!-- Vitals Strip -->
        <div class="vitals-strip">
          <div class="stat-pill"><span class="stat-label">AC</span><span class="stat-val">${c.ac}</span></div>
          <div class="stat-pill"><span class="stat-label">INIT</span><span class="stat-val">${c.initiativeText}</span></div>
          <div class="stat-pill"><span class="stat-label">SPD</span><span class="stat-val">${c.speed}ft</span></div>
          <div class="stat-pill"><span class="stat-label">DC</span><span class="stat-val">${c.spellcasting.dc}</span></div>
          <div class="stat-pill"><span class="stat-label">PERC</span><span class="stat-val">${c.passives.perception}</span></div>
        </div>

        <!-- Sleek HP Readout Strip -->
        <div class="hp-strip">
          <div class="hp-strip-main">
            <span class="hp-strip-label">HP</span>
            <span class="hp-strip-cur ${hpColorClass}-text">${currHp}</span>
            <span class="hp-strip-sep">/</span>
            <span class="hp-strip-max">${maxHp}</span>
            ${tempHp > 0 ? `<span class="hp-strip-temp">+${tempHp} Temp</span>` : ''}
          </div>
          <div class="hp-strip-meta">
            ${statusBadge}
          </div>
        </div>

      <!-- Active Conditions & Death Saves (if applicable) -->
      ${(c.conditions && c.conditions.length > 0) || isUnconscious ? `
        <div class="conditions-row">
          ${isUnconscious ? `
            <span class="badge badge-danger">UNCONSCIOUS (0 HP)</span>
            <div class="death-saves-box">
              <span class="ds-label">Death Saves:</span>
              <span class="ds-succ">✓ ${c.deathSaves.successCount}</span>
              <span class="ds-fail">✕ ${c.deathSaves.failCount}</span>
            </div>
          ` : ''}
          ${(c.conditions || []).map(cond => `<span class="badge badge-cond">${cond}</span>`).join('')}
        </div>
      ` : ''}

      <!-- Live Class Resources -->
      ${c.resources && c.resources.length > 0 ? `
        <div class="resources-section">
          ${c.resources.map(r => `
            <div 
              class="resource-badge resource-badge-clickable" 
              data-char-id="${c.id}"
              data-target-tab="actions"
              data-target-name="${escapeHtml(r.name)}"
              onclick="window.handleShortcut(this, event)"
              title="Click to inspect ${escapeHtml(r.name)} in Actions"
            >
              <span class="res-name">${r.name}:</span>
              <span class="res-val">${r.sourceType === 'passive' || r.reset === 'Passive' || r.name.toLowerCase().includes('sneak attack') ? `+${r.current} (1/turn)` : `${r.current} / ${r.max}`}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <!-- Live Spell Slots -->
      ${(standardSlots.length > 0 || pact) ? `
        <div 
          class="slots-section slots-section-clickable" 
          onclick="window.inspectTarget('${c.id}', 'spells', '', event)"
          title="Click to inspect full Spells tab"
        >
          <div class="slots-title">SPELL SLOTS (LIVE) <span class="click-hint">↗</span></div>
          <div class="slots-pips-row">
            ${pact ? `
              <div class="pact-group">
                <span class="slot-lvl-tag">Pact (L${pact.level})</span>
                <div class="pips" title="${pact.available} of ${pact.total} Pact slots available">
                  ${Array.from({ length: pact.total }).map((_, i) => `
                    <span class="pip ${i < (pact.total - pact.used) ? 'active' : 'used'}"></span>
                  `).join('')}
                </div>
              </div>
            ` : ''}
            ${standardSlots.map(s => `
              <div class="slot-group">
                <span class="slot-lvl-tag">L${s.level}</span>
                <div class="pips" title="${s.available} of ${s.total} Level ${s.level} slots available">
                  ${Array.from({ length: s.total }).map((_, i) => `
                    <span class="pip ${i < (s.total - s.used) ? 'active' : 'used'}"></span>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Expandable Abilities & Charges Drawer (Option A) -->
        ${(c.secondaryExpendables && c.secondaryExpendables.length > 0) ? `
          <div class="drawer-container">
            <button 
              type="button"
              id="drawer-btn-${c.id}"
              class="drawer-toggle-btn ${isOpen ? 'active' : ''}" 
              onclick="window.toggleDrawer('${c.id}', event)"
              title="Toggle limited-use abilities and item charges"
            >
              <span class="drawer-toggle-left">
                <span class="drawer-toggle-icon">⚡</span>
                <span class="drawer-toggle-label">${c.secondaryExpendables.length} Abilities & Charges</span>
              </span>
              <span class="drawer-toggle-arrow ${isOpen ? 'open' : ''}">▸</span>
            </button>
            
            <div id="drawer-${c.id}" class="expendables-drawer ${isOpen ? 'open' : ''}" onclick="event.stopPropagation()">
              <div class="drawer-list">
                ${c.secondaryExpendables.map(exp => {
                  const isDepleted = exp.current === 0;
                  const cadenceClass = (exp.reset || 'special').toLowerCase().replace(/\s+/g, '-');
                  const shortCadence = getCadenceShort(exp.reset);
                  const targetTab = exp.sourceType === 'item' ? 'inventory' : 'actions';
                  return `
                    <div 
                      class="drawer-item ${isDepleted ? 'depleted' : ''} drawer-item-clickable" 
                      data-char-id="${c.id}"
                      data-target-tab="${targetTab}"
                      data-target-name="${escapeHtml(exp.name)}"
                      onclick="window.handleShortcut(this, event)"
                      title="Click to inspect ${escapeHtml(exp.name)} in ${targetTab === 'inventory' ? 'Inventory' : 'Actions'}"
                    >
                      <div class="drawer-item-left">
                        <span class="cadence-pill cadence-${cadenceClass}">${shortCadence}</span>
                        <span class="drawer-item-name">${escapeHtml(exp.name)}</span>
                      </div>
                      <div class="drawer-item-right">
                        <span class="drawer-item-count ${isDepleted ? 'count-depleted' : ''}">${exp.current} / ${exp.max}</span>
                        <span class="drawer-item-jump">↗</span>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          </div>
        ` : ''}

        <!-- Attunement Summary -->
        <div class="card-footer">
          <div class="attunement-summary">
            <span class="footer-label">Attuned (${c.attunement.current}/${c.attunement.max}):</span>
            <span class="footer-val">
              ${c.attunement.items && c.attunement.items.length > 0 ? c.attunement.items.map(i => `
                <span 
                  class="attuned-item-pill" 
                  data-char-id="${c.id}" 
                  data-target-tab="inventory" 
                  data-target-name="${escapeHtml(i.name)}"
                  onclick="window.handleShortcut(this, event)"
                  title="Click to inspect ${escapeHtml(i.name)} in Inventory"
                >${escapeHtml(i.name)}</span>
              `).join(', ') : 'None'}
            </span>
          </div>
          <span class="btn-inspect-link">View Sheet →</span>
        </div>
      </div>
    </div>
  `;
}

function renderCompactBattleDeck(chars, partyMaxHp) {
  return `
    <div class="compact-battle-deck">
      <div class="deck-header-row">
        <span class="deck-col-char">ADVENTURER</span>
        <span class="deck-col-hp">HEALTH & HIT POINTS</span>
        <span class="deck-col-vitals">COMBAT STATS</span>
        <span class="deck-col-resources">KEY RESOURCES & SPELL SLOTS</span>
        <span class="deck-col-action">ACTION</span>
      </div>
      <div class="deck-rows-container">
        ${chars.map(c => {
          const currHp = Math.max(0, c.hp.current || 0);
          const maxHp = Math.max(1, c.hp.max || 1);
          const tempHp = Math.max(0, c.hp.temp || 0);
          const hpPercent = Math.max(0, Math.min(100, Math.round((currHp / maxHp) * 100)));
          const hpColorClass = hpPercent > 50 ? 'hp-high' : (hpPercent > 20 ? 'hp-mid' : 'hp-low');
          const isBloodied = hpPercent <= 50 && currHp > 0;
          const isDown = currHp === 0;
          const barWidthPct = Math.min(100, Math.round((maxHp / partyMaxHp) * 100));

          const standardSlots = Object.values(c.spellcasting.slots || {});
          const pact = c.spellcasting.pactSlots;
          const conc = state.concentration && state.concentration[c.id];

          return `
            <div class="deck-card ${state.activeCharacterId === c.id ? 'selected' : ''}" onclick="window.inspectCharacter('${c.id}')">
              
              <!-- Character Identity -->
              <div class="deck-col-char">
                <div class="deck-avatar-box ${conc ? 'concentrating-avatar' : ''}" title="${conc ? `Concentrating on ${escapeHtml(conc.spellName)}` : c.name}">
                  <img src="${c.avatarUrl || ''}" class="deck-avatar" alt="${c.name}"/>
                  <span class="deck-lvl-tag">${c.totalLevel}</span>
                </div>
                <div class="deck-identity">
                  <div class="deck-name-row">
                    <strong class="deck-name">${c.name}</strong>
                    ${c.inspiration ? `<span class="deck-insp-star" title="Heroic Inspiration Active!">★</span>` : ''}
                  </div>
                  <div class="deck-role muted">${c.classSummary}</div>
                  ${conc ? `
                    <div class="deck-conc-tag" onclick="window.breakConcentration('${c.id}', event)" title="Concentrating on ${escapeHtml(conc.spellName)} - Click to break">
                      ✦ ${escapeHtml(conc.spellName)} <span class="deck-conc-x">✕</span>
                    </div>
                  ` : ''}
                </div>
              </div>

              <!-- Proportional HP Track & Numbers -->
              <div class="deck-col-hp">
                <div class="deck-hp-numbers">
                  <span class="deck-hp-val ${hpColorClass}-text">${currHp}</span>
                  <span class="deck-hp-sep">/</span>
                  <span class="deck-hp-max">${maxHp}</span>
                  ${tempHp > 0 ? `<span class="badge badge-temp">+${tempHp}</span>` : ''}
                  ${isDown ? `<span class="status-pill status-down">DOWN</span>` : (isBloodied ? `<span class="status-pill status-bloodied">BLOODIED</span>` : '')}
                </div>
                <div class="deck-bar-track-outer">
                  <div class="deck-bar-track-scaled" style="width: ${barWidthPct}%;">
                    ${tempHp > 0 ? `<div class="deck-bar-temp" style="width: ${Math.min(100, Math.round((tempHp / maxHp) * 100))}%;"></div>` : ''}
                    <div class="deck-bar-fill ${hpColorClass}" style="width: ${hpPercent}%;"></div>
                  </div>
                </div>
              </div>

              <!-- Combat Hex Vitals -->
              <div class="deck-col-vitals">
                <div class="deck-vital-pill" title="Armor Class">
                  <span class="v-ico">🛡️</span>
                  <strong>${c.ac}</strong>
                </div>
                <div class="deck-vital-pill" title="Initiative">
                  <span class="v-ico">⚡</span>
                  <strong>${c.initiativeText}</strong>
                </div>
                <div class="deck-vital-pill" title="Speed">
                  <span class="v-ico">👟</span>
                  <strong>${c.speed}ft</strong>
                </div>
                ${c.spellcasting && c.spellcasting.spells.length > 0 ? `
                  <div class="deck-vital-pill" title="Spell Save DC">
                    <span class="v-ico">🎯</span>
                    <strong>${c.spellcasting.dc}</strong>
                  </div>
                ` : ''}
              </div>

              <!-- Key Resources / Slots -->
              <div class="deck-col-resources">
                ${c.resources && c.resources.length > 0 ? `
                  <div class="deck-res-pills">
                    ${c.resources.slice(0, 2).map(r => `
                      <span 
                        class="deck-res-pill" 
                        data-char-id="${c.id}"
                        data-target-tab="actions"
                        data-target-name="${escapeHtml(r.name)}"
                        onclick="window.handleShortcut(this, event)" 
                        title="Click to inspect ${escapeHtml(r.name)}"
                      >
                        ${escapeHtml(r.name)}: <strong>${r.sourceType === 'passive' || r.reset === 'Passive' || r.name.toLowerCase().includes('sneak attack') ? `+${r.current} (1/turn)` : `${r.current}/${r.max}`}</strong>
                      </span>
                    `).join('')}
                  </div>
                ` : ''}
                ${(standardSlots.length > 0 || pact) ? `
                  <div class="deck-slot-pips" onclick="window.inspectTarget('${c.id}', 'spells', '', event)" title="Click to view all spell slots">
                    ${pact ? `
                      <span class="deck-pact-tag" title="Pact Magic: ${pact.available}/${pact.total} slots available">Pact: ${pact.available}/${pact.total}</span>
                    ` : ''}
                    ${standardSlots.map(s => `
                      <span class="deck-pip-group" title="L${s.level}: ${s.available}/${s.total}">
                        <small>L${s.level}</small>
                        <span class="deck-pip-dots">
                          ${Array.from({ length: s.total }).map((_, i) => `
                            <i class="d-dot ${i < s.available ? 'dot-active' : 'dot-used'}"></i>
                          `).join('')}
                        </span>
                      </span>
                    `).join('')}
                  </div>
                ` : ''}
              </div>

              <!-- Quick Action Link -->
              <div class="deck-col-action">
                <button class="btn btn-sm deck-btn-inspect" onclick="window.inspectCharacter('${c.id}')">
                  View Sheet →
                </button>
              </div>

            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getCadenceShort(reset) {
  switch (reset) {
    case 'Short Rest': return 'SR';
    case 'Long Rest': return 'LR';
    case 'Dawn': return 'DAWN';
    case 'Passive': return 'PASS';
    default: return 'SPEC';
  }
}
