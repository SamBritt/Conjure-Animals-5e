// Basic types
export type AbilityKey = "str" | "dex" | "con" | "int" | "wis" | "cha";

export interface Creature {
  id: number;
  name: string;
  otherSources: { source: string; page?: number | null }[];
  srd52: boolean;
  basicRules2024: boolean;
  dragonAge: string | null;
  soundClip: { type: string; path: string } | null;
  group: string[] | null;  // Can be array, not just string
  alias: string[] | null;  // Can be array
  isNamedCreature: boolean;
  size: string;
  type: string;
  alignment: string[];
  source: string;
  page: number;
  ac: ArmorClass | number;
  hp: HitPoints;
  speed: Speed;
  cr: string;
  pb: number;
  initiative: Initiative;
  abilities: Record<AbilityKey, AbilityScore>;
  skills: Record<string, string>;
  senses: Senses;
  languages: string[];
  gear: string[];
  vulnerabilities: DamageTypeEntry[];
  resistances: DamageTypeEntry[];
  immunities: DamageTypeEntry[];
  conditionImmunities: string[];
  traits: Trait[];
  actions: Actions;
  bonusActions: ActionBase[];
  reactions: ActionBase[];
  legendary: LegendaryActions | null; // can refine later
  spellcasting: SpellcastingEntry[];
  environment: string[];
  treasure: any[]; // unknown type
  attachedItems: string[];
  legendaryGroup: any; // can refine if needed
  tokenUrl: string | null;
  hasToken: boolean;
  hasFluff: boolean;
  hasFluffImages: boolean;
}

interface Recharge {
  min: number;
  max: number;
}

export interface ArmorClass {
  value?: number;
  special?: string;  // For "11 + the spell's level"
  from?: string[];
}

export interface HitPoints {
  average: number;
  formula: string;
  special?: string;  // For "5 + five times your druid level"
}

export interface Initiative {
  modifier: number;
  total: number;
}

export interface AbilityScore {
  value: number;
  mod: number;
  save: number;
}

export interface LegendaryActions {
  count: number;
  countLair?: number | null;
  actions: {
    name: string;
    cost: number;
    text: string;
  }[];
}

export interface Speed {
  [key: string]: number;
  speedConditions?: Record<string, string>;  // For fly conditions like "(hover)"
}

export interface Senses {
  [key: string]: number;
  passivePerception: number;
}

export interface Trait {
  name: string;
  text: string;
  description?: string;
  options?: string[] | null;
}

export interface Actions {
  multiAttack?: MultiAttack;
  attacks: Attack[];
  special: (ActionBase | SpellcastingAction)[];
}

export interface MultiAttack {
  text: string;
  attacks: string[];
}


// Add this new interface for ongoing effects
export interface OngoingEffect {
  trigger: 'start_of_turn'; // We can identify this reliably
  damage: {
    dieCount: number;
    die: number;
    modifier: number;
    type: string;
    average: number;
    formula: string;
  };
  fullText: string; // Store the original text for context
}

// Updated Attack interface
export interface Attack {
  name: string;
  attackModifier: number;
  damage: ActionDamage[];
  damageType?: 'standard' | 'conditional';
  range: AttackRange;
  recharge?: Recharge | string | null;
  components: AttackComponent;
  text: string;
  ongoingEffects?: OngoingEffect[]; // Add this line
}

export interface AttackComponent {
  attackType?: string;
  toHit?: number;
  range?: string;
  damageAverage?: number;
  damageFormula?: string;
  damageType?: string;
  saveDC?: number;
  conditions?: string[];
  additionalDamage?: {
    average: number;
    formula: string;
    type: string;
  }[];
}

export interface ActionDamage {
  dieCount: number;
  die: number;
  modifier: number;
  type: string;
  average: number;
  formula: string;
  conditional?: {  // Add this optional property
    isConditional: boolean;
    condition: string;
  };
}

export interface AttackRange {
  normal: number;
  long: number | null;
  type: "melee" | "ranged";
}

export interface ActionBase {
  name: string;
  text: string;
  damage: ActionDamage[];
  components: AttackComponent;
  recharge?: Recharge | null;
  usage?: { count: number; period: string } | null;
  ongoingEffects?: OngoingEffect[]; // Add this line
}

type DamageTypeEntry = string | {
  types?: string[];
  condition?: string;
};

// A special flag for spellcasting actions
export interface SpellcastingAction extends ActionBase {
  spellcasting: true;
}

// Spellcasting blocks
export interface SpellcastingEntry {
  name: string;
  headerEntries: string[];
  ability: AbilityKey | null;
  displayAs: "action" | "bonus" | "reaction" | null;
  spells: {
    will?: string[];
    daily?: Record<string, string[]>;
    leveled?: Record<string, {
      slots: number;
      spells: string[];
    }>;
    recharge?: Record<string, string[]>;
    restLong?: Record<string, string[]>;
  };
  footerEntries?: string[];
}
