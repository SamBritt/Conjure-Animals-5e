import { readFileSync, writeFileSync } from 'fs';
import mapCreature from './src/utils/creatureMapper.js'; // adjust path as needed

// Validation function to check for common parsing issues
function validateCreatureData(creature) {
  const issues = [];
  const patterns = {
    'Unparsed Tags': /\{@[^}]*\}/g,
    'At Symbol': /@[a-zA-Z]/g,
    'Object Object': /\[?[Oo]bject [Oo]bject\]?/g,
    'Undefined': /undefined/gi,
    'Space Dot': /\s\./g,
    'Unknown': /Unknown/g,
    'Asterisks': /\*/g,
    'Empty Parens': /\(\s*\)/g,
    'Sequential Spaces': /\w\s{2,}\w/g
  };

  function checkStringValue(value, path) {
    if (typeof value === 'string') {
      Object.entries(patterns).forEach(([patternName, regex]) => {
        const matches = value.match(regex);
        if (matches) {
          issues.push({
            type: patternName,
            path: path,
            value: value,
            matches: matches
          });
        }
      });
    }
  }

  function recursiveCheck(obj, path = '') {
    if (typeof obj === 'string') {
      checkStringValue(obj, path);
    } else if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        recursiveCheck(item, `${path}[${index}]`);
      });
    } else if (obj && typeof obj === 'object') {
      Object.entries(obj).forEach(([key, value]) => {
        const newPath = path ? `${path}.${key}` : key;
        recursiveCheck(value, newPath);
      });
    }
  }

  recursiveCheck(creature);
  
  return {
    creature: creature.name || 'Unknown Creature',
    id: creature.id,
    hasIssues: issues.length > 0,
    issueCount: issues.length,
    issues: issues.sort((a, b) => a.type.localeCompare(b.type))
  };
}

function validateCreatureCollection(creatures) {
  const results = creatures.map(validateCreatureData);
  const creaturesWithIssues = results.filter(r => r.hasIssues);
  
  const summary = {
    totalCreatures: creatures.length,
    creaturesWithIssues: creaturesWithIssues.length,
    totalIssues: results.reduce((sum, r) => sum + r.issueCount, 0),
    issuesByType: {},
    problemCreatures: creaturesWithIssues
  };

  // Group issues by type
  results.forEach(result => {
    result.issues.forEach(issue => {
      if (!summary.issuesByType[issue.type]) {
        summary.issuesByType[issue.type] = 0;
      }
      summary.issuesByType[issue.type]++;
    });
  });

  return summary;
}

const rawCreatures = JSON.parse(readFileSync('./BeastList.json', 'utf8'));
const mappedCreatures = rawCreatures.map((creature, i) => {
  try {
    return mapCreature(creature, i + 1);
  } catch (error) {
    console.error(`❌ Error mapping creature "${creature.name || 'Unknown'}" (index ${i}):`);
    console.error(error.message);
    console.error('Raw creature data:', JSON.stringify(creature, null, 2));
    throw error; // Re-throw to maintain original behavior
  }
});

// Validate the mapped creatures
const validation = validateCreatureCollection(mappedCreatures);

writeFileSync('./MappedCreaturesV2.json', JSON.stringify(mappedCreatures, null, 2));
console.log(`✅ Mapped ${mappedCreatures.length} creatures to MappedCreatures.json`);

// Show validation results
if (validation.totalIssues === 0) {
  console.log('🎉 No parsing issues found!');
} else {
  console.log(`⚠️  Found ${validation.totalIssues} issues in ${validation.creaturesWithIssues} creatures:`);
  
  // Show issue breakdown
  Object.entries(validation.issuesByType).forEach(([type, count]) => {
    console.log(`   ${type}: ${count}`);
  });
  
  // Show a few example problem creatures
  if (validation.problemCreatures.length > 0) {
    console.log('\n🔍 Examples:');
    validation.problemCreatures.slice(0, 3).forEach(creature => {
      console.log(`   ${creature.creature} (${creature.issueCount} issues)`);
    });
  }
}