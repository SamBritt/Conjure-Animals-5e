// creatureMapper.js

// Better approach - use regex patterns instead of simple string matching
const ATTACK_TYPE_PATTERNS = [
  { pattern: /\{@atkr m,r\}/g, component: 'Melee or Ranged Attack Roll', replacement: 'Melee or Ranged Attack Roll:' },
  { pattern: /\{@atkr m\}/g, component: 'Melee Attack Roll', replacement: 'Melee Attack Roll:' },
  { pattern: /\{@atkr r\}/g, component: 'Ranged Attack Roll', replacement: 'Ranged Attack Roll:' },
  { pattern: /\{@atk mw\}/g, component: 'Melee Weapon Attack', replacement: 'Melee Weapon Attack:' },
  { pattern: /\{@atk rw\}/g, component: 'Ranged Weapon Attack', replacement: 'Ranged Weapon Attack:' },
  { pattern: /\{@atk ms\}/g, component: 'Melee Spell Attack', replacement: 'Melee Spell Attack:' },
  { pattern: /\{@atk rs\}/g, component: 'Ranged Spell Attack', replacement: 'Ranged Spell Attack:' },
  { pattern: /\{@atkm [^}]*\}/g, component: 'Melee Attack Roll', replacement: 'Melee Attack Roll:' },
  { pattern: /\{@atka [^}]*\}/g, component: 'Ranged Attack Roll', replacement: 'Ranged Attack Roll:' },
  { pattern: /\{@atk mw,rw\}/g, component: 'Melee or Ranged Weapon Attack', replacement: 'Melee or Ranged Weapon Attack:' }
];

// Helper function to detect attack type
function detectAttackType(entry) {
  for (const { pattern, component } of ATTACK_TYPE_PATTERNS) {
    if (pattern.test(entry)) {
      // Reset the regex lastIndex since we're reusing the same patterns
      pattern.lastIndex = 0;
      return component;
    }
  }
  return null;
}

function calculateModifier(score) {
  return Math.floor((score - 10) / 2);
}

function parseAbilities(raw) {
  const keys = ["str", "dex", "con", "int", "wis", "cha"];
  const saves = raw.save || {};
  const abilities = {};

  for (const key of keys) {
    const value = raw[key];
    abilities[key] = {
      value: value ?? null,
      mod: value != null ? calculateModifier(value) : null,
      save: saves[key] != null ? parseInt(saves[key]) : null
    };
  }
  return abilities;
}

function parseSkills(raw) {
  return raw.skill || {};
}

function parseSenses(raw) {
  const senses = {};
  (raw.senses || []).forEach(s => {
    // Handle different sense formats
    if (typeof s === 'string') {
      const match = s.match(/(\w+)\s*(\d+)/);
      if (match) {
        senses[match[1].toLowerCase()] = parseInt(match[2]);
      }
    }
  });
  senses.passivePerception = raw.passive;
  return senses;
}

function parseAC(ac) {
  if (!ac) return null;
  if (typeof ac === 'number') return ac;
  if (Array.isArray(ac)) {
    const primary = ac[0];
    if (typeof primary === 'number') return primary;
    if (typeof primary === 'object') {
      return {
        value: primary.ac || null,
        from: primary.from ? primary.from.map(item => 
          item.replace(/\{@item ([^|}]+)(?:\|[^}]*)?\}/g, '$1')
        ) : null
      };
    }
  }
  return null;
}

function parseHP(hp) {
  if (!hp) return null;
  if (typeof hp === 'number') return hp;
  if (typeof hp === 'object') {
    return {
      average: hp.average || null,
      formula: hp.formula || null
    };
  }
  return null;
}

function parseSize(size) {
  if (!size) return null;
  if (Array.isArray(size)) return size[0];
  return size;
}

function parseType(type) {
  if (!type) return null;
  if (typeof type === 'string') return type;
  if (typeof type === 'object') {
    const base = type.type || '';
    const tags = type.tags ? ` (${type.tags.join(', ')})` : '';
    return base + tags;
  }
  return null;
}

function calculateProficiencyBonus(cr) {
  if (!cr) return null;
  
  // Handle complex CR objects (like coven CRs)
  const crValue = typeof cr === 'object' ? cr.cr : cr;
  
  // Convert to string if it's a number
  const crString = String(crValue);

  // Handle fractional CRs
  const crNumeric = crString.includes('/') ? 
    parseFloat(crString.split('/')[0]) / parseFloat(crString.split('/')[1]) : 
    parseFloat(crString);
    
  // Proficiency bonus progression: +2 at CR 0-4, then +1 every 4 levels
  if (crNumeric < 5) return 2;
  return Math.min(9, 2 + Math.floor(crNumeric / 4));
}

function calculateInitiative(dexMod) {
  if (dexMod === null || dexMod === undefined) return null;
  return {
    modifier: dexMod,
    total: 10 + dexMod
  };
}

function parseAlignment(alignment, alignmentPrefix = null) {
  if (!alignment) return [];
  
  const result = alignment.map(a => {
    if (typeof a === 'string') return a;
    if (typeof a === 'object') {
      return Object.keys(a).join(' ');
    }
    return a;
  });
  
  // Add prefix if it exists
  if (alignmentPrefix && result.length > 0) {
    return [alignmentPrefix + result.join(' ')];
  }
  
  return result;
}

function parseResistances(raw, key) {
  const data = raw[key];
  if (!data) return [];
  
  return data.map(item => {
    if (typeof item === 'string') return item;
    if (typeof item === 'object') {
      // Handle conditional resistances like "from nonmagical attacks"
      if (item.resist && item.note) {
        return {
          types: item.resist,
          condition: item.note
        };
      }
      if (item.resist) return item.resist;
      if (item.special) return item.special;
    }
    return item;
  }).flat();
}

function parseMultiAttack(rawActions) {
  const multi = rawActions.find(a => a.name.toLowerCase().includes("multiattack"));
  if (!multi || !multi.entries?.[0]) return null;

  const text = multi.entries[0].trim();
  const allAttacks = rawActions
    .filter(a => !a.name.toLowerCase().includes("multiattack"))
    .map(a => a.name.replace(/\s*\{.*?\}/g, '').trim());

  const mentioned = allAttacks.filter(name => 
    text.toLowerCase().includes(name.toLowerCase())
  );

  // Clean the text properly including spell references
  const cleanText = text
    .replace(/\{@spell ([^|}]+)(?:\|[^}]*)?\}/g, '$1') // Clean spell references
    .replace(/\{@.*?\}/g, '') // Clean any other tags
    .replace(/\s+/g, ' ')
    .trim();

  return {
    text: cleanText,
    attacks: mentioned.map(a => a.toLowerCase())
  };
}

// Utility functions for damage parsing
function parseDiceNotation(diceString) {
  const diceMatch = diceString.match(/(\d+)d(\d+)(?:\s*[+]\s*(\d+))?/);
  if (!diceMatch) return null;
  
  return {
    dieCount: parseInt(diceMatch[1]),
    die: parseInt(diceMatch[2]),
    modifier: diceMatch[3] ? parseInt(diceMatch[3]) : 0
  };
}

function calculateAverageDamage(diceData) {
  return Math.floor(diceData.dieCount * (diceData.die + 1) / 2) + diceData.modifier;
}

function extractDamageFromText(text) {
  if (!text) return [];
  
  const results = [];
  
  // Handle format: {@h}25 ({@damage 5d6 + 8}) damage of a type chosen...
  const variableDamageRegex = /\{@h\}(\d+)\s*\(\{@damage ([^}]+)\}\)\s+damage of a type/gi;
  let match;
  
  while ((match = variableDamageRegex.exec(text))) {
    const diceData = parseDiceNotation(match[2]);
    if (diceData) {
      results.push({
        ...diceData,
        type: 'variable'
      });
    }
  }
  
  // Handle multiple damage instances: "12 ({@damage 2d6 + 5}) Slashing damage plus 17 ({@damage 5d6}) Fire damage"
  if (results.length === 0) {
    const multiDamageRegex = /(\d+)\s*\(\{@damage ([^}]+)\}\)\s+([A-Za-z]+)\s+damage/gi;
    
    while ((match = multiDamageRegex.exec(text))) {
      const diceData = parseDiceNotation(match[2]);
      if (diceData) {
        results.push({
          ...diceData,
          type: match[3].toLowerCase()
        });
      }
    }
  }
  
  // Handle format: {@h}13 ({@damage 2d8 + 4}) Piercing damage
  if (results.length === 0) {
    const hDamageRegex = /\{@h\}(\d+)\s*\(\{@damage ([^}]+)\}\)\s+([A-Za-z]+)\s+damage/gi;
    while ((match = hDamageRegex.exec(text))) {
      const diceData = parseDiceNotation(match[2]);
      if (diceData) {
        results.push({
          ...diceData,
          type: match[3].toLowerCase()
        });
      }
    }
  }
  
  // Handle simple format: {@damage 1d4 + 3} Bludgeoning damage
  if (results.length === 0) {
    const simpleDamageRegex = /\{@(?:damage|h) ([^}]+)\}\s+([A-Za-z]+)\s+damage/gi;
    while ((match = simpleDamageRegex.exec(text))) {
      const diceData = parseDiceNotation(match[1]);
      if (diceData) {
        results.push({
          ...diceData,
          type: match[2].toLowerCase()
        });
      }
    }
  }
  
  // Handle standalone {@damage} tags: 14 ({@damage 4d6}) Lightning damage
  if (results.length === 0) {
    const standaloneDamageRegex = /(\d+)\s*\(\{@damage ([^}]+)\}\)\s+([A-Za-z]+)\s+damage/gi;
    while ((match = standaloneDamageRegex.exec(text))) {
      const diceData = parseDiceNotation(match[2]);
      if (diceData) {
        results.push({
          ...diceData,
          type: match[3].toLowerCase()
        });
      }
    }
  }
  
  // Handle raw format: "10 (2d6 + 3) Bludgeoning damage"
  if (results.length === 0) {
    const rawDamageRegex = /(\d+)\s*\((\d+)d(\d+)(?:\s*[+]\s*(\d+))?\)\s+([A-Za-z]+)\s+damage/gi;
    while ((match = rawDamageRegex.exec(text))) {
      results.push({
        dieCount: parseInt(match[2]),
        die: parseInt(match[3]),
        modifier: match[4] ? parseInt(match[4]) : 0,
        type: match[5].toLowerCase()
      });
    }
  }
  
  return results;
}

function extractHealingFromText(text) {
  if (!text) return [];
  
  const results = [];
  
  // Handle healing format: "30 ({@dice 6d8 + 3}) hit points"
  const healingRegex = /(\d+)\s*\(\{@dice ([^}]+)\}\)\s+hit points/gi;
  let match;
  
  while ((match = healingRegex.exec(text))) {
    const diceData = parseDiceNotation(match[2]);
    if (diceData) {
      results.push({
        ...diceData,
        type: 'healing',
        average: parseInt(match[1])
      });
    }
  }
  
  // Also handle raw healing format: "30 (6d8 + 3) hit points"
  if (results.length === 0) {
    const rawHealingRegex = /(\d+)\s*\((\d+)d(\d+)(?:\s*[+]\s*(\d+))?\)\s+hit points/gi;
    while ((match = rawHealingRegex.exec(text))) {
      results.push({
        dieCount: parseInt(match[2]),
        die: parseInt(match[3]),
        modifier: match[4] ? parseInt(match[4]) : 0,
        type: 'healing',
        average: parseInt(match[1])
      });
    }
  }
  
  return results;
}

function parseDamageEntry(entry) {
  return extractDamageFromText(entry);
}

// Update cleanComplexText to handle {@atk ms} and {@atk rs}:
function cleanComplexText(text) {
    let result = text;
  
  // Replace attack types using lookup
  for (const { pattern, replacement } of ATTACK_TYPE_PATTERNS) {
    result = result.replace(pattern, replacement);
    // Reset regex lastIndex for global patterns
    pattern.lastIndex = 0;
  }

  result = result
    .replace(/\{@hit ([-+]?\d+)\}/g, '+$1')
    .replace(/\{@h\}/g, 'Hit: ')
    .replace(/\{@hom\}/g, 'Hit or Miss: ')
    .replace(/\{@damage ([^}]+)\}/g, '$1')
    .replace(/\{@dc (\d+)\}/g, 'DC $1')
    .replace(/\{@dice ([^}]+)\}/g, '$1') // This should already handle {@dice} tags
    .replace(/\{@hazard ([^|}]+)(?:\|[^}]*)?\}/g, '$1')
    .replace(/\{@action [^|}]+(?:\|[^|}]+)?\|([^}]+)\}/g, '$1')
    .replace(/\{@action ([^|}]+)(?:\|[^}]*)?\}/g, '$1')
    .replace(/\{@condition ([^|}]+)(?:\|[^}]*)?\}/g, '$1')
    .replace(/\{@skill ([^|}]+)(?:\|[^}]*)?\}/g, '$1')
    .replace(/\{@creature ([^|}]+)\|[^|}]*\|([^}]+)\}/g, '$2')
    .replace(/\{@creature ([^|}]+)(?:\|[^}]*)?\}/g, '$1')
    .replace(/\{@spell ([^|}]+)(?:\|[^}]*)?\}/g, '$1')
    .replace(/\{@variantrule ([^|\[]+)(?:\s*\[[^\]]*\])?(?:\|[^}]*)?\}/g, '$1')
    .replace(/\{@status ([^|}]+)(?:\|\|[^}]*)?\}/g, '$1')
    .replace(/\{@actTrigger\}/g, 'Trigger:')
    .replace(/\{@actResponse d\}\{@actSave dex\}/g, 'Response—Dexterity Saving Throw:')
    .replace(/\{@actResponse ([^}]+)\}/g, (match, response) => {
      if (response === 'd') return 'Response—Dexterity Saving Throw:';
      return `Response—${response}:`;
    })
    .replace(/\{@actSave (con|str|dex|int|wis|cha)\}/g, (match, ability) => {
      const abilityNames = {
        con: 'Constitution', str: 'Strength', dex: 'Dexterity',
        int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma'
      };
      return `${abilityNames[ability]} Saving Throw:`;
    })
    .replace(/\{@actSaveFail (\d+)\}/g, (match, num) => {
      const ordinals = { '1': 'First', '2': 'Second', '3': 'Third' };
      return `${ordinals[num] || num} Failure:`;
    })
    .replace(/\{@actSaveFail\}/g, 'Failure:')
    .replace(/\{@actSaveSuccess\}/g, 'Success:')
    .replace(/\{@actSaveSuccessOrFail\}/g, 'Failure or Success:')
    .replace(/\{@[^}]+\}/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^[,\s]+/, '')
    .replace(/\\"/g, '"')  // Add this line to unescape all quotes
    .trim();

    return result;
}

// Helper function to escape regex special characters
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Updated parseGear function to handle object structures properly
function parseGear(raw) {
  if (!raw.gear) return [];
  return raw.gear.map(item => {
    // Handle string items
    if (typeof item === 'string') {
      return item.replace(/\{@item ([^|}]+)(?:\|[^}]*)?\}/g, '$1');
    }
    // Handle object items - common patterns in 5etools
    if (typeof item === 'object' && item !== null) {
      // If it has a direct name property
      if (item.name) {
        return item.name.replace(/\{@item ([^|}]+)(?:\|[^}]*)?\}/g, '$1');
      }
      // If it has an item property
      if (item.item) {
        return item.item.replace(/\{@item ([^|}]+)(?:\|[^}]*)?\}/g, '$1');
      }
      // If it has some other structure, try to extract meaningful info
      if (item.entry) {
        return item.entry.replace(/\{@item ([^|}]+)(?:\|[^}]*)?\}/g, '$1');
      }
      // Debug: log the object structure so we can see what it looks like
      console.log('Unknown gear object structure:', JSON.stringify(item, null, 2));
      return 'Unknown Item';
    }
    // Fallback for other types
    return String(item);
  });
}

// Fix 2: Add otherSources parsing function  
function parseOtherSources(raw) {
  if (!raw.otherSources) return [];
  return raw.otherSources.map(source => ({
    source: source.source,
    page: source.page || null
  }));
}

// Updated parseAttackComponents function to handle multiple damage types
function parseAttackComponents(entry) {
  const components = {};
  
  // Parse attack type using lookup
  components.attackType = detectAttackType(entry);
  
  // Parse to hit bonus (just the number)
  const hitMatch = entry.match(/\{@hit ([-+]?\d+)/);
  if (hitMatch) {
    components.toHit = parseInt(hitMatch[1]);
  }
  
  // Parse range/reach - handle hybrid attacks
  const rangeMatch = entry.match(/range (\d+(?:\/\d+)?) ft/i);
  const reachMatch = entry.match(/reach (\d+) ft/i);
  
  if (entry.includes('{@atkr m,r}') && reachMatch && rangeMatch) {
    // Hybrid attack - show both
    components.range = `reach ${reachMatch[1]} ft. or range ${rangeMatch[1]} ft`;
  } else if (rangeMatch) {
    components.range = rangeMatch[1] + ' ft';
  } else if (reachMatch) {
    components.range = reachMatch[1] + ' ft';
  }
  
  // Parse ALL damage components using the shared utility
  const allDamage = extractDamageFromText(entry);
  
  if (allDamage.length > 0) {
    // Set primary damage (first damage type)
    const primaryDamage = allDamage[0];
    components.damageAverage = calculateAverageDamage(primaryDamage);
    components.damageFormula = `${primaryDamage.dieCount}d${primaryDamage.die}${primaryDamage.modifier ? ` + ${primaryDamage.modifier}` : ''}`;
    components.damageType = primaryDamage.type;
    
    // Handle additional damage types (if any)
    if (allDamage.length > 1) {
      components.additionalDamage = allDamage.slice(1).map(d => ({
        average: calculateAverageDamage(d),
        formula: `${d.dieCount}d${d.die}${d.modifier ? ` + ${d.modifier}` : ''}`,
        type: d.type
      }));
    }
  }
  
  // Handle variable damage types like "damage of a type chosen by the cataclysm"
  if (entry.includes('damage of a type chosen')) {
    components.damageType = 'variable';
    const optionsMatch = entry.match(/damage of a type chosen[^:]*:\s*([^.]+)/i);
    if (optionsMatch) {
      components.damageOptions = optionsMatch[1].trim();
    }
  }
  
  // Parse saving throw information
  const saveMatch = entry.match(/\{@actSave (con|str|dex|int|wis|cha)\}/);
  if (saveMatch) {
    const abilityNames = {
      con: 'Constitution', str: 'Strength', dex: 'Dexterity',
      int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma'
    };
    components.saveAbility = saveMatch[1];
    components.saveType = `${abilityNames[saveMatch[1]]} Saving Throw`;
  }
  
  // Parse DC
  const dcMatch = entry.match(/\{@dc (\d+)\}/);
  if (dcMatch) {
    components.saveDC = parseInt(dcMatch[1]);
  }
  
  // Parse save failure effects
  const failures = {};
  const firstFailMatch = entry.match(/\{@actSaveFail 1\}\s*([^{]*?)(?=\{@actSaveFail|$)/);
  if (firstFailMatch) {
    failures.first = firstFailMatch[1].trim();
  }
  
  const secondFailMatch = entry.match(/\{@actSaveFail 2\}\s*([^{]*?)(?=\{@actSaveFail|$)/);
  if (secondFailMatch) {
    failures.second = secondFailMatch[1].trim();
  }
  
  if (Object.keys(failures).length > 0) {
    components.saveFailures = failures;
  }
  
  return components;
}

// Updated parseAttacks function (simplified recharge section)
function parseAttacks(rawActions) {
  return rawActions
    .filter(a => a.entries?.[0] && (/\{@atk/.test(a.entries[0]) || /\{@hit /.test(a.entries[0])))
    .map(a => {
      const entry = a.entries[0];
      const hitMatch = entry.match(/\{@hit ([-+]?\d+)/);
      const attackModifier = hitMatch ? parseInt(hitMatch[1]) : null;
      
      // Parse range
      const rangeMatch = entry.match(/range (\d+)(?:\/(\d+))? ft/i);
      const reachMatch = entry.match(/reach (\d+) ft/i);
      
      const range = rangeMatch ? {
        normal: parseInt(rangeMatch[1]),
        long: rangeMatch[2] ? parseInt(rangeMatch[2]) : null,
        type: 'ranged'
      } : reachMatch ? {
        normal: parseInt(reachMatch[1]),
        long: null,
        type: 'melee'
      } : null;

      // Parse recharge using shared utility
      const recharge = parseRecharge(a.name);

      // Clean up text more carefully - handle complex 5etools tags
      let cleanText = cleanComplexText(entry);

      return {
        name: a.name.replace(/\s*\{.*?\}/g, '').trim(),
        attackModifier,
        damage: mapDamageData(extractDamageFromText(entry)),
        range,
        recharge,
        components: parseAttackComponents(entry),
        text: cleanText
      };
    });
}

function parseComplexAction(action) {
  // Check if this has a nested list structure (like Cataclysmic Event)
  const hasNestedList = action.entries?.some(entry => 
    typeof entry === 'object' && entry.type === 'list'
  );
  
  if (hasNestedList) {
    return parseStructuredAction(action);
  }
  
  // Fallback to simple text parsing for non-structured actions
  function processEntries(entries) {
    if (!Array.isArray(entries)) return [];
    
    return entries.map(entry => {
      if (typeof entry === 'string') {
        return cleanComplexText(entry);
      } else if (entry.type === 'list') {
        return processListItems(entry.items).join(' ');
      } else if (entry.type === 'item') {
        const name = entry.name ? cleanComplexText(entry.name) : '';
        const text = entry.entries ? processEntries(entry.entries).join(' ') : '';
        return name ? `${name}. ${text}` : text;
      } else {
        return '';
      }
    }).filter(Boolean);
  }
  
  function processListItems(items) {
    if (!Array.isArray(items)) return [];
    
    return items.map(item => {
      if (item.type === 'item') {
        const name = item.name ? cleanComplexText(item.name) : '';
        const text = item.entries ? processEntries(item.entries).join(' ') : '';
        return name ? `${name}. ${text}` : text;
      }
      return typeof item === 'string' ? cleanComplexText(item) : '';
    }).filter(Boolean);
  }
  
  return processEntries(action.entries || []).join(' ');
}

function parseStructuredAction(action) {
  const result = {
    description: '',
    options: []
  };
  
  // Find the description and list
  for (const entry of action.entries || []) {
    if (typeof entry === 'string') {
      result.description = cleanComplexText(entry);
    } else if (entry.type === 'list' && entry.items) {
      // Parse each list item as a structured option
      result.options = entry.items.map(item => parseActionOption(item));
    }
  }
  
  return result;
}

function parseActionOption(item) {
  if (item.type !== 'item') return null;
  
  const option = {
    name: item.name ? cleanComplexText(item.name) : '',
    saveType: null,
    saveDC: null,
    areaType: null,
    areaSize: null,
    damage: [],
    effects: [],
    conditions: [],
    text: ''
  };
  
  // Process each entry in the option
  for (const entry of item.entries || []) {
    if (typeof entry === 'string') {
      // Extract structured data from the text
      option.text = cleanComplexText(entry);
      
      // Parse save type
      const saveMatch = entry.match(/\{@actSave (con|str|dex|int|wis|cha)\}/);
      if (saveMatch) {
        option.saveType = saveMatch[1];
      }
      
      // Parse DC
      const dcMatch = entry.match(/\{@dc (\d+)\}/);
      if (dcMatch) {
        option.saveDC = parseInt(dcMatch[1]);
      }
      
      // Parse area effects
      const areaMatch = entry.match(/(\d+)-foot(?:-radius)?\s+\{@variantrule ([^|\[]+)(?:\s*\[[^\]]*\])?(?:\|[^}]*)?\}/);
      if (areaMatch) {
        option.areaSize = areaMatch[1] + '-foot';
        option.areaType = areaMatch[2].toLowerCase().trim();
      }
      
      // Parse damage instances using shared utility
      const damageData = extractDamageFromText(entry);
      option.damage = damageData.map(d => ({
        average: calculateAverageDamage(d),
        formula: `${d.dieCount}d${d.die}${d.modifier ? ` + ${d.modifier}` : ''}`,
        dieCount: d.dieCount,
        die: d.die,
        modifier: d.modifier,
        type: d.type
      }));
      
      // Parse conditions
      const conditionRegex = /\{@condition ([^|}]+)(?:\|[^}]*)?\}/g;
      let conditionMatch;
      while ((conditionMatch = conditionRegex.exec(entry))) {
        option.conditions.push(conditionMatch[1].toLowerCase());
      }
      
      // Parse effects/hazards
      const hazardMatch = entry.match(/\{@hazard ([^|}]+)(?:\|[^}]*)?\}/);
      if (hazardMatch) {
        option.effects.push(hazardMatch[1]);
      }
    }
  }
  
  return option;
}

function parseSpecialActions(rawActions) {
  return rawActions
    .filter(a => 
      (!a.entries?.[0] || (!/\{@atk/.test(a.entries[0]) && !/\{@hit /.test(a.entries[0]))) && 
      !a.name.toLowerCase().includes("multiattack")
    )
    .map(a => {
      // Parse recharge using shared utility
      const recharge = parseRecharge(a.name);

      // Parse usage limits like (1/Day)
      const usageMatch = a.name.match(/\((\d+)\/([^)]+)\)/);
      const usage = usageMatch ? {
        count: parseInt(usageMatch[1]),
        period: usageMatch[2].toLowerCase()
      } : null;

      const parsedAction = parseComplexAction(a);
      const entry = a.entries?.[0] || '';
      
      // Parse damage from the entry text
      const damage = extractDamageFromText(entry);
      
      // Parse healing from the entry text
      const healing = extractHealingFromText(entry);
      
      // Combine damage and healing into a single array for consistency
      const allDice = [...damage, ...healing];
      
      // Parse components for special actions (save DC, damage, etc.)
      const components = parseSpecialActionComponents(entry);
      
      return {
        name: a.name.replace(/\s*\{.*?\}/g, '').replace(/\s*\([^)]*\)/g, '').trim(),
        recharge,
        usage,
        damage: mapDamageData(allDice),
        components,
        ...(typeof parsedAction === 'string' ? 
          { text: parsedAction } : 
          { 
            description: parsedAction.description,
            options: parsedAction.options,
            text: parsedAction.description
          }
        )
      };
    });
}

function parseSpecialActionComponents(entry) {
  if (!entry) return {};
  
  const components = {};
  
  // Parse save type and DC
  const saveMatch = entry.match(/\{@actSave (con|str|dex|int|wis|cha)\}/);
  if (saveMatch) {
    const abilityNames = {
      con: 'Constitution', str: 'Strength', dex: 'Dexterity',
      int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma'
    };
    components.saveType = saveMatch[1];
    components.saveAbility = `${abilityNames[saveMatch[1]]} Saving Throw`;
  }
  
  const dcMatch = entry.match(/\{@dc (\d+)\}/);
  if (dcMatch) {
    components.saveDC = parseInt(dcMatch[1]);
  }
  
  // Parse area effects
  const areaMatch = entry.match(/(\d+)-foot(?:-radius)?\s+\{@variantrule ([^|\[]+)(?:\s*\[[^\]]*\])?(?:\|[^}]*)?\}/);
  if (areaMatch) {
    components.areaSize = areaMatch[1] + '-foot';
    components.areaType = areaMatch[2].toLowerCase().trim();
  }
  
  // Parse damage using shared utility
  const damageData = extractDamageFromText(entry);
  if (damageData.length > 0) {
    components.damage = damageData.map(d => ({
    average: calculateAverageDamage(d),
    formula: `${d.dieCount}d${d.die}${d.modifier ? ` + ${d.modifier}` : ''}`,
    type: d.type
    }));
  }
  
  // Parse conditions
  const conditionRegex = /\{@condition ([^|}]+)(?:\|[^}]*)?\}/g;
  const conditions = [];
  let match;
  while ((match = conditionRegex.exec(entry))) {
    conditions.push(match[1].toLowerCase());
  }
  if (conditions.length > 0) {
    components.conditions = conditions;
  }
  
  return components;
}

function parseSpellcasting(raw) {
  if (!raw.spellcasting) return null;

  return raw.spellcasting.map(sc => {
    const parsed = {
      name: sc.name ? sc.name.replace(/\s*\{@recharge[^}]*\}/g, '').trim() : "Spellcasting",
      headerEntries: (sc.headerEntries || []).map(entry => cleanComplexText(entry)),
      ability: sc.ability || null,
      displayAs: sc.displayAs || null,
      spells: {}
    };

    // Parse recharge spells
    if (sc.recharge) {
      parsed.spells.recharge = {};
      Object.keys(sc.recharge).forEach(rechargeNum => {
        parsed.spells.recharge[rechargeNum] = sc.recharge[rechargeNum].map(spell => 
          spell.replace(/\{@spell ([^|}]+)(?:\|[^}]*)?\}/g, '$1')
        );
      });
      
      const rechargeKeys = Object.keys(sc.recharge);
      if (rechargeKeys.length === 1 && rechargeKeys[0] !== '1') {
        const rechargeNum = rechargeKeys[0];
        parsed.name += ` (Recharge ${rechargeNum}–6)`;
      }
    }

    // Parse other spell categories
    if (sc.will) {
        parsed.spells.will = sc.will.map(spell => {
            const cleaned = spell.replace(/\{@spell ([^|}]+)(?:\|[^}]*)?\}/g, '$1')
                .replace(/\{@variantrule ([^|}]+)(?:\|[^}]*)?\}/g, '$1')
                .replace(/\\"/g, '"');

            return cleaned;
        });
    }
    
    if (sc.daily) {
      parsed.spells.daily = {};
      Object.keys(sc.daily).forEach(freq => {
        parsed.spells.daily[freq] = sc.daily[freq].map(spell => 
          spell.replace(/\{@spell ([^|}]+)(?:\|[^}]*)?\}/g, '$1')
               .replace(/\{@variantrule ([^|}]+)(?:\|[^}]*)?\}/g, '$1')
               .replace(/\(\{@dice ([^}]+)\}\)/g, '($1)')
                .replace(/\{@dice ([^}]+)\}/g, '$1')
                .replace(/\\"/g, '"')
        );
      });
    }
    
    if (sc.restLong) {
      parsed.spells.restLong = {};
      Object.keys(sc.restLong).forEach(freq => {
        parsed.spells.restLong[freq] = sc.restLong[freq].map(spell => 
          spell.replace(/\{@spell ([^|}]+)(?:\|[^}]*)?\}/g, '$1')
          .replace(/\\"/g, '"')
        );
      });
    }
    
    if (sc.spells) {
      // Handle leveled spells - clean the spell names
      Object.keys(sc.spells).forEach(level => {
        if (!parsed.spells.leveled) parsed.spells.leveled = {};
        parsed.spells.leveled[level] = {
          ...sc.spells[level],
          spells: sc.spells[level].spells.map(spell => 
            spell.replace(/\{@spell ([^|}]+)(?:\|[^}]*)?\}/g, '$1')
                .replace(/\\"/g, '"')
            )
        };
      });
    }

    // Add footer entries if they exist
    if (sc.footerEntries) {
      parsed.footerEntries = sc.footerEntries.map(entry => cleanComplexText(entry));
    }

    return parsed;
  });
}

// Helper function to format spells for trait display
function formatSpellsForTrait(spells) {
  const parts = [];
  
  if (spells.will) {
    parts.push(`At will: ${spells.will.join(', ')}`);
  }
  
   if (spells.daily) {
    Object.keys(spells.daily).forEach(freq => {
      // Handle "e" suffix (like "3e" meaning "3/day each")
      let count;
      if (freq.endsWith('e')) {
        const num = freq.slice(0, -1);
        count = `${num}/day each`;
      } else {
        count = freq === '1' ? 'once per day' : `${freq} times per day`;
      }
      
      // Clean any {@dice} tags from spells in the daily list
     const cleanSpells = spells.daily[freq].map(spell => 
        spell.replace(/\(\{@dice ([^}]+)\}\)/g, '($1)')  // Handle ({@dice ...})
            .replace(/\{@dice ([^}]+)\}/g, '$1')        // Handle {@dice ...}
            .replace(/\\"/g, '"')                       // Handle escaped quotes
        );
            
      parts.push(`${count}: ${cleanSpells.join(', ')}`);
    });
  }
  
  if (spells.leveled) {
  Object.keys(spells.leveled).sort((a, b) => parseInt(a) - parseInt(b)).forEach(level => {
    const levelData = spells.leveled[level];
    if (level === '0') {
      // Handle cantrips
      const cleanSpells = levelData.spells.map(spell => spell.replace(/\\"/g, '"'));
        parts.push(`Cantrips (at will): ${cleanSpells.join(', ')}`);
    } else {
      // Handle regular spell levels
      const ordinal = level === '1' ? '1st' : level === '2' ? '2nd' : level === '3' ? '3rd' : `${level}th`;
      const cleanSpells = levelData.spells.map(spell => spell.replace(/\\"/g, '"'));
        parts.push(`${ordinal} level (${levelData.slots} slots): ${cleanSpells.join(', ')}`);
    }
  });
}
  
  return parts;
}

function parseLegendaryActions(raw) {
  if (!raw.legendary) return null;

  return {
    count: raw.legendaryActions || 3,
    countLair: raw.legendaryActionsLair || null,
    actions: raw.legendary.map(la => ({
      name: la.name.replace(/\s*\{.*?\}/g, '').trim(),
      cost: la.name.match(/\(costs (\d+) actions?\)/i) ? 
        parseInt(la.name.match(/\(costs (\d+) actions?\)/i)[1]) : 1,
      text: la.entries?.[0] ? 
        cleanComplexText(la.entries[0]) : ''
    }))
  };
}


// Extract recharge parsing to shared utility function
function parseRecharge(name) {
  let recharge = null;
  
  // Handle {@recharge N} tags
  const rechargeTagMatch = name.match(/\{@recharge (\d+)\}/);
  if (rechargeTagMatch) {
    const min = parseInt(rechargeTagMatch[1]);
    recharge = { min, max: 6 }; // {@recharge 5} means "Recharge 5-6"
  } 
  // Handle {@recharge} without number (defaults to 6)
  else if (name.includes('{@recharge}')) {
    recharge = { min: 6, max: 6 }; // Default to 6 for {@recharge}
  } 
  // Handle (Recharge X-Y) format
  else {
    const rechargeMatch = name.match(/\(recharge (\d+)[-–](\d+)\)/i);
    if (rechargeMatch) {
      recharge = {
        min: parseInt(rechargeMatch[1]),
        max: parseInt(rechargeMatch[2])
      };
    } else {
      // Handle single number recharge like (Recharge 6)
      const singleRechargeMatch = name.match(/\(recharge (\d+)\)/i);
      if (singleRechargeMatch) {
        const num = parseInt(singleRechargeMatch[1]);
        recharge = { min: num, max: num };
      }
    }
  }
  
  return recharge;
}

function parseReactionComponents(entry) {
  const components = {};
  
  // Parse trigger text (everything before {@actResponse})
  const triggerMatch = entry.match(/\{@actTrigger\}\s*([^{]*?)(?=\{@actResponse|$)/);
  if (triggerMatch) {
    components.trigger = triggerMatch[1].trim();
  }
  
  // Parse response type and saving throw
  if (entry.includes('{@actResponse d}{@actSave dex}')) {
    components.responseType = 'Dexterity Saving Throw';
  } else {
    const responseMatch = entry.match(/\{@actResponse ([^}]+)\}/);
    if (responseMatch) {
      components.responseType = responseMatch[1];
    }
    
    const saveMatch = entry.match(/\{@actSave (con|str|dex|int|wis|cha)\}/);
    if (saveMatch) {
      const abilityNames = {
        con: 'Constitution', str: 'Strength', dex: 'Dexterity',
        int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma'
      };
      components.responseType = `${abilityNames[saveMatch[1]]} Saving Throw`;
    }
  }
  
  // Parse DC
  const dcMatch = entry.match(/\{@dc (\d+)\}/);
  if (dcMatch) {
    components.dc = parseInt(dcMatch[1]);
  }
  
  // Parse target (text between DC and failure)
  const targetMatch = entry.match(/\{@dc \d+\}[,\s]*([^{]*?)(?=\{@actSaveFail|$)/);
  if (targetMatch) {
    components.target = targetMatch[1].trim().replace(/[,.]$/, '');
  }
  
  // Parse failure effect
  const failureMatch = entry.match(/\{@actSaveFail[^}]*\}\s*(.+)/);
  if (failureMatch) {
    const failureText = failureMatch[1];
    
    // Try to parse damage from failure text
    const damageMatch = failureText.match(/(\d+)\s*\(\{@damage ([^}]+)\}\)\s+([A-Za-z]+)\s+damage/);
    if (damageMatch) {
      components.failureDamageAverage = parseInt(damageMatch[1]);
      components.failureDamageFormula = damageMatch[2].trim();
      components.failureDamageType = damageMatch[3].toLowerCase() + ' damage';
    } else {
      // If no specific damage pattern, just clean the text
      components.failureEffect = failureText
        .replace(/\{@damage ([^}]+)\}/g, '$1')
        .replace(/\{@[^}]+\}/g, '')
        .trim();
    }
  }
  
  return components;
}

function parseReactions(raw) {
  if (!raw.reaction) return [];
  
  return raw.reaction.map(r => {
    const entry = r.entries?.[0] || '';
    return {
        name: r.name.replace(/\s*\{.*?\}/g, '').trim(),
        damage: mapDamageData(extractDamageFromText(entry)), // ADD THIS LINE
        components: parseReactionComponents(entry),
        text: entry ? cleanComplexText(entry) : ''
        };
    });
}

function mapDamageData(damageArray) {
  return damageArray.map(d => ({
    dieCount: d.dieCount,
    die: d.die,
    modifier: d.modifier,
    type: d.type,
    average: calculateAverageDamage(d),
    formula: `${d.dieCount}d${d.die}${d.modifier ? ` + ${d.modifier}` : ''}`
  }));
}

function mapCreature(raw, id = null) {
  const dexMod = raw.dex != null ? calculateModifier(raw.dex) : null;

  // Parse spellcasting first to check for bonus action spells
  const spellcasting = parseSpellcasting(raw);
  const bonusActionSpells = spellcasting ? 
    spellcasting.filter(sc => sc.displayAs === 'bonus') : [];
  const reactionSpells = spellcasting ? 
    spellcasting.filter(sc => sc.displayAs === 'reaction') : [];
  const actionSpells = spellcasting ? 
    spellcasting.filter(sc => sc.displayAs === 'action') : [];
  
  // Convert only non-action spellcasting to traits for display
  const spellcastingTraits = spellcasting ? 
    spellcasting.filter(sc => !sc.displayAs || sc.displayAs === null).map(sc => ({
      name: sc.name,
      text: [
        ...sc.headerEntries,
        ...formatSpellsForTrait(sc.spells),
        ...(sc.footerEntries || [])
      ].join(' ').replace(/\\"/g, '"')
    })) : [];

  return {
    // Basic Info
    id,
    name: raw.name,
    alias: raw.alias || null,
    isNamedCreature: raw.isNamedCreature || false,
    group: raw.group || null,
    size: parseSize(raw.size),
    type: parseType(raw.type),
    alignment: parseAlignment(raw.alignment, raw.alignmentPrefix),
    source: raw.source,
    page: raw.page,
    otherSources: parseOtherSources(raw), // Add this
    srd52: raw.srd52 || false,
    basicRules2024: raw.basicRules2024 || false,
    dragonAge: raw.dragonAge || null,
    soundClip: raw.soundClip || null,

    // Combat Stats
    ac: parseAC(raw.ac),
    hp: parseHP(raw.hp),
    speed: raw.speed || {},
    cr: raw.cr,
    pb: calculateProficiencyBonus(raw.cr),
    initiative: calculateInitiative(dexMod),

    // Abilities & Skills
    abilities: parseAbilities(raw),
    skills: parseSkills(raw),
    senses: parseSenses(raw),
    languages: raw.languages || [],

    // Equipment
    gear: parseGear(raw), // Add this

    // Resistances/Immunities
    vulnerabilities: parseResistances(raw, 'vulnerable'),
    resistances: parseResistances(raw, 'resist'),
    immunities: parseResistances(raw, 'immune'),
    conditionImmunities: raw.conditionImmune || [],

    // Features & Actions
    traits: (raw.trait || []).map(t => {
      // Check if this trait has complex nested structure like Lordly Presence
      const hasNestedList = t.entries?.some(entry => 
        typeof entry === 'object' && entry.type === 'list'
      );
      
      if (hasNestedList) {
        const structuredTrait = parseStructuredAction(t);
        return {
          name: t.name.replace(/\s*\{.*?\}/g, '').trim(),
          description: structuredTrait.description,
          options: structuredTrait.options,
          text: structuredTrait.description
        };
      } else {
        return {
          name: t.name.replace(/\s*\{.*?\}/g, '').trim(),
          text: t.entries?.[0] ? 
            cleanComplexText(t.entries[0]) : ''
        };
      }
    }).concat(spellcastingTraits), // Only add non-action spellcasting to traits
    
    actions: {
      multiAttack: parseMultiAttack(raw.action || []),
      attacks: parseAttacks(raw.action || []),
      special: parseSpecialActions(raw.action || []).concat(
        // Add action spellcasting to special actions
        actionSpells.map(sc => ({
          name: sc.name,
          text: [
            ...sc.headerEntries,
            ...formatSpellsForTrait(sc.spells),
            ...(sc.footerEntries || [])
          ].join(' '),
          spellcasting: true
        }))
      )
    },
    
    bonusActions: (raw.bonus || []).map(ba => {
      const entry = ba.entries?.[0] || '';
      return {
        name: ba.name.replace(/\s*\{.*?\}/g, '').trim(),
        damage: mapDamageData(extractDamageFromText(entry)),
        components: parseSpecialActionComponents(entry),
        text: ba.entries?.[0] ? 
          cleanComplexText(ba.entries[0]) : ''
      };
    }).concat(
      // Add spellcasting entries marked as bonus actions
      bonusActionSpells.map(sc => ({
        name: sc.name,
        text: [
          ...sc.headerEntries,
          ...formatSpellsForTrait(sc.spells),
          ...(sc.footerEntries || [])
        ].join(' '),
        spellcasting: true,
        recharge: sc.spells.recharge ? Object.keys(sc.spells.recharge)[0] : null
      }))
    ),
    
    reactions: parseReactions(raw).concat(
      // Add reaction spellcasting
      reactionSpells.map(sc => ({
        name: sc.name,
        text: [
          ...sc.headerEntries,
          ...formatSpellsForTrait(sc.spells),
          ...(sc.footerEntries || [])
        ].join(' '),
        spellcasting: true
      }))
    ),
    
    legendary: parseLegendaryActions(raw),
    spellcasting: spellcasting ? 
        spellcasting.filter(sc => sc.displayAs !== 'bonus' && sc.displayAs !== 'reaction') : null,

    // Additional Data
    environment: raw.environment || [],
    treasure: raw.treasure || [],
    attachedItems: raw.attachedItems || [],
    legendaryGroup: raw.legendaryGroup || null,
    tokenUrl: raw.tokenUrl || null,
    hasToken: raw.hasToken || false,
    hasFluff: raw.hasFluff || false,
    hasFluffImages: raw.hasFluffImages || false
  };
}

export default mapCreature;