<!-- StatBlock.vue -->
<script setup lang="ts">
interface Props {
  label: string
  value?: string | number  // Made optional since we might use slot instead
}

const props = defineProps<Props>()
</script>

<template>
  <div>
    <span class="text-yellow-400 font-semibold">{{ label }}</span>
    <span class="ml-2">
      <!-- Use slot if provided, otherwise show value -->
      <slot>{{ value }}</slot>
    </span>
  </div>
</template>