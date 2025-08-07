<script setup lang="ts">
import { computed, ref } from 'vue'
import CreatureSelect from '@/components/CreatureSelect.vue'
import RollTable from '@/components/RollTable.vue'
import Animate from '@/components/Animate.vue'
import CreatureCard from '@/components/CreatureCard.vue'
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
import DamageBreakdown from '@/components/DamageBreakdown.vue'
import type { AbilityKey, Creature, Attack, ActionDamage } from '@/types/Creatures'

// Add this interface for summoned creatures
export interface SummonedCreature extends Creature {
  index: number
}

// Define additional interfaces for your component
interface Enemy {
  index: number
  name: string
  ac: number | null
  hp: number
  missedRolls: number[]
  hitRolls: number[]  // Add this to track successful rolls
}

export interface AttackRoll {
  creature: SummonedCreature
  roll: number
  disadvantage: number
  advantage: number
  final: number
  hit: boolean
  manualOverride?: boolean
  isCritical: boolean  // Add this to track critical hits
}

interface DamageRoll {
  type: string
  total: number
}

interface AvailableAttack {
  creature: string
  name: string
  damage: Attack['damage']
  attackModifier: number
}

interface DamageDetail {
  creatureIndex: number
  creatureName: string
  attackName: string
  isCritical: boolean
  rollValue: number
  damageRolls: {
    type: string
    diceRolled: string
    rolled: number
    modifier: number
    total: number
  }[]
  totalDamage: number
}

interface DamageDetail {
  creatureIndex: number
  creatureName: string
  attackName: string
  isCritical: boolean
  rollValue: number
  damageRolls: {
    type: string
    diceRolled: string
    rolled: number
    modifier: number
    total: number
  }[]
  totalDamage: number
}

type HealthType = 'hp' | 'dmg' | 'temp'
type ButtonStyle = 'info' | 'success' | 'primary' | 'danger'

// Reactive state with proper typing
const summonCount = ref<number>(0)
const creatures = ref<SummonedCreature[]>([])
const attackingCreatures = ref<SummonedCreature[]>([])
const enemies = ref<Enemy[]>([])
const selectedEnemy = ref<Enemy | null>(null)

const showCreatureSelect = ref<boolean>(false)
const showFightMenu = ref<boolean>(false)
const showHealthMenu = ref<boolean>(false)
const showEnemyMenu = ref<boolean>(false)
const showDamageBreakdown = ref<boolean>(false)
const selectedHealthType = ref<string>('')
const attackRolls = ref<AttackRoll[]>([])

const disAdvantage = ref<boolean>(false)
const advantage = ref<boolean>(false)

const selectedAttack = ref<AvailableAttack | undefined>()
const selectedConditionalDamage = ref<ActionDamage | undefined>()
const damage = ref<number>(0)
const damageSplit = ref<DamageSplit>({})
const damageDetails = ref<DamageDetail[]>([])
const healBy = ref<number>(0)
const enemySummonCount = ref<number>(0)

const handleToggle = (rollType: 'advantage' | 'disadvantage'): void => {
  if (rollType === 'advantage') {
    advantage.value = !advantage.value
    if (disAdvantage.value) disAdvantage.value = false
  } else {
    disAdvantage.value = !disAdvantage.value
    if (advantage.value) advantage.value = false
  }
}

const loadSummons = (count: number, creature: Creature): void => {
  summonCount.value = count
  creatures.value = Array.from({ length: count }, (_, index): SummonedCreature => ({ 
    ...creature,
    index: index + 1
  }))
  openCreatureSelect()
}

const openEnemyMenu = (): void => {
  showEnemyMenu.value = !showEnemyMenu.value
}

const openCreatureSelect = (): void => {
  showCreatureSelect.value = !showCreatureSelect.value
}

const openFightMenu = (): void => {
  showFightMenu.value = !showFightMenu.value
}

const openHealthMenu = (healthType: HealthType): void => {
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

const closeHealthMenu = (): void => {
  showHealthMenu.value = false
}

const handleCreatureSelect = (creature: SummonedCreature): void => {
  const existingIndex = attackingCreatures.value.findIndex(c => c.index === creature.index)
  if (existingIndex !== -1) {
    attackingCreatures.value.splice(existingIndex, 1)
  } else {
    attackingCreatures.value.push(creature)
  }
}

const handleEnemySelect = (creature: Enemy): void => {
  selectedEnemy.value = creature
}

const addEnemies = (count: number): void => {
  enemySummonCount.value = count
}

const removeEnemies = (count: number): void => {
  enemySummonCount.value = count
}

const summonEnemies = (): void => {
  enemies.value = Array.from({ length: enemySummonCount.value }, (_, index): Enemy => ({
    index: index + 1,
    name: '',
    ac: null,
    hp: 0,
    missedRolls: [],
    hitRolls: []  // Initialize empty hit rolls array
  }))
  showEnemyMenu.value = false
}

const cancelSummonEnemies = (): void => {
  showHealthMenu.value = false
}

const addHealth = (count: number): void => {
  healBy.value = count
}

const removeHealth = (count: number): void => {
  healBy.value = count
}

const submitHealthChange = (): void => {
  switch (selectedHealthType.value) {
    case 'Heal':
      heal()
      break
    case 'Harm':
      harm()
      break
  }
}

const heal = (): void => {
  creatures.value
    .filter((creature) =>
      attackingCreatures.value.some(
        (attackingCreature) => attackingCreature.index === creature.index
      )
    )
    .forEach((creature) => {
      const afterHeal = creature.hp.average + healBy.value
      const maxHp = creature.hp.average // Assuming this is max HP, you might want to add maxHp to your interface
      creature.hp.average = afterHeal > maxHp ? maxHp : afterHeal
    })
}

const harm = (): void => {
  creatures.value
    .filter((creature) =>
      attackingCreatures.value.some(
        (attackingCreature) => attackingCreature.index === creature.index
      )
    )
    .forEach((creature) => {
      creature.hp.average = Math.max(0, creature.hp.average - healBy.value)
    })

  // Remove dead creatures
  creatures.value = creatures.value.filter((creature) => creature.hp.average > 0)
}

const cancelHealthChange = (): void => {
  healBy.value = 0
  closeHealthMenu()
}

const roll = (die: number, num: number = 1): number => {
  if (num === 0) {
    return 0
  }
  return Math.floor(Math.random() * die) + 1 + roll(die, num - 1)
}

const rollToHit = (die: number, num: number = 1): void => {
  attackRolls.value = []
  
  // Early return if no attack selected
  if (!selectedAttack.value) {
    console.warn('No attack selected')
    return
  }

  // Early return if no enemy selected (but AC can be null for discovery)
  if (!selectedEnemy.value) {
    console.warn('No enemy selected')
    return
  }
  
  attackingCreatures.value.forEach((creature, idx) => {
    const output = roll(die)
    let secondary: number | undefined
    let final: number

    // Debug logging
    console.log(`Creature ${idx + 1}:`, {
      advantage: advantage.value,
      disadvantage: disAdvantage.value,
      firstRoll: output
    })

    if (advantage.value || disAdvantage.value) {
      secondary = roll(die)
      final = advantage.value 
        ? Math.max(secondary, output)
        : Math.min(secondary, output)
      
      console.log(`  Secondary roll: ${secondary}, Final: ${final} (${advantage.value ? 'advantage' : 'disadvantage'})`)
    } else {
      final = output
      console.log(`  Normal roll: ${final}`)
    }

    const adv = secondary ? Math.max(secondary, output) : output
    const dis = secondary ? Math.min(secondary, output) : output

    // Use the selected attack's modifier
    const attackModifier = selectedAttack.value?.attackModifier || 0
    const finalWithModifier = final + attackModifier

    // Auto-determine hits based on known information
    let hit: boolean
    // Critical hit should be based on the FINAL roll (after advantage/disadvantage), not the first roll
    let isCritical = final === 20
    
    if (selectedEnemy.value.ac !== null) {
      // AC is known - auto-determine hits based on AC
      hit = finalWithModifier >= selectedEnemy.value.ac
    } else {
      // AC is unknown - use cascading logic from previous rolls
      const enemyHits = selectedEnemy.value.hitRolls || []
      const enemyMisses = selectedEnemy.value.missedRolls || []
      
      // If this roll is <= any known miss, it's a miss
      if (enemyMisses.some(missRoll => finalWithModifier <= missRoll)) {
        hit = false
      }
      // If this roll is >= any known hit, it's a hit
      else if (enemyHits.some(hitRoll => finalWithModifier >= hitRoll)) {
        hit = true
      }
      // Otherwise, we don't know - default to false for manual selection
      else {
        hit = false
      }
    }

    attackRolls.value[idx] = {
      creature,
      roll: output,
      disadvantage: dis,
      advantage: adv,
      final: finalWithModifier,
      finalD20: final,  // Store the actual d20 result used
      hit: hit,
      manualOverride: false,
      isCritical: isCritical
    }
  })
}

const rollDamage = (): void => {
  // Early return if no attack is selected
  if (!selectedAttack.value) {
    console.warn('No attack selected')
    return
  }

  const damageRolls: DamageRoll[] = []
  const newDamageDetails: DamageDetail[] = []

  // Only roll for creatures that hit AND match the selected attack's creature type
  attackRolls.value
    .filter(rollData => 
      rollData.hit && 
      rollData.creature.name === selectedAttack.value!.creature
    )
    .forEach((rollData) => {
      // Find the specific attack that matches the selected attack
      const attack = rollData.creature.actions.attacks.find(
        attack => attack.name === selectedAttack.value!.name
      )

      if (attack) {
        const creatureDamageRolls: DamageDetail['damageRolls'] = []
        let creatureTotalDamage = 0

        // Determine which damage entries to process
        let damageEntriesToProcess: ActionDamage[]

        if (attack.damageType === 'conditional' && selectedConditionalDamage.value) {
          // For conditional attacks, only process the selected conditional damage
          damageEntriesToProcess = [selectedConditionalDamage.value]
          
          // Also include any non-conditional damage (like "plus" damage)
          const nonConditionalDamage = attack.damage.filter(dmg => !dmg.conditional?.isConditional)
          damageEntriesToProcess.push(...nonConditionalDamage)
        } else {
          // For standard attacks, process all damage entries
          damageEntriesToProcess = attack.damage
        }

        // Calculate damage for each selected damage type
        damageEntriesToProcess.forEach(dmg => {
          let diceCount = dmg.dieCount
          
          // Double dice on critical hit
          if (rollData.isCritical) {
            diceCount = dmg.dieCount * 2
          }
          
          const rolledDamage = roll(dmg.die, diceCount)
          const totalDamageForType = rolledDamage + dmg.modifier
          
          // Create dice description
          const diceDescription = rollData.isCritical 
            ? `${diceCount}d${dmg.die} (crit from ${dmg.dieCount}d${dmg.die})`
            : `${diceCount}d${dmg.die}`

          creatureDamageRolls.push({
            type: dmg.type,
            diceRolled: diceDescription,
            rolled: rolledDamage,
            modifier: dmg.modifier,
            total: totalDamageForType
          })

          creatureTotalDamage += totalDamageForType
          
          damageRolls.push({
            type: dmg.type,
            total: totalDamageForType
          })
        })

        // Add to damage details for breakdown
        newDamageDetails.push({
          creatureIndex: rollData.creature.index,
          creatureName: rollData.creature.name,
          attackName: selectedAttack.value!.name,
          isCritical: rollData.isCritical,
          rollValue: rollData.finalD20, // Use the actual d20 result that was used
          damageRolls: creatureDamageRolls,
          totalDamage: creatureTotalDamage
        })
      }
    })

  // Calculate totals
  const totalSum = damageRolls.reduce((sum, dmg) => sum + dmg.total, 0)

  // Group by damage type
  const typeSums: DamageSplit = {}
  damageRolls.forEach((damageEntry) => {
    typeSums[damageEntry.type] = (typeSums[damageEntry.type] || 0) + damageEntry.total
  })

  damage.value = totalSum
  damageSplit.value = typeSums
  damageDetails.value = newDamageDetails
}

const handleRollMiss = (rollValue: number): void => {
  if (!selectedEnemy.value) return
  
  // Update current attack rolls and cascade within current rolls
  attackRolls.value.forEach(roll => {
    if (roll.final <= rollValue) {
      roll.hit = false
      roll.manualOverride = true
      
      // Add to enemy's missed rolls if not already there
      if (!selectedEnemy.value!.missedRolls.includes(roll.final)) {
        selectedEnemy.value!.missedRolls.push(roll.final)
      }
    }
  })
  
  // Check if we can determine AC
  checkAndSetAC()
}

const handleRollSuccess = (rollValue: number): void => {
  if (!selectedEnemy.value) return
  
  // Update current attack rolls and cascade within current rolls
  attackRolls.value.forEach(roll => {
    if (roll.final >= rollValue) {
      roll.hit = true
      roll.manualOverride = true
      
      // Add to enemy's hit rolls if not already there
      if (!selectedEnemy.value!.hitRolls.includes(roll.final)) {
        selectedEnemy.value!.hitRolls.push(roll.final)
      }
    }
  })
  
  // Check if we can determine AC
  checkAndSetAC()
}

// Function to automatically determine and set AC when possible
const checkAndSetAC = (): void => {
  if (!selectedEnemy.value || selectedEnemy.value.ac !== null) return
  
  const hits = selectedEnemy.value.hitRolls
  const misses = selectedEnemy.value.missedRolls
  
  if (hits.length === 0 || misses.length === 0) return
  
  const lowestHit = Math.min(...hits)
  const highestMiss = Math.max(...misses)
  
  // If we have consecutive numbers (miss X, hit X+1), we know the exact AC
  if (lowestHit === highestMiss + 1) {
    selectedEnemy.value.ac = lowestHit
    console.log(`AC determined: ${lowestHit} (${highestMiss} missed, ${lowestHit} hit)`)
  }
}

const setSelectedAttack = (attack: AvailableAttack): void => {
  selectedAttack.value = attack
  // Clear conditional damage selection when attack changes
  selectedConditionalDamage.value = undefined
}

const setSelectedConditionalDamage = (damageOption: ActionDamage): void => {
  selectedConditionalDamage.value = damageOption
}

const flattenedRolls = computed<number[]>(() => {
  const rolls = new Set(attackRolls.value.map((obj) => obj.final))
  return Array.from(rolls).sort((a, b) => a - b)
})

const missedEnemyRolls = computed<number[]>(() => {
  return selectedEnemy.value ? [...new Set(selectedEnemy.value.missedRolls)].sort((a, b) => a - b) : []
})

const hitEnemyRolls = computed<number[]>(() => {
  return selectedEnemy.value ? [...new Set(selectedEnemy.value.hitRolls)].sort((a, b) => a - b) : []
})

// Function to determine AC based on hit/miss pattern
const suggestedAC = computed<number | null>(() => {
  if (!selectedEnemy.value || selectedEnemy.value.ac !== null) return null
  
  const hits = selectedEnemy.value.hitRolls
  const misses = selectedEnemy.value.missedRolls
  
  if (hits.length === 0 || misses.length === 0) return null
  
  const lowestHit = Math.min(...hits)
  const highestMiss = Math.max(...misses)
  
  // Only suggest AC if we have a clear gap but not consecutive numbers
  // (consecutive numbers would auto-set the AC)
  if (lowestHit > highestMiss && lowestHit !== highestMiss + 1) {
    return lowestHit
  }
  
  return null
})

const availableAttacks = computed<AvailableAttack[]>(() => {
  const attackMap = new Map<string, AvailableAttack>()

  for (const creature of attackingCreatures.value) {
    // Process regular attacks
    for (const attack of creature.actions.attacks) { 
      const key = `${creature.name}-${attack.name}`
      
      if (!attackMap.has(key)) {
        attackMap.set(key, {
          creature: creature.name,
          name: attack.name,
          damage: attack.damage,
          attackModifier: attack.attackModifier
        })
      }
    }
  }

  return Array.from(attackMap.values())
})

const conditionalDamageOptions = computed<ActionDamage[]>(() => {
  if (!selectedAttack.value) return []
  
  // Find the actual attack to get damage options
  const creature = attackingCreatures.value.find(c => c.name === selectedAttack.value!.creature)
  if (!creature) return []
  
  const attack = creature.actions.attacks.find(a => a.name === selectedAttack.value!.name)
  if (!attack || attack.damageType !== 'conditional') return []
  
  // Return only conditional damage entries
  return attack.damage.filter(d => d.conditional?.isConditional)
})

const canRollDamage = computed<boolean>(() => {
  if (!selectedAttack.value) return false
  
  // For conditional attacks, require conditional damage selection
  if (conditionalDamageOptions.value.length > 0) {
    return !!selectedConditionalDamage.value
  }
  
  // For standard attacks, just need an attack selected
  return true
})

const buttonProps = (style?: ButtonStyle) => {
  const props: Record<string, boolean> = {
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
                @increase="(count: number) => addHealth(count)"
                @decrease="(count: number) => removeHealth(count)"
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
            <CreatureSelect @summon="(count: number, creature: Creature) => loadSummons(count, creature)" />
          </SideMenu>
        </Animate>

        <Animate>
          <SideMenu v-if="showEnemyMenu">
            <CounterConfirm
              @increase="(count: number) => addEnemies(count)"
              @decrease="(count: number) => removeEnemies(count)"
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
                    :disabled="!selectedEnemy || !selectedAttack"
                    @click="rollToHit(20)">
                    <DiceIcon />
                  </Button>
                </span>
              </div>

              <hr class="h-px border-0 bg-zinc-500 my-2" />

              <div class="overflow-y-auto h-60">
                <RollTable
                  :attackRolls="attackRolls"
                  :disAdvantage="disAdvantage"
                  :advantage="advantage"
                  :attackModifier="selectedAttack?.attackModifier || 0"
                  :availableAttacks="availableAttacks"
                  :selectedAttack="selectedAttack"
                  :conditionalDamageOptions="conditionalDamageOptions"
                  :selectedConditionalDamage="selectedConditionalDamage"
                  @selectAttack="setSelectedAttack"
                  @selectConditionalDamage="setSelectedConditionalDamage" />
              </div>

              <div class="space-y-4">
                <h4>Rolls vs AC {{ selectedEnemy?.ac || '??' }}</h4>
                <div class="flex flex-wrap gap-6">
                  <div
                    v-for="roll in flattenedRolls"
                    :key="roll"
                    :class="[
                      'relative flex items-center justify-center w-10 h-10 rounded-full text-center font-medium',
                      // Check if this roll is a critical hit
                      attackRolls.some(r => r.final === roll && r.isCritical)
                        ? 'bg-yellow-500 text-black font-bold border-2 border-yellow-300'
                        : attackRolls.some(r => r.final === roll && r.hit) 
                          ? 'bg-emerald-500 text-white' 
                          : 'bg-rose-500 text-white'
                    ]">
                    <button
                      class="absolute flex justify-center items-center -left-2 -top-1 w-4 h-4 bg-rose-400 rounded-full text-xs font-bold"
                      @click="() => handleRollMiss(roll)">
                      ×
                    </button>
                    {{ roll }}
                    <button
                      class="absolute flex justify-center items-center -right-2 -top-1 w-4 h-4 bg-emerald-400 rounded-full text-xs font-bold"
                      @click="() => handleRollSuccess(roll)">
                      ✓
                    </button>
                  </div>
                </div>
                
                <div class="text-sm text-gray-300">
                  Hits: {{ attackRolls.filter(r => r.hit).length }} / {{ attackRolls.length }}
                  <span v-if="attackRolls.some(r => r.isCritical && r.hit)" class="text-yellow-300 ml-2">
                    ({{ attackRolls.filter(r => r.isCritical && r.hit).length }} Critical!)
                  </span>
                </div>
              </div>

              <h4>Damage</h4>
              <div class="flex justify-between">
                <div class="flex gap-2">
                  <Button
                    @click="rollDamage"
                    :disabled="!canRollDamage"
                    info
                    text="Roll Damage" />
                  
                  <Button
                    v-if="damageDetails.length > 0"
                    @click="showDamageBreakdown = true"
                    outline
                    info
                    text="Breakdown" />
                </div>

                <div class="flex">
                  <div class="flex flex-col pr-4 border-r-2 border-white">
                    <div
                      v-for="(damageAmount, type) in damageSplit"
                      :key="type"
                      class="flex gap-1 items-center">
                      <h3 class="text-sm">{{ damageAmount }}</h3>
                      <span class="text-xs">{{ type }}</span>
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
        <h3>Enemy AC: {{ selectedEnemy?.ac ?? '??' }}</h3>
        
        <div v-if="selectedEnemy?.missedRolls?.length">
          <h4 class="text-sm font-medium">Missed Rolls:</h4>
          <span class="text-sm">{{ missedEnemyRolls.join(', ') }}</span>
        </div>
        
        <div v-if="selectedEnemy?.hitRolls?.length">
          <h4 class="text-sm font-medium">Hit Rolls:</h4>
          <span class="text-sm">{{ hitEnemyRolls.join(', ') }}</span>
        </div>
        
        <div v-if="suggestedAC" class="mt-2 p-2 bg-blue-600 rounded">
          <h4 class="text-sm font-medium">Suggested AC: {{ suggestedAC }}</h4>
          <button 
            @click="selectedEnemy!.ac = suggestedAC"
            class="text-xs bg-blue-500 px-2 py-1 rounded mt-1">
            Set AC
          </button>
        </div>
      </div>

      <div
        v-if="enemies.length"
        class="flex flex-col justify-center items-center gap-4 h-full">
        <div class="flex flex-wrap justify-center items-end gap-2 gap-y-4">
          <CreatureCard
            v-for="(enemy, idx) in enemies"
            type="enemy"
            :key="`enemy-${idx}`"
            @select="(selectedEnemy: Enemy) => handleEnemySelect(selectedEnemy)"
            :creature="enemy"
            :index="idx + 1" />
        </div>
      </div>

      <div
        v-if="creatures.length"
        class="flex flex-col justify-center items-center gap-4 h-full">
        <div class="flex flex-wrap justify-center items-end gap-2 gap-y-4">
          <CreatureCard
            v-for="(creature, idx) in creatures"
            type="creature"
            :key="`summon-${idx}`"
            @select="(selectedCreature: SummonedCreature) => handleCreatureSelect(selectedCreature)"
            :creature="creature"
            :index="idx + 1" />
        </div>
      </div>
    </div>
    
    <!-- Damage Breakdown Modal -->
    <DamageBreakdown
      v-if="showDamageBreakdown"
      :damageDetails="damageDetails"
      @close="showDamageBreakdown = false" />
  </div>
</template>