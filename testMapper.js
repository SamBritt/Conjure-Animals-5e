import { readFileSync, writeFileSync } from 'fs';
import mapCreature from './creatureMapper.js'; // adjust path as needed

const rawCreatures = JSON.parse(readFileSync('./BeastList.json', 'utf8'));
const mappedCreatures = rawCreatures.map((creature, i) => mapCreature(creature, i + 1));

writeFileSync('./MappedCreatures.json', JSON.stringify(mappedCreatures, null, 2));
console.log(`✅ Mapped ${mappedCreatures.length} creatures to MappedCreatures.json`);
