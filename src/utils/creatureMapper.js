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
  const saves = raw.save || {}; // Get the save object from raw data
  const abilities = {};

  for (const key of keys) {
    const value = raw[key];
    let saveValue = null;

    // Check if there's a save bonus for this ability
    if (saves[key] != null) {
      // Convert "+7" format to just 7, or handle plain numbers
      const saveStr = String(saves[key]);
      saveValue = saveStr.startsWith('+') ? parseInt(saveStr.slice(1)) : parseInt(saveStr);
    } else {
      // Use base modifier instead of null when no save proficiency
      saveValue = value != null ? calculateModifier(value) : null;
    }

    abilities[key] = {
      value: value ?? null,
      mod: value != null ? calculateModifier(value) : null,
      save: saveValue
    };
  }
  return abilities;
}

function parseSkills(raw) {
  return raw.skill || {};
}

// Fix 3: Update parseSenses function to handle array format properly
function parseSenses(raw) {
  const senses = {};

  // Handle senses array
  if (raw.senses && Array.isArray(raw.senses)) {
    raw.senses.forEach(s => {
      if (typeof s === 'string') {
        // Handle formats like "darkvision 60 ft."
        const match = s.match(/(\w+)\s+(\d+)\s*ft/i);
        if (match) {
          senses[match[1].toLowerCase()] = parseInt(match[2]);
        } else {
          // Handle other sense formats without numbers
          const senseMatch = s.match(/^(\w+)/);
          if (senseMatch) {
            senses[senseMatch[1].toLowerCase()] = true;
          }
        }
      }
    });
  }

  // Add passive perception
  senses.passivePerception = raw.passive;
  return senses;
}

// Fix: Update parseAC to clean {@spell} and {@item} tags in the "from" array
function parseAC(ac) {
  if (!ac) return null;
  if (typeof ac === 'number') return ac;
  if (Array.isArray(ac)) {
    const primary = ac[0];
    if (typeof primary === 'number') return primary;
    if (typeof primary === 'object') {
      return {
        value: primary.ac || null,
        from: primary.from ? primary.from.map(item => {
          // Clean various 5etools tags from AC sources
          return item
            .replace(/\{@item ([^|}]+)(?:\|[^}]*)?\}/g, '$1')      // Clean {@item} tags
            .replace(/\{@spell ([^|}]+)(?:\|[^}]*)?\}/g, '$1')     // Clean {@spell} tags
            .replace(/\{@[^}]+\}/g, '')                            // Clean any other tags
            .trim();
        }) : null
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
    let base = '';

    // Handle nested type structure like {"type": {"choose": ["celestial", "fiend"]}}
    if (type.type && typeof type.type === 'object' && type.type.choose) {
      base = type.type.choose.join(' or ');
    } else if (type.type) {
      base = type.type;
    }

    let tags = '';
    if (type.tags && Array.isArray(type.tags)) {
      const tagStrings = type.tags.map(tag => {
        if (typeof tag === 'string') return tag;
        if (typeof tag === 'object' && tag.tag) {
          // Handle prefix (like "Wood" for "Wood Elf")
          return tag.prefix ? `${tag.prefix} ${tag.tag}` : tag.tag;
        }
        return String(tag);
      });
      tags = ` (${tagStrings.join(', ')})`;
    }

    // Handle swarm types - add swarmSize information
    if (type.swarmSize) {
      const sizeMap = {
        'T': 'Tiny',
        'S': 'Small',
        'M': 'Medium',
        'L': 'Large',
        'H': 'Huge',
        'G': 'Gargantuan'
      };
      const swarmSizeName = sizeMap[type.swarmSize] || type.swarmSize;

      // If we already have tags, add swarm info to them
      if (tags) {
        tags = ` (swarm of ${swarmSizeName}, ${tags.slice(2, -1)})`;
      } else {
        tags = ` (swarm of ${swarmSizeName})`;
      }
    }

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

// Fix: Update parseMultiAttack to clean text properly
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

  // UPDATED: Clean the text using cleanComplexText instead of basic cleaning
  const cleanText = cleanComplexText(text);

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

// Fix 3: Update extractDamageFromText to handle variable damage types
function extractDamageFromText(text) {
  if (!text) return [];
  
  // FIRST: Extract and store ongoing damage effects
  const ongoingEffects = [];
  
  // Single comprehensive pattern for ongoing damage effects
  const ongoingDamagePattern = /(and it |^|, and )?(takes|suffers) (\d+) \(([^)]+)\) (\w+) damage at the (start|beginning) of/gi;
  
  // Extract ongoing damage data
  let cleanedText = text;
  let match; // Declare once at function scope
  while ((match = ongoingDamagePattern.exec(text))) {
    const average = parseInt(match[3]);
    const formula = match[4];
    const damageType = match[5];
    
    const diceData = parseDiceNotation(formula);
    if (diceData) {
      ongoingEffects.push({
        trigger: 'start_of_turn', // We know this much for sure
        damage: {
          ...diceData,
          type: damageType.toLowerCase(),
          average: average,
          formula: formula
        },
        fullText: match[0].trim()
      });
    }
  }
  
  // Remove ongoing damage from the text
  ongoingDamagePattern.lastIndex = 0; // Reset regex
  cleanedText = cleanedText.replace(ongoingDamagePattern, '');
  
  // Continue with normal damage extraction using the cleaned text
  const results = [];
  
  // Store ongoing effects in results for later access
  results.ongoingEffects = ongoingEffects;

  // Handle conditional damage patterns FIRST (before other patterns)
  // Pattern 1: Base damage before "or" - with {@damage} tags
  const baseBeforeOrRegex = /\{@h\}(\d+)\s+\(\{@damage ([^}]+)\}\)\s+([A-Za-z]+)\s+damage[—,]?\s*or/gi;
  while ((match = baseBeforeOrRegex.exec(cleanedText))) {
    const diceData = parseDiceNotation(match[2]);
    if (diceData) {
      results.push({
        ...diceData,
        type: match[3].toLowerCase(),
        conditional: {
          isConditional: true,
          condition: "normal"
        }
      });
    }
  }

  // Pattern 2: Conditional damage after "or" - with {@damage} tags
  const conditionalRegex = /or\s+(\d+)\s+\(\{@damage ([^}]+)\}\)\s+([A-Za-z]+)\s+damage\s+(?:if|when)\s+([^—.,]*?)(?:\s*(?:to\s+make|to\s+attack|if\s+|when\s+|plus\s+|\.|,|$))/gi;
  while ((match = conditionalRegex.exec(cleanedText))) {
    const diceData = parseDiceNotation(match[2]);
    if (diceData) {
      results.push({
        ...diceData,
        type: match[3].toLowerCase(),
        conditional: {
          isConditional: true,
          condition: match[4].trim()
            .replace(/\{@condition ([^|}]+)(?:\|[^}]*)?\}/g, '$1')
            .replace(/\{@variantrule ([^|\[]+)(?:\s*\[[^\]]*\])?(?:\|[^}]*)?\}/g, '$1')
        }
      });
    }
  }

  // If we found conditional damage, also look for "plus" damage but don't return early yet
  const plusDamageRegex = /plus\s+(\d+)\s+\(\{@damage ([^}]+)\}\)\s+([A-Za-z]+)\s+damage/gi;
  while ((match = plusDamageRegex.exec(cleanedText))) {
    const diceData = parseDiceNotation(match[2]);
    if (diceData) {
      results.push({
        ...diceData,
        type: match[3].toLowerCase()
        // No conditional metadata - this is always-rolled damage
      });
    }
  }

  // If we found conditional damage, return early (but after processing plus damage)
  if (results.some(r => r.conditional?.isConditional)) {
    return results;
  }

  // COMPREHENSIVE DAMAGE EXTRACTION for non-conditional attacks
  // This handles all damage instances in the text, including "X damage plus Y damage" patterns
  
  // Helper function to check for duplicates
  const isDuplicate = (newDamage, existingResults) => {
    return existingResults.some(r => 
      r.dieCount === newDamage.dieCount && 
      r.die === newDamage.die && 
      r.modifier === newDamage.modifier && 
      r.type === newDamage.type
    );
  };

  // Try patterns in order of specificity, stopping when we find matches

  // Pattern 1: Handle {@damage} tagged damage
  const taggedDamageRegex = /(\d+)\s*\(\{@damage ([^}]+)\}\)\s+([A-Za-z]+)\s+damage/gi;
  while ((match = taggedDamageRegex.exec(cleanedText))) {
    const diceData = parseDiceNotation(match[2]);
    if (diceData) {
      const newDamage = { ...diceData, type: match[3].toLowerCase() };
      if (!isDuplicate(newDamage, results)) {
        results.push(newDamage);
      }
    }
  }

  // If we found tagged damage, return (most specific)
  if (results.length > 0) {
    return results;
  }

  // Pattern 2: Handle {@h} prefixed damage  
  const hDamageRegex = /\{@h\}(\d+)\s*\(\{@damage ([^}]+)\}\)\s+([A-Za-z]+)\s+damage/gi;
  while ((match = hDamageRegex.exec(cleanedText))) {
    const diceData = parseDiceNotation(match[2]);
    if (diceData) {
      const newDamage = { ...diceData, type: match[3].toLowerCase() };
      if (!isDuplicate(newDamage, results)) {
        results.push(newDamage);
      }
    }
  }

  // If we found {@h} damage, return
  if (results.length > 0) {
    return results;
  }

  // Pattern 3: Handle raw damage patterns (no tags)
  // This catches "7 (1d8 + 3) piercing damage plus 13 (3d8) cold damage"
  const rawDamageRegex = /(\d+)\s*\((\d+d\d+(?:\s*[+]\s*\d+)?)\)\s+([A-Za-z]+)\s+damage/gi;
  while ((match = rawDamageRegex.exec(cleanedText))) {
    const diceData = parseDiceNotation(match[2]);
    if (diceData) {
      const newDamage = { ...diceData, type: match[3].toLowerCase() };
      if (!isDuplicate(newDamage, results)) {
        results.push(newDamage);
      }
    }
  }

  // If we found raw damage, return
  if (results.length > 0) {
    return results;
  }

  // Pattern 4: Handle variable damage types like "Necrotic or Radiant damage (empyrean's choice)"
  const variableTypeRegex = /(\d+)\s*\(\{@damage ([^}]+)\}\)\s+([A-Za-z]+\s+or\s+[A-Za-z]+)\s+damage\s*\([^)]*choice[^)]*\)/gi;
  while ((match = variableTypeRegex.exec(cleanedText))) {
    const diceData = parseDiceNotation(match[2]);
    if (diceData) {
      results.push({
        ...diceData,
        type: match[3].toLowerCase(),
        isVariable: true
      });
    }
  }

  // Pattern 5: Handle damage of chosen type
  const variableDamageRegex = /\{@h\}(\d+)\s*\(\{@damage ([^}]+)\}\)\s+damage of a type/gi;
  while ((match = variableDamageRegex.exec(cleanedText))) {
    const diceData = parseDiceNotation(match[2]);
    if (diceData) {
      results.push({
        ...diceData,
        type: 'variable'
      });
    }
  }

  // Pattern 6: Handle simple tagged damage
  const simpleDamageRegex = /\{@(?:damage|h) ([^}]+)\}\s+([A-Za-z]+)\s+damage/gi;
  while ((match = simpleDamageRegex.exec(cleanedText))) {
    const diceData = parseDiceNotation(match[1]);
    if (diceData) {
      const newDamage = { ...diceData, type: match[2].toLowerCase() };
      if (!isDuplicate(newDamage, results)) {
        results.push(newDamage);
      }
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

// Fix: Update cleanSpellEntry to remove asterisks from spell names
function cleanSpellEntry(spell) {
  // Handle string spells
  if (typeof spell === 'string') {
    return spell.replace(/\{@spell ([^|}]+)(?:\|[^}]*)?\}/g, '$1')
      .replace(/\{@variantrule ([^|}]+)(?:\|[^}]*)?\}/g, '$1')
      .replace(/\{@damage ([^}]+)\}/g, '$1')
      .replace(/\{@dice ([^}]+)\}/g, '$1')
      .replace(/\{@creature ([^|}]+)(?:\|[^}]*)?\}/g, '$1')
      .replace(/\s*\*\s*$/g, '')  // ADD: Remove trailing asterisks
      .replace(/\\"/g, '"');
  }

  // Handle object spells with entry property
  if (typeof spell === 'object' && spell !== null) {
    if (spell.entry) {
      return spell.entry.replace(/\{@spell ([^|}]+)(?:\|[^}]*)?\}/g, '$1')
        .replace(/\{@variantrule ([^|}]+)(?:\|[^}]*)?\}/g, '$1')
        .replace(/\{@damage ([^}]+)\}/g, '$1')
        .replace(/\{@dice ([^}]+)\}/g, '$1')
        .replace(/\{@creature ([^|}]+)(?:\|[^}]*)?\}/g, '$1')
        .replace(/\s*\*\s*$/g, '')  // ADD: Remove trailing asterisks
        .replace(/\\"/g, '"');
    }
    // Handle other potential object structures
    if (spell.name) {
      return spell.name.replace(/\{@spell ([^|}]+)(?:\|[^}]*)?\}/g, '$1')
        .replace(/\{@damage ([^}]+)\}/g, '$1')
        .replace(/\{@dice ([^}]+)\}/g, '$1')
        .replace(/\{@creature ([^|}]+)(?:\|[^}]*)?\}/g, '$1')
        .replace(/\s*\*\s*$/g, '')  // ADD: Remove trailing asterisks
        .replace(/\\"/g, '"');
    }
    console.log('Unknown spell object structure:', JSON.stringify(spell, null, 2));
    return 'Unknown Spell';
  }

  // Fallback for other types
  return String(spell);
}

// Fix: Update cleanComplexText to include whitespace cleanup
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
    .replace(/\{@dice ([^}]+)\}/g, '$1')
    .replace(/\{@hazard ([^|}]+)(?:\|[^}]*)?\}/g, '$1')
    .replace(/\{@action ([^|}]+)(?:\|\|([^}]+))?\}/g, (match, action, displayText) => {
  return displayText || action;
})
    .replace(/\{@action [^|}]+(?:\|[^|}]+)?\|([^}]+)\}/g, '$1')
    .replace(/\{@action ([^|}]+)(?:\|[^}]*)?\}/g, '$1')
    .replace(/\{@condition ([^|}]+)(?:\|[^}]*)?\}/g, '$1')
    // Handle {@skill} followed by {@skillCheck} pattern
    .replace(/\{@skill ([^}]+)\}\s*\{@skillCheck [^}]*\s+(\d+)\}/g, '$1 +$2')
    .replace(/\{@skill ([^|}]+)(?:\|[^}]*)?\}/g, '$1')
    .replace(/\{@skillCheck ([^}]+)\}/g, '$1')
    .replace(/\{@creature ([^|}]+)\|[^|}]*\|([^}]+)\}/g, '$2')
    .replace(/\{@creature ([^|}]+)(?:\|[^}]*)?\}/g, '$1')
    .replace(/\{@spell ([^|}]+)(?:\|[^}]*)?\}/g, '$1')
    .replace(/\{@item ([^|}]+)(?:\|[^}]*)?\}/g, '$1')
    .replace(/\{@sense ([^|}]+)(?:\|[^}]*)?\}/g, '$1')
    .replace(/\{@filter ([^|}]+)(?:\|[^}]*)?\}/g, '$1')
    // Handle {@adventure} tags - extract the display name (last part after final |)
    .replace(/\{@adventure ([^|}]+)\|([^|}]+)\|([^|}]+)\|([^}]+)\}/g, '$4')  // 4-part adventure tag
    .replace(/\{@adventure ([^|}]+)\|([^|}]+)\|([^}]+)\}/g, '$3')           // 3-part adventure tag
    .replace(/\{@adventure ([^|}]+)\|([^}]+)\}/g, '$2')                     // 2-part adventure tag
    .replace(/\{@adventure ([^|}]+)\}/g, '$1')                              // Single-part adventure tag
    // Handle complex {@status} tags with || separator
    .replace(/\{@status ([^|}]+)\|\|([^}]+)\}/g, '$2')
    .replace(/\{@status ([^|}]+)(?:\|[^}]*)?\}/g, '$1')
    // Better handling of variant rules with display text
    .replace(/\{@variantrule ([^|\[]+)(?:\s*\[[^\]]*\])?(?:\|[^|}]*)?(?:\|([^}]+))?\}/g, (match, rule, displayText) => {
      return displayText || rule;
    })
    // Better {@quickref} handling
    .replace(/\{@quickref ([^|}]+)(?:\|[^|}]*)?(?:\|[^|}]*)?(?:\|[^|}]*)?(?:\|([^}]+))?\}/g, (match, text, displayText) => {
      return displayText || text;
    })
    .replace(/\{@actTrigger\}/g, 'Trigger:')
    // Handle specific response + save combinations FIRST
    .replace(/\{@actResponse d\}\{@actSave dex\}/g, 'Response—Dexterity Saving Throw:')
    .replace(/\{@actResponse d\}\{@actSave str\}/g, 'Response—Strength Saving Throw:')
    .replace(/\{@actResponse d\}\{@actSave con\}/g, 'Response—Constitution Saving Throw:')
    .replace(/\{@actResponse d\}\{@actSave int\}/g, 'Response—Intelligence Saving Throw:')
    .replace(/\{@actResponse d\}\{@actSave wis\}/g, 'Response—Wisdom Saving Throw:')
    .replace(/\{@actResponse d\}\{@actSave cha\}/g, 'Response—Charisma Saving Throw:')
    // Handle remaining individual patterns
    .replace(/\{@actResponse ([^}]+)\}/g, (match, response) => {
      if (response === 'd') return 'Response—Saving Throw:';
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
    .replace(/\s+/g, ' ')          // ADD: Normalize whitespace
    .replace(/\s+([.!?])/g, '$1')  // ADD: Remove spaces before punctuation
    .replace(/^[,\s]+/, '')
    .replace(/\\"/g, '"')
    .trim();

  return result;
}

// Fix 2: Update parseGear function to handle attachedItems
function parseGear(raw) {
  const gear = [];

  // Handle gear property (existing functionality)
  if (raw.gear) {
    const gearItems = raw.gear.map(item => {
      if (typeof item === 'string') {
        const cleaned = item
          .replace(/\{@item ([^|}]+)(?:\|[^}]*)?\}/g, '$1')
          .split('|')[0];
        return cleaned;
      }
      if (typeof item === 'object' && item !== null) {
        if (item.name) {
          return item.name.replace(/\{@item ([^|}]+)(?:\|[^}]*)?\}/g, '$1')
            .split('|')[0];
        } else if (item.item) {
          const result = item.item.replace(/\{@item ([^|}]+)(?:\|[^}]*)?\}/g, '$1').split('|')[0];
    return result;
        } else if (item.entry) {
          return item.entry.replace(/\{@item ([^|}]+)(?:\|[^}]*)?\}/g, '$1')
            .split('|')[0];
        } else {
          console.log('Unknown gear object structure:', JSON.stringify(item, null, 2));
          return 'Unknown Item';
        }
      }
      return String(item);
    });
    gear.push(...gearItems);
  }

  // Handle attachedItems property (NEW)
  if (raw.attachedItems) {
    const attachedItems = raw.attachedItems.map(item => {
      if (typeof item === 'string') {
        // Split on | and take the first part (remove source reference)
        const itemName = item.split('|')[0];
        return itemName;
      }
      return String(item);
    });
    gear.push(...attachedItems);
  }

  return gear;
}

function parseAttachedItems(raw) {
  if (!raw.attachedItems) return [];
  
  return raw.attachedItems.map(item => {
    if (typeof item === 'string') {
      // Split on | and take the first part (remove source reference)
      return item.split('|')[0];
    }
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

function parseAttackComponents(entry) {
  const components = {};

  // Parse attack type using lookup
  components.attackType = detectAttackType(entry);

  // Parse to hit bonus (just the number)
  const hitMatch = entry.match(/\{@hit ([-+]?\d+)/);
  if (hitMatch) {
    components.toHit = parseInt(hitMatch[1]);
  }

  // Parse range/reach - UPDATED to handle "ranged X/Y ft" format
  const rangeMatch = entry.match(/ranged (\d+)(?:\/(\d+))?\s*ft/i);
  const reachMatch = entry.match(/reach (\d+)\s*ft/i);

  if (entry.includes('{@atkr m,r}') && reachMatch && rangeMatch) {
    // Hybrid attack - show both
    components.range = `reach ${reachMatch[1]} ft. or range ${rangeMatch[1]} ft`;
  } else if (rangeMatch) {
    // Handle ranged format properly
    if (rangeMatch[2]) {
      components.range = `${rangeMatch[1]}/${rangeMatch[2]} ft`;
    } else {
      components.range = `${rangeMatch[1]} ft`;
    }
  } else if (reachMatch) {
    components.range = `${reachMatch[1]} ft`;
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

// Fix 1: Update parseAttacks to handle "range X ft" format (not just "ranged X ft")
function parseAttacks(rawActions) {
  return rawActions
    .filter(a => a.entries?.[0] && (/\{@atk/.test(a.entries[0]) || /\{@hit /.test(a.entries[0])))
    .map(a => {
      const entry = a.entries[0];
      const hitMatch = entry.match(/\{@hit ([-+]?\d+)/);
      const attackModifier = hitMatch ? parseInt(hitMatch[1]) : null;

      // FIXED: Parse range - handle both "range X ft" and "ranged X/Y ft" formats
      const rangeMatch = entry.match(/range (\d+)(?:\/(\d+))?\s*ft/i) || entry.match(/ranged (\d+)(?:\/(\d+))?\s*ft/i);
      const reachMatch = entry.match(/reach (\d+)\s*ft/i);

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
const damage = mapDamageData(extractDamageFromText(entry));

// Add this check:
const hasConditionalDamage = damage.some(d => d.conditional?.isConditional);
      return {
        name: a.name.replace(/\s*\{.*?\}/g, '').trim(),
        attackModifier,
        damage,
        damageType: hasConditionalDamage ? 'conditional' : 'standard', // ADD THIS
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

// Fix 2: Update parseSpeed to handle conditions in a standardized way
function parseSpeed(speed) {
  if (!speed) return {};

  const parsedSpeed = {};

  Object.keys(speed).forEach(key => {
    const value = speed[key];

    if (typeof value === 'number') {
      // Simple numeric speeds stay as numbers
      parsedSpeed[key] = value;
    } else if (typeof value === 'boolean') {
      // Boolean properties like canHover get preserved
      parsedSpeed[key] = value;
    } else if (typeof value === 'object' && value.number) {
      // Handle complex speed objects - extract the number
      parsedSpeed[key] = value.number;

      if (value.condition) {
        // Clean any {@item} or other tags from the condition
        const cleanCondition = value.condition
          .replace(/\{@item ([^|}]+)(?:\|[^}]*)?\}/g, '$1')
          .replace(/\{@[^}]+\}/g, '')
          .trim();

        // Store the condition in a standardized speedConditions object
        if (!parsedSpeed.speedConditions) {
          parsedSpeed.speedConditions = {};
        }
        parsedSpeed.speedConditions[key] = cleanCondition;
      }
    } else {
      // Pass through other values as-is
      parsedSpeed[key] = value;
    }
  });

  return parsedSpeed;
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

      // Parse usage limits like (1/Day) - FIXED: Clean {@quickref} tags from period
      const usageMatch = a.name.match(/\((\d+)\/([^)]+)\)/);
      const usage = usageMatch ? {
        count: parseInt(usageMatch[1]),
        period: usageMatch[2].toLowerCase()
          // Clean {@quickref} tags from the period
          .replace(/\{@quickref ([^|}]+)(?:\|[^|}]*)?(?:\|[^|}]*)?(?:\|[^|}]*)?(?:\|([^}]+))?\}/g, (match, text, displayText) => {
            return displayText || text;
          })
          .trim()
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

      // Clean the action name using the same logic as cleanComplexText
      let cleanName = a.name;
      if (cleanName) {
        cleanName = cleanName
          // Handle {@quickref} tags in names
          .replace(/\{@quickref ([^|}]+)(?:\|[^|}]*)?(?:\|[^|}]*)?(?:\|[^|}]*)?(?:\|([^}]+))?\}/g, (match, text, displayText) => {
            return displayText || text;
          })
          // Handle recharge tags
          .replace(/\{@recharge[^}]*\}/g, '')
          // Remove usage patterns but preserve them for parsing above
          .replace(/\s*\([^)]*\)/g, (match) => {
            // Keep usage patterns like (1/Day) but remove other parenthetical content that was parsed from tags
            if (usageMatch && match.includes(usageMatch[0])) {
              return match;
            }
            // Remove parenthetical content that came from {@quickref} or other tags
            if (match.includes('Recharges after') || match.includes('recharges after')) {
              return match; // Keep recharge text
            }
            return match; // For now, keep all parenthetical content to be safe
          })
          // Handle other common tags in names
          .replace(/\{@[^}]+\}/g, '')
          .replace(/\s+/g, ' ')
          .trim();
      }

      return {
        name: cleanName,
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

// Fix: Update parseSpellcasting to clean headerEntries text properly
function parseSpellcasting(raw) {
  if (!raw.spellcasting) return null;

  return raw.spellcasting.map(sc => {
    const parsed = {
      name: sc.name ? sc.name.replace(/\s*\{@recharge[^}]*\}/g, '').trim() : "Spellcasting",
      // UPDATED: Clean headerEntries using cleanComplexText and fix whitespace
      headerEntries: (sc.headerEntries || []).map(entry => {
        return cleanComplexText(entry)
          .replace(/\s+/g, ' ')        // Normalize whitespace
          .replace(/\s+([.!?])/g, '$1') // Remove spaces before punctuation
          .trim();
      }),
      ability: sc.ability || null,
      displayAs: sc.displayAs || null,
      spells: {}
    };

    // Parse recharge spells
    if (sc.recharge) {
      parsed.spells.recharge = {};
      Object.keys(sc.recharge).forEach(rechargeNum => {
        parsed.spells.recharge[rechargeNum] = sc.recharge[rechargeNum].map(spell =>
          cleanSpellEntry(spell)
        );
      });

      const rechargeKeys = Object.keys(sc.recharge);
      if (rechargeKeys.length === 1 && rechargeKeys[0] !== '1') {
        const rechargeNum = rechargeKeys[0];
        parsed.name += ` (Recharge ${rechargeNum}–6)`;
      }
    }

    // Parse other spell categories using the helper
    if (sc.will) {
      parsed.spells.will = sc.will.map(spell => cleanSpellEntry(spell));
    }

    if (sc.daily) {
      parsed.spells.daily = {};
      Object.keys(sc.daily).forEach(freq => {
        parsed.spells.daily[freq] = sc.daily[freq].map(spell => cleanSpellEntry(spell));
      });
    }

    if (sc.restLong) {
      parsed.spells.restLong = {};
      Object.keys(sc.restLong).forEach(freq => {
        parsed.spells.restLong[freq] = sc.restLong[freq].map(spell => cleanSpellEntry(spell));
      });
    }

    if (sc.spells) {
      // Handle leveled spells - clean the spell names
      Object.keys(sc.spells).forEach(level => {
        if (!parsed.spells.leveled) parsed.spells.leveled = {};
        parsed.spells.leveled[level] = {
          ...sc.spells[level],
          spells: sc.spells[level].spells.map(spell => cleanSpellEntry(spell))
        };
      });
    }

    // Add footer entries if they exist
    if (sc.footerEntries) {
      // UPDATED: Clean footerEntries using cleanComplexText and fix whitespace
      parsed.footerEntries = sc.footerEntries.map(entry => {
        return cleanComplexText(entry)
          .replace(/\s+/g, ' ')        // Normalize whitespace
          .replace(/\s+([.!?])/g, '$1') // Remove spaces before punctuation
          .trim();
      });
    }

    return parsed;
  });
}

// Fix 3: Update formatSpellsForTrait to fix spacing and singular/plural slots
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

      // Clean any {@dice} tags from spells in the daily list and fix whitespace
      const cleanSpells = spells.daily[freq].map(spell =>
        spell.replace(/\(\{@dice ([^}]+)\}\)/g, '($1)')  // Handle ({@dice ...})
          .replace(/\{@dice ([^}]+)\}/g, '$1')        // Handle {@dice ...}
          .replace(/\\"/g, '"')                       // Handle escaped quotes
          .replace(/\s+/g, ' ')                       // Normalize whitespace
          .replace(/\s+([.!?])/g, '$1')               // Remove spaces before punctuation
          .trim()
      );

      parts.push(`${count}: ${cleanSpells.join(', ')}`);
    });
  }

  if (spells.leveled) {
    Object.keys(spells.leveled).sort((a, b) => parseInt(a) - parseInt(b)).forEach(level => {
      const levelData = spells.leveled[level];
      if (level === '0') {
        // Handle cantrips
        const cleanSpells = levelData.spells.map(spell =>
          spell.replace(/\\"/g, '"')
            .replace(/\s+/g, ' ')
            .replace(/\s+([.!?])/g, '$1')
            .trim()
        );
        parts.push(`Cantrips (at will): ${cleanSpells.join(', ')}`);
      } else {
        // FIXED: Handle regular spell levels with proper singular/plural and formatting
        const ordinal = level === '1' ? '1st' : level === '2' ? '2nd' : level === '3' ? '3rd' : `${level}th`;
        const slotText = levelData.slots === 1 ? 'slot' : 'slots';
        const cleanSpells = levelData.spells.map(spell =>
          spell.replace(/\\"/g, '"')
            .replace(/\s+/g, ' ')
            .replace(/\s+([.!?])/g, '$1')
            .trim()
        );
        parts.push(`${ordinal} level (${levelData.slots} ${slotText}): ${cleanSpells.join(', ')}`);
      }
    });
  }

  // FIXED: Add proper spacing between spell level groups
  return parts.join(' ');
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

// Fix: Update parseReactionComponents to handle text cleaning issues
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
  } else if (entry.includes('{@actResponse d}{@actSave str}')) {
    components.responseType = 'Strength Saving Throw';
  } else if (entry.includes('{@actResponse d}{@actSave con}')) {
    components.responseType = 'Constitution Saving Throw';
  } else if (entry.includes('{@actResponse d}{@actSave int}')) {
    components.responseType = 'Intelligence Saving Throw';
  } else if (entry.includes('{@actResponse d}{@actSave wis}')) {
    components.responseType = 'Wisdom Saving Throw';
  } else if (entry.includes('{@actResponse d}{@actSave cha}')) {
    components.responseType = 'Charisma Saving Throw';
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

  // Parse failure effect - UPDATED to handle text cleaning better
  const failureMatch = entry.match(/\{@actSaveFail[^}]*\}\s*(.+)/);
  if (failureMatch) {
    let failureText = failureMatch[1];

    // Clean the failure text with better handling
    failureText = failureText
      // Handle damage tags - preserve dice notation
      .replace(/(\d+)\s*\(\{@damage ([^}]+)\}\)/g, '$1 ($2)')
      // Handle conditions
      .replace(/\{@condition ([^|}]+)(?:\|[^}]*)?\}/g, '$1')
      // Handle DC references
      .replace(/\{@dc (\d+)\}/g, 'DC $1')
      // Handle skills
      .replace(/\{@skill ([^|}]+)(?:\|[^}]*)?\}/g, '$1')
      // Handle variant rules with proper text extraction
      .replace(/\{@variantrule ([^|\[]+)(?:\s*\[[^\]]*\])?(?:\|[^|}]*)?(?:\|([^}]+))?\}/g, (match, rule, displayText) => {
        // If there's a display text after the second |, use that, otherwise use the rule name
        return displayText || rule;
      })
      // Handle any remaining tags
      .replace(/\{@[^}]+\}/g, '')
      // Clean up whitespace
      .replace(/\s+/g, ' ')
      .trim();

    // Try to parse damage from failure text (this should now work better)
    const damageMatch = failureText.match(/(\d+)\s*\(([^)]+)\)\s+([A-Za-z]+)\s+damage/);
    if (damageMatch) {
      components.failureDamageAverage = parseInt(damageMatch[1]);
      components.failureDamageFormula = damageMatch[2].trim();
      components.failureDamageType = damageMatch[3].toLowerCase() + ' damage';
    } else {
      // Store the cleaned failure effect
      components.failureEffect = failureText;
    }
  }

  return components;
}

// Fix: Update parseReactions to clean {@quickref} tags in reaction names
function parseReactions(raw) {
  if (!raw.reaction) return [];

  return raw.reaction.map(r => {
    const entry = r.entries?.[0] || '';

    // Clean the reaction name using the same logic as cleanComplexText
    let cleanName = r.name;
    if (cleanName) {
      cleanName = cleanName
        // Handle {@quickref} tags in names
        .replace(/\{@quickref ([^|}]+)(?:\|[^|}]*)?(?:\|[^|}]*)?(?:\|[^|}]*)?(?:\|([^}]+))?\}/g, (match, text, displayText) => {
          return displayText || text;
        })
        // Handle other common tags in names
        .replace(/\{@recharge[^}]*\}/g, '')
        .replace(/\{@[^}]+\}/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    }

    return {
      name: cleanName,
      damage: mapDamageData(extractDamageFromText(entry)),
      components: parseReactionComponents(entry),
      text: entry ? cleanComplexText(entry) : ''
    };
  });
}

function mapDamageData(damageArray) {
  return damageArray.map(d => {
    const result = {
      dieCount: d.dieCount,
      die: d.die,
      modifier: d.modifier,
      type: d.type,
      average: calculateAverageDamage(d),
      formula: `${d.dieCount}d${d.die}${d.modifier ? ` + ${d.modifier}` : ''}`
    };
    
    // Pass through conditional metadata if it exists
    if (d.conditional) {
      result.conditional = d.conditional;
    }
    
    return result;
  });
}

// Fix: Update mapCreature to clean {@creature} tags from languages array
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
        formatSpellsForTrait(sc.spells),
        ...(sc.footerEntries || [])
      ].join(' ').replace(/\\"/g, '"')
    })) : [];

  // Extract CR value properly from both simple and complex formats
  let crValue = raw.cr;
  if (typeof raw.cr === 'object' && raw.cr !== null) {
    // Handle complex CR objects like {"cr": "0", "xp": 0}
    crValue = raw.cr.cr || raw.cr.rating || raw.cr.value || raw.cr;
  }

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
    otherSources: parseOtherSources(raw),
    srd52: raw.srd52 || false,
    basicRules2024: raw.basicRules2024 || false,
    dragonAge: raw.dragonAge || null,
    soundClip: raw.soundClip || null,

    // Combat Stats
    ac: parseAC(raw.ac),
    hp: parseHP(raw.hp),
    speed: parseSpeed(raw.speed),
    cr: crValue,
    pb: calculateProficiencyBonus(crValue),
    initiative: calculateInitiative(dexMod),

    // Abilities & Skills
    abilities: parseAbilities(raw),
    skills: parseSkills(raw),
    senses: parseSenses(raw),
    // UPDATED: Clean {@creature} and other tags from languages
    languages: (raw.languages || []).map(lang => {
      if (typeof lang === 'string') {
        return lang
          .replace(/\{@creature ([^|}]+)\|[^|}]*\|([^}]+)\}/g, '$2')  // Handle {@creature Name|Source|DisplayName}
          .replace(/\{@creature ([^|}]+)(?:\|[^}]*)?\}/g, '$1')       // Handle {@creature Name|Source}
          .replace(/\{@[^}]+\}/g, '')                                 // Clean any other tags
          .replace(/\s+/g, ' ')
          .trim();
      }
      return lang;
    }),

    // Equipment
    gear: parseGear(raw),

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
    }).concat(spellcastingTraits),

    actions: {
      multiAttack: parseMultiAttack(raw.action || []),
      attacks: parseAttacks(raw.action || []),
      special: parseSpecialActions(raw.action || []).concat(
        // Add action spellcasting to special actions
        actionSpells.map(sc => ({
          name: sc.name,
          text: [
            ...sc.headerEntries,
            formatSpellsForTrait(sc.spells),
            ...(sc.footerEntries || [])
          ].join(' '),
          spellcasting: true
        }))
      )
    },

    bonusActions: (raw.bonus || []).map(ba => {
      const entry = ba.entries?.[0] || '';

      // Clean the bonus action name
      let cleanName = ba.name;
      if (cleanName) {
        cleanName = cleanName
          .replace(/\{@quickref ([^|}]+)(?:\|[^|}]*)?(?:\|[^|}]*)?(?:\|[^|}]*)?(?:\|([^}]+))?\}/g, (match, text, displayText) => {
            return displayText || text;
          })
          .replace(/\{@recharge[^}]*\}/g, '')
          .replace(/\{@[^}]+\}/g, '')
          .replace(/\s+/g, ' ')
          .trim();
      }

      return {
        name: cleanName,
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
          formatSpellsForTrait(sc.spells),
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
          formatSpellsForTrait(sc.spells),
          ...(sc.footerEntries || [])
        ].join(' '),
        spellcasting: true
      }))
    ),

    legendary: parseLegendaryActions(raw),
    spellcasting: spellcasting || null,

    // Additional Data
    environment: raw.environment || [],
    treasure: raw.treasure || [],
    attachedItems: parseAttachedItems(raw),
    legendaryGroup: raw.legendaryGroup || null,
    tokenUrl: raw.tokenUrl || null,
    hasToken: raw.hasToken || false,
    hasFluff: raw.hasFluff || false,
    hasFluffImages: raw.hasFluffImages || false
  };
}

export default mapCreature;