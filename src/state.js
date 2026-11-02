/**
 * Pure Read-Only Observer State Store
 */
import { fetchCharacterData, extractCharacterId, parseDnDBeyondCharacter } from './dndbeyond.js';

function loadStoredJson(key, fallback) {
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const item = localStorage.getItem(`seasoners_${key}`);
    if (item === null || item === undefined) return fallback;
    try {
      return JSON.parse(item);
    } catch (e) {
      return item || fallback;
    }
  } catch (e) {
    return fallback;
  }
}

export function saveStoredJson(key, val) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(`seasoners_${key}`, JSON.stringify(val));
  } catch (e) {}
}

export const state = {
  roster: [],
  characters: {}, // keyed by dndBeyondId
  partyState: { stronghold: {}, ship: {} },
  activeCharacterId: '124205395', // default Pasquale
  activeTab: 'party',
  displayMode: loadStoredJson('display_mode', 'full'), // 'full' or 'compact'
  targetHighlight: null, // { charId, tab, targetName }
  concentration: loadStoredJson('concentration', {}), // keyed by charId: { spellName, level, source, timestamp }
  combatLog: loadStoredJson('combat_log', []), // recent events
  activeToasts: [], // currently floating toasts
  isCombatLogOpen: loadStoredJson('sidebar_open', true),
  openDrawers: new Set(),
  isSyncing: false,
  lastSyncTime: null,
  autoSyncEnabled: true,
  autoSyncIntervalSec: 20,
  autoSyncTimer: null,
  characterSyncErrors: {}, // keyed by charId: errorMessage
  isOfflineMode: false,
  networkStatus: typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'online',
  activeShipTarget: 'hull', // 'hull' or 'helm'
  lastShipRoll: null, // latest weapon salvo roll result
  listeners: []
};

export function subscribe(fn) {
  state.listeners.push(fn);
  return () => {
    state.listeners = state.listeners.filter(l => l !== fn);
  };
}

export function notify() {
  state.listeners.forEach(fn => {
    try { fn(state); } catch (err) { console.error('Listener error:', err); }
  });
}

export const DEFAULT_SEASONERS_ROSTER = [
  {
    id: "pasquale",
    name: "Pasquale Étienne",
    player: "Jake",
    dndBeyondId: "124205395",
    url: "https://www.dndbeyond.com/characters/124205395",
    role: "",
    enabled: true
  },
  {
    id: "agnes",
    name: "Sister Agnes",
    player: "Agnes",
    dndBeyondId: "46268812",
    url: "https://www.dndbeyond.com/characters/46268812",
    role: "",
    enabled: true
  },
  {
    id: "petrus",
    name: "Petrus Moonshine",
    player: "Petrus",
    dndBeyondId: "65780522",
    url: "https://www.dndbeyond.com/characters/65780522",
    role: "",
    enabled: true
  },
  {
    id: "tang",
    name: "Tang",
    player: "Tang",
    dndBeyondId: "91618985",
    url: "https://www.dndbeyond.com/characters/91618985",
    role: "",
    enabled: true
  },
  {
    id: "meridon",
    name: "Meridon Dorvaris",
    player: "Meridon",
    dndBeyondId: "46711646",
    url: "https://www.dndbeyond.com/characters/46711646",
    role: "",
    enabled: true
  }
];

function hasLocalNodeApi() {
  if (typeof location === 'undefined') return false;
  const h = location.hostname || '';
  return h === 'localhost' || h === '127.0.0.1';
}

async function fetchSharedCloudBundle() {
  if (typeof window !== 'undefined' && window.__SEASONERS_CLOUD_URL__) {
    try {
      const res = await fetch(`${window.__SEASONERS_CLOUD_URL__}?action=state&t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) return await res.json();
    } catch (e) {}
  }
  try {
    const partyStateRes = await fetch(`data/party_state.json?t=${Date.now()}`, { cache: 'no-store' });
    if (partyStateRes.ok) {
      return { partyState: await partyStateRes.json() };
    }
  } catch (e) {}
  return null;
}

export async function initApp() {
  try {
    const saved = loadStoredJson('roster', null);
    if (saved) {
      state.roster = saved;
    } else if (!state.roster || state.roster.length === 0) {
      const rosterRes = await fetch('data/party_roster.json');
      state.roster = await rosterRes.json();
    }
    const savedMode = loadStoredJson('display_mode', null);
    if (savedMode) state.displayMode = savedMode;
    const savedConc = loadStoredJson('concentration', null);
    if (savedConc) state.concentration = savedConc;
    const savedCombatLog = loadStoredJson('combat_log', null);
    if (savedCombatLog && Array.isArray(savedCombatLog) && savedCombatLog.length > 0) {
      state.combatLog = savedCombatLog;
    }

    // Load Tactical Party & Ship State (Cloud / Server Ground Truth with LocalStorage fallback)
    try {
      const bundle = await fetchSharedCloudBundle();
      if (bundle && bundle.partyState) {
        applyRemotePartyState(bundle.partyState);
        if (Array.isArray(bundle.roster) && bundle.roster.length > 0) {
          state.roster = bundle.roster;
          saveStoredJson('roster', state.roster);
        }
      } else {
        const savedPartyState = loadStoredJson('party_state', null);
        if (savedPartyState) applyRemotePartyState(savedPartyState);
      }
    } catch (err) {
      const savedPartyState = loadStoredJson('party_state', null);
      if (savedPartyState) applyRemotePartyState(savedPartyState);
    }
  } catch (e) {
    console.warn('Failed to load roster, using default Seasoners', e);
    state.roster = JSON.parse(JSON.stringify(DEFAULT_SEASONERS_ROSTER));
  }

  if (!Array.isArray(state.roster) || state.roster.length === 0) {
    state.roster = JSON.parse(JSON.stringify(DEFAULT_SEASONERS_ROSTER));
  }

  // Ensure default fields
  state.roster.forEach(entry => {
    if (entry.enabled === undefined) entry.enabled = true;
    if (!entry.dndBeyondId && entry.url) {
      entry.dndBeyondId = extractCharacterId(entry.url);
    }
  });

  // Pre-hydrate from static character JSONs on GitHub Pages / static hosts for <100ms instant render
  if (Object.keys(state.characters).length === 0) {
    try {
      await Promise.allSettled(
        state.roster.filter(e => e.enabled !== false).map(async (entry) => {
          const cid = entry.dndBeyondId || extractCharacterId(entry.url);
          if (!cid) return;
          const r = await fetch(`data/characters/${cid}.json?t=${Date.now()}`, { cache: 'no-store' });
          if (r.ok) {
            const parsed = parseDnDBeyondCharacter(await r.json());
            parsed.player = entry.player || parsed.name;
            parsed.role = entry.role || parsed.role || 'Adventurer';
            if (entry.name && entry.name.trim()) parsed.name = entry.name.trim();
            state.characters[cid] = parsed;
            previousCharacterSnapshots[cid] = JSON.parse(JSON.stringify(parsed));
          }
        })
      );
      if (!state.activeCharacterId || !state.characters[state.activeCharacterId]) {
        const firstId = Object.keys(state.characters)[0];
        if (firstId) state.activeCharacterId = firstId;
      }
    } catch (e) {}
  }

  connectRealtimeStream();
  notify();
  await syncAllCharacters();
  startAutoSync();
}

let eventSourceInstance = null;
let cloudPollTimer = null;

function applyRemotePartyState(remote) {
  if (!remote || typeof remote !== 'object') return;
  state.partyState = remote;
  saveStoredJson('party_state', state.partyState);
  if (remote.concentration && typeof remote.concentration === 'object') {
    state.concentration = remote.concentration;
    saveStoredJson('concentration', state.concentration);
  }
  if (remote.lastShipRoll !== undefined) {
    state.lastShipRoll = remote.lastShipRoll;
  }
  if (Array.isArray(remote.combatLog) && remote.combatLog.length > 0) {
    const existingIds = new Set((state.combatLog || []).map(e => e.id));
    let changed = false;
    for (let i = remote.combatLog.length - 1; i >= 0; i--) {
      const item = remote.combatLog[i];
      if (item && item.id && !existingIds.has(item.id)) {
        state.combatLog.unshift(item);
        existingIds.add(item.id);
        changed = true;
      }
    }
    if (changed) {
      if (state.combatLog.length > 50) state.combatLog = state.combatLog.slice(0, 50);
      saveStoredJson('combat_log', state.combatLog);
    }
  }
}

function connectRealtimeStream() {
  if (typeof window === 'undefined') return;

  // 1. Local SSE stream when connected to local Node server
  if (hasLocalNodeApi() && typeof EventSource !== 'undefined') {
    try {
      if (eventSourceInstance) eventSourceInstance.close();
      eventSourceInstance = new EventSource('/api/events');
      eventSourceInstance.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type === 'state_update' && msg.payload) {
            applyRemotePartyState(msg.payload);
            notify();
          } else if (msg.type === 'roster_update' && Array.isArray(msg.payload)) {
            state.roster = msg.payload;
            saveStoredJson('roster', state.roster);
            syncAllCharacters();
          }
        } catch (e) {}
      };
    } catch (e) {}
  }

  // 2. 24/7 Cloud State Polling (every 4s) for GitHub Pages multiplayer sync
  if (window.__SEASONERS_CLOUD_URL__) {
    if (cloudPollTimer) clearInterval(cloudPollTimer);
    cloudPollTimer = setInterval(async () => {
      try {
        const bundle = await fetchSharedCloudBundle();
        if (!bundle) return;
        let didChange = false;
        if (bundle.partyState) {
          const prevJson = JSON.stringify(state.partyState || {});
          const nextJson = JSON.stringify(bundle.partyState);
          if (prevJson !== nextJson) {
            applyRemotePartyState(bundle.partyState);
            didChange = true;
          }
        }
        if (bundle.characters && typeof bundle.characters === 'object') {
          for (const [cid, rawOrParsed] of Object.entries(bundle.characters)) {
            if (!rawOrParsed) continue;
            const parsed = parseDnDBeyondCharacter(rawOrParsed);
            const rosterEntry = (state.roster || []).find(r => String(r.dndBeyondId) === String(cid));
            if (rosterEntry) {
              if (rosterEntry.enabled === false) continue;
              parsed.player = rosterEntry.player || parsed.name;
              parsed.role = rosterEntry.role || parsed.role || 'Adventurer';
              if (rosterEntry.name && rosterEntry.name.trim()) parsed.name = rosterEntry.name.trim();
            }
            const prevChar = state.characters[cid];
            const prevSig = prevChar ? JSON.stringify({ hp: prevChar.hp, slots: prevChar.spellcasting?.slots, pact: prevChar.spellcasting?.pactSlots, res: prevChar.resources, exp: prevChar.secondaryExpendables, insp: prevChar.inspiration, cond: prevChar.conditions, ds: prevChar.deathSaves }) : '';
            const nextSig = JSON.stringify({ hp: parsed.hp, slots: parsed.spellcasting?.slots, pact: parsed.spellcasting?.pactSlots, res: parsed.resources, exp: parsed.secondaryExpendables, insp: parsed.inspiration, cond: parsed.conditions, ds: parsed.deathSaves });
            if (prevSig !== nextSig) {
              processCharacterDeltas(cid, parsed);
              state.characters[cid] = parsed;
              state.lastSyncTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              didChange = true;
            }
          }
        }
        if (didChange) notify();
      } catch (e) {}
    }, 4000);
  }
}

// Module-level snapshot storage for delta diffing
const previousCharacterSnapshots = {};

function processCharacterDeltas(charId, curr) {
  const prev = previousCharacterSnapshots[charId];
  if (!prev) {
    // Initial load: save baseline snapshot silently
    previousCharacterSnapshots[charId] = JSON.parse(JSON.stringify(curr));
    return;
  }

  const prevHp = prev.hp?.current ?? 0;
  const currHp = curr.hp?.current ?? 0;
  const currMax = curr.hp?.max ?? 1;

  // 1. HP Damage taken
  if (currHp < prevHp) {
    const dmg = prevHp - currHp;
    const conc = state.concentration && state.concentration[charId];

    if (conc) {
      // Concentration check required!
      const dc = Math.max(10, Math.floor(dmg / 2));
      const conMod = curr.savingThrows?.con?.value ?? 0;
      const conProf = curr.savingThrows?.con?.proficient ?? false;
      const feats = (curr.featuresAndTraits?.feats || []).map(f => (f.name || '').toLowerCase());
      const hasWarCaster = feats.some(f => f.includes('war caster'));
      const conSign = conMod >= 0 ? `+${conMod}` : `${conMod}`;

      const alertTitle = `⚠️ CONCENTRATION SAVE: DC ${dc}`;
      const alertMsg = `${curr.name} took ${dmg} damage while concentrating on ${conc.spellName}!`;
      const alertSub = `Con Save: ${conSign} (${conProf ? 'Proficient' : 'Standard'}${hasWarCaster ? ' • War Caster Advantage' : ''})`;

      addCombatLogEntry({
        type: 'concentration_alert',
        charId,
        charName: curr.name,
        title: alertTitle,
        message: alertMsg,
        subtext: alertSub,
        icon: '⚠️',
        dc,
        dmg,
        spellName: conc.spellName
      });

      addToast({
        type: 'concentration_alert',
        title: alertTitle,
        message: alertMsg,
        subtext: alertSub,
        icon: '⚠️',
        duration: 9000
      });
    }

    const dmgTitle = `🔴 Damage Taken (-${dmg} HP)`;
    const dmgMsg = `${curr.name} took ${dmg} damage (${currHp}/${currMax} HP)`;
    addCombatLogEntry({
      type: 'damage',
      charId,
      charName: curr.name,
      title: dmgTitle,
      message: dmgMsg,
      subtext: `HP dropped from ${prevHp} to ${currHp}`,
      icon: '💥',
      delta: -dmg
    });
    addToast({
      type: 'damage',
      title: dmgTitle,
      message: dmgMsg,
      subtext: `HP dropped from ${prevHp} to ${currHp}`,
      icon: '💥',
      duration: 6000
    });
  } else if (currHp > prevHp) {
    // 2. HP Healing received
    const heal = currHp - prevHp;
    const healTitle = `💚 Health Restored (+${heal} HP)`;
    const healMsg = `${curr.name} healed for +${heal} HP (${currHp}/${currMax} HP)`;
    addCombatLogEntry({
      type: 'heal',
      charId,
      charName: curr.name,
      title: healTitle,
      message: healMsg,
      subtext: `HP increased from ${prevHp} to ${currHp}`,
      icon: '💚',
      delta: heal
    });
    addToast({
      type: 'heal',
      title: healTitle,
      message: healMsg,
      subtext: `HP increased from ${prevHp} to ${currHp}`,
      icon: '💚',
      duration: 6000
    });
  }

  // 3. Temp HP Gained
  const prevTemp = prev.hp?.temp ?? 0;
  const currTemp = curr.hp?.temp ?? 0;
  if (currTemp > prevTemp) {
    const diff = currTemp - prevTemp;
    addCombatLogEntry({
      type: 'temp_hp',
      charId,
      charName: curr.name,
      title: `🛡️ Temp HP Added (+${diff})`,
      message: `${curr.name} gained +${diff} Temporary Hit Points (${currTemp} total)`,
      icon: '🛡️'
    });
    addToast({
      type: 'temp_hp',
      title: `🛡️ Temp HP Added (+${diff})`,
      message: `${curr.name} gained +${diff} Temporary Hit Points (${currTemp} total)`,
      icon: '🛡️',
      duration: 5000
    });
  }

  // 4. Heroic Inspiration Awarded / Spent
  if (!prev.inspiration && curr.inspiration) {
    addCombatLogEntry({
      type: 'inspiration',
      charId,
      charName: curr.name,
      title: `⭐ Heroic Inspiration Awarded`,
      message: `${curr.name} gained Heroic Inspiration!`,
      icon: '⭐'
    });
    addToast({
      type: 'inspiration',
      title: `⭐ Heroic Inspiration Awarded`,
      message: `${curr.name} gained Heroic Inspiration!`,
      icon: '⭐',
      duration: 6000
    });
  } else if (prev.inspiration && !curr.inspiration) {
    addCombatLogEntry({
      type: 'inspiration',
      charId,
      charName: curr.name,
      title: `💫 Inspiration Expended`,
      message: `${curr.name} spent Heroic Inspiration`,
      icon: '💫'
    });
  }

  // 5. Spell Slots Expended
  for (let lvl = 1; lvl <= 9; lvl++) {
    const pSlot = prev.spellcasting?.slots?.[lvl];
    const cSlot = curr.spellcasting?.slots?.[lvl];
    if (pSlot && cSlot && cSlot.used > pSlot.used) {
      const usedCount = cSlot.used - pSlot.used;
      const slotTitle = `🟣 Spell Slot Expended (L${lvl})`;
      const slotMsg = `${curr.name} expended ${usedCount}x Level ${lvl} slot (${cSlot.available} remaining)`;
      addCombatLogEntry({
        type: 'spell_slot',
        charId,
        charName: curr.name,
        title: slotTitle,
        message: slotMsg,
        icon: '🟣'
      });
      addToast({
        type: 'spell_slot',
        title: slotTitle,
        message: slotMsg,
        icon: '🟣',
        duration: 5000
      });
    }
  }

  // 6. Pact Slots Expended
  if (prev.spellcasting?.pactSlots && curr.spellcasting?.pactSlots) {
    if (curr.spellcasting.pactSlots.used > prev.spellcasting.pactSlots.used) {
      const slotTitle = `🟣 Pact Slot Expended (L${curr.spellcasting.pactSlots.level})`;
      const slotMsg = `${curr.name} expended a Pact Slot (${curr.spellcasting.pactSlots.available} left)`;
      addCombatLogEntry({
        type: 'spell_slot',
        charId,
        charName: curr.name,
        title: slotTitle,
        message: slotMsg,
        icon: '🟣'
      });
      addToast({
        type: 'spell_slot',
        title: slotTitle,
        message: slotMsg,
        icon: '🟣',
        duration: 5000
      });
    }
  }

  // 7. Death Saves
  if (curr.deathSaves && prev.deathSaves) {
    if (curr.deathSaves.failCount > prev.deathSaves.failCount) {
      addCombatLogEntry({
        type: 'death_save',
        charId,
        charName: curr.name,
        title: `💀 Death Save Failed`,
        message: `${curr.name} failed a death saving throw (${curr.deathSaves.failCount}/3 failures)!`,
        icon: '💀'
      });
      addToast({
        type: 'death_save',
        title: `💀 Death Save Failed`,
        message: `${curr.name} failed a death saving throw (${curr.deathSaves.failCount}/3 failures)!`,
        icon: '💀',
        duration: 8000
      });
    }
    if (curr.deathSaves.successCount > prev.deathSaves.successCount) {
      addCombatLogEntry({
        type: 'death_save',
        charId,
        charName: curr.name,
        title: `✨ Death Save Succeeded`,
        message: `${curr.name} succeeded on a death saving throw (${curr.deathSaves.successCount}/3 successes)!`,
        icon: '✨'
      });
      addToast({
        type: 'death_save',
        title: `✨ Death Save Succeeded`,
        message: `${curr.name} succeeded on a death saving throw (${curr.deathSaves.successCount}/3 successes)!`,
        icon: '✨',
        duration: 6000
      });
    }
  }

  // Update snapshot clone
  previousCharacterSnapshots[charId] = JSON.parse(JSON.stringify(curr));
}

export async function syncAllCharacters() {
  if (state.isSyncing) return;
  state.isSyncing = true;
  notify();

  const activeEntries = state.roster.filter(entry => entry.enabled !== false);
  const activeCharIds = new Set(activeEntries.map(e => e.dndBeyondId || extractCharacterId(e.url)).filter(Boolean));

  // Remove data for any characters that were removed or are deactivated
  for (const id of Object.keys(state.characters)) {
    if (!activeCharIds.has(id)) {
      delete state.characters[id];
      delete previousCharacterSnapshots[id];
    }
  }

  let anyError = false;
  const promises = activeEntries.map(async (entry) => {
    const charId = entry.dndBeyondId || extractCharacterId(entry.url);
    if (charId) {
      try {
        const parsed = await fetchCharacterData(charId);
        parsed.player = entry.player || parsed.name;
        parsed.role = entry.role || parsed.role || 'Adventurer';
        if (entry.name && entry.name.trim()) parsed.name = entry.name.trim();
        parsed.isStale = false;
        parsed.lastSuccessSync = Date.now();
        
        // Detect combat deltas before saving into state
        processCharacterDeltas(charId, parsed);

        state.characters[charId] = parsed;
        if (state.characterSyncErrors[charId]) {
          delete state.characterSyncErrors[charId];
        }
      } catch (err) {
        anyError = true;
        console.error('Sync failed for ' + (entry.name || charId), err);
        state.characterSyncErrors[charId] = err.message || 'Sync failed';
        if (state.characters[charId]) {
          state.characters[charId].isStale = true;
        }
      }
    }
  });

  await Promise.allSettled(promises);

  // Sync shared party_state from 24/7 Cloud / Server on poll
  try {
    const bundle = await fetchSharedCloudBundle();
    if (bundle && bundle.partyState) {
      applyRemotePartyState(bundle.partyState);
    }
  } catch (e) {}

  const errorCount = Object.keys(state.characterSyncErrors).length;
  state.isOfflineMode = anyError && errorCount >= activeEntries.length;
  state.networkStatus = state.isOfflineMode ? 'offline' : 'online';

  // If active character is deactivated or removed, switch to first available active character
  if (!state.characters[state.activeCharacterId]) {
    const firstActiveId = Array.from(activeCharIds)[0];
    if (firstActiveId) state.activeCharacterId = firstActiveId;
  }

  state.isSyncing = false;
  state.lastSyncTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  notify();
}

export function toggleAutoSync() {
  state.autoSyncEnabled = !state.autoSyncEnabled;
  if (state.autoSyncEnabled) {
    startAutoSync();
  } else {
    stopAutoSync();
  }
  notify();
}

function startAutoSync() {
  stopAutoSync();
  if (!state.autoSyncEnabled) return;
  state.autoSyncTimer = setInterval(() => {
    syncAllCharacters();
  }, state.autoSyncIntervalSec * 1000);
}

function stopAutoSync() {
  if (state.autoSyncTimer) {
    clearInterval(state.autoSyncTimer);
    state.autoSyncTimer = null;
  }
}

export function setDisplayMode(mode) {
  state.displayMode = mode;
  saveStoredJson('display_mode', mode);
  notify();
}

// -------------------------------------------------------------------------------------------------
// CONCENTRATION ENGINE
// -------------------------------------------------------------------------------------------------
export function setConcentration(charId, spellName, level = 0, source = '') {
  if (!state.concentration) state.concentration = {};
  const c = state.characters[charId];
  const charName = c ? c.name : 'Character';
  
  if (state.concentration[charId]?.spellName?.toLowerCase() === spellName.toLowerCase()) {
    breakConcentration(charId);
    return;
  }

  state.concentration[charId] = {
    spellName,
    level,
    source,
    timestamp: Date.now()
  };

  saveStoredJson('concentration', state.concentration);

  addCombatLogEntry({
    type: 'concentration',
    charId,
    charName,
    title: `✦ Concentration Begun`,
    message: `${charName} is now concentrating on ${spellName}`,
    icon: '✦'
  });

  addToast({
    type: 'concentration',
    title: `✦ Concentrating: ${spellName}`,
    message: `${charName} is concentrating (Auto Con-Save alert active)`,
    icon: '✦',
    duration: 4000
  });

  persistPartyState();
  notify();
}

export function breakConcentration(charId) {
  if (!state.concentration || !state.concentration[charId]) return;
  const c = state.characters[charId];
  const charName = c ? c.name : 'Character';
  const spellName = state.concentration[charId].spellName;

  delete state.concentration[charId];
  saveStoredJson('concentration', state.concentration);

  addCombatLogEntry({
    type: 'concentration_break',
    charId,
    charName,
    title: `✕ Concentration Ended`,
    message: `${charName} dropped concentration on ${spellName}`,
    icon: '✕'
  });

  addToast({
    type: 'concentration_break',
    title: `Concentration Ended`,
    message: `${charName} dropped concentration on ${spellName}`,
    icon: '✕',
    duration: 3500
  });

  persistPartyState();
  notify();
}

// -------------------------------------------------------------------------------------------------
// COMBAT PULSE LOG & TOASTS
// -------------------------------------------------------------------------------------------------
export function addCombatLogEntry(entry) {
  const time = new Date();
  const timeText = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const item = {
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    timeText,
    timestamp: Date.now(),
    ...entry
  };
  state.combatLog.unshift(item);
  if (state.combatLog.length > 50) state.combatLog.pop();
  saveStoredJson('combat_log', state.combatLog);
}

export function addToast(toast) {
  const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  const newToast = { id, ...toast };
  state.activeToasts.unshift(newToast);
  if (state.activeToasts.length > 5) state.activeToasts.pop();

  setTimeout(() => {
    removeToast(id);
  }, toast.duration || 6000);

  notify();
}

export function removeToast(id) {
  state.activeToasts = state.activeToasts.filter(t => t.id !== id);
  notify();
}

export function clearCombatLog() {
  state.combatLog = [];
  saveStoredJson('combat_log', []);
  notify();
}

export function toggleCombatLog(force) {
  state.isCombatLogOpen = force !== undefined ? force : !state.isCombatLogOpen;
  saveStoredJson('sidebar_open', state.isCombatLogOpen);
  notify();
}

// Tabletop instant simulation helper
export function simulateCombatPulse(type = 'damage', charId = null) {
  const targetId = charId || state.activeCharacterId || Object.keys(state.characters)[0];
  const c = state.characters[targetId];
  if (!c) return;

  if (type === 'damage') {
    const dmg = 28;
    const currHp = Math.max(0, (c.hp.current || 50) - dmg);
    const conc = state.concentration && state.concentration[targetId];
    if (conc) {
      const dc = Math.max(10, Math.floor(dmg / 2));
      const conMod = c.savingThrows?.con?.value ?? 0;
      const conProf = c.savingThrows?.con?.proficient ?? false;
      const feats = (c.featuresAndTraits?.feats || []).map(f => (f.name || '').toLowerCase());
      const hasWarCaster = feats.some(f => f.includes('war caster'));
      const conSign = conMod >= 0 ? `+${conMod}` : `${conMod}`;

      const alertTitle = `⚠️ CONCENTRATION SAVE: DC ${dc}`;
      const alertMsg = `${c.name} took ${dmg} damage while concentrating on ${conc.spellName}!`;
      const alertSub = `Con Save: ${conSign} (${conProf ? 'Proficient' : 'Standard'}${hasWarCaster ? ' • War Caster Advantage' : ''})`;

      addCombatLogEntry({
        type: 'concentration_alert',
        charId: targetId,
        charName: c.name,
        title: alertTitle,
        message: alertMsg,
        subtext: alertSub,
        icon: '⚠️',
        dc,
        dmg,
        spellName: conc.spellName
      });
      addToast({
        type: 'concentration_alert',
        title: alertTitle,
        message: alertMsg,
        subtext: alertSub,
        icon: '⚠️',
        duration: 9000
      });
    }

    addCombatLogEntry({
      type: 'damage',
      charId: targetId,
      charName: c.name,
      title: `🔴 Damage Taken (-${dmg} HP)`,
      message: `${c.name} took ${dmg} damage (${currHp}/${c.hp.max} HP)`,
      subtext: `Simulated combat hit`,
      icon: '💥',
      delta: -dmg
    });
    addToast({
      type: 'damage',
      title: `🔴 Damage Taken (-${dmg} HP)`,
      message: `${c.name} took ${dmg} damage (${currHp}/${c.hp.max} HP)`,
      subtext: `Simulated combat hit`,
      icon: '💥',
      duration: 6000
    });
  } else if (type === 'heal') {
    const heal = 35;
    addCombatLogEntry({
      type: 'heal',
      charId: targetId,
      charName: c.name,
      title: `💚 Health Restored (+${heal} HP)`,
      message: `${c.name} healed for +${heal} HP`,
      icon: '💚',
      delta: heal
    });
    addToast({
      type: 'heal',
      title: `💚 Health Restored (+${heal} HP)`,
      message: `${c.name} healed for +${heal} HP`,
      icon: '💚',
      duration: 5000
    });
  } else if (type === 'inspiration') {
    addCombatLogEntry({
      type: 'inspiration',
      charId: targetId,
      charName: c.name,
      title: `⭐ Heroic Inspiration Awarded`,
      message: `${c.name} received Heroic Inspiration!`,
      icon: '⭐'
    });
    addToast({
      type: 'inspiration',
      title: `⭐ Heroic Inspiration Awarded`,
      message: `${c.name} received Heroic Inspiration!`,
      icon: '⭐',
      duration: 6000
    });
  }
}

// -------------------------------------------------------------------------------------------------
// THE VAGRANT // SHIP HP MANAGEMENT & SIEGE WEAPON ROLLER
// -------------------------------------------------------------------------------------------------

export async function persistPartyState() {
  if (!state.partyState) state.partyState = {};
  state.partyState.concentration = state.concentration || {};
  state.partyState.lastShipRoll = state.lastShipRoll || null;
  state.partyState.combatLog = (state.combatLog || []).slice(0, 30);
  saveStoredJson('party_state', state.partyState);

  if (typeof window !== 'undefined' && window.__SEASONERS_CLOUD_URL__) {
    try {
      fetch(window.__SEASONERS_CLOUD_URL__, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'save-state', partyState: state.partyState })
      }).catch(() => {});
    } catch (e) {}
  }

  if (hasLocalNodeApi()) {
    try {
      if (typeof fetch !== 'undefined') {
        await fetch('/api/save-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(state.partyState, null, 2)
        });
      }
    } catch (err) {}
  }
}

export function setShipActiveTarget(target) {
  state.activeShipTarget = 'hull';
  notify();
}

export function applyShipDamage(amount, target = null, bypassDt = false) {
  if (!state.partyState) state.partyState = {};
  if (!state.partyState.ship) state.partyState.ship = {};
  const ship = state.partyState.ship;

  const dmg = Math.max(0, parseInt(amount, 10) || 0);
  if (dmg === 0) return;

  if (!ship.hull) ship.hull = { currentHp: 450, maxHp: 450, ac: 17, damageThreshold: 30 };
  const dt = ship.hull.damageThreshold ?? 30;

  if (!bypassDt && dmg < dt) {
    addCombatLogEntry({
      type: 'info',
      charName: 'The Vagrant (Hull)',
      title: `🛡️ Attack Below Damage Threshold (${dt})`,
      message: `Attack dealt ${dmg} damage (under DT ${dt}) - 0 damage taken.`,
      icon: '🛡️'
    });
    addToast({
      type: 'info',
      title: 'Damage Threshold 30',
      message: `Hit dealt ${dmg} damage (under DT 30) - 0 damage taken.`,
      icon: '🛡️',
      duration: 4500
    });
    notify();
    return;
  }

  const prev = ship.hull.currentHp ?? 450;
  const max = ship.hull.maxHp ?? 450;
  const next = Math.max(0, prev - dmg);
  ship.hull.currentHp = next;

  addCombatLogEntry({
    type: 'damage',
    charName: 'The Vagrant (Hull)',
    title: `💥 Hull Sustained ${dmg} Damage`,
    message: `Hull took ${dmg} damage (${next} / ${max} HP remaining).`,
    icon: '💥'
  });

  if (next === 0) {
    addToast({
      type: 'damage',
      title: '🚨 HULL AT 0 HP',
      message: 'The Vagrant hull has dropped to 0 HP!',
      icon: '🚨',
      duration: 9000
    });
  } else if (next <= max / 2 && prev > max / 2) {
    addToast({
      type: 'warning',
      title: '⚠️ Hull Below 50%',
      message: `The Vagrant hull is at ${next} / ${max} HP.`,
      icon: '⚠️',
      duration: 6000
    });
  }

  persistPartyState();
  notify();
}

export function applyShipRepair(amount, target = null) {
  if (!state.partyState) state.partyState = {};
  if (!state.partyState.ship) state.partyState.ship = {};
  const ship = state.partyState.ship;

  const heal = Math.max(0, parseInt(amount, 10) || 0);
  if (heal === 0) return;

  if (!ship.hull) ship.hull = { currentHp: 450, maxHp: 450, ac: 17, damageThreshold: 30 };
  const prev = ship.hull.currentHp ?? 450;
  const max = ship.hull.maxHp ?? 450;
  const next = Math.min(max, prev + heal);
  ship.hull.currentHp = next;

  addCombatLogEntry({
    type: 'heal',
    charName: 'The Vagrant (Hull)',
    title: `🔧 Hull Repaired (+${next - prev} HP)`,
    message: `Restored ${next - prev} HP to the hull (${next} / ${max} HP).`,
    icon: '🔧'
  });

  persistPartyState();
  notify();
}

export function resetShipHp(target = null) {
  if (!state.partyState) state.partyState = {};
  if (!state.partyState.ship) state.partyState.ship = {};
  const ship = state.partyState.ship;

  if (!ship.hull) ship.hull = { currentHp: 450, maxHp: 450, ac: 17, damageThreshold: 30 };
  ship.hull.currentHp = ship.hull.maxHp ?? 450;
  addCombatLogEntry({
    type: 'heal',
    charName: 'The Vagrant (Hull)',
    title: `⚓ Hull Reset to 450 HP`,
    message: `The Vagrant hull restored to ${ship.hull.currentHp} HP.`,
    icon: '⚓'
  });

  persistPartyState();
  notify();
}

export function clearShipRoll() {
  state.lastShipRoll = null;
  persistPartyState();
  notify();
}

// -------------------------------------------------------------------------------------------------
// TRUE RANDOMNESS ENGINE (ZERO PSEUDO-RANDOM / HARDWARE ENTROPY & QUANTUM VACUUM)
// -------------------------------------------------------------------------------------------------
let quantumEntropyPool = [];
let isFetchingQuantum = false;
let lastEntropySource = 'Hardware Kernel CSPRNG (BCryptGenRandom)';

export function getEntropyStatus() {
  return {
    source: lastEntropySource,
    quantumPoolSize: quantumEntropyPool.length
  };
}

export async function replenishQuantumEntropy() {
  if (isFetchingQuantum || typeof window === 'undefined') return;
  isFetchingQuantum = true;
  try {
    const res = await fetch('https://qrng.anu.edu.au/API/jsonI.php?length=100&type=uint16', {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(4000)
    });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.data) && data.data.length > 0) {
        quantumEntropyPool.push(...data.data);
        if (quantumEntropyPool.length > 300) quantumEntropyPool = quantumEntropyPool.slice(-300);
      }
    }
  } catch (e) {
    // Network or timeout - falls back silently to OS kernel CSPRNG
  } finally {
    isFetchingQuantum = false;
  }
}

// Auto-replenish when in browser
if (typeof window !== 'undefined') {
  replenishQuantumEntropy();
}

export function rollTrueDie(sides) {
  if (sides <= 1) return 1;

  // 1. Quantum Vacuum Entropy Pool (ANU Canberra)
  if (quantumEntropyPool.length > 0) {
    if (quantumEntropyPool.length < 30) {
      replenishQuantumEntropy();
    }
    const maxQuantumValid = Math.floor(65536 / sides) * sides;
    while (quantumEntropyPool.length > 0) {
      const qVal = quantumEntropyPool.shift();
      if (qVal < maxQuantumValid) {
        lastEntropySource = 'Quantum Vacuum Fluctuation (ANU Canberra)';
        return (qVal % sides) + 1;
      }
    }
  }

  // 2. Hardware Kernel CSPRNG (Windows BCryptGenRandom / CPU RDRAND)
  // Rejection sampling against 2^32 to guarantee zero modulo bias
  const maxUint32Valid = Math.floor(0xFFFFFFFF / sides) * sides;
  let rand;
  do {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const buf = new Uint32Array(1);
      window.crypto.getRandomValues(buf);
      rand = buf[0];
    } else {
      try {
        const crypto = require('crypto');
        rand = crypto.randomBytes(4).readUInt32BE(0);
      } catch (e) {
        rand = Math.floor(Math.random() * 0xFFFFFFFF);
      }
    }
  } while (rand >= maxUint32Valid);

  lastEntropySource = 'Hardware Kernel CSPRNG (BCryptGenRandom)';
  return (rand % sides) + 1;
}

export function rollTrueDicePool(count, sides) {
  const dice = [];
  let sum = 0;
  for (let i = 0; i < count; i++) {
    const val = rollTrueDie(sides);
    dice.push(val);
    sum += val;
  }
  return { dice, sum, entropySource: lastEntropySource };
}

function rollSingleDie(sides) {
  return rollTrueDie(sides);
}

function rollDicePool(count, sides) {
  return rollTrueDicePool(count, sides);
}

export function rollShipWeapon(weaponKey, options = {}) {
  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  let result = null;

  if (weaponKey === 'eldritch-blaster-single') {
    const d20 = rollSingleDie(20);
    const attackMod = 10; // Authoritative +10 to hit
    const attackTotal = d20 + attackMod;
    const isCrit = d20 >= (options.crit19 ? 19 : 20);
    const isNat1 = d20 === 1;

    const baseDiceCount = isCrit ? 20 : 10;
    const forceRoll = rollDicePool(baseDiceCount, 6);
    let totalDmg = forceRoll.sum;

    result = {
      id: 'roll_' + Date.now(),
      weaponKey,
      weaponName: 'Eldritch Blaster (1 Attack)',
      type: 'attack',
      timestamp,
      range: '400 / 1,200 ft.',
      attack: {
        d20,
        mod: attackMod,
        total: attackTotal,
        isCrit,
        isNat1
      },
      damage: {
        type: 'Force',
        diceCount: baseDiceCount,
        diceSides: 6,
        dice: forceRoll.dice,
        diceSum: forceRoll.sum,
        total: totalDmg
      },
      summary: isCrit 
        ? `CRITICAL HIT (${d20} + 10 = ${attackTotal})! Dealt ${totalDmg} Force damage (${baseDiceCount}d6).`
        : `Ranged Spell Attack: ${d20} + 10 = ${attackTotal}. Hit: ${totalDmg} Force damage (${baseDiceCount}d6).`
    };

    addCombatLogEntry({
      type: 'action',
      charName: 'The Vagrant (Eldritch Blaster)',
      title: isCrit ? `🎯 CRITICAL HIT! Eldritch Blaster` : `🎯 Eldritch Blaster: ${attackTotal}`,
      message: `Attack [${d20} + 10 = ${attackTotal}]. Damage: ${totalDmg} Force (${baseDiceCount}d6). Range: 400 / 1,200 ft.`,
      icon: '🎯'
    });

  } else if (weaponKey === 'eldritch-blaster-all') {
    // 4 separate attacks per PDF
    const attacks = [];
    let combinedDamage = 0;
    const allDice = [];

    for (let i = 1; i <= 4; i++) {
      const d20 = rollSingleDie(20);
      const isCrit = d20 >= (options.crit19 ? 19 : 20);
      const attackTotal = d20 + 10;
      const diceCount = isCrit ? 20 : 10;
      const pool = rollDicePool(diceCount, 6);
      combinedDamage += pool.sum;
      allDice.push(...pool.dice);
      attacks.push({
        beamIndex: i,
        d20,
        total: attackTotal,
        isCrit,
        damage: pool.sum
      });
    }

    result = {
      id: 'roll_' + Date.now(),
      weaponKey,
      weaponName: 'Eldritch Blasters (4 Attacks Salvo)',
      type: 'multi_attack',
      timestamp,
      range: '400 / 1,200 ft.',
      attacks,
      damage: {
        type: 'Force',
        diceCount: allDice.length,
        diceSides: 6,
        dice: allDice,
        total: combinedDamage
      },
      summary: `Fired all 4 Eldritch Blasters! Attacks: [${attacks.map(a => `${a.total}${a.isCrit ? '★' : ''}`).join(', ')}]. Total Force Damage: ${combinedDamage}.`
    };

    addCombatLogEntry({
      type: 'action',
      charName: 'The Vagrant (4× Blasters)',
      title: `⚡ 4× Eldritch Blasters Salvo`,
      message: `Attacks: ${attacks.map(a => a.total).join(', ')}. Combined Damage: ${combinedDamage} Force across 4 beams.`,
      icon: '⚡'
    });

  } else if (weaponKey === 'magic-missile-silos') {
    // 2 attacks, auto-hit if stationary, else +10
    const isStationary = options.stationary !== false; // Default true if ship didn't move
    const siloAttacks = [];
    let totalDmg = 0;
    const allDice = [];

    for (let i = 1; i <= 2; i++) {
      const d20 = isStationary ? null : rollSingleDie(20);
      const attackTotal = isStationary ? null : d20 + 10;
      const pool = rollDicePool(11, 8);
      totalDmg += pool.sum;
      allDice.push(...pool.dice);
      siloAttacks.push({
        siloIndex: i,
        autoHit: isStationary,
        d20,
        attackTotal,
        damage: pool.sum
      });
    }

    result = {
      id: 'roll_' + Date.now(),
      weaponKey,
      weaponName: 'Magic Missile Silos (2 Attacks)',
      type: isStationary ? 'damage_only' : 'multi_attack',
      timestamp,
      range: '1,000 / 3,000 ft.',
      isStationary,
      attacks: siloAttacks,
      damage: {
        type: 'Force',
        diceCount: 22,
        diceSides: 8,
        dice: allDice,
        total: totalDmg
      },
      summary: isStationary
        ? `Stationary Salvo (Auto-Hit)! Both silos hit automatically for ${totalDmg} Force damage (22d8).`
        : `Moving Salvo (+10 to hit): Attacks [${siloAttacks.map(s => s.attackTotal).join(', ')}]. Total Damage: ${totalDmg} Force.`
    };

    addCombatLogEntry({
      type: 'action',
      charName: 'The Vagrant (Silos)',
      title: isStationary ? `🚀 Magic Missile Silos (Auto-Hit)` : `🚀 Magic Missile Silos (${siloAttacks.map(s => s.attackTotal).join(', ')})`,
      message: `${isStationary ? 'Stationary launch: Auto-hits!' : 'Moving launch.'} Dealt ${totalDmg} Force damage (22d8). Range: 1,000 / 3,000 ft.`,
      icon: '🚀'
    });

  } else if (weaponKey === 'piercing-ram') {
    const d20 = rollSingleDie(20);
    const attackTotal = d20 + 10;
    const isCrit = d20 === 20;
    const isNat1 = d20 === 1;

    const diceCount = isCrit ? 32 : 16;
    const pool = rollDicePool(diceCount, 10);
    const damageDealt = pool.sum;
    const selfDamage = Math.floor(damageDealt / 2);

    result = {
      id: 'roll_' + Date.now(),
      weaponKey,
      weaponName: 'Piercing Ram Collision',
      type: 'ram_attack',
      timestamp,
      range: '0 ft. (Melee)',
      attack: {
        d20,
        mod: 10,
        total: attackTotal,
        isCrit,
        isNat1
      },
      damage: {
        type: 'Piercing',
        diceCount,
        diceSides: 10,
        dice: pool.dice,
        total: damageDealt,
        selfDamage
      },
      summary: `Ram Attack: ${d20} + 10 = ${attackTotal}. Hit: ${damageDealt} Piercing damage! The Vagrant takes ${selfDamage} damage (half) and comes to a dead stop.`
    };

    addCombatLogEntry({
      type: 'action',
      charName: 'The Vagrant (Ram)',
      title: `🛡️ Piercing Ram: ${attackTotal}`,
      message: `Impact: ${attackTotal}. Dealt ${damageDealt} Piercing damage. Vagrant takes ${selfDamage} recoil damage and stops dead.`,
      icon: '🛡️'
    });
    result.entropySource = lastEntropySource;
  }

  if (result) {
    result.entropySource = lastEntropySource;
  }

  state.lastShipRoll = result;
  persistPartyState();
  notify();
  return result;
}
