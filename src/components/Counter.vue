<script setup>
import { toRef, defineEmits, watchEffect, ref, computed, onBeforeMount } from 'vue'
import MinusIcon from '../assets/minus.svg?component'
import Button from '@/components/Button.vue'
import PlusIcon from '../assets/plus3.svg?component'
const props = defineProps({
  creature: Object,
  index: Number
})

const emit = defineEmits(['increase', 'decrease'])

const value = ref(0)

const increase = () => {
  value.value += 1
  emit('increase', value.value)
}

const decrease = () => {
  if (value.value <= 0) return

  value.value -= 1
  emit('decrease', value.value)
}
</script>

<template>
  <div class="flex gap-3 items-center">
    <Button
      rounded
      outline
      small
      @click="decrease">
      <MinusIcon class="fill-white stroke-white" />
    </Button>

    <span class="text-lg font-semibold">{{ value }}</span>
    
    <Button
      rounded
      outline
      small
      @click="increase">
      <PlusIcon class="fill-white stroke-white" />
    </Button>
  </div>
</template>

<style scoped></style>
