/**
 * Live D&D Beyond Feed (Right-Hand Docked Sidebar Component)
 * Displays real-time party combat activity, damage taken, healing, and concentration checks.
 */
import { state } from '../state.js';

export function renderCombatPulseModal() {
  const entries = state.combatLog || [];
  const isOpen = Boolean(state.isCombatLogOpen);

  return `
    <!-- Floating Edge Tab (Visible when sidebar is closed) -->
    <button 
      id="sidebarDockTab" 
      class="sidebar-dock-tab ${isOpen ? 'hidden' : ''}" 
      onclick="window.toggleCombatLog(true)" 
      title="Expand Live Rolls"
    >
      <span class="dock-tab-arrow">❮</span>
      <span class="dock-tab-icon">⚡</span>
      <span class="dock-tab-text">Live Rolls</span>
      <span id="dockTabBadge" class="dock-tab-badge" style="${entries.length > 0 ? '' : 'display:none;'}">
        ${entries.length > 99 ? '99+' : entries.length}
      </span>
    </button>

    <!-- Docked Right Sidebar -->
    <aside id="combatPulseModal" class="live-feed-sidebar ${isOpen ? 'open' : 'closed'}">
      
      <!-- Pinned Sidebar Header -->
      <div class="live-feed-header">
        <div class="live-feed-title-row">
          <div class="live-feed-title">
            <span class="live-feed-icon">⚡</span>
            <div>
              <h3>Live Rolls</h3>
              <div class="live-feed-subtitle">Real-time HP, spell slots & concentration tracker</div>
            </div>
          </div>
          <div class="live-feed-header-actions">
            <button class="btn btn-sm btn-icon hide-sidebar-btn" onclick="window.toggleCombatLog(false)" title="Hide sidebar">
              <span class="collapse-arrow">❯</span>
            </button>
          </div>
        </div>

        <!-- Quick Sub-toolbar -->
        <div class="live-feed-subtoolbar">
          <span class="feed-count-tag">${entries.length} Events Logged</span>
          <div class="feed-actions-right">
            ${entries.length > 0 ? `
              <button class="feed-text-btn" onclick="window.clearCombatLog()" title="Clear event history">Clear History</button>
            ` : ''}
          </div>
        </div>
      </div>

      <!-- Scrollable Event Stream -->
      <div class="live-feed-list" id="pulseEntriesList">
        ${renderCombatPulseEntries(entries)}
      </div>

    </aside>
  `;
}

export function renderCombatPulseEntries(entries) {
  if (!entries || entries.length === 0) {
    return `
      <div class="pulse-empty">
        <div class="pulse-empty-icon">🛡️</div>
        <strong>No Combat Events Recorded</strong>
        <p>As players take damage, cast spells, or heal on D&D Beyond, real-time alerts and saving throw DCs will appear here automatically.</p>
      </div>
    `;
  }

  return entries.map(item => {
    let typeClass = 'entry-default';
    if (item.type === 'concentration_alert') typeClass = 'entry-alert';
    else if (item.type === 'damage') typeClass = 'entry-damage';
    else if (item.type === 'heal') typeClass = 'entry-heal';
    else if (item.type === 'spell_slot') typeClass = 'entry-spell';
    else if (item.type === 'inspiration') typeClass = 'entry-insp';
    else if (item.type === 'death_save') typeClass = 'entry-death';

    return `
      <div class="pulse-entry-card ${typeClass}">
        <div class="entry-left-col">
          <span class="entry-type-icon">${item.icon || '⚡'}</span>
        </div>
        <div class="entry-body">
          <div class="entry-meta">
            <span class="entry-char-name">${escapeHtml(item.charName || '')}</span>
            <span class="entry-timestamp">${item.timeText || ''}</span>
          </div>
          <div class="entry-title">${escapeHtml(item.title || '')}</div>
          <div class="entry-message">${escapeHtml(item.message || '')}</div>
          ${item.subtext ? `
            <div class="entry-subtext">${escapeHtml(item.subtext)}</div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
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
