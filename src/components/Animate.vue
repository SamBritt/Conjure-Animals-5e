<script setup>
import { defineEmits, ref, computed } from 'vue'
const emits = defineEmits(['click'])

const props = defineProps({
  style: {
    type: String,
    default: 'slide'
  }
})

const transitionProps = computed(() => {
  return {
    'enter-active-class': 'transition ease-out duration-200 transform',
    'enter-from-class': 'opacity-0 -translate-x-1',
    'enter-to-class': 'opacity-100',
    'leave-active-class': 'transition ease-in duration-200 transform',
    'leave-from-class': 'opacity-100',
    'leave-to-class': 'opacity-0 -translate-x-8'
  }
})

const buttonStyles = computed(() => {
  const styles = []

  return styles
})
</script>

<template>
  <Transition v-bind="transitionProps">
    <slot />
  </Transition>
</template>

<style scoped></style>
