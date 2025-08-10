<script setup lang="ts">
interface Enemy {
  name: string
  ac: number | null
  hitRolls: number[]
  missedRolls: number[]
}

const props = defineProps<{
  selectedEnemy: Enemy | null
  hitEnemyRolls: number[]
  missedEnemyRolls: number[]
  suggestedAC: number | null
}>()

const emits = defineEmits<{
  setAC: [ac: number]
}>()

const handleSetAC = () => {
  if (props.suggestedAC) {
    emits('setAC', props.suggestedAC)
  }
}
</script>

<template>
  <div v-if="selectedEnemy" class="bg-slate-700 rounded-xl border border-slate-500 p-4 shadow-lg">
    <!-- Header with AC -->
    <div class="flex items-center gap-3 mb-3">
      <div class="flex items-center justify-center w-10 h-10 bg-slate-800 rounded-lg border border-slate-400">
        <span class="text-lg font-bold text-white">{{ selectedEnemy?.ac ?? '??' }}</span>
      </div>
      <div>
        <h3 class="text-base font-semibold text-white">{{ selectedEnemy.name }}</h3>
        <p class="text-xs text-slate-300">Target AC</p>
      </div>
    </div>

    <!-- Roll History -->
    <div class="flex gap-6 mb-3">
      <!-- Hit Rolls -->
      <div v-if="hitEnemyRolls.length > 0">
        <div class="text-xs font-medium text-emerald-400 mb-1">✓ Hits:</div>
        <div class="text-sm text-white font-mono">{{ hitEnemyRolls.join(', ') }}</div>
      </div>

      <!-- Miss Rolls -->
      <div v-if="missedEnemyRolls.length > 0">
        <div class="text-xs font-medium text-rose-400 mb-1">✗ Misses:</div>
        <div class="text-sm text-white font-mono">{{ missedEnemyRolls.join(', ') }}</div>
      </div>
    </div>

    <!-- AC Suggestion -->
    <div v-if="suggestedAC" class="flex items-center justify-between bg-blue-500/20 rounded-lg p-2 border border-blue-500/30">
      <span class="text-sm text-white">Suggested AC: <span class="font-bold">{{ suggestedAC }}</span></span>
      <button 
        @click="handleSetAC"
        class="px-3 py-1 bg-blue-500 hover:bg-blue-400 text-white text-xs font-semibold rounded transition-colors shadow-sm">
        Set AC
      </button>
    </div>
  </div>
</template>