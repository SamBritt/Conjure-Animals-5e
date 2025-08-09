<script setup lang="ts">
import { defineEmits, ref, computed } from 'vue'
import type { AbilityKey, Creature, Attack } from '@/types/Creatures'

interface SummonedCreature extends Creature {
  index: number
  tempHP?: number
  maxHP: number
  uuid: string
}

const props = defineProps<{
  creature: SummonedCreature | Creature
  index: number
  type: string
  selected?: boolean
}>()

const emit = defineEmits(['select'])

const select = () => {
  emit('select', props.creature)
}

const creatureClass = computed(() => {
  const baseClasses = [
    'relative',
    'flex',
    'flex-col',
    'items-center',
    'justify-center',
    'w-28',
    'h-32',
    'p-3',
    'cursor-pointer',
    'transition-all',
    'duration-300',
    'ease-out',
    'rounded-xl'
  ]

  // Enhanced shadows and transforms
  const interactionClasses = [
    'shadow-lg',
    'hover:shadow-xl',
    'hover:scale-105',
    'active:scale-95',
    'transform',
    'hover:-translate-y-1'
  ]

  // Background gradients based on type and state
  let backgroundClasses: string[] = []
  
  if (props.selected) {
    if (props.type === 'creature') {
      backgroundClasses = [
        'bg-gradient-to-br',
        'from-emerald-500',
        'to-emerald-700',
        'ring-2',
        'ring-emerald-300',
        'ring-opacity-75'
      ]
    } else {
      backgroundClasses = [
        'bg-gradient-to-br',
        'from-rose-500',
        'to-rose-700',
        'ring-2',
        'ring-rose-300',
        'ring-opacity-75'
      ]
    }
  } else {
    if (props.type === 'creature') {
      backgroundClasses = [
        'bg-gradient-to-br',
        'from-slate-600',
        'to-slate-800',
        'hover:from-slate-500',
        'hover:to-slate-700'
      ]
    } else {
      backgroundClasses = [
        'bg-gradient-to-br',
        'from-rose-600',
        'to-rose-800',
        'hover:from-rose-500',
        'hover:to-rose-700'
      ]
    }
  }

  return [...baseClasses, ...interactionClasses, ...backgroundClasses]
})

const indexBadgeClass = computed(() => [
  'absolute',
  'bottom-0',
  'left-1/2',
  'transform',
  '-translate-x-1/2',
  'translate-y-1/2',
  'w-6',
  'h-6',
  'bg-zinc-800',
  'text-white',
  'text-xs',
  'font-bold',
  'rounded-full',
  'flex',
  'items-center',
  'justify-center',
  'border-2',
  'border-white',
  'shadow-lg',
  'z-10'
])

const acBadgeClass = computed(() => [
  'absolute',
  'top-0',
  'right-0',
  'transform',
  'translate-x-1/2',
  '-translate-y-1/2',
  'bg-amber-500',
  'text-white',
  'text-center',
  'rounded-ull',
  'px-2',
  'py-1',
  'shadow-lg',
  'border-2',
  'border-white',
  'min-w-8',
  'z-10'
])

const tempHPBadgeClass = computed(() => [
  'absolute',
  'top-0',
  'left-0',
  'transform',
  '-translate-x-1/2',
  '-translate-y-1/2',
  'bg-blue-500',
  'text-white',
  'text-center',
  'rounded-full',
  'px-2',
  'py-1',
  'shadow-lg',
  'border-2',
  'border-white',
  'min-w-8',
  'z-10'
])

// Check if creature has temp HP
const hasTemporaryHP = computed(() => {
  const creature = props.creature as SummonedCreature
  return creature.tempHP && creature.tempHP > 0
})
</script>

<template>
  <div
    :class="creatureClass"
    @click="select">
    
    <!-- Creature Name -->
    <div class="text-white text-center mb-2">
      <div class="text-xs font-medium truncate w-full px-1 leading-tight">
        {{ creature.name }}
      </div>
    </div>
    
    <!-- HP Display -->
    <div class="flex flex-col items-center text-white">
      <div class="text-xl font-bold">
        {{ creature.hp.average }}
      </div>
      <div class="text-xs uppercase tracking-wide opacity-75">
        HP
      </div>
    </div>
    
    <!-- Index Badge -->
    <div :class="indexBadgeClass">
      {{ index }}
    </div>
    
    <!-- AC Badge (for enemies) -->
    <div
      v-if="props.type === 'enemy'"
      :class="acBadgeClass">
      <div class="text-xs font-bold">{{ creature.ac || '??' }}</div>
      <div class="text-xs opacity-80">AC</div>
    </div>
    
    <!-- Temp HP Badge (for creatures with temporary HP) -->
    <div
      v-if="hasTemporaryHP"
      :class="tempHPBadgeClass">
      <div class="text-xs font-bold">{{ (creature as SummonedCreature).tempHP }}</div>
      <div class="text-xs opacity-80">TMP</div>
    </div>
    
    <!-- Selection Glow Effect -->
    <div v-if="props.selected" class="absolute inset-0 rounded-xl animate-pulse border-2 border-white opacity-30 z-0"></div>
    
    <!-- Hover Shimmer Effect -->
    <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white to-transparent opacity-0 hover:opacity-5 transition-opacity duration-300 transform -skew-x-12 z-0"></div>
  </div>
</template>

<style scoped></style>
