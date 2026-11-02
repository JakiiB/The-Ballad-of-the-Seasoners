/**
 * Deep-Dive Interactive Character Sheet Component (Authentic D&D Beyond Experience)
 */
import { state } from '../state.js';
import { cleanHtml } from '../dndbeyond.js';

let activeSheetTab = 'actions';
let activeActionsFilter = 'all';
let activeFeaturesFilter = 'all';
let featureSearchQuery = '';
let spellSearchQuery = '';
let activeSpellFilter = 'all';
const expandedFeatures = new Set();
const expandedSpells = new Set();

export function setSheetTab(tab) {
  activeSheetTab = tab;
  window.refreshApp();
}

export function setActionsFilter(filter) {
  activeActionsFilter = filter;
  window.refreshApp();
}

export function setFeaturesFilter(filter) {
  activeFeaturesFilter = filter;
  window.refreshApp();
}

export function setSpellFilter(filter) {
  activeSpellFilter = filter;
  window.refreshApp();
}

export function toggleFeatureCard(rawId) {
  const id = String(rawId);
  if (expandedFeatures.has(id)) {
    expandedFeatures.delete(id);
  } else {
    expandedFeatures.add(id);
  }
  window.refreshApp();
}

export function toggleAllFeatures(expand) {
  const c = state.characters[state.activeCharacterId];
  if (!c) return;
  if (expand) {
    (c.featuresAndTraits?.classFeatures || []).forEach(f => expandedFeatures.add(String(f.id || f.name)));
    (c.featuresAndTraits?.racialTraits || []).forEach(t => expandedFeatures.add(String(t.id || t.name)));
    (c.featuresAndTraits?.feats || []).forEach(f => expandedFeatures.add(String(f.id || f.name)));
    (c.featuresAndTraits?.choices || []).forEach(ch => expandedFeatures.add(String(ch.id || ch.name)));
  } else {
    expandedFeatures.clear();
  }
  window.refreshApp();
}

export function toggleSpellCard(id) {
  if (expandedSpells.has(id)) {
    expandedSpells.delete(id);
  } else {
    expandedSpells.add(id);
  }
  window.refreshApp();
}

export function handleFeatureSearch(val) {
  featureSearchQuery = (val || '').toLowerCase().trim();
  window.refreshApp();
}

export function handleSpellSearch(val) {
  spellSearchQuery = (val || '').toLowerCase().trim();
  window.refreshApp();
}

// Expose to window for inline event handlers
window.setSheetTab = setSheetTab;
window.setActionsFilter = setActionsFilter;
window.setFeaturesFilter = setFeaturesFilter;
window.setSpellFilter = setSpellFilter;
window.toggleFeatureCard = toggleFeatureCard;
window.toggleAllFeatures = toggleAllFeatures;
window.toggleSpellCard = toggleSpellCard;
window.handleFeatureSearch = handleFeatureSearch;
window.handleSpellSearch = handleSpellSearch;

export function renderCharacterSheet() {
  const c = state.characters[state.activeCharacterId];
  if (!c) {
    return `
      <div class="empty-state">
        <p style="font-size:1.1rem; font-weight:700; color:var(--text);">No active character selected.</p>
        <p class="muted">Click "⚙ Party URLs" to activate or add characters for this session.</p>
        <button class="btn btn-primary" style="margin-top:1rem;" onclick="window.openRosterModal()">⚙ Manage Party URLs</button>
      </div>
    `;
  }

  const chars = Object.values(state.characters);
  const hpPercent = Math.max(0, Math.min(100, Math.round(((c.hp.current || 0) / (c.hp.max || 1)) * 100)));
  const hpStatusClass = hpPercent > 50 ? 'hp-high' : (hpPercent > 20 ? 'hp-mid' : 'hp-low');
  const isBloodied = hpPercent <= 50 && c.hp.current > 0;
  const conc = state.concentration && state.concentration[c.id];

  return `
    <div class="sheet-container">
      
      <!-- 1. Top Character Quick Switcher -->
      <div class="char-picker-bar">
        ${chars.map(char => `
          <button class="char-tab-btn ${char.id === c.id ? 'active' : ''}" onclick="window.inspectCharacter('${char.id}')">
            <img src="${char.avatarUrl || ''}" class="mini-avatar" alt="${char.name}"/>
            <span>${char.name}</span>
          </button>
        `).join('')}
      </div>

      <!-- 2. Authentic D&D Beyond Sheet Header -->
      <div class="dnd-sheet-header" style="${c.backdropAvatarUrl ? `background-image: linear-gradient(to right, rgba(13,17,23,0.96) 20%, rgba(13,17,23,0.85) 60%, rgba(13,17,23,0.7)), url('${c.backdropAvatarUrl}')` : ''}">
        <div class="dnd-header-left">
          <div class="dnd-avatar-frame ${conc ? 'concentrating-avatar' : ''}" title="${conc ? `Concentrating on ${escapeHtml(conc.spellName)}` : c.name}">
            <img src="${c.avatarUrl || ''}" alt="${c.name}" class="dnd-avatar-img"/>
            ${c.frameAvatarUrl ? `<img src="${c.frameAvatarUrl}" class="dnd-avatar-border"/>` : ''}
            <div class="dnd-level-tag">LVL ${c.totalLevel}</div>
          </div>
          <div class="dnd-identity">
            <div class="dnd-char-name-row">
              <h1 class="dnd-char-name">${c.name}</h1>
              <div class="inspiration-coin ${c.inspiration ? 'active' : ''}" title="${c.inspiration ? 'Heroic Inspiration Active!' : 'No Inspiration'}">★</div>
            </div>
            <div class="dnd-char-sub">${c.race} // ${c.classSummary}</div>
            ${conc ? `
              <div class="sheet-conc-pill" onclick="window.breakConcentration('${c.id}', event)" title="Concentrating on ${escapeHtml(conc.spellName)} - Click to break">
                <span class="sheet-conc-spark">✦</span>
                <span class="sheet-conc-text">Concentrating on <strong>${escapeHtml(conc.spellName)}</strong></span>
                <span class="sheet-conc-dc-tag">Auto Con-Save DC Active</span>
                <span class="sheet-conc-close" title="Break Concentration">✕</span>
              </div>
            ` : ''}
            
            <!-- Health & Hit Dice Bar -->
            <div class="dnd-health-row">
              <div class="dnd-hp-text">
                <span class="dnd-hp-label">HIT POINTS</span>
                <span class="dnd-hp-val ${hpStatusClass}"><span class="hp-cur">${c.hp.current}</span><span class="hp-sep">/</span><span class="hp-max">${c.hp.max}</span></span>
                ${c.hp.temp > 0 ? `<span class="badge badge-temp">+${c.hp.temp} TEMP</span>` : ''}
                ${isBloodied ? `<span class="badge badge-danger">BLOODIED</span>` : ''}
              </div>
              <div class="dnd-hp-bar-bg">
                <div class="dnd-hp-bar-fill ${hpStatusClass}" style="width: ${hpPercent}%;"></div>
              </div>
              <div class="dnd-hit-dice">
                <span class="muted">Hit Dice:</span> 
                <strong>${(c.hitDice || []).map(h => h.text).join(' | ') || 'N/A'}</strong>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Side Combat Hex Badges -->
        <div class="dnd-combat-badges">
          <div class="dnd-stat-badge badge-ac">
            <div class="badge-icon">🛡️</div>
            <div class="badge-value">${c.ac}</div>
            <div class="badge-title">ARMOR CLASS</div>
          </div>
          <div class="dnd-stat-badge">
            <div class="badge-icon">⚡</div>
            <div class="badge-value">${c.initiativeText}</div>
            <div class="badge-title">INITIATIVE</div>
          </div>
          <div class="dnd-stat-badge">
            <div class="badge-icon">👟</div>
            <div class="badge-value">${c.speed}</div>
            <div class="badge-title">SPEED</div>
          </div>
          <div class="dnd-stat-badge">
            <div class="badge-icon">🎯</div>
            <div class="badge-value">+${c.profBonus}</div>
            <div class="badge-title">PROFICIENCY</div>
          </div>
          <div class="dnd-stat-badge">
            <div class="badge-icon">👁️</div>
            <div class="badge-value">${c.passives.perception}</div>
            <div class="badge-title">PASSIVE PERC</div>
          </div>
        </div>
      </div>

      <!-- 3. The 2-Column D&D Beyond Layout -->
      <div class="dnd-layout-grid">
        
        <!-- LEFT COLUMN: VITALS SPINE (Always Visible) -->
        <aside class="dnd-vitals-spine">
          
          <!-- 6 Ability Score Blocks -->
          <div class="dnd-ability-stack">
            ${['str','dex','con','int','wis','cha'].map(ab => {
              const score = c.stats[ab];
              const mod = c.modifiers[ab];
              const save = c.savingThrows[ab];
              return `
                <div class="dnd-ability-pillar">
                  <div class="pillar-label">${ab.toUpperCase()}</div>
                  <div class="pillar-mod">${mod >= 0 ? '+' : ''}${mod}</div>
                  <div class="pillar-score">${score}</div>
                  <div class="pillar-save ${save.proficient ? 'proficient' : ''}" title="Saving Throw">
                    <span>SAVE</span>
                    <strong>${save.bonusText}</strong>
                    ${save.proficient ? '<span class="star-prof">★</span>' : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Senses Block -->
          <div class="spine-card">
            <h4 class="spine-card-title">👁️ Senses</h4>
            <div class="senses-list">
              <div class="sense-row">
                <span>Passive Perception</span>
                <strong>${c.passives.perception}</strong>
              </div>
              <div class="sense-row">
                <span>Passive Investigation</span>
                <strong>${c.passives.investigation}</strong>
              </div>
              <div class="sense-row">
                <span>Passive Insight</span>
                <strong>${c.passives.insight}</strong>
              </div>
              ${(c.senses?.special || []).map(s => `
                <div class="sense-row special-sense">
                  <span>${s}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Skills & Proficiencies -->
          <div class="spine-card">
            <h4 class="spine-card-title">📜 Skills</h4>
            <div class="spine-skills-list">
              ${Object.entries(c.skills || {}).map(([name, s]) => `
                <div class="spine-skill-row ${s.expertise ? 'expertise' : (s.proficient ? 'proficient' : '')}">
                  <span class="sk-marker">${s.expertise ? '★★' : (s.proficient ? '★' : '○')}</span>
                  <span class="sk-name">${name} <small>(${s.ability.toUpperCase()})</small></span>
                  <span class="sk-bonus">${s.bonusText}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Proficiencies & Languages -->
          <div class="spine-card">
            <h4 class="spine-card-title">🛡️ Proficiencies & Training</h4>
            <div class="prof-group">
              <div class="prof-label">ARMOR</div>
              <div class="prof-val">${(c.proficiencies?.armor || []).join(', ') || 'None'}</div>
            </div>
            <div class="prof-group">
              <div class="prof-label">WEAPONS</div>
              <div class="prof-val">${(c.proficiencies?.weapons || []).join(', ') || 'None'}</div>
            </div>
            ${(c.proficiencies?.tools || []).length > 0 ? `
              <div class="prof-group">
                <div class="prof-label">TOOLS</div>
                <div class="prof-val">${c.proficiencies.tools.join(', ')}</div>
              </div>
            ` : ''}
            <div class="prof-group">
              <div class="prof-label">LANGUAGES</div>
              <div class="prof-val">${(c.proficiencies?.languages || []).join(', ') || 'Common'}</div>
            </div>
          </div>

        </aside>

        <!-- RIGHT COLUMN: D&D BEYOND TABS PANEL -->
        <main class="dnd-tab-panel">
          
          <!-- Tab Navigation Bar -->
          <div class="dnd-nav-tabs">
            <button class="dnd-tab-btn ${activeSheetTab === 'actions' ? 'active' : ''}" onclick="window.setSheetTab('actions')">
              ⚔️ Actions
            </button>
            <button class="dnd-tab-btn ${activeSheetTab === 'spells' ? 'active' : ''}" onclick="window.setSheetTab('spells')">
              📜 Spells (${c.spellcasting.spells.length})
            </button>
            <button class="dnd-tab-btn ${activeSheetTab === 'inventory' ? 'active' : ''}" onclick="window.setSheetTab('inventory')">
              🎒 Inventory (${c.inventory.length})
            </button>
            <button class="dnd-tab-btn ${activeSheetTab === 'features' ? 'active' : ''}" onclick="window.setSheetTab('features')">
              ⚡ Features & Traits
            </button>
            <button class="dnd-tab-btn ${activeSheetTab === 'description' ? 'active' : ''}" onclick="window.setSheetTab('description')">
              📖 Description
            </button>
          </div>

          <!-- Active Tab Body -->
          <div class="dnd-tab-content">
            ${activeSheetTab === 'actions' ? renderActionsTab(c) : ''}
            ${activeSheetTab === 'spells' ? renderSpellsTab(c) : ''}
            ${activeSheetTab === 'inventory' ? renderInventoryTab(c) : ''}
            ${activeSheetTab === 'features' ? renderFeaturesTab(c) : ''}
            ${activeSheetTab === 'description' ? renderDescriptionTab(c) : ''}
          </div>

        </main>

      </div>
    </div>
  `;
}

// -------------------------------------------------------------------------------------------------
// TAB 1: ⚔️ ACTIONS (Attacks Table + Action Economy)
// -------------------------------------------------------------------------------------------------
function renderActionsTab(c) {
  const attacks = c.attacks || [];
  const acts = c.actionsList || { actions: [], bonusActions: [], reactions: [], other: [] };

  const showAttacks = activeActionsFilter === 'all' || activeActionsFilter === 'attacks';
  const showActions = activeActionsFilter === 'all' || activeActionsFilter === 'actions';
  const showBonus = activeActionsFilter === 'all' || activeActionsFilter === 'bonus';
  const showReactions = activeActionsFilter === 'all' || activeActionsFilter === 'reactions';
  const showOther = activeActionsFilter === 'all' || activeActionsFilter === 'other';

  return `
    <div class="actions-view">
      <!-- Sub-Filter Bar -->
      <div class="segmented-control">
        <button class="segment-btn ${activeActionsFilter === 'all' ? 'active' : ''}" onclick="window.setActionsFilter('all')">All</button>
        <button class="segment-btn ${activeActionsFilter === 'attacks' ? 'active' : ''}" onclick="window.setActionsFilter('attacks')">Attacks (${attacks.length})</button>
        <button class="segment-btn ${activeActionsFilter === 'actions' ? 'active' : ''}" onclick="window.setActionsFilter('actions')">Actions (${acts.actions.length})</button>
        <button class="segment-btn ${activeActionsFilter === 'bonus' ? 'active' : ''}" onclick="window.setActionsFilter('bonus')">Bonus Actions (${acts.bonusActions.length})</button>
        <button class="segment-btn ${activeActionsFilter === 'reactions' ? 'active' : ''}" onclick="window.setActionsFilter('reactions')">Reactions (${acts.reactions.length})</button>
        ${acts.other.length > 0 ? `
          <button class="segment-btn ${activeActionsFilter === 'other' ? 'active' : ''}" onclick="window.setActionsFilter('other')">Other (${acts.other.length})</button>
        ` : ''}
      </div>

      <!-- Attacks Table (D&D Beyond Style) -->
      ${showAttacks && attacks.length > 0 ? `
        <div class="action-section">
          <h3 class="section-title">⚔️ Attacks & Weapons</h3>
          <div class="attacks-table-wrap">
            <table class="dnd-attacks-table">
              <thead>
                <tr>
                  <th>ATTACK / WEAPON</th>
                  <th>RANGE</th>
                  <th>HIT / DC</th>
                  <th>DAMAGE / TYPE</th>
                  <th>NOTES & MASTERY</th>
                </tr>
              </thead>
              <tbody>
                ${attacks.map(atk => `
                  <tr data-target-name="${(atk.name || '').toLowerCase()}">
                    <td class="atk-name-cell">
                      <strong>${atk.name}</strong>
                      ${atk.properties ? `<span class="atk-props">${atk.properties}</span>` : ''}
                    </td>
                    <td class="atk-range-cell">${atk.rangeText}</td>
                    <td class="atk-hit-cell"><span class="badge-tohit">${atk.toHitText}</span></td>
                    <td class="atk-dmg-cell">
                      <strong>${atk.damageText}</strong>
                    </td>
                    <td class="atk-mastery-cell">
                      ${atk.mastery ? `<span class="mastery-pill">${atk.mastery}</span>` : '-'}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}

      <!-- Actions List -->
      ${showActions && acts.actions.length > 0 ? `
        <div class="action-section">
          <h3 class="section-title">⚡ Actions</h3>
          <div class="action-card-grid">
            ${acts.actions.map(a => renderActionCard(a, 'action')).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Bonus Actions List -->
      ${showBonus && acts.bonusActions.length > 0 ? `
        <div class="action-section">
          <h3 class="section-title">✨ Bonus Actions</h3>
          <div class="action-card-grid">
            ${acts.bonusActions.map(a => renderActionCard(a, 'bonus')).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Reactions List -->
      ${showReactions && acts.reactions.length > 0 ? `
        <div class="action-section">
          <h3 class="section-title">🛡️ Reactions</h3>
          <div class="action-card-grid">
            ${acts.reactions.map(a => renderActionCard(a, 'reaction')).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Other Features / Passives -->
      ${showOther && acts.other.length > 0 ? `
        <div class="action-section">
          <h3 class="section-title">🔮 Special & Tactical Features</h3>
          <div class="action-card-grid">
            ${acts.other.map(a => renderActionCard(a, 'other')).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

function renderActionCard(a, type) {
  const desc = cleanHtml(a.snippet || a.description || 'No description available.');
  return `
    <div class="dnd-action-card type-${type}" data-target-name="${(a.name || '').toLowerCase()}">
      <div class="dnd-action-header">
        <span class="dnd-action-name">${a.name}</span>
        ${a.limitedUse && a.limitedUse.max > 0 ? `
          <span class="dnd-action-charge ${a.limitedUse.current === 0 ? 'depleted' : ''}">
            ${a.limitedUse.current} / ${a.limitedUse.max} ${a.limitedUse.resetType}
          </span>
        ` : ''}
      </div>
      <p class="dnd-action-snippet">${desc}</p>
    </div>
  `;
}

// -------------------------------------------------------------------------------------------------
// TAB 2: 📜 SPELLS (Spellcasting Stats + Live Slots + Filters)
// -------------------------------------------------------------------------------------------------
function renderSpellsTab(c) {
  const spells = c.spellcasting.spells;
  if (spells.length === 0) {
    return `<div class="empty-state">No spells prepared or known for this character.</div>`;
  }

  // Filter spells by query and level
  let filtered = spells;
  if (spellSearchQuery) {
    filtered = filtered.filter(s => 
      s.name.toLowerCase().includes(spellSearchQuery) || 
      s.school.toLowerCase().includes(spellSearchQuery) ||
      s.description.toLowerCase().includes(spellSearchQuery)
    );
  }
  if (activeSpellFilter === 'cantrip') filtered = filtered.filter(s => s.level === 0);
  else if (activeSpellFilter === 'concentration') filtered = filtered.filter(s => s.concentration);
  else if (activeSpellFilter === 'ritual') filtered = filtered.filter(s => s.ritual);
  else if (/^\d+$/.test(activeSpellFilter)) {
    const lvl = parseInt(activeSpellFilter);
    filtered = filtered.filter(s => s.level === lvl);
  }

  // Group by level
  const byLevel = {};
  for (let lvl = 0; lvl <= 9; lvl++) byLevel[lvl] = [];
  filtered.forEach(s => {
    if (byLevel[s.level]) byLevel[s.level].push(s);
  });

  return `
    <div class="spells-view">
      <!-- Top Spellcasting Bar -->
      <div class="spellcasting-overview-bar">
        <div class="spell-overview-item">
          <span class="sp-lbl">SPELLCASTING ABILITY</span>
          <span class="sp-val">${(c.spellcasting.ability || 'INT').toUpperCase()}</span>
        </div>
        <div class="spell-overview-item">
          <span class="sp-lbl">SPELL SAVE DC</span>
          <span class="sp-val">${c.spellcasting.dc}</span>
        </div>
        <div class="spell-overview-item">
          <span class="sp-lbl">SPELL ATTACK BONUS</span>
          <span class="sp-val">${c.spellcasting.attackText}</span>
        </div>
      </div>

      <!-- Live Spell Slots Row -->
      <div class="spell-slots-tracker-row">
        ${Object.values(c.spellcasting.slots || {}).map(slot => `
          <div class="spell-slot-card">
            <span class="slot-lvl-tag">LVL ${slot.level}</span>
            <div class="slot-pips">
              ${Array.from({ length: slot.total }).map((_, i) => `
                <span class="slot-pip ${i < slot.available ? 'filled' : 'expended'}"></span>
              `).join('')}
            </div>
            <span class="slot-count-text">${slot.available} / ${slot.total}</span>
          </div>
        `).join('')}
        ${c.spellcasting.pactSlots ? `
          <div class="spell-slot-card pact-card">
            <span class="slot-lvl-tag">PACT (L${c.spellcasting.pactSlots.level})</span>
            <div class="slot-pips">
              ${Array.from({ length: c.spellcasting.pactSlots.total }).map((_, i) => `
                <span class="slot-pip pact-pip ${i < c.spellcasting.pactSlots.available ? 'filled' : 'expended'}"></span>
              `).join('')}
            </div>
            <span class="slot-count-text">${c.spellcasting.pactSlots.available} / ${c.spellcasting.pactSlots.total}</span>
          </div>
        ` : ''}
      </div>

      <!-- Search & Filters Toolbar -->
      <div class="dnd-toolbar">
        <input 
          type="text" 
          class="dnd-search-input" 
          placeholder="🔍 Filter spells by name, school, or effect..." 
          value="${spellSearchQuery}" 
          oninput="window.handleSpellSearch(this.value)"
        />
        <div class="segmented-control">
          <button class="segment-btn ${activeSpellFilter === 'all' ? 'active' : ''}" onclick="window.setSpellFilter('all')">All</button>
          <button class="segment-btn ${activeSpellFilter === 'cantrip' ? 'active' : ''}" onclick="window.setSpellFilter('cantrip')">Cantrips</button>
          <button class="segment-btn ${activeSpellFilter === 'concentration' ? 'active' : ''}" onclick="window.setSpellFilter('concentration')">Concentration</button>
          <button class="segment-btn ${activeSpellFilter === 'ritual' ? 'active' : ''}" onclick="window.setSpellFilter('ritual')">Ritual</button>
        </div>
      </div>

      <!-- Spells By Level List -->
      <div class="spell-groups-list">
        ${Object.entries(byLevel).map(([lvl, lvlSpells]) => {
          if (lvlSpells.length === 0) return '';
          const title = lvl === '0' ? 'Cantrips' : `Level ${lvl} Spells`;
          const conc = state.concentration && state.concentration[c.id];
          return `
            <div class="spell-level-group">
              <h3 class="level-heading">${title} (${lvlSpells.length})</h3>
              <div class="spell-grid">
                ${lvlSpells.map(s => {
                  const sId = `spell-${s.name.toLowerCase().replace(/\s+/g, '-')}`;
                  const isOpen = expandedSpells.has(sId);
                  const isConcentratingOnThis = Boolean(conc && conc.spellName && conc.spellName.toLowerCase() === s.name.toLowerCase());
                  return `
                    <div class="spell-card ${isOpen ? 'open' : ''} ${isConcentratingOnThis ? 'spell-card-concentrating' : ''}" data-target-name="${(s.name || '').toLowerCase()}" onclick="window.toggleSpellCard('${sId}')">
                      <div class="spell-card-header">
                        <span class="spell-name">${s.name}</span>
                        <div class="spell-tags">
                          ${s.concentration ? `
                            <button 
                              class="tag-c-btn ${isConcentratingOnThis ? 'active' : ''}" 
                              onclick="window.toggleSpellConcentration('${c.id}', '${escapeHtml(s.name).replace(/'/g, "\\'")}', ${s.level}, event)" 
                              title="${isConcentratingOnThis ? 'Currently concentrating! Click to break.' : 'Click to concentrate'}"
                            >
                              ${isConcentratingOnThis ? '✦ Concentrating' : 'C'}
                            </button>
                          ` : ''}
                          ${s.ritual ? '<span class="tag-r">R</span>' : ''}
                          <span class="tag-school">${s.school}</span>
                        </div>
                      </div>
                      <div class="spell-meta">
                        <span>⏱ ${s.castingTime}</span>
                        <span>🎯 ${s.range}</span>
                        <span>⏳ ${s.duration}</span>
                        ${isConcentratingOnThis ? '<span class="conc-active-pill">✦ Active Concentration</span>' : ''}
                      </div>
                      <div class="spell-desc ${isOpen ? 'expanded' : 'collapsed'}">
                        ${s.description || 'No description available.'}
                      </div>
                      <div class="card-expand-hint">${isOpen ? '▲ Collapse' : '▼ Read Details'}</div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// -------------------------------------------------------------------------------------------------
// TAB 3: 🎒 INVENTORY (Attunement + Equipped + Containers + Carried)
// -------------------------------------------------------------------------------------------------
function renderInventoryTab(c) {
  const equipped = c.inventory.filter(i => i.equipped);
  const attuned = c.inventory.filter(i => i.attuned);
  const bagOfHolding = c.inventory.find(i => i.name.toLowerCase().includes('bag of holding'));
  const inBag = bagOfHolding ? c.inventory.filter(i => i.containerEntityId === bagOfHolding.id) : [];
  const otherItems = c.inventory.filter(i => !i.equipped && (!bagOfHolding || i.containerEntityId !== bagOfHolding.id));

  return `
    <div class="inventory-view">
      <!-- Currency Bar -->
      <div class="purse-bar">
        <span class="coin-badge gp" title="Gold Pieces">
          <span class="coin-token gp">G</span>
          <span>${(c.currencies.gp || 0).toLocaleString()} GP</span>
        </span>
        <span class="coin-badge pp" title="Platinum Pieces">
          <span class="coin-token pp">P</span>
          <span>${(c.currencies.pp || 0).toLocaleString()} PP</span>
        </span>
        ${(c.currencies.ep || 0) > 0 ? `
          <span class="coin-badge ep" title="Electrum Pieces">
            <span class="coin-token ep">E</span>
            <span>${(c.currencies.ep || 0).toLocaleString()} EP</span>
          </span>
        ` : ''}
        <span class="coin-badge sp" title="Silver Pieces">
          <span class="coin-token sp">S</span>
          <span>${(c.currencies.sp || 0).toLocaleString()} SP</span>
        </span>
        <span class="coin-badge cp" title="Copper Pieces">
          <span class="coin-token cp">C</span>
          <span>${(c.currencies.cp || 0).toLocaleString()} CP</span>
        </span>
      </div>

      <!-- Attuned Items -->
      <div class="inv-group">
        <h3 class="section-title">✨ Attuned Magic Items (${attuned.length}/3)</h3>
        <div class="item-grid">
          ${attuned.map(i => renderItemCard(i, 'attuned')).join('')}
        </div>
      </div>

      <!-- Equipped Gear -->
      <div class="inv-group">
        <h3 class="section-title">⚔️ Equipped Equipment & Weapons (${equipped.length})</h3>
        <div class="item-grid">
          ${equipped.map(i => renderItemCard(i, 'equipped')).join('')}
        </div>
      </div>

      <!-- Inside Bag of Holding -->
      ${inBag.length > 0 ? `
        <div class="inv-group">
          <h3 class="section-title">🎒 Inside Bag of Holding (${inBag.length})</h3>
          <div class="item-grid">
            ${inBag.map(i => renderItemCard(i, 'bag')).join('')}
          </div>
        </div>
      ` : ''}

      <!-- General Inventory -->
      <div class="inv-group">
        <h3 class="section-title">📦 Other Carried Gear (${otherItems.length})</h3>
        <div class="item-grid">
          ${otherItems.map(i => renderItemCard(i, 'carried')).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderItemCard(item, context) {
  const rarityClass = 'rarity-' + (item.rarity || 'common').toLowerCase().replace(/\s+/g, '-');
  return `
    <div class="gear-card ${rarityClass}" data-target-name="${(item.name || '').toLowerCase()}">
      <div class="gear-header">
        <span class="gear-name">${item.name} ${item.quantity > 1 ? `(x${item.quantity})` : ''}</span>
        <span class="gear-rarity">${item.rarity}</span>
      </div>
      <div class="gear-meta">
        <span>${item.filterType}</span>
        ${item.attuned ? '<span class="badge badge-gold">Attuned</span>' : ''}
        ${item.equipped ? '<span class="badge badge-blue">Equipped</span>' : ''}
        ${item.weight > 0 ? `<span>${item.weight} lbs</span>` : ''}
      </div>
      ${item.description ? `<div class="gear-desc">${cleanHtml(item.description)}</div>` : ''}
    </div>
  `;
}

// -------------------------------------------------------------------------------------------------
// TAB 4: ⚡ FEATURES & TRAITS (D&D Beyond Full Hierarchy + Search + Accordions)
// -------------------------------------------------------------------------------------------------
function renderFeaturesTab(c) {
  const ft = c.featuresAndTraits || { classFeatures: [], racialTraits: [], feats: [], choices: [], backgroundFeature: null };

  let classFeats = ft.classFeatures || [];
  let raceTraits = ft.racialTraits || [];
  let featsList = ft.feats || [];
  let choicesList = ft.choices || [];

  // Filter by search query
  if (featureSearchQuery) {
    const q = featureSearchQuery;
    classFeats = classFeats.filter(f => f.name.toLowerCase().includes(q) || f.snippet.toLowerCase().includes(q) || f.description.toLowerCase().includes(q));
    raceTraits = raceTraits.filter(t => t.name.toLowerCase().includes(q) || t.snippet.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    featsList = featsList.filter(f => f.name.toLowerCase().includes(q) || f.snippet.toLowerCase().includes(q) || f.description.toLowerCase().includes(q));
    choicesList = choicesList.filter(ch => ch.name.toLowerCase().includes(q) || ch.snippet.toLowerCase().includes(q) || ch.description.toLowerCase().includes(q));
  }

  const showClass = activeFeaturesFilter === 'all' || activeFeaturesFilter === 'class';
  const showRace = activeFeaturesFilter === 'all' || activeFeaturesFilter === 'race';
  const showFeats = activeFeaturesFilter === 'all' || activeFeaturesFilter === 'feats';
  const showChoices = activeFeaturesFilter === 'all' || activeFeaturesFilter === 'choices';

  // Group class features by Class Name
  const classGroups = {};
  classFeats.forEach(f => {
    const key = f.className + (f.subclassName ? ` (${f.subclassName})` : '');
    if (!classGroups[key]) classGroups[key] = [];
    classGroups[key].push(f);
  });

  return `
    <div class="features-view">
      <!-- Toolbar: Search + Sub-Filters + Expand Toggle -->
      <div class="dnd-toolbar">
        <input 
          type="text" 
          class="dnd-search-input" 
          placeholder="🔍 Search features, racial traits, maneuvers, feats..." 
          value="${featureSearchQuery}" 
          oninput="window.handleFeatureSearch(this.value)"
        />
        <div class="segmented-control">
          <button class="segment-btn ${activeFeaturesFilter === 'all' ? 'active' : ''}" onclick="window.setFeaturesFilter('all')">All</button>
          <button class="segment-btn ${activeFeaturesFilter === 'class' ? 'active' : ''}" onclick="window.setFeaturesFilter('class')">Class (${classFeats.length})</button>
          <button class="segment-btn ${activeFeaturesFilter === 'race' ? 'active' : ''}" onclick="window.setFeaturesFilter('race')">Species (${raceTraits.length})</button>
          <button class="segment-btn ${activeFeaturesFilter === 'feats' ? 'active' : ''}" onclick="window.setFeaturesFilter('feats')">Feats (${featsList.length})</button>
          ${choicesList.length > 0 ? `
            <button class="segment-btn ${activeFeaturesFilter === 'choices' ? 'active' : ''}" onclick="window.setFeaturesFilter('choices')">Tactical Options (${choicesList.length})</button>
          ` : ''}
        </div>
        <div class="expand-all-group">
          <button class="btn btn-sm" onclick="window.toggleAllFeatures(true)">Expand All</button>
          <button class="btn btn-sm" onclick="window.toggleAllFeatures(false)">Collapse All</button>
        </div>
      </div>

      <!-- Class Features Sections -->
      ${showClass ? Object.entries(classGroups).map(([groupTitle, feats]) => `
        <div class="dnd-feature-group">
          <h3 class="group-banner">🛡️ ${groupTitle}</h3>
          <div class="feature-accordion-stack">
            ${feats.map(f => renderFeatureCard(f, f.sourceTag, 'tag-class')).join('')}
          </div>
        </div>
      `).join('') : ''}

      <!-- Species / Racial Traits Section -->
      ${showRace && raceTraits.length > 0 ? `
        <div class="dnd-feature-group">
          <h3 class="group-banner">🧬 ${c.race} Traits</h3>
          <div class="feature-accordion-stack">
            ${raceTraits.map(t => renderFeatureCard(t, t.raceName, 'tag-race')).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Feats Section -->
      ${showFeats && featsList.length > 0 ? `
        <div class="dnd-feature-group">
          <h3 class="group-banner">⭐ Feats & Special Training</h3>
          <div class="feature-accordion-stack">
            ${featsList.map(f => renderFeatureCard(f, 'Feat', 'tag-feat')).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Tactical Choices (Maneuvers, Metamagic, Invocations) -->
      ${showChoices && choicesList.length > 0 ? `
        <div class="dnd-feature-group">
          <h3 class="group-banner">🎯 Tactical Choices & Maneuvers</h3>
          <div class="feature-accordion-stack">
            ${choicesList.map(ch => renderFeatureCard(ch, ch.category, 'tag-choice')).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Background Feature -->
      ${activeFeaturesFilter === 'all' && ft.backgroundFeature ? `
        <div class="dnd-feature-group">
          <h3 class="group-banner">📜 Background Feature (${ft.backgroundFeature.backgroundName})</h3>
          <div class="feature-accordion-stack">
            ${renderFeatureCard(ft.backgroundFeature, 'Background', 'tag-bg')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

function renderFeatureCard(item, sourceTag, tagClass) {
  const id = String(item.id || item.name);
  const isOpen = expandedFeatures.has(id);
  const rawSnip = item.snippet || item.description || 'No description available.';
  const rawDesc = item.description || item.snippet || 'No description available.';
  const snippet = cleanHtml(rawSnip);
  const fullDesc = cleanHtml(rawDesc);

  return `
    <div class="dnd-feat-card ${isOpen ? 'open' : ''}" data-target-name="${(item.name || '').toLowerCase()}">
      <div class="dnd-feat-card-header" onclick="window.toggleFeatureCard('${id}')">
        <div class="dnd-feat-title-wrap">
          <span class="dnd-feat-name">${item.name}</span>
          ${sourceTag ? `<span class="source-pill ${tagClass}">${sourceTag}</span>` : ''}
        </div>
        <span class="dnd-feat-arrow">${isOpen ? '▲' : '▼'}</span>
      </div>
      
      <!-- Collapsed Snippet -->
      ${!isOpen ? `
        <div class="dnd-feat-snippet" onclick="window.toggleFeatureCard('${id}')">
          ${snippet.length > 140 ? snippet.substring(0, 140) + '...' : snippet}
        </div>
      ` : ''}

      <!-- Expanded Full Rule Text -->
      ${isOpen ? `
        <div class="dnd-feat-body">
          <p style="white-space: pre-line;">${fullDesc}</p>
        </div>
      ` : ''}
    </div>
  `;
}

// -------------------------------------------------------------------------------------------------
// TAB 5: 📖 DESCRIPTION & LORE (Personality, Ideals, Bonds, Flaws, Appearance, Backstory)
// -------------------------------------------------------------------------------------------------
function renderDescriptionTab(c) {
  const d = c.description || {};

  return `
    <div class="description-view">
      <!-- 4 Personality Trait Callout Boxes -->
      <div class="dnd-traits-grid">
        <div class="trait-box">
          <h4>PERSONALITY TRAITS</h4>
          <p>${d.personalityTraits || 'None recorded.'}</p>
        </div>
        <div class="trait-box">
          <h4>IDEALS</h4>
          <p>${d.ideals || 'None recorded.'}</p>
        </div>
        <div class="trait-box">
          <h4>BONDS</h4>
          <p>${d.bonds || 'None recorded.'}</p>
        </div>
        <div class="trait-box">
          <h4>FLAWS</h4>
          <p>${d.flaws || 'None recorded.'}</p>
        </div>
      </div>

      <!-- Physical Characteristics -->
      <div class="dnd-bio-block">
        <h3 class="section-title">👤 Physical Appearance & Details</h3>
        <div class="dnd-appearance-pills">
          <span class="bio-pill"><strong>Age:</strong> ${d.age || '-'}</span>
          <span class="bio-pill"><strong>Height:</strong> ${d.height || '-'}</span>
          <span class="bio-pill"><strong>Weight:</strong> ${d.weight || '-'}</span>
          <span class="bio-pill"><strong>Eyes:</strong> ${d.eyes || '-'}</span>
          <span class="bio-pill"><strong>Skin:</strong> ${d.skin || '-'}</span>
          <span class="bio-pill"><strong>Hair:</strong> ${d.hair || '-'}</span>
          ${d.faith ? `<span class="bio-pill"><strong>Faith:</strong> ${d.faith}</span>` : ''}
        </div>
      </div>

      <!-- Backstory -->
      <div class="dnd-bio-block">
        <h3 class="section-title">📜 Backstory & History</h3>
        <div class="bio-prose">
          <p style="white-space: pre-line;">${d.backstory || 'No backstory recorded on D&D Beyond.'}</p>
        </div>
      </div>

      <!-- Allies & Organizations -->
      ${d.allies ? `
        <div class="dnd-bio-block">
          <h3 class="section-title">🤝 Allies & Organizations</h3>
          <div class="bio-prose">
            <p style="white-space: pre-line;">${d.allies}</p>
          </div>
        </div>
      ` : ''}
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
