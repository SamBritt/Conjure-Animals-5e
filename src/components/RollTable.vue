<script setup lang="ts">
import type { AttackRoll } from '../views/Battle.vue'

interface AvailableAttack {
  creature: string
  name: string
  damage: any[]
  attackModifier: number
}

interface ActionDamage {
  dieCount: number
  die: number
  modifier: number
  type: string
  average: number
  formula: string
  conditional?: {
    isConditional: boolean
    condition: string
  }
}

interface AttackConditionalData {
  attackKey: string
  attack: AvailableAttack
  conditionalOptions: ActionDamage[]
  selectedConditional?: ActionDamage
}

const props = defineProps<{
  attackRolls: AttackRoll[]
  disAdvantage: boolean
  advantage: boolean
  attackModifier?: number
  availableAttacks: AvailableAttack[]
  selectedAttack?: AvailableAttack
  selectedAttacks: AvailableAttack[]
  conditionalDamageOptions: ActionDamage[]
  selectedConditionalDamage?: ActionDamage
  selectedConditionalDamageMap: Map<string, ActionDamage>
  attacksWithConditionals: AttackConditionalData[]
}>()

const emits = defineEmits<{
  selectAttack: [attack: AvailableAttack]
  toggleAttackSelection: [attack: AvailableAttack]
  selectConditionalDamage: [damageOption: ActionDamage]
  selectConditionalDamageForAttack: [attackKey: string, damageOption: ActionDamage]
}>()

const handleAttackSelection = (attack: AvailableAttack) => {
  emits('selectAttack', attack)
}

const handleToggleAttackSelection = (attack: AvailableAttack) => {
  emits('toggleAttackSelection', attack)
}

const handleConditionalDamageSelection = (damageOption: ActionDamage) => {
  emits('selectConditionalDamage', damageOption)
}

const handleConditionalDamageSelectionForAttack = (attackKey: string, damageOption: ActionDamage) => {
  emits('selectConditionalDamageForAttack', attackKey, damageOption)
}

const rollClass = (row: string) => {
  const styles = [`flex`, `flex-row`, `justify-center`]

  switch (row) {
    case 'advantage':
      if (props.advantage) {
        styles.push('bg-emerald-300')
      }
      break
    case 'disadvantage':
      if (props.disAdvantage) {
        styles.push('bg-rose-400')
      }
      break
  }

  return styles
}
</script>

<template>
  <div class="space-y-4">
    <!-- Attack Selection Section -->
    <div v-if="availableAttacks.length > 0" class="bg-zinc-600 p-3 rounded">
      <h5 class="text-sm font-medium mb-2 text-white">Select Attacks (one per creature type):</h5>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="attack in availableAttacks"
          :key="`${attack.creature}-${attack.name}`"
          @click="handleToggleAttackSelection(attack)"
          :class="[
            'p-2 rounded-md border transition-colors text-sm',
            selectedAttacks.some(a => a.creature === attack.creature && a.name === attack.name)
              ? 'bg-green-500 border-green-400 text-white'
              : 'bg-stone-500 border-stone-400 text-white hover:bg-stone-400'
          ]">
          <div class="text-xs text-gray-300">{{ attack.creature }}</div>
          <div class="font-medium">{{ attack.name }}</div>
          <div class="text-xs text-gray-400">+{{ attack.attackModifier }}</div>
        </button>
      </div>
      <div class="text-xs text-gray-300 mt-2">
        Click to select/change attacks. One attack per creature type will be rolled.
      </div>
    </div>

    <!-- Per-Attack Conditional Damage Selection Section -->
    <div v-if="attacksWithConditionals.length > 0" class="bg-zinc-600 p-3 rounded">
      <h5 class="text-sm font-medium mb-3 text-white">Choose Damage Type for Each Attack:</h5>
      <div class="space-y-3">
        <div
          v-for="attackData in attacksWithConditionals"
          :key="attackData.attackKey"
          class="bg-zinc-700 p-3 rounded-lg"
        >
          <div class="text-sm font-medium text-white mb-2">
            {{ attackData.attack.creature }} - {{ attackData.attack.name }}
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="damageOption in attackData.conditionalOptions"
              :key="`${attackData.attackKey}-${damageOption.formula}-${damageOption.conditional?.condition}`"
              @click="handleConditionalDamageSelectionForAttack(attackData.attackKey, damageOption)"
              :class="[
                'p-2 rounded-md border transition-colors text-sm',
                attackData.selectedConditional?.formula === damageOption.formula && 
                attackData.selectedConditional?.conditional?.condition === damageOption.conditional?.condition
                  ? 'bg-green-500 border-green-400 text-white'
                  : 'bg-stone-500 border-stone-400 text-white hover:bg-stone-400'
              ]">
              <div class="font-medium">{{ damageOption.formula }} {{ damageOption.type }}</div>
              <div class="text-xs text-gray-300">{{ damageOption.conditional?.condition }}</div>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Roll Results Table -->
    <table class="bg-zinc-500 w-full p-1 text-center">
      <thead>
        <tr>
          <th class="border border-slate-600 p-1">Creature</th>

          <template v-if="advantage || disAdvantage">
            <th class="border border-slate-600 p-1">Disadvantage</th>
            <th class="border border-slate-600 p-1">Advantage</th>
          </template>

          <th
            v-else
            class="border border-slate-600 p-1">
            Roll
          </th>
          <th class="border border-slate-600 p-1">Final</th>
        </tr>
      </thead>

      <tbody>
        <tr
          v-for="roll in attackRolls"
          class="m-0">
          <td class="p-1">
            {{ `${roll.creature.name} ${roll.creature.index}` }}
          </td>

          <template v-if="advantage || disAdvantage">
            <td :class="[{ 'bg-rose-400': disAdvantage }, 'p-1']">
              <div :class="rollClass('disadvantage')">
                <p class="text-md">
                  {{ roll.disadvantage }}
                </p>

                <sup class="text-xs">{{ `+${attackModifier || 0}` }}</sup>
              </div>
            </td>

            <td :class="[{ 'bg-emerald-300': advantage }, 'p-1']">
              <div :class="rollClass('advantage')">
                <p :class="[{ 'text-amber-400': roll.advantage === 20 }, 'text-md']">
                  {{ roll.advantage }}
                </p>

                <sup class="text-xs">{{ `+${attackModifier || 0}` }}</sup>
              </div>
            </td>
          </template>

          <td
            v-else
            :class="[{ 'text-amber-400': roll.roll === 20 }, '']">
            <div class="flex flex-row p-1 justify-center">
              <p class="text-md">
                {{ roll.roll }}
              </p>

              <sup class="text-xs text-center">{{ `+${attackModifier || 0}` }}</sup>
            </div>
          </td>

          <td class="p-1">
            {{ roll.final }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>