/**
 * Quick Party Search ("Who Has...?" Command Palette / Ctrl+K)
 * Real-time unified indexing across all 5 characters for Spells, Items, Features, and Actions.
 */
import { state } from '../state.js';

let currentQuery = '';
let currentResults = [];
let selectedIndex = 0;

export function searchParty(query) {
  const q = (query || '').toLowerCase().trim();
  if (q.length < 2) return [];

  const results = [];
  const chars = Object.values(state.characters || {});

  for (const c of chars) {
    const charId = c.id;
    const charName = c.name;
    const avatar = c.avatar || c.avatarUrl || '';

    // 1. Spells
    const spells = c.spellcasting?.spells || [];
    for (const s of spells) {
      const sName = s.name || '';
      const sSchool = s.school || '';
      const sDesc = s.description || '';
      
      const score = calculateMatchScore(q, sName, sSchool, sDesc);
      if (score > 0) {
        results.push({
          score,
          charId,
          charName,
          avatar,
          tab: 'spells',
          targetName: sName,
          name: sName,
          category: 'Spell',
          categoryIcon: '✨',
          badge: s.level === 0 ? 'Cantrip' : `Level ${s.level}`,
          detail: `${sSchool}${s.castingTime ? ' • ' + s.castingTime : ''}${s.prepared ? ' • Prepared' : ''}`,
          snippet: sDesc
        });
      }
    }

    // 2. Inventory & Magic Items
    const items = c.inventory || [];
    for (const i of items) {
      const iName = i.name || '';
      const iRarity = i.rarity || '';
      const iType = i.filterType || '';
      const iDesc = i.description || '';

      const score = calculateMatchScore(q, iName, `${iRarity} ${iType}`, iDesc);
      if (score > 0) {
        const badges = [];
        if (i.attuned) badges.push('Attuned');
        if (i.equipped) badges.push('Equipped');
        if (i.rarity && i.rarity !== 'Common') badges.push(i.rarity);

        results.push({
          score,
          charId,
          charName,
          avatar,
          tab: 'inventory',
          targetName: iName,
          name: iName,
          category: 'Item',
          categoryIcon: '🎒',
          badge: badges.join(' • ') || (i.filterType || 'Gear'),
          detail: `${i.filterType || 'Gear'}${i.quantity > 1 ? ` (x${i.quantity})` : ''}${i.weight ? ` • ${i.weight} lbs` : ''}`,
          snippet: iDesc
        });
      }
    }

    // 3. Actions & Tactical Abilities
    const acts = c.actionsList || {};
    const allActs = [
      ...(acts.actions || []).map(a => ({ ...a, actType: 'Action' })),
      ...(acts.bonusActions || []).map(a => ({ ...a, actType: 'Bonus Action' })),
      ...(acts.reactions || []).map(a => ({ ...a, actType: 'Reaction' })),
      ...(acts.other || []).map(a => ({ ...a, actType: 'Tactical' }))
    ];

    for (const a of allActs) {
      const aName = a.name || '';
      const aSnip = a.snippet || '';
      const aDesc = a.description || '';

      const score = calculateMatchScore(q, aName, a.actType, aSnip || aDesc);
      if (score > 0) {
        let chargeText = 'Unlimited';
        if (a.limitedUse) {
          chargeText = `${a.limitedUse.current}/${a.limitedUse.max} ${a.limitedUse.resetType || ''}`.trim();
        }

        results.push({
          score,
          charId,
          charName,
          avatar,
          tab: 'actions',
          targetName: aName,
          name: aName,
          category: 'Action',
          categoryIcon: '⚔️',
          badge: a.actType,
          detail: chargeText,
          snippet: aSnip || aDesc
        });
      }
    }

    // 4. Class Features & Traits
    const feats = c.featuresAndTraits || {};
    for (const f of (feats.classFeatures || [])) {
      const fName = f.name || '';
      const fClass = f.className || '';
      const fSnip = f.snippet || '';
      const fDesc = f.description || '';

      const score = calculateMatchScore(q, fName, fClass, fSnip || fDesc);
      if (score > 0) {
        results.push({
          score,
          charId,
          charName,
          avatar,
          tab: 'features',
          targetName: fName,
          name: fName,
          category: 'Feature',
          categoryIcon: '📜',
          badge: f.sourceTag || `${fClass} ${f.level || ''}`,
          detail: f.subclassName ? `Subclass: ${f.subclassName}` : fClass,
          snippet: fSnip || fDesc
        });
      }
    }

    // 5. Feats
    for (const ft of (feats.feats || [])) {
      const ftName = ft.name || '';
      const ftSnip = ft.snippet || '';
      const ftDesc = ft.description || '';

      const score = calculateMatchScore(q, ftName, 'Feat', ftSnip || ftDesc);
      if (score > 0) {
        results.push({
          score,
          charId,
          charName,
          avatar,
          tab: 'features',
          targetName: ftName,
          name: ftName,
          category: 'Feat',
          categoryIcon: '⭐',
          badge: 'Feat',
          detail: 'Special Training',
          snippet: ftSnip || ftDesc
        });
      }
    }

    // 6. Tactical Choices (Maneuvers, Metamagic, Invocations)
    for (const ch of (feats.choices || [])) {
      const chName = ch.name || '';
      const chCat = ch.category || 'Choice';
      const chSnip = ch.snippet || '';
      const chDesc = ch.description || '';

      const score = calculateMatchScore(q, chName, chCat, chSnip || chDesc);
      if (score > 0) {
        results.push({
          score,
          charId,
          charName,
          avatar,
          tab: 'features',
          targetName: chName,
          name: chName,
          category: 'Choice',
          categoryIcon: '🎯',
          badge: chCat,
          detail: ch.sourceType || 'Option',
          snippet: chSnip || chDesc
        });
      }
    }
  }

  // Deduplicate and Sort: Higher score first, then alphabetical
  const seen = new Set();
  const deduped = [];
  for (const r of results) {
    const key = `${r.charId}:${r.tab}:${r.name.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(r);
    }
  }

  deduped.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return deduped.slice(0, 30);
}

function calculateMatchScore(q, name, meta = '', desc = '') {
  const n = (name || '').toLowerCase();
  const m = (meta || '').toLowerCase();
  const d = (desc || '').toLowerCase();

  // Exact match on name
  if (n === q) return 100;

  // Name starts with query
  if (n.startsWith(q)) return 80;

  // Name contains query as a discrete word
  const words = n.split(/\s+/);
  if (words.some(w => w === q)) return 70;
  if (words.some(w => w.startsWith(q))) return 65;

  // Name contains query anywhere
  if (n.includes(q)) return 50;

  // Category or meta tags contain query
  if (m.includes(q)) return 30;

  // Description contains query
  if (d.includes(q)) return 10;

  return 0;
}

export function renderPartySearchModal() {
  return `
    <dialog id="partySearchModal" class="search-modal-dialog" closedby="any" aria-label="Quick Party Search">
      <div class="search-modal-box">
        
        <!-- Search Input Bar -->
        <div class="search-modal-input-wrap">
          <span class="search-modal-icon">🔍</span>
          <input 
            type="text" 
            id="partySearchInput" 
            class="search-modal-input" 
            placeholder="Search spells, magic items, features, actions across all 5 characters..." 
            autocomplete="off"
            spellcheck="false"
            autofocus
            oninput="window.onPartySearchInput(this.value)"
            onkeydown="window.onPartySearchKeydown(event)"
          />
          <button type="button" class="search-modal-clear" id="partySearchClear" onclick="window.clearPartySearch()" aria-label="Clear search" title="Clear">✕</button>
          <button type="button" class="search-modal-esc" onclick="window.closePartySearch()" aria-label="Close search dialog" title="Close (ESC)">ESC</button>
        </div>

        <!-- Meta Summary Bar -->
        <div class="search-results-meta" id="partySearchResultsMeta">
          ${renderMetaText(currentQuery, currentResults)}
        </div>

        <!-- Results List -->
        <div class="search-results-list" id="partySearchResultsList" role="listbox">
          ${renderResultItems(currentResults, selectedIndex)}
        </div>

        <!-- Keyboard Guide Footer -->
        <div class="search-modal-footer">
          <span class="footer-hint"><kbd>↑</kbd> <kbd>↓</kbd> Navigate</span>
          <span class="footer-hint"><kbd>↵</kbd> Inspect with Spotlight</span>
          <span class="footer-hint"><kbd>ESC</kbd> Close</span>
        </div>

      </div>
    </dialog>
  `;
}

function renderMetaText(query, results) {
  if (!query || query.trim().length < 2) {
    return `<span>Type at least 2 letters to search the entire party's spells, inventory, actions & features...</span>`;
  }
  if (results.length === 0) {
    return `<span class="meta-empty">No results found for "<strong>${escapeHtml(query)}</strong>" across the active party.</span>`;
  }
  return `<span>Found <strong>${results.length}</strong> matching results for "<strong>${escapeHtml(query)}</strong>":</span>`;
}

export function renderResultItems(results, activeIdx = 0) {
  if (!results || results.length === 0) {
    if (!currentQuery || currentQuery.trim().length < 2) {
      return `
        <div class="search-empty-state">
          <div class="search-empty-icon">🧭</div>
          <div class="search-empty-title">Quick Party Intelligence</div>
          <p class="search-empty-sub">
            Find out who has <span class="search-chip" onclick="window.quickSearch('Revivify')">Revivify</span>, 
            <span class="search-chip" onclick="window.quickSearch('Counterspell')">Counterspell</span>, 
            <span class="search-chip" onclick="window.quickSearch('Boots')">Boots</span>, or 
            <span class="search-chip" onclick="window.quickSearch('Sneak Attack')">Sneak Attack</span> with a single keystroke.
          </p>
        </div>
      `;
    }
    return `
      <div class="search-empty-state">
        <div class="search-empty-icon">🔍</div>
        <div class="search-empty-title">No matching spells, items, or features</div>
        <p class="search-empty-sub">Try searching by partial name, school of magic, or ability type.</p>
      </div>
    `;
  }

  return results.map((item, idx) => {
    const isSelected = idx === activeIdx;
    const catClass = `cat-${item.category.toLowerCase()}`;

    return `
      <div 
        class="search-result-item ${isSelected ? 'selected' : ''}" 
        id="search-result-${idx}"
        data-index="${idx}"
        onclick="window.selectPartySearchResult(${idx})"
        onmouseenter="window.setPartySearchHover(${idx})"
      >
        <div class="result-char-badge">
          ${item.avatar ? `
            <img src="${item.avatar}" class="result-char-avatar" alt="${escapeHtml(item.charName)}" onerror="this.style.display='none'" />
          ` : `
            <span class="result-char-initial">${escapeHtml(item.charName.charAt(0))}</span>
          `}
          <span class="result-char-name">${escapeHtml(item.charName)}</span>
        </div>

        <div class="result-main-col">
          <div class="result-header-row">
            <span class="result-category-tag ${catClass}">${item.categoryIcon} ${item.category}</span>
            <strong class="result-name">${highlightMatch(item.name, currentQuery)}</strong>
            ${item.badge ? `<span class="result-badge">${escapeHtml(item.badge)}</span>` : ''}
          </div>
          <div class="result-sub-row">
            <span class="result-detail">${escapeHtml(item.detail)}</span>
            ${item.snippet ? `
              <span class="result-snip-preview">${escapeHtml(truncate(item.snippet, 110))}</span>
            ` : ''}
          </div>
        </div>

        <div class="result-action-col">
          <span class="result-jump-hint">Inspect ↗</span>
        </div>
      </div>
    `;
  }).join('');
}

export function updateSearchResults(query) {
  const queryStr = typeof query === 'string' ? query : (query?.target?.value ?? (document.getElementById('partySearchInput')?.value || ''));
  currentQuery = queryStr;
  currentResults = searchParty(currentQuery);
  selectedIndex = 0;

  const metaEl = document.getElementById('partySearchResultsMeta');
  if (metaEl) metaEl.innerHTML = renderMetaText(currentQuery, currentResults);

  const listEl = document.getElementById('partySearchResultsList');
  if (listEl) {
    listEl.innerHTML = renderResultItems(currentResults, selectedIndex);
    listEl.scrollTop = 0;
  }

  const clearBtn = document.getElementById('partySearchClear');
  if (clearBtn) clearBtn.style.display = currentQuery.length > 0 ? 'block' : 'none';
}

export function moveSelection(delta) {
  if (currentResults.length === 0) return;
  selectedIndex = Math.max(0, Math.min(currentResults.length - 1, selectedIndex + delta));

  // Update DOM active class
  const items = document.querySelectorAll('.search-result-item');
  items.forEach((el, idx) => {
    el.classList.toggle('selected', idx === selectedIndex);
  });

  // Scroll into view
  const activeEl = document.getElementById(`search-result-${selectedIndex}`);
  if (activeEl) {
    activeEl.scrollIntoView({ block: 'nearest' });
  }
}

export function setHoverSelection(idx) {
  selectedIndex = idx;
  const items = document.querySelectorAll('.search-result-item');
  items.forEach((el, i) => {
    el.classList.toggle('selected', i === selectedIndex);
  });
}

export function getSelectedResult() {
  return currentResults[selectedIndex] || null;
}

export function getResultAt(idx) {
  return currentResults[idx] || null;
}

export function resetSearchState() {
  currentQuery = '';
  currentResults = [];
  selectedIndex = 0;
}

function highlightMatch(text, query) {
  if (!query || query.trim().length < 2) return escapeHtml(text);
  try {
    const q = query.trim();
    const regex = new RegExp(`(${escapeRegex(q)})`, 'gi');
    return escapeHtml(text).replace(regex, '<mark class="search-match-mark">$1</mark>');
  } catch (err) {
    return escapeHtml(text);
  }
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function truncate(str, len) {
  if (!str) return '';
  if (str.length <= len) return str;
  return str.substring(0, len) + '...';
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
