<!-- CreatureDetailModal.vue - Using Composable -->
<script setup lang="ts">
import { computed, toRef } from 'vue'
import type { Creature } from '@/types/Creatures'
import { useCreature } from '@/composables/useCreature'
import StatLine from '@/components/StatLine.vue'
import StatBlock from '@/components/StatBlock.vue'
import TraitSection from '@/components/TraitSection.vue'
import ActionSection from '@/components/ActionSection.vue'
import SpellcastingSection from '@/components/SpellcastingSection.vue'
import CreatureToken from './CreatureToken.vue'
import AbilityScoreComponent from '@/components/AbilityScore.vue'

interface Props {
  creature: Creature
}

const props = defineProps<Props>()

const emits = defineEmits<{
  close: []
  summon: [count: number, creature: Creature]
}>()

// Use the composable - much cleaner!
const { ac, hp, initiative, speed, skills, senses, languages, immunities, cr, descriptor } =
  useCreature(toRef(props, 'creature'))

const closeModal = () => {
  emits('close')
}

const leftAbilities = computed(() => {
  return Object.entries(props.creature.abilities).slice(0, 3)
})

const rightAbilities = computed(() => {
  return Object.entries(props.creature.abilities).slice(3, 6)
})
</script>

<template>
  <!-- Modal Backdrop -->
  <div
    v-if="creature"
    class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
    @click="closeModal">
    <!-- Modal Content -->
    <div
      class="bg-zinc-800 text-gray-200 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] border border-gray-700 flex flex-col overflow-hidden"
      @click.stop>
      <!-- Header - Fixed -->
      <div class="p-6 relative flex-shrink-0">
        <div class="flex justify-center items-center">
          <div class="relative flex gap-4">
            <AbilityScoreComponent
              v-for="([key, ability], idx) in leftAbilities"
              :key="key"
              :name="key"
              :ability="ability"
              :style="{
                transform: `translateX(${(leftAbilities.length - 1 - idx) * 10}px) translateY(${
                  (leftAbilities.length - 1 - idx) * 5
                }px)`,
                zIndex: idx + 1
              }" />
          </div>

          <div class="flex flex-col items-center">
            <CreatureToken :creature="creature" />
            <div class="flex text-center relative">
              <div
                class="absolute flex items-center gap-2 text-nowrap -translate-x-1/2 -translate-y-8">
                <div class="w-20 h-20 bg-zinc-900 rounded-full p-2 z-30">
                  <div class="text-yellow-400 font-semibold uppercase text-xs">HP</div>
                  <div class="text-2xl font-bold">{{ creature.hp.average }}</div>
                </div>

                <div class="flex flex-col">
                  <h1 class="text-3xl font-bold text-yellow-400 mb-2">{{ creature.name }}</h1>
                  <p class="text-gray-300 italic">{{ descriptor }}</p>
                </div>
                <div class="w-20 h-20 bg-zinc-900 rounded-full p-2 z-30">
                  <div class="text-yellow-400 font-semibold uppercase text-xs">AC</div>
                  <div class="text-2xl font-bold">{{ ac.value }}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="relative flex gap-4">
            <AbilityScoreComponent
              v-for="([key, ability], idx) in rightAbilities"
              :key="key"
              :name="key"
              :ability="ability"
              :style="{
                transform: `translateX(${idx * -10}px) translateY(${idx * 5}px)`,
                zIndex: rightAbilities.length - idx
              }" />
          </div>
        </div>
      </div>

      <!-- Stats Section - Fixed -->
      <div class="p-4 flex-shrink-0">
        <!-- Basic Stats -->
        <div class="space-y-1 text-sm mb-4">
          <div class="flex justify-between">
            <StatBlock label="AC">
              {{ ac.value }}
              <template v-if="ac.source">
                (<span class="italic text-gray-400">{{ ac.source }}</span
                >)
              </template>
            </StatBlock>

            <StatBlock label="Initiative">
              {{ initiative.modifier }}
              <span
                v-if="initiative.total"
                class="italic text-gray-400"
                >({{ initiative.total }})</span
              >
            </StatBlock>
          </div>

          <div class="flex justify-between">
            <StatBlock label="HP">
              {{ hp.value }}
              (<span
                v-if="hp.formula"
                class="italic text-gray-400"
                >{{ hp.formula }}</span
              >)
            </StatBlock>

            <StatBlock
              label="Speed"
              :value="speed" />
          </div>
        </div>

        <!-- Creature Details -->
        <div class="flex justify-between mb-4">
          <StatLine
            label="Skills"
            :value="skills" />
          <StatLine
            label="Immunities"
            :value="immunities" />
          <StatLine
            label="Senses"
            :value="senses" />
          <StatLine
            label="Languages"
            :value="languages" />
          <StatLine
            label="CR"
            :value="cr.cr" />
        </div>
      </div>

      <!-- Scrollable Content Area -->
      <div class="flex-1 overflow-y-auto px-4">
        <!-- Traits -->
        <TraitSection
          title="Traits"
          :traits="creature.traits || []" />

        <!-- Actions -->
        <ActionSection
          title="Actions"
          :attacks="creature.actions?.attacks || []"
          :actions="creature.actions?.special || []"
          :multiAttack="creature.actions?.multiAttack" />

        <!-- Bonus Actions -->
        <ActionSection
          title="Bonus Actions"
          :actions="creature.bonusActions || []" />

        <!-- Reactions -->
        <ActionSection
          title="Reactions"
          :actions="creature.reactions || []" />

        <!-- Spellcasting -->
        <SpellcastingSection :spellcasting="creature.spellcasting || []" />

        <!-- Source -->
        <div class="mt-6 pt-3 border-t border-gray-700 text-xs text-gray-500 mb-4">
          <span class="text-yellow-400 font-semibold">Source:</span>
          {{ creature.source }}, page {{ creature.page }}
        </div>
      </div>
    </div>
  </div>
</template>
