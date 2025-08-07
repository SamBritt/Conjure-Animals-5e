<script setup lang="ts">
interface DamageDetail {
  creatureIndex: number
  creatureName: string
  attackName: string
  isCritical: boolean
  rollValue: number
  damageRolls: {
    type: string
    diceRolled: string  // e.g. "2d8" or "4d8 (crit)"
    rolled: number
    modifier: number
    total: number
  }[]
  totalDamage: number
}

const props = defineProps<{
  damageDetails: DamageDetail[]
}>()

const emits = defineEmits<{
  close: []
}>()
</script>

<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-zinc-800 p-6 rounded-lg max-w-2xl max-h-96 overflow-y-auto">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold text-white">Damage Breakdown</h3>
        <button 
          @click="emits('close')"
          class="text-gray-400 hover:text-white text-xl">
          ×
        </button>
      </div>
      
      <div class="space-y-4">
        <div 
          v-for="detail in damageDetails" 
          :key="`${detail.creatureName}-${detail.creatureIndex}`"
          :class="[
            'p-3 rounded border-l-4',
            detail.isCritical 
              ? 'bg-yellow-900 border-yellow-500' 
              : 'bg-zinc-700 border-gray-500'
          ]">
          
          <div class="flex justify-between items-start mb-2">
            <div>
              <h4 class="font-medium text-white">
                {{ detail.creatureName }} #{{ detail.creatureIndex }}
              </h4>
              <p class="text-sm text-gray-300">
                {{ detail.attackName }} (rolled {{ detail.rollValue }})
                <span v-if="detail.isCritical" class="text-yellow-300 font-bold ml-1">
                  CRITICAL HIT!
                </span>
              </p>
            </div>
            <div class="text-right">
              <div class="text-xl font-bold text-white">
                {{ detail.totalDamage }}
              </div>
              <div class="text-xs text-gray-400">total</div>
            </div>
          </div>
          
          <div class="grid grid-cols-1 gap-1">
            <div 
              v-for="dmg in detail.damageRolls" 
              :key="dmg.type"
              class="flex justify-between items-center text-sm">
              <span class="text-gray-300">
                {{ dmg.diceRolled }} + {{ dmg.modifier }} {{ dmg.type }}
              </span>
              <span class="text-white font-medium">
                {{ dmg.rolled }} + {{ dmg.modifier }} = {{ dmg.total }}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div v-if="damageDetails.length === 0" class="text-center text-gray-400 py-8">
        No damage rolled yet
      </div>
    </div>
  </div>
</template>