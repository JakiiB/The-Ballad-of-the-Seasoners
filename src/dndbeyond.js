/**
 * D&D Beyond Data Ingestion & Parser Engine
 * Pure Read-Only Observer of Truth from D&D Beyond.
 */

export function extractCharacterId(input) {
  if (!input) return null;
  const str = String(input).trim();
  if (/^\d+$/.test(str)) return str;
  const match = str.match(/characters?\/(?:v5\/character\/)?(\d+)/);
  if (match) return match[1];
  const digits = str.match(/(\d{6,12})/);
  return digits ? digits[1] : null;
}

export function cleanHtml(html, ctx = {}) {
  if (!html) return '';

  const prof = ctx.profBonus || 6;
  const charLevel = ctx.characterLevel || ctx.totalLevel || 19;
  const classLevel = ctx.classLevel || charLevel;
  const mods = ctx.modifiers || { str: 0, dex: 4, con: 3, int: 1, wis: 5, cha: 5 };

  let text = String(html)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]*>?/gm, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, ' - ')
    .replace(/&ndash;/g, ' - ')
    .replace(/&amp;/g, '&')
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');

  // Strip BBCode tags: [spell]Bless[/spell] -> Bless, [action]Attack[/action] -> Attack, etc.
  text = text.replace(/\[(?:spell|action|items|rules|condition|wprop|skill)\](.*?)\[\/(?:spell|action|items|rules|condition|wprop|skill)\]/gi, '$1');

  // Resolve {{...}} snippet expressions
  text = text.replace(/\{\{([^}]+)\}\}/g, (match, rawExpr) => {
    let expr = rawExpr.trim();

    // 1. scalevalue
    if (expr.toLowerCase() === 'scalevalue') {
      return ctx.scaleValue || 'scale';
    }

    // 2. limiteduse
    if (expr.toLowerCase() === 'limiteduse') {
      return ctx.limitedUse !== undefined ? String(ctx.limitedUse) : 'uses';
    }

    // 3. savedc:stat,stat
    const saveDcMatch = expr.match(/^savedc:([a-z,]+)$/i);
    if (saveDcMatch) {
      const stats = saveDcMatch[1].toLowerCase().split(',');
      const statMods = stats.map(s => mods[s] ?? 0);
      const bestMod = Math.max(...statMods);
      return String(8 + prof + bestMod);
    }

    // 4. spellattack:stat
    const spellAtkMatch = expr.match(/^spellattack:([a-z]+)$/i);
    if (spellAtkMatch) {
      const st = spellAtkMatch[1].toLowerCase();
      const bonus = prof + (mods[st] ?? 0);
      return bonus >= 0 ? `+${bonus}` : String(bonus);
    }

    // Extract format flags: #signed, #unsigned
    let isSigned = false;
    let isUnsigned = false;
    if (expr.includes('#signed')) {
      isSigned = true;
      expr = expr.replace('#signed', '');
    }
    if (expr.includes('#unsigned')) {
      isUnsigned = true;
      expr = expr.replace('#unsigned', '');
    }

    // Extract modifiers: @min:N, @max:N, @roundup, @rounddown
    let minVal = null;
    let maxVal = null;
    let roundMode = null;

    const minMatch = expr.match(/@min:(-?\d+)/i);
    if (minMatch) {
      minVal = parseInt(minMatch[1], 10);
      expr = expr.replace(minMatch[0], '');
    }
    const maxMatch = expr.match(/@max:(-?\d+)/i);
    if (maxMatch) {
      maxVal = parseInt(maxMatch[1], 10);
      expr = expr.replace(maxMatch[0], '');
    }
    if (/@roundup/i.test(expr)) {
      roundMode = 'up';
      expr = expr.replace(/@roundup/i, '');
    }
    if (/@rounddown/i.test(expr)) {
      roundMode = 'down';
      expr = expr.replace(/@rounddown/i, '');
    }

    // Replace variables in math expression
    expr = expr.replace(/modifier:([a-z]+)/gi, (_, st) => {
      return mods[st.toLowerCase()] ?? 0;
    });
    expr = expr.replace(/proficiency/gi, String(prof));
    expr = expr.replace(/characterlevel/gi, String(charLevel));
    expr = expr.replace(/classlevel/gi, String(classLevel));

    // Clean up math expression (only allow digits, +, -, *, /, (, ), space)
    const cleanMath = expr.replace(/[^0-9+\-*/().\s]/g, '');

    try {
      let val = Function(`'use strict'; return (${cleanMath});`)();
      if (typeof val === 'number' && !isNaN(val)) {
        if (roundMode === 'up') val = Math.ceil(val);
        else if (roundMode === 'down') val = Math.floor(val);
        else val = Math.round(val);

        if (minVal !== null) val = Math.max(minVal, val);
        if (maxVal !== null) val = Math.min(maxVal, val);

        if (isSigned) return val >= 0 ? `+${val}` : String(val);
        return String(val);
      }
    } catch (e) {
      // ignore
    }

    return expr.trim();
  });

  // Final sweep: if any unbracketed remnants remain, clean or evaluate them
  // e.g. (proficiency/2)@roundup#unsigned or @roundup#unsigned
  text = text.replace(/\((?:proficiency|characterlevel|classlevel|\d+)\s*[/+*-]\s*\d+\)@(roundup|rounddown)#[a-z]+/gi, (m) => {
    let sub = m.replace(/proficiency/gi, String(prof))
               .replace(/characterlevel/gi, String(charLevel))
               .replace(/classlevel/gi, String(classLevel));
    let isRoundUp = /@roundup/i.test(sub);
    let mathStr = sub.replace(/@[a-z]+#[a-z]+/gi, '').replace(/[^0-9+\-*/().\s]/g, '');
    try {
      let val = Function(`'use strict'; return (${mathStr});`)();
      if (typeof val === 'number' && !isNaN(val)) {
        return String(isRoundUp ? Math.ceil(val) : Math.floor(val));
      }
    } catch(e) {}
    return '';
  });

  text = text.replace(/@round(up|down)#[a-z]+/gi, '');
  text = text.replace(/#[a-z]+/gi, '');
  text = text.replace(/@min:-?\d+/gi, '');

  return text.trim();
}

function expandAbilityName(short) {
  const map = { str: 'strength', dex: 'dexterity', con: 'constitution', int: 'intelligence', wis: 'wisdom', cha: 'charisma' };
  return map[short] || short;
}

const FULL_CASTER_SLOTS = {
  1:  [2,0,0,0,0,0,0,0,0],
  2:  [3,0,0,0,0,0,0,0,0],
  3:  [4,2,0,0,0,0,0,0,0],
  4:  [4,3,0,0,0,0,0,0,0],
  5:  [4,3,2,0,0,0,0,0,0],
  6:  [4,3,3,0,0,0,0,0,0],
  7:  [4,3,3,1,0,0,0,0,0],
  8:  [4,3,3,2,0,0,0,0,0],
  9:  [4,3,3,3,1,0,0,0,0],
  10: [4,3,3,3,2,0,0,0,0],
  11: [4,3,3,3,2,1,0,0,0],
  12: [4,3,3,3,2,1,0,0,0],
  13: [4,3,3,3,2,1,1,0,0],
  14: [4,3,3,3,2,1,1,0,0],
  15: [4,3,3,3,2,1,1,1,0],
  16: [4,3,3,3,2,1,1,1,0],
  17: [4,3,3,3,3,2,2,1,1],
  18: [4,3,3,3,3,3,2,1,1],
  19: [4,3,3,3,3,3,2,1,1],
  20: [4,3,3,3,3,3,2,2,1]
};

const CONDITION_MAP = {
  1: 'Blinded',
  2: 'Charmed',
  3: 'Deafened',
  4: 'Frightened',
  5: 'Grappled',
  6: 'Incapacitated',
  7: 'Invisible',
  8: 'Paralyzed',
  9: 'Petrified',
  10: 'Poisoned',
  11: 'Prone',
  12: 'Restrained',
  13: 'Stunned',
  14: 'Unconscious',
  15: 'Exhaustion'
};

export function parseDnDBeyondCharacter(raw) {
  if (raw && raw.__preParsed) return raw;
  const c = raw.data || raw;
  const parsedClasses = (c.classes || []).map(cl => ({
    name: cl.definition?.name || 'Adventurer',
    level: cl.level || 1,
    subclass: cl.subclassDefinition?.name || null,
    isStartingClass: !!cl.isStartingClass,
    hitDiceUsed: cl.hitDiceUsed || 0
  }));

  const totalLevel = parsedClasses.reduce((sum, cl) => sum + cl.level, 0) || 1;
  const profBonus = Math.floor((totalLevel - 1) / 4) + 2;

  // 1. Ability Scores
  const abilityNames = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  const abilityMap = { 1: 'str', 2: 'dex', 3: 'con', 4: 'int', 5: 'wis', 6: 'cha' };
  const baseScores = {};
  (c.stats || []).forEach(s => {
    if (abilityMap[s.id]) baseScores[abilityMap[s.id]] = s.value;
  });

  const bonusScores = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
  const overrideScores = { str: null, dex: null, con: null, int: null, wis: null, cha: null };

  // Build lookup of active inventory definition IDs (must be equipped, and attuned if attunement is required)
  const activeItemDefIds = new Set();
  const activeItemIds = new Set();
  (c.inventory || []).forEach(inv => {
    if (!inv.equipped) return;
    const def = inv.definition || {};
    const reqAttune = Boolean(def.canAttune || def.needsAttunement);
    if (reqAttune && !inv.isAttuned) return;
    if (def.id) activeItemDefIds.add(def.id);
    if (inv.id) activeItemIds.add(inv.id);
  });

  // Build lookup of feature IDs belonging to non-starting multiclass classes
  const nonStartingClassFeatureIds = new Set();
  (c.classes || []).forEach(cl => {
    if (!cl.isStartingClass) {
      (cl.classFeatures || []).forEach(f => {
        if (f.definition?.id) nonStartingClassFeatureIds.add(f.definition.id);
      });
    }
  });

  const allModifiers = [];
  if (c.modifiers) {
    for (const group in c.modifiers) {
      if (Array.isArray(c.modifiers[group])) {
        c.modifiers[group].forEach(m => {
          // 1. Filter out item modifiers from unequipped or unattuned inventory items
          if (group === 'item') {
            if (m.componentId && !activeItemDefIds.has(m.componentId) && !activeItemIds.has(m.componentId)) {
              return;
            }
          }
          // 2. Filter out class modifiers restricted to the starting class when coming from a secondary multiclass
          if (group === 'class' && m.availableToMulticlass === false) {
            if (m.componentId && nonStartingClassFeatureIds.has(m.componentId)) {
              return;
            }
          }
          allModifiers.push({ group, ...m });
        });
      }
    }
  }

  allModifiers.forEach(m => {
    abilityNames.forEach(ab => {
      const full = expandAbilityName(ab);
      if (m.subType === `${ab}-score` || m.subType === `${full}-score`) {
        if (m.type === 'bonus') {
          bonusScores[ab] += (m.value || m.fixedValue || 0);
        } else if (m.type === 'set') {
          const val = m.value || m.fixedValue || 0;
          if (!overrideScores[ab] || val > overrideScores[ab]) overrideScores[ab] = val;
        }
      }
    });
  });

  (c.overrideStats || []).forEach(s => {
    if (s.value !== null && abilityMap[s.id]) overrideScores[abilityMap[s.id]] = s.value;
  });

  (c.bonusStats || []).forEach(s => {
    if (s.value !== null && abilityMap[s.id]) bonusScores[abilityMap[s.id]] += s.value;
  });

  const finalStats = {};
  const modifiers = {};
  abilityNames.forEach(ab => {
    const rawVal = overrideScores[ab] !== null ? overrideScores[ab] : ((baseScores[ab] || 10) + bonusScores[ab]);
    finalStats[ab] = rawVal;
    modifiers[ab] = Math.floor((rawVal - 10) / 2);
  });

  // 2. Hit Points (Includes Tough / per-level feat modifiers)
  const conMod = modifiers.con;
  const baseHp = c.baseHitPoints || (totalLevel * 8);
  const bonusHp = c.bonusHitPoints || 0;
  const hpPerLevelBonus = allModifiers
    .filter(m => m.type === 'bonus' && m.subType === 'hit-points-per-level')
    .reduce((sum, m) => sum + ((m.value || m.fixedValue || 0) * totalLevel), 0);
  const flatHpModBonus = allModifiers
    .filter(m => m.type === 'bonus' && m.subType === 'hit-points')
    .reduce((sum, m) => sum + (m.value || m.fixedValue || 0), 0);
  const maxHp = c.overrideHitPoints || (baseHp + (conMod * totalLevel) + bonusHp + hpPerLevelBonus + flatHpModBonus);
  const removedHp = c.removedHitPoints || 0;
  const currentHp = Math.max(0, maxHp - removedHp);
  const tempHp = c.temporaryHitPoints || 0;

  // 3. Saving Throws (Supports Monk Diamond Soul 'saving-throws' proficiency)
  const savingThrowProfs = {};
  abilityNames.forEach(ab => {
    const fullName = expandAbilityName(ab);
    const isProf = allModifiers.some(m => 
      m.type === 'proficiency' && 
      (m.subType === `${ab}-saving-throws` || m.subType === `${fullName}-saving-throws` || m.subType === 'saving-throws')
    );
    savingThrowProfs[ab] = isProf;
  });

  const hasJackOfAllTrades = allModifiers.some(m => m.type === 'half-proficiency' && (m.subType === 'ability-checks' || m.subType === 'initiative'));
  const jackBonus = hasJackOfAllTrades ? Math.floor(profBonus / 2) : 0;

  const itemSaveBonus = allModifiers
    .filter(m => m.type === 'bonus' && (m.subType === 'saving-throws'))
    .reduce((sum, m) => sum + (m.value || m.fixedValue || 0), 0);

  const savingThrows = {};
  abilityNames.forEach(ab => {
    const fullName = expandAbilityName(ab);
    const specificSaveBonus = allModifiers
      .filter(m => m.type === 'bonus' && (m.subType === `${ab}-saving-throws` || m.subType === `${fullName}-saving-throws`))
      .reduce((sum, m) => sum + (m.value || m.fixedValue || 0), 0);
    let mod = modifiers[ab] + (savingThrowProfs[ab] ? profBonus : 0) + itemSaveBonus + specificSaveBonus;
    savingThrows[ab] = {
      proficient: savingThrowProfs[ab],
      value: mod,
      bonusText: mod >= 0 ? `+${mod}` : `${mod}`
    };
  });

  // 4. Skills & Passives
  const skillsConfig = [
    { name: 'Acrobatics', ability: 'dex', subType: 'acrobatics' },
    { name: 'Animal Handling', ability: 'wis', subType: 'animal-handling' },
    { name: 'Arcana', ability: 'int', subType: 'arcana' },
    { name: 'Athletics', ability: 'str', subType: 'athletics' },
    { name: 'Deception', ability: 'cha', subType: 'deception' },
    { name: 'History', ability: 'int', subType: 'history' },
    { name: 'Insight', ability: 'wis', subType: 'insight' },
    { name: 'Intimidation', ability: 'cha', subType: 'intimidation' },
    { name: 'Investigation', ability: 'int', subType: 'investigation' },
    { name: 'Medicine', ability: 'wis', subType: 'medicine' },
    { name: 'Nature', ability: 'int', subType: 'nature' },
    { name: 'Perception', ability: 'wis', subType: 'perception' },
    { name: 'Performance', ability: 'cha', subType: 'performance' },
    { name: 'Persuasion', ability: 'cha', subType: 'persuasion' },
    { name: 'Religion', ability: 'int', subType: 'religion' },
    { name: 'Sleight of Hand', ability: 'dex', subType: 'sleight-of-hand' },
    { name: 'Stealth', ability: 'dex', subType: 'stealth' },
    { name: 'Survival', ability: 'wis', subType: 'survival' }
  ];

  const parsedSkills = {};
  skillsConfig.forEach(sk => {
    const isExpertise = allModifiers.some(m => m.type === 'expertise' && m.subType === sk.subType);
    const isProf = isExpertise || allModifiers.some(m => m.type === 'proficiency' && m.subType === sk.subType);
    let bonus = modifiers[sk.ability];
    if (isExpertise) {
      bonus += profBonus * 2;
    } else if (isProf) {
      bonus += profBonus;
    } else if (hasJackOfAllTrades) {
      bonus += jackBonus;
    }
    parsedSkills[sk.name] = {
      ability: sk.ability,
      proficient: isProf,
      expertise: isExpertise,
      bonus: bonus,
      bonusText: bonus >= 0 ? `+${bonus}` : `${bonus}`
    };
  });

  const passivePerception = 10 + (parsedSkills['Perception']?.bonus || 0);
  const passiveInvestigation = 10 + (parsedSkills['Investigation']?.bonus || 0);
  const passiveInsight = 10 + (parsedSkills['Insight']?.bonus || 0);

  // 5. Armor Class (Includes D&D Beyond characterValues AC overrides & bonuses)
  const equippedArmor = (c.inventory || []).filter(i => i.equipped && i.definition?.filterType === 'Armor');
  const equippedShield = (c.inventory || []).filter(i => i.equipped && i.definition?.filterType === 'Shield');
  let baseAc = 10;
  let dexContribution = modifiers.dex;

  const isMonk = parsedClasses.some(cl => cl.name.toLowerCase() === 'monk');
  if (equippedArmor.length === 0 && isMonk) {
    baseAc = 10 + modifiers.wis;
  }

  if (equippedArmor.length > 0) {
    const arm = equippedArmor[0].definition;
    baseAc = arm.armorClass || 10;
    if (arm.armorTypeId === 1) {
      dexContribution = modifiers.dex;
    } else if (arm.armorTypeId === 2) {
      dexContribution = Math.min(modifiers.dex, 2);
    } else if (arm.armorTypeId === 3) {
      dexContribution = 0;
    }
  }

  let shieldAc = equippedShield.length > 0 ? 2 : 0;
  const acBonuses = allModifiers
    .filter(m => m.type === 'bonus' && m.subType === 'armor-class')
    .reduce((sum, m) => sum + (m.value || m.fixedValue || 0), 0);

  let charValAcOverride = null;
  let charValAcBonus = 0;
  (c.characterValues || []).forEach(cv => {
    if (cv.typeId === 1 && typeof cv.value === 'number') charValAcOverride = cv.value;
    if ((cv.typeId === 2 || cv.typeId === 3) && typeof cv.value === 'number') charValAcBonus += cv.value;
  });

  const totalAc = charValAcOverride !== null ? charValAcOverride : (baseAc + dexContribution + shieldAc + acBonuses + charValAcBonus);

  // 6. Initiative & Speed (Includes Alert, Mobile, and speed bonus modifiers)
  const initModBonus = allModifiers
    .filter(m => m.type === 'bonus' && m.subType === 'initiative')
    .reduce((sum, m) => sum + (m.value || m.fixedValue || 0), 0);
  const initBonus = modifiers.dex + (hasJackOfAllTrades ? jackBonus : 0) + initModBonus;

  let baseSpeed = c.race?.weightSpeeds?.normal?.walk || 30;
  const speedModBonus = allModifiers
    .filter(m => m.type === 'bonus' && (m.subType === 'speed' || m.subType === 'innate-speed-walking' || m.subType === 'unarmored-movement'))
    .reduce((sum, m) => sum + (m.value || m.fixedValue || 0), 0);
  baseSpeed += speedModBonus;
  if (isMonk && totalLevel >= 18) {
    baseSpeed = Math.max(baseSpeed, 60);
  }

  // 7. Spellcasting & Slots (Supports Full, Half, and 1/3 Casters like Arcane Trickster)
  const fullCasters = ['bard', 'cleric', 'druid', 'sorcerer', 'wizard'];
  const halfCasters = ['paladin', 'ranger', 'artificer'];
  let effectiveCasterLevel = 0;
  let casterClassCount = 0;
  parsedClasses.forEach(cl => {
    const cName = cl.name.toLowerCase();
    const subName = (cl.subclass || '').toLowerCase();
    if (fullCasters.includes(cName)) {
      effectiveCasterLevel += cl.level;
      casterClassCount++;
    } else if (halfCasters.includes(cName)) {
      effectiveCasterLevel += Math.floor(cl.level / 2);
      casterClassCount++;
    } else if (subName.includes('arcane trickster') || subName.includes('eldritch knight')) {
      effectiveCasterLevel += Math.ceil(cl.level / 3);
      casterClassCount++;
    }
  });

  const maxSlots = FULL_CASTER_SLOTS[effectiveCasterLevel] || [0,0,0,0,0,0,0,0,0];

  const spellSlots = {};
  for (let lvl = 1; lvl <= 9; lvl++) {
    const total = maxSlots[lvl - 1] || 0;
    const usedRecord = (c.spellSlots || []).find(s => s.level === lvl);
    const used = usedRecord ? usedRecord.used : 0;
    if (total > 0) {
      spellSlots[lvl] = {
        level: lvl,
        total: total,
        used: Math.min(used, total),
        available: Math.max(0, total - used)
      };
    }
  }

  // Warlock Pact Magic
  const warlockClass = parsedClasses.find(cl => cl.name.toLowerCase() === 'warlock');
  let pactSlots = null;
  if (warlockClass) {
    const wLvl = warlockClass.level;
    const pactSlotCount = wLvl >= 11 ? 3 : (wLvl >= 2 ? 2 : 1);
    const pactSlotLvl = Math.min(5, Math.ceil(wLvl / 2));
    const pactUsedRecord = (c.pactMagic || []).find(p => p.level === pactSlotLvl);
    const pactUsed = pactUsedRecord ? pactUsedRecord.used : 0;
    pactSlots = {
      level: pactSlotLvl,
      total: pactSlotCount,
      used: pactUsed,
      available: Math.max(0, pactSlotCount - pactUsed)
    };
  }

  const primarySpellClass = parsedClasses.find(cl => fullCasters.includes(cl.name.toLowerCase())) || warlockClass || parsedClasses[0];
  let spellAbility = 'cha';
  if (primarySpellClass) {
    const pName = primarySpellClass.name.toLowerCase();
    const pSub = (primarySpellClass.subclass || '').toLowerCase();
    if (pName === 'cleric' || pName === 'druid' || pName === 'ranger' || pName === 'monk') spellAbility = 'wis';
    else if (pName === 'wizard' || pName === 'artificer' || pName === 'rogue' || pName === 'fighter' || pSub.includes('arcane trickster') || pSub.includes('eldritch knight')) spellAbility = 'int';
  }

  const spellSaveDc = 8 + profBonus + modifiers[spellAbility];
  const spellAttackBonus = profBonus + modifiers[spellAbility];

  const defaultCharCtx = {
    profBonus,
    characterLevel: totalLevel,
    totalLevel,
    modifiers,
    stats: finalStats,
    spellSaveDc,
    spellAttackBonus
  };

  // Spells
  const allSpells = [];
  (c.classSpells || []).forEach(cs => {
    (cs.spells || []).forEach(s => {
      allSpells.push(normalizeSpell(s, 'Class', defaultCharCtx));
    });
  });

  if (c.spells) {
    for (const group in c.spells) {
      (c.spells[group] || []).forEach(s => {
        allSpells.push(normalizeSpell(s, group, defaultCharCtx));
      });
    }
  }

  const seenSpellNames = new Set();
  const uniqueSpells = [];
  allSpells.forEach(s => {
    if (!seenSpellNames.has(s.name.toLowerCase())) {
      seenSpellNames.add(s.name.toLowerCase());
      uniqueSpells.push(s);
    }
  });
  uniqueSpells.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));

  // 8. Inventory & Attunement
  const inventory = (c.inventory || []).map(i => {
    const def = i.definition || {};
    return {
      id: i.id,
      name: def.name,
      quantity: i.quantity || 1,
      equipped: !!i.equipped,
      attuned: !!i.isAttuned,
      canAttune: !!def.canAttune,
      rarity: def.rarity || 'Common',
      filterType: def.filterType || 'Gear',
      weight: def.weight || 0,
      magic: !!def.magic,
      isContainer: !!def.isContainer,
      containerEntityId: i.containerEntityId,
      limitedUse: i.limitedUse,
      description: cleanHtml(def.description || def.snippet || '', defaultCharCtx)
    };
  });

  const attunedItems = inventory.filter(i => i.attuned);

  // 9. Universal Authentic Expendables & Charges Engine (100% Dynamic & Evergreen)
  const allExpendables = [];
  const seenExp = new Set();

  function resolveMax(lu) {
    if (lu.maxUses && lu.maxUses > 0) return lu.maxUses;
    if (lu.statModifierUsesId && abilityMap[lu.statModifierUsesId]) {
      const statName = abilityMap[lu.statModifierUsesId];
      return Math.max(1, modifiers[statName] !== undefined ? modifiers[statName] : 1);
    }
    if (lu.useProficiencyBonus) return profBonus;
    return lu.maxUses || 0;
  }

  function resolveReset(lu) {
    if (lu.resetType === 1) return 'Short Rest';
    if (lu.resetType === 2) return 'Long Rest';
    if (typeof lu.resetTypeDescription === 'string') {
      const desc = lu.resetTypeDescription.toLowerCase();
      if (desc.includes('short')) return 'Short Rest';
      if (desc.includes('long')) return 'Long Rest';
      if (desc.includes('dawn')) return 'Dawn';
    }
    return 'Special';
  }

  // A. Actions: Class, Race, Feat, Item
  if (c.actions) {
    for (const cat of ['class', 'race', 'feat', 'item']) {
      for (const a of (c.actions[cat] || [])) {
        // Skip item actions if the originating item requires attunement and is not attuned
        if (cat === 'item' && c.inventory) {
          const matchedItem = c.inventory.find(inv => 
            (a.componentId && inv.id === a.componentId) || 
            (inv.definition && inv.definition.name.toLowerCase() === a.name.toLowerCase())
          );
          if (matchedItem && matchedItem.definition) {
            const reqAttune = Boolean(matchedItem.definition.canAttune || matchedItem.definition.needsAttunement);
            if (reqAttune && !matchedItem.isAttuned) continue;
          }
        }

        if (a.limitedUse && !seenExp.has(a.name.toLowerCase())) {
          seenExp.add(a.name.toLowerCase());
          const max = resolveMax(a.limitedUse);
          const used = a.limitedUse.numberUsed || 0;
          allExpendables.push({
            name: a.name,
            category: cat === 'class' ? 'Class' : (cat === 'race' ? 'Racial' : (cat === 'feat' ? 'Feat' : 'Item')),
            current: Math.max(0, max - used),
            max: max,
            used: used,
            reset: resolveReset(a.limitedUse),
            sourceType: 'ability'
          });
        }
      }
    }
  }

  // B. Equipped Magic Items with charges/limited use (Must be attuned if attunement is required)
  if (c.inventory) {
    for (const item of c.inventory) {
      if (!item.limitedUse || !item.equipped || !item.definition) continue;

      // Filter out items that require attunement but are not currently attuned
      const requiresAttunement = Boolean(item.definition.canAttune || item.definition.needsAttunement);
      if (requiresAttunement && !item.isAttuned) {
        continue;
      }

      if (!seenExp.has(item.definition.name.toLowerCase())) {
        seenExp.add(item.definition.name.toLowerCase());
        const max = item.limitedUse.maxUses || 1;
        const used = item.limitedUse.numberUsed || 0;
        allExpendables.push({
          name: item.definition.name,
          category: 'Magic Item',
          current: Math.max(0, max - used),
          max: max,
          used: used,
          reset: resolveReset(item.limitedUse),
          sourceType: 'item'
        });
      }
    }
  }

  // C. Rogue Sneak Attack passive
  if (parsedClasses.some(cl => cl.name.toLowerCase() === 'rogue')) {
    const rogueCl = parsedClasses.find(cl => cl.name.toLowerCase() === 'rogue');
    const diceCount = Math.ceil(rogueCl.level / 2);
    allExpendables.unshift({
      name: 'Sneak Attack',
      category: 'Class',
      current: `${diceCount}d6`,
      max: `${diceCount}d6`,
      used: 0,
      reset: 'Passive',
      sourceType: 'passive'
    });
  }

  // Sort by tactical cadence: Short Rest -> Long Rest -> Dawn -> Special
  const cadenceOrder = { 'Short Rest': 1, 'Long Rest': 2, 'Dawn': 3, 'Special': 4, 'Passive': 0 };
  allExpendables.sort((a, b) => (cadenceOrder[a.reset] || 99) - (cadenceOrder[b.reset] || 99));

  // Partition into Primary (shown directly on card) vs Secondary (expandable drawer)
  const primaryKeywords = [
    'ki points', 'sorcery points', 'bardic inspiration', 'action surge', 
    'superiority dice', 'lucky', 'sneak attack', 'rage', 'wild shape', 'lay on hands', 'channel divinity'
  ];
  const primaryResources = [];
  const secondaryExpendables = [];

  for (const exp of allExpendables) {
    const isPrimary = primaryKeywords.some(pk => exp.name.toLowerCase().includes(pk));
    if (isPrimary && primaryResources.length < 2) {
      primaryResources.push(exp);
    } else {
      secondaryExpendables.push(exp);
    }
  }

  if (primaryResources.length === 0 && secondaryExpendables.length > 0) {
    primaryResources.push(secondaryExpendables.shift());
  }

  // 10. Active Conditions (Direct from D&D Beyond)
  const activeConditions = (c.conditions || []).map(cond => {
    return CONDITION_MAP[cond.id] || `Condition ${cond.id}`;
  });

  // 11. Hit Dice & Class Durability
  const hitDice = parsedClasses.map(cl => {
    const rawClass = (c.classes || []).find(x => x.definition?.name === cl.name) || {};
    const dice = 'd' + (rawClass.definition?.hitDice || 8);
    const total = cl.level;
    const used = cl.hitDiceUsed || 0;
    const remaining = Math.max(0, total - used);
    return {
      className: cl.name,
      subclass: cl.subclass,
      dice,
      total,
      used,
      remaining,
      text: `${remaining}/${total}${dice}`
    };
  });

  // 12. Senses & Proficiencies
  const specialSenses = allModifiers
    .filter(m => m.type === 'sense')
    .map(m => `${m.friendlySubtypeName} ${m.value || m.fixedValue || 60}ft`);

  if (c.race?.racialTraits) {
    c.race.racialTraits.forEach(t => {
      const name = t.definition?.name || '';
      if (/darkvision/i.test(name) && !specialSenses.some(s => /darkvision/i.test(s))) {
        specialSenses.push('Darkvision 60ft');
      }
      if (/blindsight/i.test(name) && !specialSenses.some(s => /blindsight/i.test(s))) {
        specialSenses.push('Blindsight 10ft');
      }
    });
  }

  const armorProfs = [...new Set(allModifiers.filter(m => m.type === 'proficiency' && m.subType?.includes('armor')).map(m => m.friendlySubtypeName))];
  const weaponProfs = [...new Set(allModifiers.filter(m => m.type === 'proficiency' && (m.subType?.includes('weapon') || m.subType?.includes('firearm'))).map(m => m.friendlySubtypeName))];
  const toolProfs = [...new Set(allModifiers.filter(m => m.type === 'proficiency' && m.subType?.includes('tool')).map(m => m.friendlySubtypeName))];
  const languageProfs = [...new Set(allModifiers.filter(m => m.type === 'language').map(m => m.friendlySubtypeName))];

  // 13. Attacks Calculation (Equipped Weapons, Monk Strikes, Damage Cantrips)
  const attacks = [];
  const equippedWeapons = inventory.filter(i => i.equipped && (i.filterType === 'Weapon' || i.filterType === 'Staff'));

  equippedWeapons.forEach(w => {
    const rawInv = (c.inventory || []).find(rawItem => rawItem.id === w.id) || {};
    const def = rawInv.definition || {};
    const props = (def.properties || []).map(p => p.name);
    const isFinesse = props.some(p => /finesse/i.test(p));
    const isRanged = def.attackType === 2 || props.some(p => /range/i.test(p));

    let abilityMod = modifiers.str;
    if (isRanged && !props.some(p => /thrown/i.test(p))) {
      abilityMod = modifiers.dex;
    } else if (isFinesse || isMonk) {
      abilityMod = Math.max(modifiers.str, modifiers.dex);
    }

    let magicBonus = 0;
    (def.grantedModifiers || []).forEach(m => {
      if (m.type === 'bonus' && m.subType === 'magic') {
        magicBonus += (m.value || m.fixedValue || 0);
      }
    });
    if (magicBonus === 0) {
      const match = (w.name || '').match(/\+(\d)/);
      if (match) magicBonus = parseInt(match[1]);
    }

    const toHit = profBonus + abilityMod + magicBonus;
    const toHitText = toHit >= 0 ? `+${toHit}` : `${toHit}`;

    const baseDice = def.damage?.diceString || '1d4';
    const totalDmgMod = abilityMod + magicBonus;
    const damageText = `${baseDice}${totalDmgMod !== 0 ? (totalDmgMod > 0 ? `+${totalDmgMod}` : totalDmgMod) : ''} ${def.damageType || 'Physical'}`;

    let rangeText = isRanged ? 'Ranged' : '5 ft Reach';
    if (/firearm|pistol/i.test(def.name)) rangeText = '30/90 ft';
    else if (/musket/i.test(def.name)) rangeText = '40/120 ft';
    else if (/dagger/i.test(def.name)) rangeText = '20/60 ft (Thrown)';
    else if (/spear/i.test(def.name)) rangeText = '20/60 ft (Thrown)';

    const masteryTags = props.filter(p => ['Vex', 'Graze', 'Nick', 'Topple', 'Sap', 'Slow', 'Push', 'Cleave'].includes(p));

    attacks.push({
      id: w.id,
      name: w.name,
      toHitText,
      rangeText,
      damageText,
      damageType: def.damageType || 'Physical',
      mastery: masteryTags.join(', '),
      properties: props.filter(p => !masteryTags.includes(p)).join(', '),
      isSpell: false
    });
  });

  if (isMonk) {
    const monkLevel = parsedClasses.find(cl => cl.name.toLowerCase() === 'monk')?.level || 1;
    let die = '1d4';
    if (monkLevel >= 17) die = '1d10';
    else if (monkLevel >= 11) die = '1d8';
    else if (monkLevel >= 5) die = '1d6';
    const toHit = profBonus + Math.max(modifiers.dex, modifiers.str);
    attacks.unshift({
      id: 'unarmed-strike',
      name: 'Unarmed Strike',
      toHitText: toHit >= 0 ? `+${toHit}` : `${toHit}`,
      rangeText: '5 ft Reach',
      damageText: `${die}+${modifiers.dex} Bludgeoning`,
      damageType: 'Bludgeoning',
      mastery: 'Martial Arts',
      properties: 'Finesse',
      isSpell: false
    });
  }

  (uniqueSpells || []).forEach(s => {
    if (s.level === 0 && (/blast|strike|bolt|ray|shocking|flame|toll|sliver/i.test(s.name))) {
      attacks.push({
        id: `spell-${s.name.toLowerCase().replace(/\s+/g, '-')}`,
        name: s.name,
        toHitText: spellAttackBonus >= 0 ? `+${spellAttackBonus}` : `${spellAttackBonus}`,
        rangeText: s.range,
        damageText: s.description.match(/\d+d\d+/)?.[0] ? `${s.description.match(/\d+d\d+/)[0]} Force/Magic` : 'Spell Damage',
        damageType: 'Magical',
        mastery: 'Cantrip',
        properties: s.castingTime,
        isSpell: true
      });
    }
  });

  // 14. Action Economy Lists (Actions, Bonus Actions, Reactions, Other)
  const actionsList = {
    attacks,
    actions: [],
    bonusActions: [],
    reactions: [],
    other: []
  };

  const allActs = [];
  ['class', 'race', 'feat', 'item'].forEach(k => {
    (c.actions?.[k] || []).forEach(a => {
      // Skip item actions if the originating item requires attunement and is not attuned
      if (k === 'item' && c.inventory) {
        const matchedItem = c.inventory.find(inv => 
          (a.componentId && inv.id === a.componentId) || 
          (inv.definition && inv.definition.name.toLowerCase() === a.name.toLowerCase())
        );
        if (matchedItem && matchedItem.definition) {
          const reqAttune = Boolean(matchedItem.definition.canAttune || matchedItem.definition.needsAttunement);
          if (reqAttune && !matchedItem.isAttuned) return;
        }
      }
      allActs.push(Object.assign({ sourceCategory: k }, a));
    });
  });

  allActs.forEach(a => {
    const actType = a.activation?.activationType;

    let limitedUse = null;
    let max = null;
    if (a.limitedUse) {
      max = resolveMax(a.limitedUse);
      const used = a.limitedUse.numberUsed || 0;
      if (max > 0) {
        limitedUse = {
          max: max,
          current: Math.max(0, max - used),
          resetType: resolveReset(a.limitedUse)
        };
      }
    }

    const actCtx = {
      ...defaultCharCtx,
      limitedUse: max || undefined,
      scaleValue: a.dice?.diceString || a.levelScale || undefined
    };

    const cleanDesc = cleanHtml(a.description || a.snippet || '', actCtx);
    const cleanSnip = cleanHtml(a.snippet || a.description || '', actCtx);

    const item = {
      id: a.id || a.name,
      name: a.name,
      source: a.sourceCategory,
      snippet: cleanSnip,
      description: cleanDesc,
      limitedUse
    };

    if (actType === 1) actionsList.actions.push(item);
    else if (actType === 3) actionsList.bonusActions.push(item);
    else if (actType === 4) actionsList.reactions.push(item);
    else actionsList.other.push(item);
  });

  // 15. Features & Traits
  const classFeatures = [];
  (c.classes || []).forEach(cl => {
    const clName = cl.definition?.name || 'Adventurer';
    const subName = cl.subclassDefinition?.name || null;
    const subId = cl.subclassDefinition?.id;

    (cl.classFeatures || []).forEach(f => {
      const def = f.definition || {};
      if (def.hideInSheet) return;
      if (def.requiredLevel > cl.level) return;
      if (['Hit Points', 'Proficiencies'].includes(def.name)) return;

      const isSub = subId && def.classId === subId;
      const sourceTag = isSub ? `${subName || clName} ${def.requiredLevel}` : `${clName} ${def.requiredLevel}`;

      const featCtx = {
        ...defaultCharCtx,
        classLevel: cl.level,
        scaleValue: f.levelScale?.description || f.levelScale?.dice?.diceString || f.levelScale?.fixedValue || undefined
      };

      classFeatures.push({
        id: def.id || def.name,
        name: def.name,
        className: clName,
        subclassName: subName,
        isSubclass: isSub,
        level: def.requiredLevel,
        sourceTag,
        snippet: cleanHtml(def.snippet || '', featCtx),
        description: cleanHtml(def.description || def.snippet || '', featCtx)
      });
    });
  });

  const racialTraits = [];
  const ignoredRacial = ['Age', 'Size', 'Languages', 'Creature Type', 'Ability Score Increase', 'Ability Score Increases'];
  (c.race?.racialTraits || []).forEach(t => {
    const def = t.definition || {};
    if (def.hideInSheet) return;
    if (ignoredRacial.includes(def.name)) return;

    racialTraits.push({
      id: def.id || def.name,
      name: def.name,
      raceName: c.race?.fullName || 'Species',
      snippet: cleanHtml(def.snippet || '', defaultCharCtx),
      description: cleanHtml(def.description || def.snippet || '', defaultCharCtx)
    });
  });

  const featsList = (c.feats || []).map(f => ({
    id: f.definition?.id || f.definition?.name || 'Feat',
    name: f.definition?.name || 'Feat',
    snippet: cleanHtml(f.definition?.snippet || '', defaultCharCtx),
    description: cleanHtml(f.definition?.description || f.definition?.snippet || '', defaultCharCtx)
  }));

  const choicesList = [];
  if (c.options) {
    for (const cat of ['class', 'feat', 'race']) {
      (c.options[cat] || []).forEach(opt => {
        const def = opt.definition || {};
        const name = def.name;
        if (!name || ignoredRacial.includes(name)) return;

        let category = 'Option';
        if (/attack|riposte|brace|feint|trip|disarm|goading|menacing|pushing|parry/i.test(name)) category = 'Maneuver';
        else if (/spell|quickened|twinned|subtle|heightened|empowered|transmuted/i.test(name)) category = 'Metamagic';
        else if (/blast|invocation|sight|eyes|whispers|armor of shadows/i.test(name)) category = 'Invocation';
        else if (/fighting style|defense|archery|dueling/i.test(name)) category = 'Fighting Style';

        choicesList.push({
          id: def.id || name,
          name,
          category,
          sourceType: cat,
          snippet: cleanHtml(def.snippet || '', defaultCharCtx),
          description: cleanHtml(def.description || def.snippet || '', defaultCharCtx)
        });
      });
    }
  }

  const backgroundFeature = c.background?.definition?.featureName ? {
    name: c.background.definition.featureName,
    backgroundName: c.background.definition.name || 'Background',
    description: cleanHtml(c.background.definition.featureDescription || '', defaultCharCtx)
  } : null;

  // 16. Description & Lore
  const charDescription = {
    personalityTraits: c.traits?.personalityTraits || '',
    ideals: c.traits?.ideals || '',
    bonds: c.traits?.bonds || '',
    flaws: c.traits?.flaws || '',
    appearance: c.traits?.appearance || '',
    backstory: cleanHtml(c.notes?.backstory || ''),
    allies: cleanHtml(c.notes?.allies || ''),
    age: c.age || '',
    height: c.height || '',
    weight: c.weight ? `${c.weight} lbs` : '',
    eyes: c.eyes || '',
    skin: c.skin || '',
    hair: c.hair || '',
    faith: c.faith || ''
  };

  return {
    id: String(c.id),
    name: c.name,
    avatarUrl: c.decorations?.avatarUrl || null,
    frameAvatarUrl: c.decorations?.frameAvatarUrl || null,
    backdropAvatarUrl: c.decorations?.backdropAvatarUrl || null,
    race: c.race?.fullName || c.race?.baseRaceName || 'Adventurer',
    classes: parsedClasses,
    classSummary: parsedClasses.map(cl => `${cl.name} ${cl.level}` + (cl.subclass ? ` (${cl.subclass})` : '')).join(' / '),
    totalLevel,
    profBonus,
    inspiration: !!c.inspiration,
    hp: {
      current: currentHp,
      max: maxHp,
      temp: tempHp,
      removed: removedHp
    },
    deathSaves: c.deathSaves || { failCount: 0, successCount: 0, isStabilized: false },
    conditions: activeConditions,
    ac: totalAc,
    speed: baseSpeed,
    initiative: initBonus,
    initiativeText: initBonus >= 0 ? `+${initBonus}` : `${initBonus}`,
    stats: finalStats,
    modifiers,
    savingThrows,
    skills: parsedSkills,
    passives: {
      perception: passivePerception,
      investigation: passiveInvestigation,
      insight: passiveInsight
    },
    senses: {
      perception: passivePerception,
      investigation: passiveInvestigation,
      insight: passiveInsight,
      special: specialSenses
    },
    proficiencies: {
      armor: armorProfs,
      weapons: weaponProfs,
      tools: toolProfs,
      languages: languageProfs
    },
    hitDice,
    attacks,
    actionsList,
    featuresAndTraits: {
      classFeatures,
      racialTraits,
      feats: featsList,
      choices: choicesList,
      backgroundFeature
    },
    description: charDescription,
    spellcasting: {
      ability: spellAbility,
      dc: spellSaveDc,
      attackBonus: spellAttackBonus,
      attackText: spellAttackBonus >= 0 ? `+${spellAttackBonus}` : `${spellAttackBonus}`,
      slots: spellSlots,
      pactSlots: pactSlots,
      spells: uniqueSpells
    },
    resources: primaryResources,
    expendables: allExpendables,
    secondaryExpendables: secondaryExpendables,
    attunement: {
      max: 3,
      current: attunedItems.length,
      items: attunedItems
    },
    inventory,
    currencies: c.currencies || { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    feats: featsList,
    invocations: (c.options?.class || []).map(o => ({
      name: o.definition?.name || 'Invocation',
      description: cleanHtml(o.definition?.description || o.definition?.snippet || '', defaultCharCtx)
    })),
    notes: {
      allies: c.notes?.allies || '',
      backstory: c.notes?.backstory || '',
      personalPossessions: c.notes?.personalPossessions || ''
    },
    __preParsed: true
  };
}

function normalizeSpell(s, source, ctx = {}) {
  const def = s.definition || {};
  const act = s.activation || def.activation || {};
  let actText = '';
  if (act.activationTime) {
    const typeName = act.activationType === 1 ? 'Action' : act.activationType === 3 ? 'Bonus Action' : act.activationType === 4 ? 'Reaction' : 'Special';
    actText = `${act.activationTime} ${typeName}`;
  }

  const range = s.range || def.range || {};
  const rangeText = range.rangeValue ? `${range.rangeValue} ft` : (range.origin || 'Self');

  const dur = s.duration || def.duration || {};
  const durText = dur.durationInterval ? `${dur.durationInterval} ${dur.durationUnit}` : 'Instantaneous';

  return {
    name: def.name || 'Unknown Spell',
    level: def.level !== undefined ? def.level : 0,
    school: def.school || 'Universal',
    source,
    prepared: s.prepared !== undefined ? s.prepared : true,
    castingTime: actText || '1 Action',
    range: rangeText,
    duration: durText,
    concentration: !!def.concentration,
    ritual: !!def.ritual,
    description: cleanHtml(def.description || def.snippet || '', ctx)
  };
}

export async function fetchCharacterData(dndId) {
  if (!dndId) throw new Error('No character ID provided');

  // 1. Try local server endpoint (only when running on localhost)
  const isLocalServer = typeof location !== 'undefined' && (
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1'
  );
  if (isLocalServer) {
    try {
      const res = await fetch(`/api/character/${dndId}?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        return parseDnDBeyondCharacter(json);
      }
    } catch (err) {}
  }

  // 2. Try 24/7 Cloud JSON proxy endpoint
  if (typeof window !== 'undefined' && window.__SEASONERS_CLOUD_URL__) {
    try {
      const res = await fetch(`${window.__SEASONERS_CLOUD_URL__}?action=character&id=${encodeURIComponent(dndId)}&t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json && (json.__preParsed || json.data || json.id)) {
          return parseDnDBeyondCharacter(json);
        }
      }
    } catch (err) {}
  }

  // 3. Fallback: Static cached file (cache-busted)
  try {
    const res = await fetch(`data/characters/${dndId}.json?t=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      return parseDnDBeyondCharacter(json);
    }
  } catch (err) {}

  throw new Error(`Could not pull character data for ID ${dndId}`);
}
