import { 
  state, 
  initApp, 
  subscribe, 
  syncAllCharacters, 
  toggleAutoSync, 
  setDisplayMode, 
  setConcentration, 
  breakConcentration, 
  toggleCombatLog, 
  clearCombatLog, 
  simulateCombatPulse, 
  removeToast, 
  addToast, 
  DEFAULT_SEASONERS_ROSTER,
  applyShipDamage,
  applyShipRepair,
  resetShipHp,
  setShipActiveTarget,
  rollShipWeapon,
  clearShipRoll
} from './state.js';
import { extractCharacterId } from './dndbeyond.js';
import { renderPartyHud } from './components/partyHud.js';
import { renderCharacterSheet, setSheetTab } from './components/characterSheet.js';
import { renderVagrantShipPage } from './components/vagrantShipPage.js';
import { renderPerihelionHousePage } from './components/perihelionHousePage.js';
import { renderGuideModal } from './components/guideModal.js';
import { renderRosterModal, renderRosterModalContent } from './components/rosterModal.js';
import { renderCombatPulseModal, renderCombatPulseEntries } from './components/combatPulseModal.js';
import { 
  renderPartySearchModal, 
  updateSearchResults, 
  moveSelection, 
  setHoverSelection, 
  getSelectedResult, 
  getResultAt, 
  resetSearchState 
} from './components/partySearchModal.js';
import { triggerInlineWeaponRoll } from './components/diceRoller.js';

window.state = state;
window.triggerInlineWeaponRoll = triggerInlineWeaponRoll;
window.setConcentration = setConcentration;
window.breakConcentration = (charId, event) => {
  if (event) event.stopPropagation();
  breakConcentration(charId);
};
window.toggleSpellConcentration = (charId, spellName, level, event) => {
  if (event) event.stopPropagation();
  setConcentration(charId, spellName, level);
};
window.toggleCombatLog = toggleCombatLog;
window.clearCombatLog = clearCombatLog;
window.simulateCombatPulse = simulateCombatPulse;
window.dismissToast = (id) => removeToast(id);

window.applyShipDamage = (amt, target, bypassDt) => applyShipDamage(amt, target, bypassDt);
window.applyShipRepair = (amt, target) => applyShipRepair(amt, target);
window.resetShipHp = (target) => resetShipHp(target);
window.setShipActiveTarget = (target) => setShipActiveTarget(target);
window.rollShipWeapon = (key, opts) => rollShipWeapon(key, opts);
window.clearShipRoll = () => clearShipRoll();

window.handleShortcut = (el, event) => {
  if (event) event.stopPropagation();
  const charId = el.getAttribute('data-char-id');
  const tab = el.getAttribute('data-target-tab') || 'actions';
  const name = el.getAttribute('data-target-name') || '';
  window.inspectTarget(charId, tab, name, event);
};

window.inspectCharacter = (id) => {
  state.activeCharacterId = id;
  state.activeTab = 'sheet';
  render();
};

window.inspectTarget = (charId, tab, targetName, event) => {
  if (event) event.stopPropagation();
  state.activeCharacterId = charId;
  state.activeTab = 'sheet';
  setSheetTab(tab || 'actions');
  state.targetHighlight = targetName ? targetName.toLowerCase().trim() : null;
  render();

  if (state.targetHighlight) {
    setTimeout(() => {
      const q = state.targetHighlight;
      const targets = Array.from(document.querySelectorAll('[data-target-name]'));
      
      // 1. Exact match on data-target-name
      let match = targets.find(el => el.getAttribute('data-target-name')?.toLowerCase() === q);

      // 2. Substring or contains match (e.g. "loremaster's libram" matches "loremaster's libram of prophecy")
      if (!match) {
        match = targets.find(el => {
          const val = el.getAttribute('data-target-name')?.toLowerCase() || '';
          return val.includes(q) || q.includes(val);
        });
      }

      // 3. Word token match (ignoring apostrophes / punctuation)
      if (!match) {
        const cleanQ = q.replace(/[^a-z0-9]/gi, ' ').trim();
        const words = cleanQ.split(/\s+/).filter(w => w.length > 2);
        if (words.length > 0) {
          match = targets.find(el => {
            const val = (el.getAttribute('data-target-name') || '').toLowerCase();
            return words.every(w => val.includes(w));
          });
        }
      }

      // 4. Text content search fallback across cards
      if (!match) {
        const allCards = Array.from(document.querySelectorAll('.gear-card, .dnd-action-card, .feature-accordion-card, .spell-card, tr'));
        match = allCards.find(el => el.textContent.toLowerCase().includes(q));
      }

      if (match) {
        // Auto-expand any collapsed ancestors or collapsible cards
        const detailsParent = match.closest('details');
        if (detailsParent && !detailsParent.open) {
          detailsParent.open = true;
        }

        const featCard = match.closest('.dnd-feat-card') || (match.classList.contains('dnd-feat-card') ? match : null);
        if (featCard && !featCard.classList.contains('open')) {
          const header = featCard.querySelector('.dnd-feat-card-header');
          if (header) {
            header.click();
            setTimeout(() => {
              const freshTargets = Array.from(document.querySelectorAll('[data-target-name]'));
              const freshMatch = freshTargets.find(el => (el.getAttribute('data-target-name') || '').toLowerCase() === q) || featCard;
              freshMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
              freshMatch.classList.add('target-pulse');
              setTimeout(() => freshMatch.classList.remove('target-pulse'), 3500);
            }, 50);
            return;
          }
        }

        const spellCard = match.closest('.spell-card') || (match.classList.contains('spell-card') ? match : null);
        if (spellCard && !spellCard.classList.contains('open')) {
          spellCard.click();
          setTimeout(() => {
            const freshTargets = Array.from(document.querySelectorAll('[data-target-name]'));
            const freshMatch = freshTargets.find(el => (el.getAttribute('data-target-name') || '').toLowerCase() === q) || spellCard;
            freshMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
            freshMatch.classList.add('target-pulse');
            setTimeout(() => freshMatch.classList.remove('target-pulse'), 3500);
          }, 50);
          return;
        }

        match.scrollIntoView({ behavior: 'smooth', block: 'center' });
        match.classList.add('target-pulse');
        setTimeout(() => {
          match.classList.remove('target-pulse');
        }, 3500);
      }
    }, 150);
  }
};

window.setDisplayMode = (mode) => {
  setDisplayMode(mode);
};

window.switchTab = (tab) => {
  state.activeTab = tab;
  render();
};

window.toggleDrawer = (id, event) => {
  if (event) event.stopPropagation();
  if (!state.openDrawers) state.openDrawers = new Set();
  const willBeOpen = !state.openDrawers.has(id);
  if (willBeOpen) {
    state.openDrawers.add(id);
  } else {
    state.openDrawers.delete(id);
  }

  const drawer = document.getElementById(`drawer-${id}`);
  const btn = document.getElementById(`drawer-btn-${id}`);
  if (drawer && btn) {
    drawer.classList.toggle('open', willBeOpen);
    btn.classList.toggle('active', willBeOpen);
    const arrow = btn.querySelector('.drawer-toggle-arrow');
    if (arrow) arrow.classList.toggle('open', willBeOpen);
  } else {
    render();
  }
};

window.setSheetTab = setSheetTab;
window.refreshApp = () => render();

window.syncAll = async () => {
  await syncAllCharacters();
};

window.toggleAutoSync = toggleAutoSync;

function bindDialogLightDismissFallback(dialog) {
  if (!dialog || dialog.dataset.dialogBound === 'true') return;
  dialog.dataset.dialogBound = 'true';

  if (dialog.id === 'partySearchModal') {
    dialog.addEventListener('close', () => {
      dialog.returnValue = '';
      resetSearchState();
    });
  } else {
    dialog.addEventListener('close', () => {
      dialog.returnValue = '';
    });
  }

  // Fallback for browsers without closedby="any" support
  if (!('closedBy' in HTMLDialogElement.prototype) && dialog.getAttribute('closedby') === 'any') {
    const outside = (e) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    let pressedOutside = false;
    dialog.addEventListener('pointerdown', (e) => {
      pressedOutside = outside(e);
    });
    dialog.addEventListener('pointerup', (e) => {
      if (pressedOutside && outside(e)) dialog.close();
    });
  }
}

window.openPartySearch = () => {
  const container = document.getElementById('searchModalContainer');
  if (container && !document.getElementById('partySearchModal')) {
    container.innerHTML = renderPartySearchModal();
  }
  const modal = document.getElementById('partySearchModal');
  if (modal) {
    bindDialogLightDismissFallback(modal);
    if (!modal.open) modal.showModal();
    const input = document.getElementById('partySearchInput');
    if (input) {
      input.focus();
      input.select();
    }
  }
  updateSearchResults(document.getElementById('partySearchInput')?.value || '');
};

window.closePartySearch = () => {
  const modal = document.getElementById('partySearchModal');
  if (modal && modal.open) modal.close();
  resetSearchState();
};

window.onPartySearchInput = (val) => {
  const input = document.getElementById('partySearchInput');
  const queryStr = typeof val === 'string' ? val : (val?.target?.value ?? (input?.value || ''));
  if (input && typeof val === 'string' && input.value !== val) {
    input.value = val;
  }
  updateSearchResults(queryStr);
};

window.onPartySearchKeydown = (event) => {
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    moveSelection(1);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    moveSelection(-1);
  } else if (event.key === 'Enter') {
    event.preventDefault();
    const item = getSelectedResult();
    if (item) {
      window.selectPartySearchResultItem(item);
    }
  }
};

window.setPartySearchHover = (idx) => {
  setHoverSelection(idx);
};

window.selectPartySearchResult = (idx) => {
  const item = getResultAt(idx);
  if (item) {
    window.selectPartySearchResultItem(item);
  }
};

window.selectPartySearchResultItem = (itemOrIdx) => {
  const item = typeof itemOrIdx === 'number' ? getResultAt(itemOrIdx) : itemOrIdx;
  if (!item) return;
  window.closePartySearch();
  window.inspectTarget(item.charId, item.tab, item.targetName);
};

window.quickSearch = (term) => {
  const input = document.getElementById('partySearchInput');
  if (input) {
    input.value = term;
    input.focus();
  }
  updateSearchResults(term);
};

window.clearPartySearch = () => {
  const input = document.getElementById('partySearchInput');
  if (input) {
    input.value = '';
    input.focus();
  }
  updateSearchResults('');
};

window.openRosterModal = () => {
  const modalContainer = document.getElementById('modalContainer');
  let modal = document.getElementById('rosterModal');
  if (!modal && modalContainer) {
    modalContainer.innerHTML = renderRosterModal();
    modal = document.getElementById('rosterModal');
  } else if (modal) {
    modal.innerHTML = renderRosterModalContent();
  }
  if (modal) {
    bindDialogLightDismissFallback(modal);
    if (!modal.open) modal.showModal();
  }
};

window.closeRosterModal = () => {
  const modal = document.getElementById('rosterModal');
  if (modal && modal.open) modal.close();
};

window.openGuideModal = () => {
  const guideContainer = document.getElementById('guideModalContainer');
  if (guideContainer && !document.getElementById('guideModal')) {
    guideContainer.innerHTML = renderGuideModal();
  }
  const modal = document.getElementById('guideModal');
  if (modal) {
    bindDialogLightDismissFallback(modal);
    if (!modal.open) modal.showModal();
  }
};

window.closeGuideModal = () => {
  const modal = document.getElementById('guideModal');
  if (modal && modal.open) modal.close();
};

window.toggleRosterRowActive = (idx) => {
  if (state.roster[idx]) {
    const chk = document.getElementById(`roster-active-${idx}`);
    state.roster[idx].enabled = chk ? chk.checked : !state.roster[idx].enabled;
    const row = document.getElementById(`roster-row-${idx}`);
    if (row) row.classList.toggle('disabled-row', !state.roster[idx].enabled);
  }
};

window.addRosterRow = () => {
  syncRosterModalInputs();
  state.roster.push({
    id: 'char_' + Date.now(),
    name: '',
    player: '',
    role: '',
    url: '',
    dndBeyondId: '',
    enabled: true
  });
  const modal = document.getElementById('rosterModal');
  if (modal) {
    modal.innerHTML = renderRosterModalContent();
    if (!modal.open) modal.showModal();
  }
  const lastIdx = state.roster.length - 1;
  const newUrlInput = document.getElementById(`roster-url-${lastIdx}`);
  if (newUrlInput) newUrlInput.focus();
};

window.removeRosterRow = (idx) => {
  syncRosterModalInputs();
  state.roster.splice(idx, 1);
  const modal = document.getElementById('rosterModal');
  if (modal) {
    modal.innerHTML = renderRosterModalContent();
    if (!modal.open) modal.showModal();
  }
};

window.resetRosterToDefault = () => {
  if (confirm('Restore the 5 core Seasoners characters?')) {
    state.roster = JSON.parse(JSON.stringify(DEFAULT_SEASONERS_ROSTER));
    const modal = document.getElementById('rosterModal');
    if (modal) {
      modal.innerHTML = renderRosterModalContent();
      if (!modal.open) modal.showModal();
    }
  }
};

function syncRosterModalInputs() {
  state.roster.forEach((entry, idx) => {
    const nameInp = document.getElementById(`roster-name-${idx}`);
    const roleInp = document.getElementById(`roster-role-${idx}`);
    const urlInp = document.getElementById(`roster-url-${idx}`);
    const activeInp = document.getElementById(`roster-active-${idx}`);
    if (nameInp) entry.name = nameInp.value.trim();
    if (roleInp) entry.role = roleInp.value.trim();
    if (urlInp) {
      entry.url = urlInp.value.trim();
      entry.dndBeyondId = extractCharacterId(entry.url) || entry.dndBeyondId;
    }
    if (activeInp) entry.enabled = activeInp.checked;
  });
}

window.saveRoster = async () => {
  syncRosterModalInputs();

  // Remove empty placeholder rows
  state.roster = state.roster.filter(e => e.url || e.name || e.dndBeyondId);
  if (state.roster.length === 0) {
    state.roster = JSON.parse(JSON.stringify(DEFAULT_SEASONERS_ROSTER));
  }

  // Persist to localStorage
  try {
    localStorage.setItem('seasoners_roster', JSON.stringify(state.roster));
  } catch (e) {}

  // Persist to 24/7 Google Cloud if inside Apps Script or linked to Cloud URL
  if (typeof google !== 'undefined' && google.script && google.script.run) {
    try {
      google.script.run.saveCloudRoster(state.roster);
    } catch (e) {}
  } else {
    if (typeof window !== 'undefined' && window.__SEASONERS_CLOUD_URL__) {
      fetch(window.__SEASONERS_CLOUD_URL__, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'save-roster', roster: state.roster })
      }).catch(() => {});
    }
    try {
      await fetch('/api/save-roster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state.roster, null, 2)
      });
    } catch (e) {
      console.warn('Local save API not reachable, saving to memory & storage.');
    }
  }

  window.closeRosterModal();
  await syncAllCharacters();
  render();
};

window.refreshApp = () => render();

function render() {
  // Update Tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === state.activeTab);
  });

  // Sync button & Auto-sync badge status
  const syncBtn = document.getElementById('btnSync');
  if (syncBtn) {
    syncBtn.innerHTML = state.isSyncing ? '↻ Syncing...' : '↻ Refresh Now';
  }

  const syncIndicator = document.getElementById('syncIndicator');
  if (syncIndicator) {
    syncIndicator.className = 'sync-indicator ' + (state.autoSyncEnabled ? 'active' : 'paused');
    syncIndicator.innerHTML = `
      <span class="pulse-dot"></span>
      <span>${state.autoSyncEnabled ? `Live Sync ON (${state.autoSyncIntervalSec}s)` : 'Live Sync Paused'}</span>
    `;
  }

  const syncTimestamp = document.getElementById('syncTimestamp');
  if (syncTimestamp && state.lastSyncTime) {
    syncTimestamp.textContent = `Updated: ${state.lastSyncTime}`;
  }

  // Network Status Badge (Offline / Stale indicator)
  const networkBadge = document.getElementById('networkStatusBadge');
  if (networkBadge) {
    if (state.isOfflineMode || state.networkStatus === 'offline') {
      networkBadge.style.display = 'inline-flex';
      networkBadge.className = 'network-status-badge offline';
      networkBadge.innerHTML = '📡 Offline (Cached)';
      networkBadge.title = 'Operating offline. Serving cached party data from disk.';
    } else if (Object.keys(state.characterSyncErrors || {}).length > 0) {
      const staleCount = Object.keys(state.characterSyncErrors).length;
      networkBadge.style.display = 'inline-flex';
      networkBadge.className = 'network-status-badge partial';
      networkBadge.innerHTML = `⚠️ ${staleCount} Stale`;
      networkBadge.title = `${staleCount} character(s) using cached data due to network hiccups.`;
    } else {
      networkBadge.style.display = 'none';
    }
  }

  // Render active view
  const viewContainer = document.getElementById('viewContainer');
  if (!viewContainer) return;

  switch (state.activeTab) {
    case 'party':
      viewContainer.innerHTML = renderPartyHud();
      break;
    case 'sheet':
      viewContainer.innerHTML = renderCharacterSheet();
      break;
    case 'vagrant':
      viewContainer.innerHTML = renderVagrantShipPage();
      break;
    case 'perihelion':
      viewContainer.innerHTML = renderPerihelionHousePage();
      break;
    default:
      state.activeTab = 'party';
      viewContainer.innerHTML = renderPartyHud();
      break;
  }

  // Modal
  const modalContainer = document.getElementById('modalContainer');
  if (modalContainer && !document.getElementById('rosterModal')) {
    modalContainer.innerHTML = renderRosterModal();
    bindDialogLightDismissFallback(document.getElementById('rosterModal'));
  }

  // Live D&D Beyond Feed Badge & Sidebar
  const count = (state.combatLog || []).length;
  const pulseBadge = document.getElementById('combatPulseBadge');
  if (pulseBadge) {
    if (count > 0) {
      pulseBadge.style.display = 'inline-flex';
      pulseBadge.textContent = count > 99 ? '99+' : count;
    } else {
      pulseBadge.style.display = 'none';
    }
  }

  // Toggle body sidebar-open class for responsive layout adjustments
  document.body.classList.toggle('sidebar-open', Boolean(state.isCombatLogOpen));

  const combatPulseContainer = document.getElementById('combatPulseContainer');
  if (combatPulseContainer) {
    combatPulseContainer.innerHTML = renderCombatPulseModal();
  }

  // Party Search Modal
  const searchModalContainer = document.getElementById('searchModalContainer');
  if (searchModalContainer && !document.getElementById('partySearchModal')) {
    searchModalContainer.innerHTML = renderPartySearchModal();
    bindDialogLightDismissFallback(document.getElementById('partySearchModal'));
  }

  // Guide Modal
  const guideModalContainer = document.getElementById('guideModalContainer');
  if (guideModalContainer && !document.getElementById('guideModal')) {
    guideModalContainer.innerHTML = renderGuideModal();
    bindDialogLightDismissFallback(document.getElementById('guideModal'));
  }

  // Floating Toasts (Incremental, non-flickering)
  updateToasts();
}

function updateToasts() {
  const toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) return;

  const activeIds = new Set((state.activeToasts || []).map(t => t.id));

  // Remove toasts that are no longer active
  Array.from(toastContainer.children).forEach(child => {
    if (!activeIds.has(child.id)) {
      child.style.opacity = '0';
      child.style.transform = 'translateX(100%) scale(0.9)';
      setTimeout(() => child.remove(), 250);
    }
  });

  // Add any new toasts that aren't in the DOM yet
  (state.activeToasts || []).forEach(t => {
    if (!document.getElementById(t.id)) {
      const div = document.createElement('div');
      div.id = t.id;
      div.className = `toast-item toast-${t.type || 'info'}`;
      div.title = 'Click to dismiss';
      div.onclick = () => window.dismissToast(t.id);
      div.innerHTML = `
        <div class="toast-icon">${t.icon || '⚡'}</div>
        <div class="toast-content">
          <div class="toast-title">${escapeHtml(t.title || '')}</div>
          <div class="toast-msg">${escapeHtml(t.message || '')}</div>
          ${t.subtext ? `<div class="toast-sub">${escapeHtml(t.subtext)}</div>` : ''}
        </div>
        <button class="toast-close">✕</button>
      `;
      toastContainer.appendChild(div);
    }
  });
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

// Global keyboard shortcuts (Ctrl+K / Cmd+K)
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    const modal = document.getElementById('partySearchModal');
    if (modal && modal.open) {
      window.closePartySearch();
    } else {
      window.openPartySearch();
    }
  }
});

// Global Error & Promise Boundaries (Safety Net)
window.addEventListener('error', (event) => {
  console.warn('[HUD Safety Catch]', event.message, event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.warn('[HUD Safety Promise Catch]', event.reason);
});

// Network Connectivity Listeners
window.addEventListener('online', () => {
  state.isOfflineMode = false;
  state.networkStatus = 'online';
  addToast({
    id: 'toast-online',
    type: 'info',
    icon: '🌐',
    title: 'Connection Restored',
    message: 'Network is back online. Resuming live synchronization.'
  });
  render();
});

window.addEventListener('offline', () => {
  state.isOfflineMode = true;
  state.networkStatus = 'offline';
  addToast({
    id: 'toast-offline',
    type: 'warning',
    icon: '📡',
    title: 'Operating Offline',
    message: 'Network connection lost. HUD is running smoothly from local cache.'
  });
  render();
});

// Subscribe to state changes
subscribe(render);

async function bootstrap() {
  await initApp();
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('drawer') === 'all') {
    Object.keys(state.characters).forEach(id => state.openDrawers.add(id));
    render();
  } else if (urlParams.has('drawer')) {
    state.openDrawers.add(urlParams.get('drawer'));
    render();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
