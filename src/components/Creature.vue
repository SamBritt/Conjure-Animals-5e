<script setup>
import { defineEmits, ref, computed } from 'vue'

const props = defineProps({
  creature: Object,
  index: Number,
  type: String
})

const emit = defineEmits(['select'])

const selected = ref(false)

const select = () => {
  emit('select', props.creature)
  selected.value = !selected.value
}

const creatureClass = computed(() => {
  const arr = [
    'relative',
    'flex',
    'items-center',
    'justify-center',
    'w-20',
    'h-20',
    'shadow-lg',
    'hover:shadow-xl',
    'hover:scale-105',
    'active:scale-95',
    'hover:-mt-1',
    'hover:cursor-pointer',
    'transition-all',
    'ease',
    'rounded-full'
  ]

  if (selected.value) {
    props.type === 'creature' ? arr.push('bg-emerald-300') : arr.push('bg-rose-300')
  } else {
    props.type === 'creature' ? arr.push('bg-slate-500') : arr.push('bg-rose-500')
  }

  return arr
})
</script>

<template>
  <div
    :class="creatureClass"
    @click="select">
    <div class="absolute flex justify-center w-6 bg-zinc-200 bottom-0 rounded-full">
      {{ index }}
    </div>
    <div class="flex flex-col">
      <p class="m-0 text-xl">{{ creature.hp }}</p>
      <p
        v-if="props.type == 'enemy'"
        class="absolute flex justify-center w-6 top-0 right-0 bg-zinc-200 rounded-full m-0 text-md">
        {{ creature.ac || '??' }}
      </p>
    </div>
  </div>
</template>

<style scoped></style>
