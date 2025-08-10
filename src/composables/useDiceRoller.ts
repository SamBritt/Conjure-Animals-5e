// composables/useDiceRoller.ts
import { ref, reactive } from 'vue'

export interface DiceRollResult {
  id: string
  formula: string
  result: number
  rolls: number[]
  modifier: number
  timestamp: number
}

// Global reactive state for toast notifications
const rollResults = ref<DiceRollResult[]>([])

export const useDiceRoller = () => {
  
  // Basic dice rolling function
  const rollDie = (sides: number): number => {
    return Math.floor(Math.random() * sides) + 1
  }

  // Parse and roll a dice formula like "1d8 + 4" or "2d6"
  const rollDiceFormula = (formula: string): DiceRollResult => {
    // Clean up the formula (remove extra spaces)
    const cleanFormula = formula.trim()
    
    // Parse the formula (e.g., "1d8 + 4" or "2d6 - 1")
    const match = cleanFormula.match(/^(\d+)d(\d+)(?:\s*([+\-])\s*(\d+))?$/)
    
    if (!match) {
      throw new Error(`Invalid dice formula: ${formula}`)
    }
    
    const diceCount = parseInt(match[1])
    const diceSides = parseInt(match[2])
    const operator = match[3] || '+'
    const modifier = match[4] ? parseInt(match[4]) : 0
    
    // Roll the dice
    const rolls: number[] = []
    for (let i = 0; i < diceCount; i++) {
      rolls.push(rollDie(diceSides))
    }
    
    // Calculate total
    const diceTotal = rolls.reduce((sum, roll) => sum + roll, 0)
    const finalModifier = operator === '-' ? -modifier : modifier
    const result = diceTotal + finalModifier
    
    return {
      id: `roll-${Date.now()}-${Math.random()}`,
      formula: cleanFormula,
      result,
      rolls,
      modifier: finalModifier,
      timestamp: Date.now()
    }
  }

  // Add a roll result to the toast queue
  const addRollResult = (rollResult: DiceRollResult): void => {
    rollResults.value.unshift(rollResult) // Add to beginning of array
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      const index = rollResults.value.findIndex(r => r.id === rollResult.id)
      if (index > -1) {
        rollResults.value.splice(index, 1)
      }
    }, 5000)
    
    // Keep max 10 results
    if (rollResults.value.length > 10) {
      rollResults.value = rollResults.value.slice(0, 10)
    }
  }

  // Roll dice and add to toast queue
  const rollAndNotify = (formula: string): DiceRollResult => {
    try {
      const result = rollDiceFormula(formula)
      addRollResult(result)
      return result
    } catch (error) {
      console.error('Error rolling dice:', error)
      throw error
    }
  }

  // Remove a specific roll result
  const removeRollResult = (id: string): void => {
    const index = rollResults.value.findIndex(r => r.id === id)
    if (index > -1) {
      rollResults.value.splice(index, 1)
    }
  }

  // Clear all roll results
  const clearAllResults = (): void => {
    rollResults.value = []
  }

  return {
    rollResults,
    rollDie,
    rollDiceFormula,
    rollAndNotify,
    addRollResult,
    removeRollResult,
    clearAllResults
  }
}