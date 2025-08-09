<template>
  <div :class="[
    'rounded-lg p-4 text-center',
    cardClasses
  ]">
    <div :class="['text-2xl font-bold', numberClasses]">{{ count }}</div>
    <div :class="['text-sm', textClasses]">{{ label }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  type: 'success' | 'warning' | 'error'
  count: number
  label: string
}

const props = defineProps<Props>()

const cardClasses = computed(() => {
  switch (props.type) {
    case 'success':
      return 'bg-green-900/30 border border-green-600'
    case 'warning':
      return 'bg-yellow-900/30 border border-yellow-600'
    case 'error':
      return 'bg-red-900/30 border border-red-600'
    default:
      return ''
  }
})

const numberClasses = computed(() => {
  switch (props.type) {
    case 'success':
      return 'text-green-400'
    case 'warning':
      return 'text-yellow-400'
    case 'error':
      return 'text-red-400'
    default:
      return ''
  }
})

const textClasses = computed(() => {
  switch (props.type) {
    case 'success':
      return 'text-green-300'
    case 'warning':
      return 'text-yellow-300'
    case 'error':
      return 'text-red-300'
    default:
      return ''
  }
})
</script>