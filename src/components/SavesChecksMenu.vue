<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { AbilityKey } from '@/types/Creatures'

interface SummonedCreature {
  uuid: string
  name: string
  abilities: {
    [K in AbilityKey]: {
      value: number
      mod: number
      save: number
    }
  }
}

interface SaveResult {
  creatureUuid: string
  abilityType: string
  result: number
  modifier: number
  rollType: 'save' | 'check'
}

const props = defineProps<{
  show: boolean
  x: number
  y: number
  attackingCreatures: SummonedCreature[]
}>()

const emit = defineEmits<{
  close: []
  results: [results: SaveResult[]]
  showCreatureDetails: [creature: SummonedCreature]
}>()

const contextMenuMode = ref<'main' | 'saves' | 'checks' | 'skills'>('main')

// Define all D&D 5e skills with their associated abilities
const skillList = [
  { name: 'Acrobatics', ability: 'dex' },
  { name: 'Animal Handling', ability: 'wis' },
  { name: 'Arcana', ability: 'int' },
  { name: 'Athletics', ability: 'str' },
  { name: 'Deception', ability: 'cha' },
  { name: 'History', ability: 'int' },
  { name: 'Insight', ability: 'wis' },
  { name: 'Intimidation', ability: 'cha' },
  { name: 'Investigation', ability: 'int' },
  { name: 'Medicine', ability: 'wis' },
  { name: 'Nature', ability: 'int' },
  { name: 'Perception', ability: 'wis' },
  { name: 'Performance', ability: 'cha' },
  { name: 'Persuasion', ability: 'cha' },
  { name: 'Religion', ability: 'int' },
  { name: 'Sleight of Hand', ability: 'dex' },
  { name: 'Stealth', ability: 'dex' },
  { name: 'Survival', ability: 'wis' }
]

// Check if all selected creatures are the same type (for creature details)
const allCreaturesSameType = computed(() => {
  if (props.attackingCreatures.length === 0) return false
  const firstCreatureName = props.attackingCreatures[0].name
  return props.attackingCreatures.every(creature => creature.name === firstCreatureName)
})

const closeMenu = (): void => {
  contextMenuMode.value = 'main'
  emit('close')
}

// Reset to main menu when the component becomes visible
watch(() => props.show, (newShow) => {
  if (newShow) {
    contextMenuMode.value = 'main'
  }
})

const showSavesMenu = (event: Event): void => {
  event.stopPropagation()
  contextMenuMode.value = 'saves'
}

const showChecksMenu = (event: Event): void => {
  event.stopPropagation()
  contextMenuMode.value = 'checks'
}

const showSkillsMenu = (event: Event): void => {
  event.stopPropagation()
  contextMenuMode.value = 'skills'
}

const showCreatureDetails = (event: Event): void => {
  event.stopPropagation()
  // Pass the first creature since they're all the same type
  emit('showCreatureDetails', props.attackingCreatures[0])
  closeMenu()
}

const rollSaves = (abilityType: string): void => {
  const results: SaveResult[] = []
  
  props.attackingCreatures.forEach(creature => {
    const roll = Math.floor(Math.random() * 20) + 1
    const modifier = creature.abilities[abilityType as AbilityKey].save
    const result = roll + modifier
    
    results.push({
      creatureUuid: creature.uuid,
      abilityType: abilityType.toUpperCase(),
      result,
      modifier,
      rollType: 'save'
    })
  })
  
  emit('results', results)
  closeMenu()
}

const rollChecks = (abilityType: string): void => {
  const results: SaveResult[] = []
  
  props.attackingCreatures.forEach(creature => {
    const roll = Math.floor(Math.random() * 20) + 1
    const baseModifier = creature.abilities[abilityType as AbilityKey].mod
    // TODO: Add skill proficiency parsing for checks
    const result = roll + baseModifier
    
    results.push({
      creatureUuid: creature.uuid,
      abilityType: abilityType.toUpperCase(),
      result,
      modifier: baseModifier,
      rollType: 'check'
    })
  })
  
  emit('results', results)
  closeMenu()
}

const rollSkillCheck = (skillName: string): void => {
  const results: SaveResult[] = []
  const skill = skillList.find(s => s.name === skillName)
  if (!skill) return
  
  props.attackingCreatures.forEach(creature => {
    const roll = Math.floor(Math.random() * 20) + 1
    const baseModifier = creature.abilities[skill.ability as AbilityKey].mod
    
    // Parse skill proficiencies - look for the skill in creature.skills
    let proficiencyBonus = 0
    if (creature.skills && creature.skills[skillName.toLowerCase().replace(/\s+/g, '')]) {
      // Extract the proficiency bonus from the skill string (e.g., "+5" -> 5)
      const skillValue = creature.skills[skillName.toLowerCase().replace(/\s+/g, '')]
      if (typeof skillValue === 'string') {
        const match = skillValue.match(/[+-]?\d+/)
        if (match) {
          const totalBonus = parseInt(match[0])
          proficiencyBonus = totalBonus - baseModifier // Extract just the proficiency part
        }
      }
    }
    
    const totalModifier = baseModifier + proficiencyBonus
    const result = roll + totalModifier
    
    results.push({
      creatureUuid: creature.uuid,
      abilityType: skillName,
      result,
      modifier: totalModifier,
      rollType: 'check'
    })
  })
  
  emit('results', results)
  closeMenu()
}
</script>

<template>
  <div
    v-if="show"
    :style="{ left: x + 'px', top: y + 'px' }"
    :class="[
      'fixed z-50 bg-zinc-800 border border-zinc-600 rounded-lg shadow-lg min-w-40',
      contextMenuMode === 'main' ? 'py-2' : ''
    ]">
    
    <!-- Main Menu -->
    <template v-if="contextMenuMode === 'main'">
      <button
        @click="showSavesMenu"
        @click.stop
        class="w-full px-3 py-2 text-left text-sm text-white hover:bg-zinc-700 transition-colors">
        Saving Throws
      </button>
      <button
        @click="showChecksMenu"
        @click.stop
        class="w-full px-3 py-2 text-left text-sm text-white hover:bg-zinc-700 transition-colors">
        Ability Checks
      </button>
      <button
        @click="showSkillsMenu"
        @click.stop
        class="w-full px-3 py-2 text-left text-sm text-white hover:bg-zinc-700 transition-colors">
        Skill Checks
      </button>
      <button
        v-if="allCreaturesSameType"
        @click="showCreatureDetails"
        @click.stop
        class="w-full px-3 py-2 text-left text-sm text-white hover:bg-zinc-700 transition-colors border-t border-zinc-600">
        Creature Details
      </button>
    </template>
    
    <!-- Ability Selection Menu (Saves & Ability Checks) -->
    <template v-else-if="contextMenuMode === 'saves' || contextMenuMode === 'checks'">
      <div class="grid grid-cols-3">
        <button
          v-for="(ability, index) in ['str', 'dex', 'con', 'int', 'wis', 'cha']"
          :key="ability"
          @click="contextMenuMode === 'saves' ? rollSaves(ability) : rollChecks(ability)"
          @click.stop
          :class="[
            'px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors',
            index === 0 ? 'rounded-tl-lg' : '', // STR - top left
            index === 2 ? 'rounded-tr-lg' : '', // CON - top right  
            index === 3 ? 'rounded-bl-lg' : '', // INT - bottom left
            index === 5 ? 'rounded-br-lg' : ''  // CHA - bottom right
          ]">
          {{ ability.toUpperCase() }}
        </button>
      </div>
    </template>
    
    <!-- Skill Selection Menu -->
    <template v-else-if="contextMenuMode === 'skills'">
      <div class="max-h-64 overflow-y-auto">
        <button
          v-for="skill in skillList"
          :key="skill.name"
          @click="rollSkillCheck(skill.name)"
          @click.stop
          class="w-full px-3 py-2 text-left text-sm text-white hover:bg-zinc-700 transition-colors flex justify-between items-center">
          <span>{{ skill.name }}</span>
          <span class="text-xs text-gray-400">{{ skill.ability.toUpperCase() }}</span>
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.overflow-y-auto::-webkit-scrollbar {
  width: 8px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #3f3f46;
  border-radius: 4px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #71717a;
  border-radius: 4px;
  border: 1px solid #52525b;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #a1a1aa;
}

.overflow-y-auto::-webkit-scrollbar-thumb:active {
  background: #d4d4d8;
}
</style>