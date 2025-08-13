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
  <div 
    v-if="selectedEnemy"
    class="fixed top-4 left-1/2 transform -translate-x-1/2 z-30 pointer-events-none">
    
    <!-- Content with heavy blur background -->
    <div class="relative flex items-center gap-6 px-6 py-3 pointer-events-auto"
         style="background: radial-gradient(ellipse 120% 80% at center, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 40%, transparent 70%); backdrop-filter: blur(32px); -webkit-backdrop-filter: blur(32px); border-radius: 12px;">
      
      <!-- Miss Rolls (Left) -->
      <div class="flex flex-col items-center min-w-24">
        <div class="text-xs font-medium text-rose-400 mb-1 uppercase tracking-wide">Misses</div>
        <div class="text-sm text-white font-mono text-center">
          {{ missedEnemyRolls.length > 0 ? missedEnemyRolls.join(', ') : '—' }}
        </div>
      </div>
      
      <!-- AC Display (Center) -->
      <div class="flex flex-col items-center">
        <div class="text-xs font-medium text-gray-300 mb-1 uppercase tracking-wide">{{ selectedEnemy.name }}</div>
        <div class="text-2xl font-bold text-white">{{ selectedEnemy?.ac ?? '??' }}</div>
        <div class="text-xs text-gray-400 uppercase tracking-wide">AC</div>
        
        <!-- AC Suggestion (Below AC) -->
        <div v-if="suggestedAC" class="mt-2 flex items-center gap-2 bg-blue-500/30 rounded px-2 py-1">
          <span class="text-xs text-white">{{ suggestedAC }}</span>
          <button 
            @click="handleSetAC"
            class="px-2 py-0.5 bg-blue-500 hover:bg-blue-400 text-white text-xs rounded transition-colors">
            Set
          </button>
        </div>
      </div>
      
      <!-- Hit Rolls (Right) -->
      <div class="flex flex-col items-center min-w-24">
        <div class="text-xs font-medium text-emerald-400 mb-1 uppercase tracking-wide">Hits</div>
        <div class="text-sm text-white font-mono text-center">
          {{ hitEnemyRolls.length > 0 ? hitEnemyRolls.join(', ') : '—' }}
        </div>
      </div>
      
    </div>
  </div>
</template>