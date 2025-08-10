<script setup>
import { toRef, defineEmits, watchEffect, ref, computed, onBeforeMount } from 'vue'

const props = defineProps({
  position: {
    type: String,
    default: 'left'
  },
  fullHeight: {
    type: Boolean,
    default: false
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
  ];
  
  // Only add full height classes when explicitly requested
  if (props.fullHeight) {
    styles.push('h-full', 'max-h-screen', 'overflow-y-auto');
  }

  switch (props.position) {
    case 'left':
      styles.push('left-0', 'rounded-r-lg');
      break;
    case 'right':
      styles.push('right-0', 'rounded-l-lg');
      break;
    case 'bottom':
      styles.push('bottom-0', 'rounded-t-lg');
      break;
    case 'top':
      styles.push('top-0', 'rounded-b-lg');
      break;
  }

  return styles;
};
</script>

<template>
  <div :class="menuClass()">
    <slot />
  </div>
</template>

<style scoped>
/* Custom scrollbar styling for fullHeight menus */
.overflow-y-auto::-webkit-scrollbar {
  width: 8px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #3f3f46;
  border-radius: 4px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #71717a;
  border-radius: 4px;
  border: 1px solid #52525b;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #a1a1aa;
}

.overflow-y-auto::-webkit-scrollbar-thumb:active {
  background: #d4d4d8;
}
</style>
