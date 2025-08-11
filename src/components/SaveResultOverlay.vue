<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
interface SaveResult {
  creatureUuid: string
  abilityType: string
  result: number
  modifier: number
  rollType: 'save' | 'check'
}

const props = defineProps<{
  results: SaveResult[]
  show: boolean
}>()

const emit = defineEmits<{
  dismiss: [creatureUuid: string]
}>()

// Force component re-render to update positions
const updateTrigger = ref(0)

const getOverlayPosition = (creatureUuid: string): object => {
  // Access the trigger to make this reactive to window resize
  updateTrigger.value
  
  // Find the creature card element using the data attribute
  const creatureElement = document.querySelector(`[data-creature-uuid="${creatureUuid}"]`)
  if (!creatureElement) {
    return { display: 'none' }
  }

  const rect = creatureElement.getBoundingClientRect()
  return {
    left: `${rect.left + rect.width / 2 - 40}px`, // Center horizontally (assuming ~80px overlay width)
    top: `${rect.top - 45}px`, // Position above the card
    transform: 'translateX(-50%)'
  }
}

const updatePositions = (): void => {
  updateTrigger.value++
}

const dismissResult = (creatureUuid: string): void => {
  emit('dismiss', creatureUuid)
}

// Add resize listener to update positions when window changes
onMounted(() => {
  window.addEventListener('resize', updatePositions)
})

onUnmounted(() => {
  window.removeEventListener('resize', updatePositions)
})
</script>

<template>
  <div
    v-if="show"
    v-for="result in results"
    :key="result.creatureUuid"
    :style="getOverlayPosition(result.creatureUuid)"
    class="fixed z-40 bg-zinc-800 border border-zinc-500 rounded-lg px-3 py-2 shadow-lg flex items-center gap-2">
    <div class="text-center">
      <div class="text-xs font-medium text-gray-300">{{ result.abilityType }}</div>
      <div class="text-sm font-bold text-white">{{ result.result }} ({{ result.modifier >= 0 ? '+' : '' }}{{ result.modifier }})</div>
    </div>
    <button
      @click="dismissResult(result.creatureUuid)"
      class="text-gray-400 hover:text-white text-xs font-bold w-4 h-4 flex items-center justify-center">
      ×
    </button>
  </div>
</template>