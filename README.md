# Beast Manager

A powerful D&D 5e creature management and battle assistant built with Vue 3 and TypeScript. Streamline your combat encounters with multi-creature summoning, advanced attack rolling, and intelligent damage calculation.

## 🚀 Features

- **Multi-creature summoning** with support for different creature types
- **Advanced attack rolling** with advantage/disadvantage support
- **Intelligent damage calculation** including conditional damage types
- **AC detection** based on hit/miss patterns
- **Creature import** from 5etools JSON exports
- **Battle management** with visual creature tracking
- **Responsive UI** with modern design

## 📖 How to Use

### Getting Started

1. **Import Creatures**: Navigate to the creature selection menu and use the "Import More" button to import creatures from 5etools JSON files
2. **Select Battle Mode**: Click the Battle tab to enter combat management mode

### Importing Creatures

Beast Manager uses creature data from [5etools](https://5e.tools/):

1. Go to [5etools Bestiary](https://5e.tools/bestiary.html)
2. Use the "Download" feature to export creatures as JSON
3. In Beast Manager, click "Import More" in the creature selection menu
4. Upload your downloaded JSON file
5. Creatures will be automatically processed and available for summoning

### Summoning Creatures

#### Single Creature Mode
1. Browse and filter creatures using the search and filter options
2. Click on a creature to select it
3. Adjust the quantity using the counter controls
4. Click "Summon" to add creatures to the battlefield

#### Multi-Select Mode  
1. Toggle "Multi-Select" mode in the creature browser
2. Check multiple different creature types (e.g., 2 Wolves + 1 Bear + 3 Goblins)
3. Use individual quantity counters for each selected creature type
4. Click "Summon All" to add all selected creatures to the battlefield

### Battle Management

#### Setting Up Combat
1. **Select Attacking Creatures**: Click and drag to select multiple creatures on the battlefield, or click individual creatures
2. **Choose Target Enemy**: Click on enemy creatures to target them
3. **Configure Modifiers**: Use Advantage/Disadvantage toggles as needed

#### Attack Rolling
1. **Select Attacks**: Choose one attack per creature type from the available options
2. **Handle Conditional Damage**: For attacks with multiple damage options (e.g., one-handed vs two-handed), select the appropriate damage type for each creature
3. **Roll Attacks**: Click "Roll Attack" to roll d20s for all selected creatures
4. **Manual Override**: Hover over roll results to manually mark hits/misses if needed

#### Saves & Ability Checks
1. **Select Creatures**: Click and drag or individually select creatures on the battlefield
2. **Right-Click Menu**: Right-click to open the context menu with roll options
3. **Choose Roll Type**: Select from "Saving Throws", "Ability Checks", or "Skill Checks"
4. **Select Ability/Skill**: Choose the specific save, ability, or skill to roll
5. **View Results**: Results appear above each creature showing the roll total and modifier
6. **Dismiss Results**: Click the "×" on individual results or use "Clear All" button to remove all results
7. **Creature Details**: When all selected creatures are the same type, access detailed creature information

#### Damage Calculation
1. **Roll Damage**: After successful attacks, click "Roll Damage" to calculate total damage
2. **View Breakdown**: Use "Breakdown" to see detailed damage rolls per creature
3. **Apply Damage**: Damage totals are calculated automatically with critical hit bonuses

#### AC Detection
The app intelligently determines enemy AC based on hit/miss patterns:
- Hit/miss rolls are tracked automatically
- When a clear pattern emerges (e.g., 15 hits, 14 misses), AC is auto-detected
- Manual AC suggestions appear when patterns are detected
- Click "Set AC" to apply suggested AC values

### Advanced Features

#### Conditional Damage
Many creatures have attacks with multiple damage options:
- **Weapon Attacks**: One-handed vs two-handed weapon usage
- **Situational Damage**: Different damage based on conditions
- Each creature can independently choose their damage type
- Damage is calculated per creature's selected option

#### Creature Management
- **Health Tracking**: Track HP, temporary HP, and damage for all creatures  
- **Favorites**: Mark frequently used creatures as favorites for quick access
- **Filtering**: Filter by creature type, CR, movement capabilities, and more
- **Search**: Find creatures quickly by name

#### Battle Flow
1. Import/select creatures → 2. Summon to battlefield → 3. Select attackers → 4. Choose target → 5. Select attacks → 6. Roll attacks → 7. Roll damage → 8. Apply results → 9. Repeat

## 🛠️ Development Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Recommended IDE Setup
[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur) + [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin)

### Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
npm run test:unit
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```

## 🎯 Use Cases

Beast Manager is perfect for:
- **DMs running large encounters** with multiple creature types
- **Conjuration spell management** (Conjure Animals, Conjure Woodland Beings, etc.)
- **Mass combat scenarios** with organized attack rolling
- **Quick creature stat lookup** and battle preparation
- **Streamlined damage calculation** for complex encounters

## 📝 Notes

- Creature data should be exported from 5etools in JSON format
- The app works best with modern browsers (Chrome, Firefox, Safari, Edge)  
- All creature data is stored locally in your browser
- No internet connection required after initial setup

## 🤝 Contributing

This project is built with Vue 3, TypeScript, and Tailwind CSS. Feel free to submit issues, feature requests, or pull requests!

See [Vite Configuration Reference](https://vitejs.dev/config/) for build configuration details.
