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

const props = defineProps<{
  attackRolls: AttackRoll[]
  disAdvantage: boolean
  advantage: boolean
  attackModifier?: number
  availableAttacks: AvailableAttack[]
  selectedAttack?: AvailableAttack
  conditionalDamageOptions: ActionDamage[]
  selectedConditionalDamage?: ActionDamage
}>()

const emits = defineEmits<{
  selectAttack: [attack: AvailableAttack]
  selectConditionalDamage: [damageOption: ActionDamage]
}>()

const handleAttackSelection = (attack: AvailableAttack) => {
  emits('selectAttack', attack)
}

const handleConditionalDamageSelection = (damageOption: ActionDamage) => {
  emits('selectConditionalDamage', damageOption)
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
      <h5 class="text-sm font-medium mb-2 text-white">Select Attack:</h5>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="attack in availableAttacks"
          :key="`${attack.creature}-${attack.name}`"
          @click="handleAttackSelection(attack)"
          :class="[
            'p-2 rounded-md border transition-colors text-sm',
            selectedAttack?.creature === attack.creature && selectedAttack?.name === attack.name
              ? 'bg-blue-500 border-blue-400 text-white'
              : 'bg-stone-500 border-stone-400 text-white hover:bg-stone-400'
          ]">
          <div class="text-xs text-gray-300">{{ attack.creature }}</div>
          <div class="font-medium">{{ attack.name }}</div>
          <div class="text-xs text-gray-400">+{{ attack.attackModifier }}</div>
        </button>
      </div>
    </div>

    <!-- Conditional Damage Selection Section -->
    <div v-if="conditionalDamageOptions.length > 0" class="bg-zinc-600 p-3 rounded">
      <h5 class="text-sm font-medium mb-2 text-white">Choose Damage Type:</h5>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="damageOption in conditionalDamageOptions"
          :key="`${damageOption.formula}-${damageOption.conditional?.condition}`"
          @click="handleConditionalDamageSelection(damageOption)"
          :class="[
            'p-2 rounded-md border transition-colors text-sm',
            selectedConditionalDamage?.formula === damageOption.formula && 
            selectedConditionalDamage?.conditional?.condition === damageOption.conditional?.condition
              ? 'bg-green-500 border-green-400 text-white'
              : 'bg-stone-500 border-stone-400 text-white hover:bg-stone-400'
          ]">
          <div class="font-medium">{{ damageOption.formula }} {{ damageOption.type }}</div>
          <div class="text-xs text-gray-300">{{ damageOption.conditional?.condition }}</div>
        </button>
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