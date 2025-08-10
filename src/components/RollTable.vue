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
  showResultsTable?: boolean
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
  <div class="space-y-6">
    <!-- Attack Selection Section -->
    <div v-if="availableAttacks.length > 0" class="bg-gradient-to-r from-zinc-700 to-zinc-600 p-4 rounded-xl border border-zinc-500">
      <div class="flex items-center gap-2 mb-4">
        <div class="flex items-center justify-center w-8 h-8 bg-blue-500 rounded-lg">
          <span class="text-sm font-bold text-white">⚔️</span>
        </div>
        <div>
          <h5 class="text-lg font-semibold text-white">Attack Selection</h5>
          <p class="text-xs text-gray-300">Choose one attack per creature type</p>
        </div>
      </div>
      
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <button
          v-for="attack in availableAttacks"
          :key="`${attack.creature}-${attack.name}`"
          @click="handleToggleAttackSelection(attack)"
          :class="[
            'group relative p-3 rounded-lg border-2 transition-all duration-200 transform hover:scale-105',
            selectedAttacks.some(a => a.creature === attack.creature && a.name === attack.name)
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-500/30'
              : 'bg-zinc-600 border-zinc-500 text-white hover:bg-zinc-500 hover:border-zinc-400'
          ]">
          
          <!-- Selected indicator -->
          <div v-if="selectedAttacks.some(a => a.creature === attack.creature && a.name === attack.name)" 
               class="absolute -top-1 -right-1 w-6 h-6 bg-emerald-400 rounded-full flex items-center justify-center">
            <span class="text-xs font-bold text-black">✓</span>
          </div>
          
          <div class="text-left">
            <div class="text-xs font-medium text-gray-300 group-hover:text-gray-200 mb-1">{{ attack.creature }}</div>
            <div class="font-semibold text-sm mb-2">{{ attack.name }}</div>
            <div class="flex items-center justify-between">
              <div class="text-xs bg-black/20 px-2 py-1 rounded">
                Attack: +{{ attack.attackModifier }}
              </div>
            </div>
          </div>
        </button>
      </div>
      
      <div class="mt-4 p-3 bg-zinc-800/50 rounded-lg">
        <p class="text-xs text-gray-300 text-center italic">
          💡 Click attacks to select/change them. Each creature type needs one attack selected for battle.
        </p>
      </div>
    </div>

    <!-- Per-Attack Conditional Damage Selection Section -->
    <div v-if="attacksWithConditionals.length > 0" class="bg-gradient-to-r from-zinc-700 to-zinc-600 p-4 rounded-xl border border-zinc-500">
      <div class="flex items-center gap-2 mb-4">
        <div class="flex items-center justify-center w-8 h-8 bg-purple-500 rounded-lg">
          <span class="text-sm font-bold text-white">🎯</span>
        </div>
        <div>
          <h5 class="text-lg font-semibold text-white">Damage Options</h5>
          <p class="text-xs text-gray-300">Select damage type for each attack</p>
        </div>
      </div>
      
      <div class="space-y-3">
        <div
          v-for="attackData in attacksWithConditionals"
          :key="attackData.attackKey"
          class="bg-zinc-600 p-3 rounded-lg border border-zinc-500"
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
                'px-3 py-2 rounded-lg text-xs border transition-colors',
                attackData.selectedConditional?.formula === damageOption.formula && 
                attackData.selectedConditional?.conditional?.condition === damageOption.conditional?.condition
                  ? 'bg-emerald-500 border-emerald-400 text-white'
                  : 'bg-zinc-700 border-zinc-600 text-white hover:bg-zinc-600'
              ]">
              
              <div class="font-medium">{{ damageOption.formula }} {{ damageOption.type }}</div>
              <div class="text-gray-300">{{ damageOption.conditional?.condition }}</div>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Roll Results Table -->
    <div v-if="showResultsTable !== false && attackRolls.length > 0" class="bg-gradient-to-r from-zinc-700 to-zinc-600 rounded-xl border border-zinc-500 overflow-hidden">
      <div class="bg-zinc-800/80 p-4 border-b border-zinc-600">
        <div class="flex items-center gap-2">
          <div class="flex items-center justify-center w-8 h-8 bg-orange-500 rounded-lg">
            <span class="text-sm font-bold text-white">🎲</span>
          </div>
          <div>
            <h5 class="text-lg font-semibold text-white">Attack Roll Results</h5>
            <p class="text-xs text-gray-300">Individual creature attack outcomes</p>
          </div>
        </div>
      </div>
      
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="bg-zinc-800/60">
              <th class="text-left p-4 text-sm font-semibold text-gray-200 border-b border-zinc-600">Creature</th>

              <template v-if="advantage || disAdvantage">
                <th class="text-center p-4 text-sm font-semibold text-gray-200 border-b border-zinc-600">
                  <div class="flex items-center justify-center gap-1">
                    <span class="text-rose-400">📉</span>
                    <span>Disadvantage</span>
                  </div>
                </th>
                <th class="text-center p-4 text-sm font-semibold text-gray-200 border-b border-zinc-600">
                  <div class="flex items-center justify-center gap-1">
                    <span class="text-emerald-400">📈</span>
                    <span>Advantage</span>
                  </div>
                </th>
              </template>

              <th v-else class="text-center p-4 text-sm font-semibold text-gray-200 border-b border-zinc-600">
                <div class="flex items-center justify-center gap-1">
                  <span>🎯</span>
                  <span>Roll</span>
                </div>
              </th>
              
              <th class="text-center p-4 text-sm font-semibold text-gray-200 border-b border-zinc-600">
                <div class="flex items-center justify-center gap-1">
                  <span>⚡</span>
                  <span>Final</span>
                </div>
              </th>
            </tr>
          </thead>

          <tbody class="divide-y divide-zinc-600/30">
            <tr
              v-for="roll in attackRolls"
              :key="`${roll.creature.uuid}-${roll.roll}`"
              :class="[
                'hover:bg-zinc-600/20 transition-colors',
                roll.hit 
                  ? roll.isCritical 
                    ? 'bg-yellow-500/10 border-l-4 border-yellow-400' 
                    : 'bg-emerald-500/10 border-l-4 border-emerald-400'
                  : 'bg-rose-500/10 border-l-4 border-rose-400'
              ]">
              
              <td class="p-3">
                <div class="text-sm font-medium text-white">
                  {{ `${roll.creature.name} ${roll.creature.index}` }}
                </div>
              </td>

              <template v-if="advantage || disAdvantage">
                <td :class="[
                  'p-3 text-center font-mono text-lg font-bold',
                  disAdvantage ? 'text-rose-300 bg-rose-500/20' : 'text-gray-400'
                ]">
                  <div class="flex items-center justify-center gap-1">
                    <span>{{ roll.disadvantage }}</span>
                    <span class="text-xs opacity-60">+{{ attackModifier || 0 }}</span>
                  </div>
                </td>

                <td :class="[
                  'p-3 text-center font-mono text-lg font-bold',
                  advantage 
                    ? roll.advantage === 20 
                      ? 'text-yellow-300 bg-yellow-500/20' 
                      : 'text-emerald-300 bg-emerald-500/20'
                    : 'text-gray-400'
                ]">
                  <div class="flex items-center justify-center gap-1">
                    <span :class="{ 'text-yellow-300': roll.advantage === 20 }">
                      {{ roll.advantage }}
                    </span>
                    <span class="text-xs opacity-60">+{{ attackModifier || 0 }}</span>
                  </div>
                </td>
              </template>

              <td v-else :class="[
                'p-3 text-center font-mono text-lg font-bold',
                roll.roll === 20 ? 'text-yellow-300 bg-yellow-500/20' : 'text-blue-300'
              ]">
                <div class="flex items-center justify-center gap-1">
                  <span>{{ roll.roll }}</span>
                  <span class="text-xs opacity-60">+{{ attackModifier || 0 }}</span>
                </div>
              </td>

              <td class="p-3 text-center">
                <div class="flex items-center justify-center gap-2">
                  <span :class="[
                    'font-mono text-xl font-bold',
                    roll.hit 
                      ? roll.isCritical
                        ? 'text-yellow-300'
                        : 'text-emerald-300'
                      : 'text-rose-300'
                  ]">
                    {{ roll.final }}
                  </span>
                  
                  <span :class="[
                    'text-xs px-2 py-1 rounded font-semibold',
                    roll.hit 
                      ? roll.isCritical
                        ? 'bg-yellow-500 text-black'
                        : 'bg-emerald-500 text-white'
                      : 'bg-rose-500 text-white'
                  ]">
                    {{ roll.isCritical ? 'CRIT' : roll.hit ? 'HIT' : 'MISS' }}
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- Empty State -->
    <div v-else-if="showResultsTable !== false" class="bg-zinc-700 p-8 rounded-xl border border-zinc-600 text-center">
      <div class="text-4xl mb-2">🎲</div>
      <h5 class="text-lg font-medium text-white mb-2">No Attack Rolls Yet</h5>
      <p class="text-sm text-gray-400">Roll for attacks to see the results here</p>
    </div>
  </div>
</template>