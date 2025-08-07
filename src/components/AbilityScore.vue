<!-- AbilityScore.vue -->
<script setup lang="ts">
import type { AbilityScore } from '@/types/Creatures'

interface Props {
  name: string
  ability: AbilityScore
}

const props = defineProps<Props>()

const abilityModifier = (mod: number): string => {
  return mod >= 0 ? `+${mod}` : `${mod}`
}
</script>

<template>
  <div class="flex-1 text-center text-sm bg-zinc-900/60 rounded-md p-2 px-5">
    <div class="text-yellow-400 font-semibold uppercase text-xs">{{ name }}</div>
    <div class="text-2xl font-bold">{{ ability.value }}</div>
    <div class="flex gap-4 text-xs">
      <div class="text-blue-300">{{ abilityModifier(ability.mod) }}</div>
      <div class="text-green-300">{{ abilityModifier(ability.save) }}</div>
    </div>
    <!-- <div class="flex gap-2 text-xs text-gray-500 mt-1">
      <div>MOD</div>
      <div>SAVE</div>
    </div> -->
  </div>
</template>