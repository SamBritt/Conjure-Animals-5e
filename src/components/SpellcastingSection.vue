<!-- SpellcastingSection.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import type { SpellcastingEntry } from '@/types/Creatures'

interface Props {
  spellcasting: SpellcastingEntry[]
}

const props = defineProps<Props>()

// Show all spellcasting entries regardless of displayAs value
// The detailed spell breakdown should always appear in the Spellcasting section
const mainSpellcasting = computed(() => {
  return props.spellcasting || []
})
</script>

<template>
  <div v-if="mainSpellcasting && mainSpellcasting.length" class="mb-4">
    <h3 class="text-lg font-bold text-yellow-400 mb-2 border-b border-yellow-600 pb-1">
      Spellcasting
    </h3>
    
    <div v-for="spell in mainSpellcasting" :key="spell.name" class="mb-3">
      <p class="text-yellow-300 font-semibold italic">{{ spell.name }}.</p>
      
      <!-- Header Entries -->
      <div v-for="entry in spell.headerEntries" :key="entry" class="text-sm mb-1 leading-relaxed">
        {{ entry }}
      </div>
      
      <!-- At Will Spells -->
      <div v-if="spell.spells.will" class="mt-2">
        <p class="text-sm">
          <span class="font-semibold">At will:</span> 
          <span v-for="(spellName, index) in spell.spells.will" :key="spellName" class="text-blue-300">
            {{ spellName }}<span v-if="index < spell.spells.will.length - 1">, </span>
          </span>
        </p>
      </div>
      
      <!-- Daily Spells -->
      <div v-if="spell.spells.daily" class="mt-1 space-y-1">
        <div v-for="(spells, frequency) in spell.spells.daily" :key="frequency" class="text-sm">
          <span class="font-semibold">{{ frequency }}:</span> 
          <span v-for="(spellName, index) in spells" :key="spellName" class="text-blue-300">
            {{ spellName }}<span v-if="index < spells.length - 1">, </span>
          </span>
        </div>
      </div>

      <!-- Recharge Spells -->
      <div v-if="spell.spells.recharge" class="mt-2 space-y-1">
        <div v-for="(spells, recharge) in spell.spells.recharge" :key="recharge" class="text-sm">
          <span class="font-semibold">Recharge {{ recharge }}{{ recharge === '6' ? '' : '–6' }}:</span> 
          <span v-for="(spellName, index) in spells" :key="spellName" class="text-blue-300">
            <em>{{ spellName }}</em><span v-if="index < spells.length - 1">, </span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>