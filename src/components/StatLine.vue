<!-- StatLine.vue -->
<script setup lang="ts">
interface Props {
  label: string
  value: string | null | undefined
}

const props = defineProps<Props>()
</script>

<template>
  <div v-if="value" class="text-sm">
    <span class="text-yellow-400 font-semibold">{{ label }}</span>
    <span class="ml-2">{{ value }}</span>
  </div>
</template>