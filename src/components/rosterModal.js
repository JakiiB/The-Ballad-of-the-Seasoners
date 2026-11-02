/**
 * Roster Management Modal Component
 * Allows live addition, removal, and session deactivation of D&D Beyond characters.
 */
import { state } from '../state.js';

export function renderRosterModalContent() {
  const activeCount = state.roster.filter(e => e.enabled !== false).length;
  const totalCount = state.roster.length;

  return `
      <div class="modal-box roster-modal-box">
        <div class="modal-header">
          <div class="modal-title-wrap">
            <h3 id="rosterModalTitle">Manage Party D&D Beyond URLs</h3>
            <p class="modal-subtitle">
              Configure characters for this session. Deactivate absent characters or add new ones.
              <span class="active-badge">${activeCount} of ${totalCount} Active</span>
            </p>
          </div>
          <button type="button" class="btn-close" onclick="window.closeRosterModal()" aria-label="Close party configuration" title="Close">✕</button>
        </div>

        <div class="modal-body">
          <div class="roster-table-header">
            <span class="col-active">ACTIVE</span>
            <span class="col-char">CHARACTER & ROLE</span>
            <span class="col-url">D&D BEYOND URL OR CHARACTER ID</span>
            <span class="col-action"></span>
          </div>

          <div class="roster-inputs-list" id="rosterInputsList">
            ${state.roster.map((entry, idx) => `
              <div class="roster-input-row ${entry.enabled === false ? 'disabled-row' : ''}" id="roster-row-${idx}">
                <div class="col-active">
                  <label class="toggle-switch" title="${entry.enabled === false ? 'Click to activate for this session' : 'Click to deactivate for this session'}">
                    <input type="checkbox" id="roster-active-${idx}" ${entry.enabled !== false ? 'checked' : ''} onchange="window.toggleRosterRowActive(${idx})" />
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                
                <div class="col-char">
                  <input type="text" class="input-name" id="roster-name-${idx}" 
                         value="${escapeAttr(entry.name || '')}" 
                         placeholder="Character Name" 
                         title="Character Name (leave blank to auto-detect)" />
                  <input type="text" class="input-role" id="roster-role-${idx}" 
                         value="${escapeAttr(entry.role || '')}" 
                         placeholder="Party Role / Class" 
                         title="Role or Archetype (e.g. Tank, Blaster, Leader)" />
                </div>

                <div class="col-url">
                  <input type="text" class="input-url" id="roster-url-${idx}" 
                         value="${escapeAttr(entry.url || entry.dndBeyondId || '')}" 
                         placeholder="https://www.dndbeyond.com/characters/..." 
                         title="Paste public character URL or numeric ID" />
                </div>

                <div class="col-action">
                  <button type="button" class="btn-remove-row" onclick="window.removeRosterRow(${idx})" aria-label="Remove character from party list" title="Remove character from party list">🗑</button>
                </div>
              </div>
            `).join('')}
          </div>

          <div class="roster-add-section">
            <button type="button" class="btn btn-add-char" onclick="window.addRosterRow()">+ Add Another Character</button>
          </div>
        </div>

        <div class="modal-footer">
          <div class="modal-footer-left">
            <button type="button" class="btn btn-outline" onclick="window.resetRosterToDefault()" title="Restore the 5 core Seasoners characters">↺ Reset to Seasoners Core</button>
          </div>
          <div class="modal-footer-right">
            <button type="button" class="btn btn-secondary" onclick="window.closeRosterModal()">Cancel</button>
            <button type="button" class="btn btn-primary" autofocus onclick="window.saveRoster()">Save & Sync Session</button>
          </div>
        </div>
      </div>
  `;
}

export function renderRosterModal() {
  return `
    <dialog class="modal-dialog roster-dialog" id="rosterModal" closedby="any" aria-labelledby="rosterModalTitle">
      ${renderRosterModalContent()}
    </dialog>
  `;
}

function escapeAttr(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
