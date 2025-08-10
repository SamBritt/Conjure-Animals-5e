<!-- ActionSection.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import type { Attack, ActionBase, MultiAttack } from '@/types/Creatures'
import DamageText from '@/components/DamageText.vue'

interface Props {
  title: string
  attacks?: Attack[]
  actions?: ActionBase[]
  multiAttack?: MultiAttack | null
}

const props = withDefaults(defineProps<Props>(), {
  attacks: () => [],
  actions: () => []
})

const hasContent = computed(() => {
  return props.multiAttack || 
         (props.attacks && props.attacks.length > 0) || 
         (props.actions && props.actions.length > 0)
})

console.log(props.actions)
</script>

<template>
  <div v-if="hasContent" class="mb-4">
    <h3 class="text-lg font-bold text-yellow-400 mb-2 border-b border-yellow-600 pb-1">
      {{ title }}
    </h3>
    
    <!-- Multiattack -->
    <div v-if="multiAttack" class="mb-3">
      <p class="text-yellow-300 font-semibold italic">Multiattack</p>
      <p class="text-sm leading-relaxed">
        <DamageText :text="multiAttack.text" />
      </p>
    </div>
    
    <!-- Attacks -->
    <div v-for="attack in attacks" :key="attack.name" class="mb-3">
      <p class="text-yellow-300 font-semibold italic">{{ attack.name }}</p>
      <p class="text-sm leading-relaxed">
        <DamageText :text="attack.text" />
      </p>
    </div>
    
    <!-- Other Actions -->
    <div v-for="action in actions" :key="action.name" class="mb-3">
      <p class="text-yellow-300 font-semibold italic">{{ action.name }}</p>
      <p class="text-sm leading-relaxed">
        <DamageText :text="action.text" />
      </p>
    </div>
  </div>
</template>