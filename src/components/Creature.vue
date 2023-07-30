<script setup>
import { toRef, defineEmits, watchEffect, ref, computed, onBeforeMount } from 'vue'

const props = defineProps({
  creature: Object,
  index: Number
})

const emit = defineEmits(['select'])

const selected = ref(false)

const select = () => {
  emit('select', props.creature)
  selected.value = !selected.value
}
</script>

<template>
  <div
    :class="[
      selected ? 'bg-emerald-300' : 'bg-slate-500',
      'relative flex items-center justify-center w-20 h-20 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 hover:-mt-1 hover:cursor-pointer transition-all ease rounded-full'
    ]"
    @click="select"
  >
  <div class="absolute flex justify-center w-6 bg-zinc-200 bottom-0 rounded-full">
    {{ index }}
  </div>
    <p class="m-0 text-xl">{{ creature.hp }}</p>
  </div>
</template>

<style scoped></style>
