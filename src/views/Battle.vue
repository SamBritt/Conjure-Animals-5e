<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useMouse, useEventListener } from '@vueuse/core'
import CreatureSelect from '@/components/CreatureSelect.vue'
import RollTable from '@/components/RollTable.vue'
import EnemyInfo from '@/components/EnemyInfo.vue'
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
import DiceRollToast from '@/components/DiceRollToast.vue'
import type { AbilityKey, Creature, Attack, ActionDamage } from '@/types/Creatures'

// Add this interface for summoned creatures
export interface SummonedCreature extends Creature {
  index: number
  tempHP?: number
  maxHP: number  // Store original HP for healing calculations
  uuid: string   // Unique identifier that doesn't change when creatures die
}

// Interface for multi-creature summoning
interface CreatureSelection {
  creature: Creature
  count: number
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
const selectedAttacks = ref<AvailableAttack[]>([])
const selectedConditionalDamage = ref<ActionDamage | undefined>()
const selectedConditionalDamageMap = ref<Map<string, ActionDamage>>(new Map())
const damage = ref<number>(0)
const damageSplit = ref<DamageSplit>({})
const damageDetails = ref<DamageDetail[]>([])
const healBy = ref<number>(0)
const enemySummonCount = ref<number>(0)

// Drag selection state
const isDragging = ref<boolean>(false)
const dragStart = ref<{ x: number; y: number; shiftKey?: boolean }>({ x: 0, y: 0 })
const dragEnd = ref<{ x: number; y: number }>({ x: 0, y: 0 })
const selectionBox = ref<HTMLElement | null>(null)


// Mouse tracking
const { x: mouseX, y: mouseY } = useMouse()

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
  // Clear any existing selections when loading new creatures
  attackingCreatures.value = []
  
  creatures.value = Array.from({ length: count }, (_, index): SummonedCreature => ({ 
    ...creature,
    index: index + 1,
    maxHP: creature.hp.average,  // Store the original HP as maxHP
    uuid: `${creature.id}-${index + 1}-${Date.now()}`,  // Unique identifier
    hp: { 
      average: creature.hp.average, 
      formula: creature.hp.formula,
      special: creature.hp.special 
    }  // Deep copy the HP object
  }))
  openCreatureSelect()
}

const loadMultipleSummons = (selections: CreatureSelection[]): void => {
  // Clear any existing selections when loading new creatures
  attackingCreatures.value = []
  
  let allCreatures: SummonedCreature[] = []
  let globalIndex = 1
  
  // Create creatures for each selection
  selections.forEach(selection => {
    const creaturesOfThisType = Array.from({ length: selection.count }, (_, localIndex): SummonedCreature => ({
      ...selection.creature,
      index: globalIndex + localIndex,
      maxHP: selection.creature.hp.average,
      uuid: `${selection.creature.id}-${globalIndex + localIndex}-${Date.now()}`,
      hp: {
        average: selection.creature.hp.average,
        formula: selection.creature.hp.formula,
        special: selection.creature.hp.special
      }
    }))
    
    allCreatures = [...allCreatures, ...creaturesOfThisType]
    globalIndex += selection.count
  })
  
  creatures.value = allCreatures
  summonCount.value = allCreatures.length
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
  const existingIndex = attackingCreatures.value.findIndex(c => c.uuid === creature.uuid)
  if (existingIndex !== -1) {
    attackingCreatures.value.splice(existingIndex, 1)
  } else {
    attackingCreatures.value.push(creature)
  }
}

const handleEnemySelect = (creature: Enemy): void => {
  selectedEnemy.value = creature
}

// Drag selection functions
const startDragSelection = (event: MouseEvent): void => {
  // Don't start drag selection if clicking on a creature card or UI element
  if ((event.target as HTMLElement).closest('.creature-card') || 
      (event.target as HTMLElement).closest('aside') ||
      (event.target as HTMLElement).closest('.side-menu') ||
      (event.target as HTMLElement).closest('button') ||
      (event.target as HTMLElement).tagName === 'INPUT') {
    return
  }
  
  // Only start with left mouse button
  if (event.button !== 0) return
  
  isDragging.value = true
  dragStart.value = { x: mouseX.value, y: mouseY.value }
  dragEnd.value = { x: mouseX.value, y: mouseY.value }
  
  // Store whether shift was held for additive selection
  dragStart.value.shiftKey = event.shiftKey
}

const updateDragSelection = (): void => {
  if (!isDragging.value) return
  dragEnd.value = { x: mouseX.value, y: mouseY.value }
}

const endDragSelection = (): void => {
  if (!isDragging.value) return
  
  // Calculate drag distance to avoid accidental tiny drags
  const dragDistance = Math.sqrt(
    Math.pow(dragEnd.value.x - dragStart.value.x, 2) + 
    Math.pow(dragEnd.value.y - dragStart.value.y, 2)
  )
  
  // Minimum drag distance of 10 pixels to start selection
  if (dragDistance < 10) {
    isDragging.value = false
    return
  }
  
  // Calculate selection area
  const minX = Math.min(dragStart.value.x, dragEnd.value.x)
  const maxX = Math.max(dragStart.value.x, dragEnd.value.x)
  const minY = Math.min(dragStart.value.y, dragEnd.value.y)
  const maxY = Math.max(dragStart.value.y, dragEnd.value.y)
  
  // Find creatures within selection area
  const creaturesInSelection: SummonedCreature[] = []
  
  creatures.value.forEach(creature => {
    const creatureElement = document.querySelector(`[data-creature-uuid="${creature.uuid}"]`) as HTMLElement
    if (creatureElement) {
      const rect = creatureElement.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      
      if (centerX >= minX && centerX <= maxX && centerY >= minY && centerY <= maxY) {
        creaturesInSelection.push(creature)
      }
    }
  })
  
  // Update selection
  if (dragStart.value.shiftKey) {
    // Additive selection - add to existing selection
    creaturesInSelection.forEach(creature => {
      if (!attackingCreatures.value.some(c => c.uuid === creature.uuid)) {
        attackingCreatures.value.push(creature)
      }
    })
  } else {
    // Replace current selection
    attackingCreatures.value = [...creaturesInSelection]
  }
  
  isDragging.value = false
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
  healBy.value = -count  // Make it negative for subtraction
}

const submitHealthChange = (): void => {
  switch (selectedHealthType.value) {
    case 'Heal':
      heal()
      break
    case 'Harm':
      harm()
      break
    case 'Temp HP':
      addTempHP()
      break
  }
}

const heal = (): void => {
  creatures.value
    .filter((creature) =>
      attackingCreatures.value.some(
        (attackingCreature) => attackingCreature.uuid === creature.uuid
      )
    )
    .forEach((creature) => {
      // Heal can only be positive, and only affects HP (not temp HP)
      if (healBy.value > 0) {
        const afterHeal = creature.hp.average + healBy.value
        creature.hp.average = Math.min(afterHeal, creature.maxHP)
      }
    })
}

const harm = (): void => {
  creatures.value
    .filter((creature) =>
      attackingCreatures.value.some(
        (attackingCreature) => attackingCreature.uuid === creature.uuid
      )
    )
    .forEach((creature) => {
      const damageAmount = Math.abs(healBy.value)
      let damageRemaining = damageAmount
      
      // If creature has temp HP, damage hits temp HP first
      if (creature.tempHP && creature.tempHP > 0) {
        if (damageRemaining <= creature.tempHP) {
          // Damage doesn't exceed temp HP
          creature.tempHP -= damageRemaining
          damageRemaining = 0
        } else {
          // Damage exceeds temp HP, carry over to real HP
          damageRemaining -= creature.tempHP
          creature.tempHP = 0
        }
      }
      
      // Apply remaining damage to actual HP
      if (damageRemaining > 0) {
        creature.hp.average = Math.max(0, creature.hp.average - damageRemaining)
      }
    })

  // Remove dead creatures (those with 0 HP and 0 temp HP)
  const deadCreatureUuids = creatures.value
    .filter(creature => creature.hp.average <= 0)
    .map(creature => creature.uuid)
    
  creatures.value = creatures.value.filter((creature) => creature.hp.average > 0)
  
  // Remove dead creatures from selection
  attackingCreatures.value = attackingCreatures.value.filter(
    creature => !deadCreatureUuids.includes(creature.uuid)
  )
}

const addTempHP = (): void => {
  creatures.value
    .filter((creature) =>
      attackingCreatures.value.some(
        (attackingCreature) => attackingCreature.uuid === creature.uuid
      )
    )
    .forEach((creature) => {
      if (healBy.value > 0) {
        // Adding temp HP - doesn't stack, take the higher value
        const currentTempHP = creature.tempHP || 0
        creature.tempHP = Math.max(currentTempHP, healBy.value)
      } else if (healBy.value < 0) {
        // Subtracting temp HP
        const currentTempHP = creature.tempHP || 0
        creature.tempHP = Math.max(0, currentTempHP + healBy.value) // healBy.value is negative
      }
    })
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

  // Roll damage for all selected attacks from creatures that hit
  selectedAttacks.value.forEach(selectedAttack => {
    attackRolls.value
      .filter(rollData => 
        rollData.hit && 
        rollData.creature.name === selectedAttack.creature
      )
      .forEach((rollData) => {
        // Find the specific attack that matches the current selected attack
        const attack = rollData.creature.actions.attacks.find(
          attack => attack.name === selectedAttack.name
        )

        if (attack) {
          const creatureDamageRolls: DamageDetail['damageRolls'] = []
          let creatureTotalDamage = 0

        // Determine which damage entries to process
        let damageEntriesToProcess: ActionDamage[]

        if (attack.damageType === 'conditional') {
          const attackKey = `${selectedAttack.creature}-${selectedAttack.name}`
          const selectedConditionalForThisAttack = getSelectedConditionalDamageForAttack(attackKey)
          
          if (selectedConditionalForThisAttack) {
            // For conditional attacks, only process the selected conditional damage for this specific attack
            damageEntriesToProcess = [selectedConditionalForThisAttack]
            
            // Also include any non-conditional damage (like "plus" damage)
            const nonConditionalDamage = attack.damage.filter(dmg => !dmg.conditional?.isConditional)
            damageEntriesToProcess.push(...nonConditionalDamage)
          } else {
            // No conditional damage selected for this attack, skip damage processing
            damageEntriesToProcess = []
          }
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
          attackName: selectedAttack.name,
          isCritical: rollData.isCritical,
          rollValue: rollData.finalD20, // Use the actual d20 result that was used
          damageRolls: creatureDamageRolls,
          totalDamage: creatureTotalDamage
        })
        }
      })
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

const handleSetEnemyAC = (ac: number): void => {
  if (selectedEnemy.value) {
    selectedEnemy.value.ac = ac
  }
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

const toggleAttackSelection = (attack: AvailableAttack): void => {
  const index = selectedAttacks.value.findIndex(a => 
    a.creature === attack.creature && a.name === attack.name
  )
  
  if (index !== -1) {
    // Attack is selected - check if this creature has other attacks available
    const otherAttacksForCreature = availableAttacks.value.filter(a => 
      a.creature === attack.creature && a.name !== attack.name
    )
    
    if (otherAttacksForCreature.length > 0) {
      // Replace with the first alternative attack for this creature
      const newAttack = otherAttacksForCreature[0]
      selectedAttacks.value[index] = newAttack
      
      // Preselect conditional damage for the new attack if it has conditional damage
      preselectConditionalDamageForAttack(newAttack)
    }
    // If no other attacks exist, keep this one selected (can't deselect)
  } else {
    // Check if we already have an attack selected for this creature
    const existingIndex = selectedAttacks.value.findIndex(a => a.creature === attack.creature)
    if (existingIndex !== -1) {
      // Replace existing attack for this creature
      selectedAttacks.value[existingIndex] = attack
    } else {
      // Add new attack for this creature
      selectedAttacks.value.push(attack)
    }
    
    // Preselect conditional damage for the newly selected attack
    preselectConditionalDamageForAttack(attack)
  }
  
  // Update primary selected attack for conditional damage
  if (selectedAttacks.value.length > 0) {
    selectedAttack.value = selectedAttacks.value[0]
  } else {
    selectedAttack.value = undefined
  }
  
  selectedConditionalDamage.value = undefined
}

const preselectConditionalDamageForAttack = (attack: AvailableAttack): void => {
  const creature = attackingCreatures.value.find(c => c.name === attack.creature)
  if (!creature) return
  
  const actualAttack = creature.actions.attacks.find(a => a.name === attack.name)
  if (actualAttack && actualAttack.damageType === 'conditional') {
    const conditionalOptions = actualAttack.damage.filter(d => d.conditional?.isConditional)
    if (conditionalOptions.length > 0) {
      const attackKey = `${attack.creature}-${attack.name}`
      // Preselect the first conditional damage option
      selectedConditionalDamageMap.value.set(attackKey, conditionalOptions[0])
    }
  }
}

const isAttackSelected = (attack: AvailableAttack): boolean => {
  return selectedAttacks.value.some(a => 
    a.creature === attack.creature && a.name === attack.name
  )
}

// Auto-preselect first attack per creature type
const autoSelectAttacks = (): void => {
  if (!availableAttacks.value || availableAttacks.value.length === 0) {
    selectedAttacks.value = []
    selectedAttack.value = undefined
    selectedConditionalDamage.value = undefined
    selectedConditionalDamageMap.value.clear()
    return
  }
  
  // Group attacks by creature type
  const attacksByCreature = new Map<string, AvailableAttack[]>()
  availableAttacks.value.forEach(attack => {
    if (!attacksByCreature.has(attack.creature)) {
      attacksByCreature.set(attack.creature, [])
    }
    attacksByCreature.get(attack.creature)!.push(attack)
  })
  
  // Select first attack for each creature type
  const preselected: AvailableAttack[] = []
  attacksByCreature.forEach(creatureAttacks => {
    preselected.push(creatureAttacks[0]) // First attack for each creature
  })
  
  selectedAttacks.value = preselected
  selectedAttack.value = preselected[0] // Primary for conditional damage
  selectedConditionalDamage.value = undefined
  
  // Auto-select first conditional damage for each attack with conditionals
  selectedConditionalDamageMap.value.clear()
  preselected.forEach(attack => {
    const creature = attackingCreatures.value.find(c => c.name === attack.creature)
    if (!creature) return
    
    const actualAttack = creature.actions.attacks.find(a => a.name === attack.name)
    if (actualAttack && actualAttack.damageType === 'conditional') {
      const conditionalOptions = actualAttack.damage.filter(d => d.conditional?.isConditional)
      if (conditionalOptions.length > 0) {
        const attackKey = `${attack.creature}-${attack.name}`
        selectedConditionalDamageMap.value.set(attackKey, conditionalOptions[0])
      }
    }
  })
}


const setSelectedConditionalDamage = (damageOption: ActionDamage): void => {
  selectedConditionalDamage.value = damageOption
}

const setSelectedConditionalDamageForAttack = (attackKey: string, damageOption: ActionDamage): void => {
  selectedConditionalDamageMap.value.set(attackKey, damageOption)
}

const getSelectedConditionalDamageForAttack = (attackKey: string): ActionDamage | undefined => {
  return selectedConditionalDamageMap.value.get(attackKey)
}

const getConditionalDamageOptionsForAttack = (attack: AvailableAttack): ActionDamage[] => {
  const creature = attackingCreatures.value.find(c => c.name === attack.creature)
  if (!creature) return []
  
  const actualAttack = creature.actions.attacks.find(a => a.name === attack.name)
  if (!actualAttack || actualAttack.damageType !== 'conditional') return []
  
  return actualAttack.damage.filter(d => d.conditional?.isConditional)
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
  if (selectedAttacks.value.length === 0) return []
  
  const allConditionalOptions: ActionDamage[] = []
  
  // Check all selected attacks for conditional damage
  selectedAttacks.value.forEach(selectedAttack => {
    const creature = attackingCreatures.value.find(c => c.name === selectedAttack.creature)
    if (!creature) return
    
    const attack = creature.actions.attacks.find(a => a.name === selectedAttack.name)
    if (!attack || attack.damageType !== 'conditional') return
    
    // Add conditional damage entries from this attack
    const conditionalDamage = attack.damage.filter(d => d.conditional?.isConditional)
    allConditionalOptions.push(...conditionalDamage)
  })
  
  return allConditionalOptions
})

const attacksWithConditionals = computed(() => {
  return selectedAttacks.value
    .filter(attack => getConditionalDamageOptionsForAttack(attack).length > 0)
    .map(attack => {
      const attackKey = `${attack.creature}-${attack.name}`
      return {
        attackKey,
        attack,
        conditionalOptions: getConditionalDamageOptionsForAttack(attack),
        selectedConditional: getSelectedConditionalDamageForAttack(attackKey)
      }
    })
})

const canRollDamage = computed<boolean>(() => {
  if (selectedAttacks.value.length === 0) return false
  
  // For conditional attacks, require conditional damage selection per attack
  for (const attack of selectedAttacks.value) {
    const conditionalOptions = getConditionalDamageOptionsForAttack(attack)
    if (conditionalOptions.length > 0) {
      const attackKey = `${attack.creature}-${attack.name}`
      const selectedConditional = getSelectedConditionalDamageForAttack(attackKey)
      if (!selectedConditional) {
        return false // This attack has conditional damage but no selection made
      }
    }
  }
  
  // All conditional attacks have selections, can roll damage
  return true
})

// Watch for changes in available attacks and auto-select them
watch(availableAttacks, () => {
  autoSelectAttacks()
}, { immediate: true })

// Selection box style computed property
const selectionBoxStyle = computed(() => {
  if (!isDragging.value) return { display: 'none' }
  
  const minX = Math.min(dragStart.value.x, dragEnd.value.x)
  const maxX = Math.max(dragStart.value.x, dragEnd.value.x)
  const minY = Math.min(dragStart.value.y, dragEnd.value.y)
  const maxY = Math.max(dragStart.value.y, dragEnd.value.y)
  
  return {
    position: 'fixed',
    left: `${minX}px`,
    top: `${minY}px`,
    width: `${maxX - minX}px`,
    height: `${maxY - minY}px`,
    border: '2px dashed #3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    pointerEvents: 'none',
    zIndex: 1000
  }
})

// Set up event listeners
useEventListener('mousedown', startDragSelection)
useEventListener('mousemove', updateDragSelection)  
useEventListener('mouseup', endDragSelection)


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
  <div class="flex h-full overflow-hidden">
    <aside class="bg-gray-800 h-screen p-4 flex flex-col relative">
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
          <SideMenu v-show="showCreatureSelect" :fullHeight="true">
            <CreatureSelect 
              @summon="(count: number, creature: Creature) => loadSummons(count, creature)"
              @summonMultiple="(selections: CreatureSelection[]) => loadMultipleSummons(selections)" />
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
            position="right"
            :fullHeight="true">
            <div class="p-4 space-y-4">
              <!-- Attack Setup Section -->
              <div class="bg-gradient-to-r from-zinc-700 to-zinc-600 p-4 rounded-xl border border-zinc-500">
                <div class="flex items-center justify-between mb-4">
                  <div class="flex items-center gap-2">
                    <div class="flex items-center justify-center w-8 h-8 bg-green-500 rounded-lg">
                      <span class="text-sm font-bold text-white">⚡</span>
                    </div>
                    <div>
                      <h5 class="text-lg font-semibold text-white">Battle Setup</h5>
                      <p class="text-xs text-gray-300">Configure attack modifiers and roll</p>
                    </div>
                  </div>
                  
                  <!-- Selected Count -->
                  <div class="flex items-center gap-2">
                    <div class="flex items-center justify-center w-10 h-10 bg-zinc-600 rounded-lg border border-zinc-500">
                      <span class="text-lg font-bold text-white">{{ attackingCreatures.length }}</span>
                    </div>
                    <div class="text-right">
                      <div class="text-sm font-medium text-white">Selected</div>
                      <div class="text-xs text-gray-300">Creatures</div>
                    </div>
                  </div>
                </div>

                <!-- Controls Row -->
                <div class="flex items-center gap-3">
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

                  <div class="flex-1"></div>

                  <Button
                    :disabled="!selectedEnemy || selectedAttacks.length === 0"
                    :class="[
                      'px-4 py-2 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 flex items-center gap-2',
                      !selectedEnemy || selectedAttacks.length === 0
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 hover:from-blue-400 hover:to-blue-500'
                    ]"
                    @click="rollToHit(20)">
                    <DiceIcon class="w-4 h-4" />
                    <span>Roll Attack</span>
                  </Button>
                </div>
              </div>

              <hr class="h-px border-0 bg-zinc-500 my-2" />

              <!-- Attack Selection Area -->
              <RollTable
                :attackRolls="attackRolls"
                :disAdvantage="disAdvantage"
                :advantage="advantage"
                :attackModifier="selectedAttack?.attackModifier || 0"
                :availableAttacks="availableAttacks"
                :selectedAttack="selectedAttack"
                :selectedAttacks="selectedAttacks"
                :conditionalDamageOptions="conditionalDamageOptions"
                :selectedConditionalDamage="selectedConditionalDamage"
                :selectedConditionalDamageMap="selectedConditionalDamageMap"
                :attacksWithConditionals="attacksWithConditionals"
                :showResultsTable="false"
                @selectAttack="setSelectedAttack"
                @toggleAttackSelection="toggleAttackSelection"
                @selectConditionalDamage="setSelectedConditionalDamage"
                @selectConditionalDamageForAttack="setSelectedConditionalDamageForAttack" />

              <!-- Always Visible Attack Results Table -->
              <div v-if="attackRolls.length > 0" class="mt-4 bg-gradient-to-r from-zinc-700 to-zinc-600 rounded-xl border border-zinc-500 overflow-hidden">
                <div class="bg-zinc-800/80 p-4 border-b border-zinc-600">
                  <div class="flex items-center gap-2">
                    <div class="flex items-center justify-center w-8 h-8 bg-orange-500 rounded-lg">
                      <span class="text-sm font-bold text-white">🎲</span>
                    </div>
                    <div>
                      <h5 class="text-lg font-semibold text-white">Attack Roll Results</h5>
                      <p class="text-xs text-gray-300">Individual creature attack outcomes</p>
                    </div>
                  </div>
                </div>
                
                <div class="overflow-x-auto">
                  <table class="w-full">
                    <thead>
                      <tr class="bg-zinc-800/60">
                        <th class="text-left p-4 text-sm font-semibold text-gray-200 border-b border-zinc-600">Creature</th>

                        <template v-if="advantage || disAdvantage">
                          <th class="text-center p-4 text-sm font-semibold text-gray-200 border-b border-zinc-600">
                            <div class="flex items-center justify-center gap-1">
                              <span class="text-rose-400">📉</span>
                              <span>Disadvantage</span>
                            </div>
                          </th>
                          <th class="text-center p-4 text-sm font-semibold text-gray-200 border-b border-zinc-600">
                            <div class="flex items-center justify-center gap-1">
                              <span class="text-emerald-400">📈</span>
                              <span>Advantage</span>
                            </div>
                          </th>
                        </template>

                        <th v-else class="text-center p-4 text-sm font-semibold text-gray-200 border-b border-zinc-600">
                          <div class="flex items-center justify-center gap-1">
                            <span>🎯</span>
                            <span>Roll</span>
                          </div>
                        </th>
                        
                        <th class="text-center p-4 text-sm font-semibold text-gray-200 border-b border-zinc-600">
                          <div class="flex items-center justify-center gap-1">
                            <span>⚡</span>
                            <span>Final</span>
                          </div>
                        </th>
                      </tr>
                    </thead>

                    <tbody class="divide-y divide-zinc-600/30">
                      <tr
                        v-for="roll in attackRolls"
                        :key="`${roll.creature.uuid}-${roll.roll}`"
                        :class="[
                          'hover:bg-zinc-600/20 transition-colors',
                          roll.hit 
                            ? roll.isCritical 
                              ? 'bg-yellow-500/10 border-l-4 border-yellow-400' 
                              : 'bg-emerald-500/10 border-l-4 border-emerald-400'
                            : 'bg-rose-500/10 border-l-4 border-rose-400'
                        ]">
                        
                        <td class="p-3">
                          <div class="text-sm font-medium text-white">
                            {{ `${roll.creature.name} ${roll.creature.index}` }}
                          </div>
                        </td>

                        <template v-if="advantage || disAdvantage">
                          <td :class="[
                            'p-3 text-center font-mono text-lg font-bold',
                            disAdvantage ? 'text-rose-300 bg-rose-500/20' : 'text-gray-400'
                          ]">
                            <div class="flex items-center justify-center gap-1">
                              <span>{{ roll.disadvantage }}</span>
                              <span class="text-xs opacity-60">+{{ selectedAttack?.attackModifier || 0 }}</span>
                            </div>
                          </td>

                          <td :class="[
                            'p-3 text-center font-mono text-lg font-bold',
                            advantage 
                              ? roll.advantage === 20 
                                ? 'text-yellow-300 bg-yellow-500/20' 
                                : 'text-emerald-300 bg-emerald-500/20'
                              : 'text-gray-400'
                          ]">
                            <div class="flex items-center justify-center gap-1">
                              <span :class="{ 'text-yellow-300': roll.advantage === 20 }">
                                {{ roll.advantage }}
                              </span>
                              <span class="text-xs opacity-60">+{{ selectedAttack?.attackModifier || 0 }}</span>
                            </div>
                          </td>
                        </template>

                        <td v-else :class="[
                          'p-3 text-center font-mono text-lg font-bold',
                          roll.roll === 20 ? 'text-yellow-300 bg-yellow-500/20' : 'text-blue-300'
                        ]">
                          <div class="flex items-center justify-center gap-1">
                            <span>{{ roll.roll }}</span>
                            <span class="text-xs opacity-60">+{{ selectedAttack?.attackModifier || 0 }}</span>
                          </div>
                        </td>

                        <td class="p-3 text-center">
                          <div class="flex items-center justify-center gap-2">
                            <span :class="[
                              'font-mono text-xl font-bold',
                              roll.hit 
                                ? roll.isCritical
                                  ? 'text-yellow-300'
                                  : 'text-emerald-300'
                                : 'text-rose-300'
                            ]">
                              {{ roll.final }}
                            </span>
                            
                            <span :class="[
                              'text-xs px-2 py-1 rounded font-semibold',
                              roll.hit 
                                ? roll.isCritical
                                  ? 'bg-yellow-500 text-black'
                                  : 'bg-emerald-500 text-white'
                                : 'bg-rose-500 text-white'
                            ]">
                              {{ roll.isCritical ? 'CRIT' : roll.hit ? 'HIT' : 'MISS' }}
                            </span>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Enemy AC & Roll Results Section -->
              <div class="bg-zinc-600 p-4 rounded-lg space-y-4">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="flex items-center justify-center w-12 h-12 bg-zinc-700 rounded-full border-2 border-zinc-500">
                      <span class="text-2xl font-bold text-white">{{ selectedEnemy?.ac || '??' }}</span>
                    </div>
                    <div>
                      <h4 class="text-lg font-medium text-white">Target AC</h4>
                      <p class="text-sm text-gray-300">{{ selectedEnemy?.name || 'Unknown Enemy' }}</p>
                    </div>
                  </div>
                  
                  <!-- Hit/Miss Summary -->
                  <div class="text-right">
                    <div class="flex items-center gap-2 mb-1">
                      <div class="flex items-center gap-1">
                        <div class="w-3 h-3 bg-emerald-500 rounded-full"></div>
                        <span class="text-sm font-medium text-white">{{ attackRolls.filter(r => r.hit).length }}</span>
                      </div>
                      <span class="text-gray-400">/</span>
                      <div class="flex items-center gap-1">
                        <div class="w-3 h-3 bg-rose-500 rounded-full"></div>
                        <span class="text-sm font-medium text-white">{{ attackRolls.filter(r => !r.hit).length }}</span>
                      </div>
                    </div>
                    <p class="text-xs text-gray-300">Hits / Misses</p>
                    <div v-if="attackRolls.some(r => r.isCritical && r.hit)" class="flex items-center gap-1 mt-1">
                      <div class="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span class="text-xs text-yellow-300 font-medium">{{ attackRolls.filter(r => r.isCritical && r.hit).length }} Critical!</span>
                    </div>
                  </div>
                </div>

                <!-- Roll Dice Display -->
                <div class="border-t border-zinc-500 pt-4">
                  <h5 class="text-sm font-medium text-white mb-3">Attack Rolls</h5>
                  <div class="flex flex-wrap gap-3">
                    <div
                      v-for="roll in flattenedRolls"
                      :key="roll"
                      class="relative group">
                      <div
                        :class="[
                          'flex items-center justify-center w-14 h-14 rounded-xl text-lg font-bold transition-all duration-200 transform group-hover:scale-105',
                          // Check if this roll is a critical hit
                          attackRolls.some(r => r.final === roll && r.isCritical)
                            ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-black shadow-lg shadow-yellow-500/30 border-2 border-yellow-300'
                            : attackRolls.some(r => r.final === roll && r.hit) 
                              ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30' 
                              : 'bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-lg shadow-rose-500/30'
                        ]">
                        {{ roll }}
                      </div>
                      
                      <!-- Manual Override Buttons -->
                      <button
                        class="absolute -left-1 -top-1 flex justify-center items-center w-5 h-5 bg-rose-500 hover:bg-rose-400 rounded-full text-xs font-bold text-white transition-colors shadow-md opacity-0 group-hover:opacity-100"
                        @click="() => handleRollMiss(roll)"
                        title="Mark as Miss">
                        ×
                      </button>
                      <button
                        class="absolute -right-1 -top-1 flex justify-center items-center w-5 h-5 bg-emerald-500 hover:bg-emerald-400 rounded-full text-xs font-bold text-white transition-colors shadow-md opacity-0 group-hover:opacity-100"
                        @click="() => handleRollSuccess(roll)"
                        title="Mark as Hit">
                        ✓
                      </button>
                    </div>
                  </div>
                  
                  <p class="text-xs text-gray-400 mt-3 italic">Hover over rolls to manually mark as hit/miss</p>
                </div>
              </div>

              <!-- Damage Section -->
              <div class="bg-zinc-700 p-4 rounded-lg border border-zinc-600">
                <h4 class="text-lg font-medium text-white mb-4">Damage</h4>
                
                <div class="flex justify-between items-center">
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

                  <!-- Damage Display -->
                  <div class="flex items-center gap-4">
                    <!-- Damage Type Breakdown -->
                    <div v-if="Object.keys(damageSplit).length > 0" 
                         class="flex flex-col gap-1 pr-4 border-r-2 border-zinc-500">
                      <div
                        v-for="(damageAmount, type) in damageSplit"
                        :key="type"
                        class="flex gap-1 items-center">
                        <h3 class="text-sm font-medium text-white">{{ damageAmount }}</h3>
                        <span class="text-xs text-gray-300 capitalize">{{ type }}</span>
                      </div>
                    </div>
                    
                    <!-- Total Damage -->
                    <h2 class="pl-2 text-2xl font-bold text-white">{{ damage || 0 }}</h2>
                  </div>
                </div>
              </div>
            </div>
          </SideMenu>
        </Transition>
      </div>

      

      <div
        v-if="enemies.length"
        class="flex flex-col justify-center items-center gap-4 h-full">
        <EnemyInfo
          :selectedEnemy="selectedEnemy"
          :hitEnemyRolls="hitEnemyRolls"
          :missedEnemyRolls="missedEnemyRolls"
          :suggestedAC="suggestedAC"
          @setAC="handleSetEnemyAC" />
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
            :key="creature.uuid"
            :data-creature-uuid="creature.uuid"
            class="creature-card"
            :selected="attackingCreatures.some(c => c.uuid === creature.uuid)"
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
    
    <!-- Drag Selection Box -->
    <div 
      v-if="isDragging"
      :style="selectionBoxStyle"
      class="selection-box">
    </div>
    
    <!-- Dice Roll Toast Notifications -->
    <DiceRollToast />
  </div>
</template>

<style scoped>
/* Disable text selection and image dragging to prevent interference with drag selection */
.h-full {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

/* Prevent image and element dragging */
.h-full img,
.h-full svg,
.h-full * {
  -webkit-user-drag: none;
  -khtml-user-drag: none;
  -moz-user-drag: none;
  -o-user-drag: none;
  user-drag: none;
  pointer-events: auto;
}

/* Ensure buttons and interactive elements still work */
button,
input,
select,
textarea {
  user-select: auto;
  -webkit-user-select: auto;
  -moz-user-select: auto;
  -ms-user-select: auto;
  pointer-events: auto;
}

/* Selection box styling */
.selection-box {
  border-radius: 4px;
  transition: none;
}

</style>