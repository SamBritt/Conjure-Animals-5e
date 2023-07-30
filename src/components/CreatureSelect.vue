<script setup>
import { computed, ref } from 'vue'
import Button from './Button.vue'
import Counter from '@/components/Counter.vue'

const emits = defineEmits(['summon'])

const list = ref([
  {
    id: 1,
    name: 'Wolf',
    attackModifier: 2,
    attack: [],
    multiAttack: [{ name: 'bite', dieCount: 2, die: 6, type: 'piercing' }],
    hp: 11
  },
  {
    id: 2,
    name: 'Black Bear',
    attackModifier: 2,
    attack: [],
    multiAttack: [
      { name: 'bite', dieCount: 1, die: 6, type: 'piercing' },
      { name: 'claw', dieCount: 2, die: 4, type: 'slashing' }
    ],
    hp: 19
  },
  {
    id: 3,
    name: 'Hawk',
    attackModifier: 3,
    attack: [],
    multiAttack: [{ name: 'bite', dieCount: 1, die: 4, type: 'piercing' }],
    hp: 8
  },
  {
    id: 4,
    name: 'Boar',
    attackModifier: 5,
    attack: [],
    multiAttack: [{ name: 'bite', dieCount: 2, die: 6, type: 'piercing' }],
    hp: 12
  },
  {
    id: 5,
    name: 'Horse',
    attackModifier: 2,
    attack: [],
    multiAttack: [{ name: 'bite', dieCount: 2, die: 6, type: 'piercing' }],
    hp: 17
  },
  {
    id: 6,
    name: 'T-Rex',
    attackModifier: 7,
    attack: [],
    multiAttack: [{ name: 'bite', dieCount: 4, die: 12, type: 'piercing' }],
    hp: 120
  },
  {
    id: 7,
    name: 'Giant Spider',
    attackModifier: 7,
    attack: [
      { name: 'Bite', dieCount: 1, die: 8, type: 'piercing' },
      { name: 'Web', dieCount: 0, die: 0, type: null }
    ],
    multiAttack: [],
    hp: 26
  },
  {
    id: 8,
    name: 'Ape',
    attackModifier: 5,
    attack: [
      { name: 'Rock', dieCount: 1, die: 8, type: 'piercing' },
    ],
    multiAttack: [
      { name: 'Fist', dieCount: 1, die: 8, type: 'piercing' },
      { name: 'Fist', dieCount: 1, die: 8, type: 'piercing' }
    ],
    hp: 19
  }
])

const summonCount = ref(8)

const selectedCreature = ref(null)

const summon = () => {
  emits('summon', summonCount.value, selectedCreature.value)
}

const disableSummon = computed(() => {
  return !selectedCreature.value
})
</script>

<template>
  <div class="flex justify-between p-4">
    <h4>Beasts</h4>
    <Counter
      @increase="(count) => (summonCount = count)"
      @decrease="(count) => (summonCount = count)" />
  </div>
  <hr class="h-px border-0 bg-zinc-500 mx-2" />
  <ul class="h-60 overflow-y-hidden">
    <li
      @click="selectedCreature = creature"
      :class="[
        'px-2 py-1 hover:bg-stone-400 hover:cursor-pointer',
        { 'bg-stone-400': selectedCreature === creature }
      ]"
      v-for="creature in list">
      {{ creature.name }}
    </li>
  </ul>
  <div class="flex p-4 gap-4">
    <Button text="Import" />
    <Button
      primary
      outline
      :disabled="disableSummon"
      @click="summon()"
      text="Summon" />
  </div>
</template>

<style scoped></style>
