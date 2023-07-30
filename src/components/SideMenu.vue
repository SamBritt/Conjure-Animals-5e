<script setup>
import { toRef, defineEmits, watchEffect, ref, computed, onBeforeMount } from 'vue'

const props = defineProps({
  position: {
    type: String,
    default: 'left'
  }
})

const emit = defineEmits(['select'])

const menuClass = () => {
  const styles = [
    `absolute`,
    `z-20`,
    `flex`,
    `flex-col`,
    `bg-zinc-700`,
    `text-zinc-100`,
    `shadow-lg`
  ]

  switch (props.position) {
    case 'left':
      styles.push('left-0', 'rounded-r-lg')
      break
    case 'right':
      styles.push('right-0', 'rounded-l-lg')
      break
    case 'bottom':
      styles.push('bottom-0', 'rounded-t-lg')
      break
    case 'top':
      styles.push('top-0', 'rounded-b-lg')
      break
  }

  return styles
}
</script>

<template>
  <div :class="menuClass()">
    <slot />
  </div>
</template>

<style scoped></style>
