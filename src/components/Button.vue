<script setup>
import { defineEmits, ref, computed } from 'vue'
const emits = defineEmits(['click'])

const props = defineProps({
  text: String,
  disabled: {
    type: Boolean,
    default: false
  },
  primary: Boolean,
  secondary: Boolean,
  success: Boolean,
  danger: Boolean,
  info: Boolean,
  outline: Boolean,
  toggled: Boolean,
  rounded: Boolean,
  icon: String,
  small: Boolean,
  asIcon: Boolean,
  size: {
    type: String,
    default: 'normal'
  }
})

const buttonProps = computed(() => {
  return {
    disabled: props.disabled
  }
})

const buttonStyles = computed(() => {
  const styles = [
    `flex`,
    `justify-center`,
    `items-center`,
    `text-black`,
    `transition-all`,
    `ease`,
    `active:scale-95`
  ]

  if (props.rounded) styles.push('rounded-full', 'p-2', 'w-12', 'h-12')
  else if (!props.asIcon) styles.push(`rounded-md`, `py-1`, `px-2`) 
  else styles.push(`p-0`)

  if (props.small) styles.push(`w-5`, `h-5`, `border-1`, `p-0`)

  if (props.disabled) {
    styles.push('cursor-not-allowed', 'opacity-50')
  }

  if ((!props.outline || props.toggled) && !props.asIcon) {
    if (props.primary) styles.push('bg-sky-300', 'text-zinc-100')
    if (props.info) styles.push('bg-amber-200', 'text-amber-800')
    if (props.success) styles.push('bg-emerald-300', 'text-zinc-100')
    if (props.danger) styles.push('bg-rose-400', 'text-zinc-100')
    if (!(props.primary || props.info || props.success || props.danger || props.asIcon)) {
      styles.push('bg-white')
    }
  }

  if (props.outline) {
    if (props.small) styles.push(`border-2`)
    else styles.push('border-4')

    styles.push('text-zinc-100')

    if (!props.toggled) styles.push('bg-transparent')

    if (props.primary) styles.push('border-sky-300')
    if (props.info) styles.push('border-amber-200', 'text-amber-800')
    if (props.success) styles.push('border-emerald-300')
    if (props.danger) styles.push('border-rose-400')
  }

  if (props.asIcon) {
    styles.push('p-0', 'w-10', 'h-10')

    if (props.primary) styles.push('fill-sky-300')
    if (props.info) styles.push('fill-amber-200', 'text-amber-800')
    if (props.success) styles.push('fill-emerald-300')
    if (props.danger) styles.push('fill-rose-400')

  }

  return styles
})

const iconClass = computed(() => {
  const styles = []

  if (props.icon) {
    styles.push('fill-white')
  }

  return styles
})

const handleClick = () => {
  emits('click')
}
</script>

<template>
  <button
    v-bind="buttonProps"
    :class="buttonStyles"
    @click="handleClick">
    {{ text }}
    <slot />
  </button>
</template>

<style scoped></style>
