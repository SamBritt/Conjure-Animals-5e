<!-- DamageText.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { parseDamageText } from '@/utils/textParsing'
import { useDiceRoller } from '@/composables/useDiceRoller'

interface Props {
  text: string
}

const props = defineProps<Props>()

// Parse the damage text using the utility function
const parsedText = computed(() => parseDamageText(props.text))

// Use dice roller
const { rollAndNotify } = useDiceRoller()

// Handle clicking on damage text to roll dice
const rollDamage = (formula: string): void => {
  try {
    rollAndNotify(formula)
  } catch (error) {
    console.error('Failed to roll dice:', error)
  }
}
</script>

<template>
  <span>
    <template v-for="(part, index) in parsedText.parts" :key="index">
      <span 
        v-if="part.isDamage" 
        class="italic text-orange-400 font-medium cursor-pointer hover:text-orange-300 hover:bg-orange-400 hover:bg-opacity-10 px-1 py-0.5 rounded transition-all duration-200"
        :title="`Roll ${part.text}`"
        @click="rollDamage(part.text)">
        {{ part.text }}
      </span>
      <span v-else>{{ part.text }}</span>
    </template>
  </span>
</template>