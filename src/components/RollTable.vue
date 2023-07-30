<script setup>
import { toRef, defineEmits, watchEffect, ref, computed, onBeforeMount } from 'vue'

const props = defineProps({
  attackRolls: [],
  advantage: Boolean,
  disAdvantage: Boolean
})

const rollClass = (row) => {
  const styles = [`flex`, `flex-row`, `justify-center`]

  switch (row) {
    case 'advantage':
      if (props.advantage.value) {
        styles.push('bg-emerald-300')
      }
      break
    case 'disadvantage':
      if (props.disAdvantage.value) {
        styles.push('bg-rose-400')
      }
      break
  }

  return styles
}
</script>

<template>
  <table class="bg-zinc-500 w-full p-1 text-center">
    <thead>
      <tr>
        <th class="border border-slate-600 p-1">Creature</th>

        <template v-if="advantage || disAdvantage">
          <th class="border border-slate-600 p-1">Disadvantage</th>
          <th class="border border-slate-600 p-1">Advantage</th>
        </template>

        <th
          v-else
          class="border border-slate-600 p-1">
          Roll
        </th>
        <th class="border border-slate-600 p-1">Final</th>
      </tr>
    </thead>

    <tbody>
      <tr
        v-for="roll in attackRolls"
        class="m-0">
        <td class="p-1">
          {{ `${roll.creature.name} ${roll.creature.index}` }}
        </td>

        <template v-if="advantage || disAdvantage">
          <td :class="[{ 'bg-rose-400': disAdvantage }, 'p-1']">
            <div :class="rollClass('disadvantage')">
              <p class="text-md">
                {{ roll.disadvantage }}
              </p>

              <sup class="text-xs">{{ `+${roll.creature.attackModifier}` }}</sup>
            </div>
          </td>

          <td :class="[{ 'bg-emerald-300': advantage }, 'p-1']">
            <div :class="rollClass('advantage')">
              <p :class="[{ 'text-amber-400': roll.advantage === 20 }, 'text-md']">
                {{ roll.advantage }}
              </p>

              <sup class="text-xs">{{ `+${roll.creature.attackModifier}` }}</sup>
            </div>
          </td>
        </template>

        <td
          v-else
          :class="[{ 'text-amber-400': roll.roll === 20 }, '']">
          <div class="flex flex-row p-1 justify-center">
            <p class="text-md">
              {{ roll.roll }}
            </p>

            <sup class="text-xs text-center">{{ `+${roll.creature.attackModifier}` }}</sup>
          </div>
        </td>

        <td class="p-1">
          {{ roll.final }}
        </td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped></style>
