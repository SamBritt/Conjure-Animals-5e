<!-- AbilityScores.vue -->
<script setup lang="ts">
import type { AbilityScore } from '@/types/Creatures'
import AbilityScoreComponent from '@/components/AbilityScore.vue'

interface Props {
  abilities: Record<string, AbilityScore>
}

const props = defineProps<Props>()
</script>

<template>
  <div class="my-4">
    <div class="flex justify-between">
      <AbilityScoreComponent 
        v-for="(ability, key) in abilities" 
        :key="key"
        :name="key"
        :ability="ability" />
    </div>
  </div>
</template>