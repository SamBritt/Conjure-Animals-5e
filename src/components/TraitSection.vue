<!-- TraitSection.vue -->
<script setup lang="ts">
interface Trait {
  name: string
  text: string
  description?: string
  options?: string[] | null
}

interface Props {
  title: string
  traits: Trait[]
}

const props = defineProps<Props>()
</script>

<template>
  <div v-if="traits && traits.length" class="mb-4">
    <h3 class="text-lg font-bold text-yellow-400 mb-2 border-b border-yellow-600 pb-1">
      {{ title }}
    </h3>
    <div v-for="trait in traits" :key="trait.name" class="mb-3">
      <p class="text-yellow-300 font-semibold italic">{{ trait.name }}</p>
      <p class="text-sm leading-relaxed">{{ trait.text }}</p>
    </div>
  </div>
</template>