<script setup>
import { computed, ref } from 'vue'
import CreatureSelect from '@/components/CreatureSelect.vue'
import RollTable from '@/components/RollTable.vue'
import Animate from '@/components/Animate.vue'
import Creature from '@/components/Creature.vue'
import CounterConfirm from '@/components/CounterConfirm.vue'
import Button from '@/components/Button.vue'
import SideMenu from '@/components/SideMenu.vue'
import ShieldIcon from '../assets/shield5.svg?component'
import SkullIcon from '../assets/skull3.svg?component'
import HeartIcon from '../assets/heart.svg?component'
import TigerIcon from '../assets/tiger.svg?component'
import MinusIcon from '../assets/minus.svg?component'
import PlusIcon from '../assets/plus3.svg?component'
import DiceIcon from '../assets/dice.svg?component'
import CheckIcon from '../assets/check.svg?component'
import CancelIcon from '../assets/cancel.svg?component'

const summonCount = ref(0)
const creatures = ref([])
const enemies = ref([])
const selectedEnemy = ref()

const showCreatureSelect = ref(false)
const showFightMenu = ref(false)
const showHealthMenu = ref(false)
const showEnemyMenu = ref(false)
const selectedHealthType = ref('')
const attackingCreatures = ref([])
const attackRolls = ref([])

const disAdvantage = ref(false)
const advantage = ref(false)

const damage = ref(0)
const damageSplit = ref({})
const healBy = ref(0)
const enemySummonCount = ref(0)

const handleToggle = (rollType) => {
  if (rollType === 'advantage') {
    advantage.value = !advantage.value

    if (disAdvantage.value) disAdvantage.value = false
  } else {
    disAdvantage.value = !disAdvantage.value

    if (advantage.value) advantage.value = false
  }
}

const loadSummons = (count, creature) => {
  summonCount.value = count
  creatures.value = Array.from({ length: count }, (i, index) => ({ index: index + 1, ...creature }))

  openCreatureSelect()
}

const openEnemyMenu = () => {
  showEnemyMenu.value = !showEnemyMenu.value
}

const openCreatureSelect = () => {
  showCreatureSelect.value = !showCreatureSelect.value
}

const openFightMenu = () => {
  showFightMenu.value = !showFightMenu.value
}

const openHealthMenu = (healthType) => {
  showHealthMenu.value = true
  switch (healthType) {
    case 'hp':
      selectedHealthType.value = 'Heal'
      return
    case 'dmg':
      selectedHealthType.value = 'Harm'
      return
    case 'temp':
      selectedHealthType.value = 'Temp HP'
      return
  }
}

const closeHealthMenu = () => {
  showHealthMenu.value = false
}

const handleCreatureSelect = (creature) => {
  if (attackingCreatures.value.includes(creature)) {
    attackingCreatures.value = attackingCreatures.value.filter((el) => el !== creature)
  } else {
    attackingCreatures.value.push(creature)
  }
}

const handleEnemySelect = (creature) => {
  selectedEnemy.value = creature
}

const addEnemies = (count) => {
  enemySummonCount.value = count
}
const removeEnemies = (count) => {
  enemySummonCount.value = count
}

const summonEnemies = () => {
  enemies.value = Array.from({ length: enemySummonCount.value }, (i, index) => ({
    index: index + 1,
    name: '',
    ac: null,
    hp: 0,
    missedRolls: []
  }))

  showEnemyMenu.value = false
}

const cancelSummonEnemies = () => {
  showHealthMenu.value = false
}

const addHealth = (count) => {
  healBy.value = count
}

const removeHealth = (count) => {
  healBy.value = count
}

const submitHealthChange = () => {
  switch (selectedHealthType.value) {
    case 'Heal':
      heal()
      break
    case 'Harm':
      harm()
      break
  }
}

const heal = () => {
  // need to map through original creature array
  console.log('heal')
  creatures.value
    .filter((creature) =>
      attackingCreatures.value.some(
        (attackingCreature) => attackingCreature.index === creature.index
      )
    )
    .map((creature) => {
      let afterHeal = creature.hp + healBy.value

      creature.hp = afterHeal > creature.hp ? creature.hp + healBy.value : afterHeal
    })
}

const harm = () => {
  // need to map through original creature array
  creatures.value
    .filter((creature) =>
      attackingCreatures.value.some(
        (attackingCreature) => attackingCreature.index === creature.index
      )
    )
    .map((creature) => {
      creature.hp = creature.hp - healBy.value
    })

  console.log(
    creatures.value.filter((creature) => attackingCreatures.value.includes(creature.index))
  )

  creatures.value = creatures.value.filter((creature) => creature.hp >= 0)
}

const cancelHealthChange = () => {
  healBy.value = 0
  closeHealthMenu()
}

const advantageRolls = computed(() => {
  return attackRolls.value.map((roll) => roll.advantage).sort((a, b) => a > b)
})

const disAdvantageRolls = computed(() => {
  return attackRolls.value.map((roll) => roll.disadvantage).sort((a, b) => a > b)
})

const roll = (die, num = 1) => {
  if (num === 0) {
    return 0
  } else {
    return Math.floor(Math.random() * die) + 1 + roll(die, num - 1)
  }
}

const rollToHit = (die, num = 1) => {
  let arr

  attackingCreatures.value.forEach((creature, idx) => {
    let output = roll(die)
    let secondary
    let final

    if (advantage.value || disAdvantage.value) {
      secondary = roll(die)

      if (advantage.value) {
        final = secondary > output ? secondary : output
      } else {
        final = secondary < output ? secondary : output
      }
    }

    let adv = secondary > output ? secondary : output
    let dis = secondary > output ? output : secondary

    attackRolls.value[idx] = {
      creature,
      roll: output,
      disadvantage: dis,
      advantage: adv,
      final: final ? final + creature.attackModifier : output + creature.attackModifier
    }
  })

  console.log(attackRolls.value)
}

const rollDamage = () => {
  const damageRolls = attackRolls.value.map((creature) =>
    creature.creature.attack.map((el) => ({
      type: el.type,
      total: roll(el.die, el.dieCount)
    }))
  )
  console.log(damageRolls)

  const totalSum = damageRolls
    .flat()
    .reduce((accumulator, current) => accumulator + current.total, 0)

  const typeSums = {}

  damageRolls.flat().forEach((damageEntry) => {
    typeSums[damageEntry.type] = (typeSums[damageEntry.type] || 0) + damageEntry.total
  })

  console.log('Damage Rolls:', damageRolls.flat())
  console.log('Total Damage:', totalSum)
  console.log('Type Sums:', typeSums)

  damage.value = totalSum
  damageSplit.value = typeSums
}

const handleRollMiss = (roll) => {
  selectedEnemy.value.missedRolls.push(roll)
}

const handleRollSuccess = () => {}

const flattenedRolls = computed(() => {
  let rolls = new Set(attackRolls.value.map((obj) => obj.final))

  return Array.from(rolls).sort()
})

const missedEnemyRolls = computed(() => {
  return [...new Set(selectedEnemy?.value.missedRolls)]
})

const availableAttacks = computed(() => {
   const result = []

  for (const creature of attackingCreatures.value) {
    for (const attack of creature.attack) { 
      const alreadyExists = result.some(
        a => a.creature === creature.name && a.name === attack.name
      )

      if (!alreadyExists) {
        result.push({
          creature: creature.name,
          name: attack.name,
          damage: attack.damage
        })
      }
    }
  }

  return result
})

const buttonProps = (style) => {
  let props = {
    outline: true,
    rounded: true
  }

  if (style) props[style] = true

  return props
}
</script>

<template>
  <div class="flex h-full">
    <aside class="bg-zinc-700 h-screen p-4 flex flex-col relative">
      <div class="flex flex-col gap-4">
        <Button
          @click="openCreatureSelect"
          v-bind="buttonProps('info')">
          <TigerIcon class="fill-amber-400" />
        </Button>

        <Button
          @click="openEnemyMenu"
          rounded
          outline>
          <PlusIcon class="fill-white stroke-white" />
        </Button>

        <Button
          @click="openFightMenu"
          rounded
          danger
          outline
          :disabled="!attackingCreatures.length">
          <DiceIcon class="fill-white stroke-white" />
        </Button>
      </div>

      <div class="flex items-center h-full">
        <div class="flex flex-col gap-4">
          <Button
            @click="openHealthMenu('hp')"
            v-bind="buttonProps()"
            :disabled="!attackingCreatures.length">
            <HeartIcon class="fill-rose-400" />
          </Button>

          <Button
            @click="openHealthMenu('dmg')"
            v-bind="buttonProps('success')"
            :disabled="!attackingCreatures.length">
            <SkullIcon class="fill-white" />
          </Button>

          <Button
            icon
            @click="openHealthMenu('temp')"
            v-bind="buttonProps('primary')"
            :disabled="!attackingCreatures.length">
            <ShieldIcon class="fill-purple-200" />
          </Button>

          <Animate>
            <SideMenu
              v-if="showHealthMenu"
              class="left-full">
              <CounterConfirm
                @increase="(count) => addHealth(count)"
                @decrease="(count) => removeHealth(count)"
                @submit="submitHealthChange"
                @cancel="cancelHealthChange">
                {{ selectedHealthType }}
              </CounterConfirm>
            </SideMenu>
          </Animate>
        </div>
      </div>
    </aside>

    <div class="h-full flex flex-col relative w-full">
      <div class="flex">
        <Animate>
          <SideMenu v-if="showCreatureSelect">
            <CreatureSelect @summon="(count, creature) => loadSummons(count, creature)" />
          </SideMenu>
        </Animate>

        <Animate>
          <SideMenu v-if="showEnemyMenu">
            <CounterConfirm
              @increase="(count) => addEnemies(count)"
              @decrease="(count) => removeEnemies(count)"
              @submit="summonEnemies"
              @cancel="cancelSummonEnemies">
              Enemies
            </CounterConfirm>
          </SideMenu>
        </Animate>

        <Transition
          enter-active-class="transition ease-out duration-200 transform"
          enter-from-class="opacity-0 translate-x-full"
          enter-to-class="opacity-100"
          leave-active-class="transition ease-in duration-200 transform"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0 translate-x-full">
          <SideMenu
            v-if="showFightMenu"
            position="right">
            <div class="p-4 space-y-4">
              <span class="flex gap-1 items-end">
                <h4 class="text-lg font-semibold">{{ attackingCreatures.length }}</h4>
                <p>selected</p>
              </span>

              <template v-if="attackingCreatures.length">
                <div
                  class="flex gap-2">
                  <div
                    v-for="attack in availableAttacks"
                    class="bg-stone-500 p-2 rounded-md outline outline-white">
                    {{ attack.name }}
                  </div>
                </div>
              </template>

              <div class="flex flex-col gap-2">
                <span class="flex gap-2">
                  <Button
                    outline
                    success
                    :toggled="advantage"
                    text="Advantage"
                    @click="handleToggle('advantage')" />

                  <Button
                    outline
                    danger
                    :toggled="disAdvantage"
                    text="Disadvantage"
                    @click="handleToggle('disadvantage')" />

                  <Button
                    asIcon
                    info
                    :disabled="!selectedEnemy"
                    @click="rollToHit(20, attackingCreatures.length)">
                    <DiceIcon />
                  </Button>
                </span>
              </div>

              <hr class="h-px border-0 bg-zinc-500 my-2" />

              <div class="overflow-y-auto h-60">
                <RollTable
                  :attackRolls="attackRolls"
                  :disAdvantage="disAdvantage"
                  :advantage="advantage" />
              </div>

              <div class="space-y-4">
                <h4>Rolls</h4>
                <div class="flex flex-wrap gap-6">
                  <div
                    v-for="roll in flattenedRolls"
                    class="relative flex items-center justify-center w-10 h-10 rounded-full bg-zinc-600 text-center">
                    <button
                      class="absolute flex justify-center items-center -left-2 -top-1 w-4 h-4 bg-rose-400 rounded-full"
                      @click="() => handleRollMiss(roll)">
                      x
                    </button>
                    {{ roll }}
                    <button
                      class="absolute flex justify-center items-center -right-2 -top-1 w-4 h-4 bg-emerald-400 rounded-full"
                      @click="() => handleRollSuccess(roll)">
                      +
                    </button>
                  </div>
                </div>
              </div>

              <h4>Damage</h4>
              <div class="flex justify-between">
                <Button
                  @click="rollDamage"
                  info
                  text="Roll Damage" />

                <div class="flex">
                  <div class="flex flex-col pr-4 border-r-2 border-white">
                    <div
                      v-for="(damage, type) in damageSplit"
                      class="flex gap-1 items-center">
                      <h3 class="text-sm">{{ damage }}</h3>

                      <span class="text-xs">
                        {{ type }}
                      </span>
                    </div>
                  </div>

                  <h2 class="pl-2 text-2xl">{{ damage }}</h2>
                </div>
              </div>
            </div>
          </SideMenu>
        </Transition>
      </div>

      <div class="flex flex-col bg-slate-500 w-fit p-2">
        <h3>Enemy AC: ??</h3>
        <div v-if="selectedEnemy?.missedRolls">
          <h3>Missed Rolls:</h3>
          <span v-for="(roll, idx) in missedEnemyRolls">{{ roll }},</span>
        </div>
      </div>

      <div
        v-if="enemies.length"
        class="flex flex-col justify-center items-center gap-4 h-full">
        <div class="flex flex-wrap justify-center items-end gap-2 gap-y-4">
          <Creature
            v-for="(enemy, idx) in enemies"
            type="enemy"
            :key="`enemy-${idx}`"
            @select="(enemy) => handleEnemySelect(enemy)"
            :creature="enemy"
            :index="idx + 1" />
        </div>
      </div>

      <div
        v-if="creatures.length"
        class="flex flex-col justify-center items-center gap-4 h-full">
        <div class="flex flex-wrap justify-center items-end gap-2 gap-y-4">
          <Creature
            v-for="(creature, idx) in creatures"
            type="creature"
            :key="`summon-${idx}`"
            @select="(creature) => handleCreatureSelect(creature)"
            :creature="creature"
            :index="idx + 1" />
        </div>
      </div>
    </div>
  </div>
</template>
