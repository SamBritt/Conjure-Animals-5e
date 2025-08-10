<!-- DiceRollToast.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { useDiceRoller } from '@/composables/useDiceRoller'
import type { DiceRollResult } from '@/composables/useDiceRoller'

const { rollResults, removeRollResult } = useDiceRoller()

const formatRolls = (result: DiceRollResult): string => {
  const rollsText = result.rolls.join(' + ')
  if (result.modifier > 0) {
    return `${rollsText} + ${result.modifier}`
  } else if (result.modifier < 0) {
    return `${rollsText} - ${Math.abs(result.modifier)}`
  }
  return rollsText
}

const getTimeAgo = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m ago`
}
</script>

<template>
  <!-- Toast Container - Fixed position bottom right -->
  <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
    <TransitionGroup 
      name="toast"
      tag="div"
      class="flex flex-col gap-2">
      <div
        v-for="result in rollResults"
        :key="result.id"
        class="bg-slate-800 border border-slate-600 rounded-lg shadow-lg p-3 min-w-64">
        
        <!-- Header -->
        <div class="flex justify-between items-start mb-2">
          <div class="flex items-center gap-2">
            <div class="text-xs text-gray-400 font-mono">{{ result.formula }}</div>
            <div class="text-xs text-gray-500">{{ getTimeAgo(result.timestamp) }}</div>
          </div>
          <button 
            @click="removeRollResult(result.id)"
            class="text-gray-400 hover:text-white text-xs">×</button>
        </div>
        
        <!-- Roll Details -->
        <div class="text-sm text-gray-300 mb-2">
          {{ formatRolls(result) }}
        </div>
        
        <!-- Result -->
        <div class="text-right">
          <span class="text-2xl font-bold text-orange-400">{{ result.result }}</span>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
/* Toast transition animations */
.toast-enter-active {
  transition: all 0.3s ease-out;
}

.toast-leave-active {
  transition: all 0.3s ease-in;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.toast-move {
  transition: transform 0.3s ease;
}
</style>