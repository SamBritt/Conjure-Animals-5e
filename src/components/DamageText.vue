<!-- DamageText.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { parseDamageText } from '@/utils/textParsing'

interface Props {
  text: string
}

const props = defineProps<Props>()

// Parse the damage text using the utility function
const parsedText = computed(() => parseDamageText(props.text))
</script>

<template>
  <span>
    <template v-for="(part, index) in parsedText.parts" :key="index">
      <span 
        v-if="part.isDamage" 
        class="italic text-orange-400 font-medium">
        {{ part.text }}
      </span>
      <span v-else>{{ part.text }}</span>
    </template>
  </span>
</template>