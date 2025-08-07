<!-- CreatureToken.vue -->
<script setup lang="ts">
import { ref, toRef } from 'vue'
import type { Creature } from '@/types/Creatures'
import { useCreature } from '@/composables/useCreature'

interface Props {
  creature: Creature
  showFallback?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showFallback: true
})

const { tokenUrl } = useCreature(toRef(props, 'creature'))

const imageError = ref(false)
const imageLoaded = ref(false)

const handleImageLoad = () => {
  imageError.value = false
  imageLoaded.value = true
}

const handleImageError = () => {
  imageError.value = true
  imageLoaded.value = false
}
</script>

<template>
  <div 
    class="w-36 h-36 rounded-full  flex items-center justify-center relative"
    :title="creature.name">
    
    <!-- Loading state - subtle pulse -->
    <div 
      v-if="tokenUrl && !imageLoaded && !imageError" 
      class="absolute inset-0 rounded-full bg-slate-600 animate-pulse">
    </div>
    
    <!-- Token image with fade-in -->
    <img
      v-if="tokenUrl && !imageError"
      :src="tokenUrl"
      :alt="`${creature.name} token`"
      @load="handleImageLoad"
      @error="handleImageError"
      :class="[
        'w-full h-full object-contain transition-opacity duration-300',
        imageLoaded ? 'opacity-100' : 'opacity-0'
      ]" />
    
    <!-- Simple text fallback when image fails or no URL -->
    <div 
      v-else-if="showFallback"
      class="text-gray-600 font-bold text-xs text-center leading-tight">
      {{ creature.name.split(' ').map(word => word[0]).join('').slice(0, 2) }}
    </div>
  </div>
</template>