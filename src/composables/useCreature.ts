// composables/useCreature.ts
import { computed, type Ref } from 'vue'
import type { Creature } from '@/types/Creatures'

export function useCreature(creature: Ref<Creature | null>) {
  
  // Size mapping
  const sizeMap: Record<string, string> = {
    'T': 'Tiny',
    'S': 'Small', 
    'M': 'Medium',
    'L': 'Large',
    'H': 'Huge',
    'G': 'Gargantuan'
  }

  // Alignment mapping
  const alignmentMap: Record<string, string> = {
    'L': 'Lawful',
    'N': 'Neutral', 
    'C': 'Chaotic',
    'G': 'Good',
    'E': 'Evil',
    'U': 'Unaligned'
  }

  // Helper function to expand size
  const expandSize = (size: string): string => {
    return sizeMap[size] || size
  }

  // Helper function to expand alignment
  const expandAlignment = (alignment: string[]): string => {
    if (!alignment || alignment.length === 0) return 'Unaligned'
    
    // Join all alignment parts and split by spaces to handle cases like ["Typically N E"]
    const alignmentString = alignment.join(' ')
    const parts = alignmentString.split(' ').filter(part => part.length > 0)
    
    const expanded: string[] = []
    let i = 0
    
    while (i < parts.length) {
      const current = parts[i]
      
      // Handle "Typically" prefix
      if (current.toLowerCase() === 'typically') {
        expanded.push('Typically')
        i++
        continue
      }
      
      // Handle alignment pairs (like N E -> Neutral Evil)
      if (i < parts.length - 1) {
        const next = parts[i + 1]
        const firstPart = alignmentMap[current]
        const secondPart = alignmentMap[next]
        
        // If both parts map to alignment components, combine them
        if (firstPart && secondPart) {
          expanded.push(`${firstPart} ${secondPart}`)
          i += 2
          continue
        }
      }
      
      // Handle single alignment (like N -> Neutral, or U -> Unaligned)
      const mapped = alignmentMap[current] || current
      expanded.push(mapped)
      i++
    }
    
    return expanded.join(' ')
  }

  // Utility function for ability modifiers
  const abilityModifier = (mod: number): string => {
    return mod >= 0 ? `+${mod}` : `${mod}`
  }

  // AC Display - returns object with value and source parts
  const displayAC = computed(() => {
    if (!creature.value) return { value: 'N/A', source: null }
    
    if (typeof creature.value.ac === 'number') {
      return { value: creature.value.ac.toString(), source: null }
    }
    
    const value = creature.value.ac?.value || 'N/A'
    const source = creature.value.ac?.from && creature.value.ac.from.length 
      ? creature.value.ac.from.join(', ')
      : null
    
    return { value: value.toString(), source }
  })

  // HP Display - returns object with value and formula parts
  const displayHP = computed(() => {
    if (!creature.value?.hp) return { value: 'N/A', formula: null }
    
    const value = creature.value.hp.average || 'N/A'
    const formula = creature.value.hp.formula || null
    
    return { value: value.toString(), formula }
  })

  // Initiative Display - returns object with modifier and total parts  
  const displayInitiative = computed(() => {
    if (!creature.value) return { modifier: 'N/A', total: null }
    const mod = creature.value.initiative?.modifier || 0
    const total = creature.value.initiative?.total || null
    return { 
      modifier: abilityModifier(mod), 
      total: total ? total.toString() : null 
    }
  })

  // CR Display - returns object with cr and details parts
  const displayCR = computed(() => {
    if (!creature.value) return { cr: 'N/A', details: null }
    const xp = creature.value.pb * 25
    const pb = abilityModifier(creature.value.pb)
    return { 
      cr: creature.value.cr, 
      details: `XP ${xp}; PB ${pb}` 
    }
  })

  // Speed formatting
  const formatSpeed = computed(() => {
    if (!creature.value?.speed) return 'N/A'
    
    const speeds: string[] = []
    const speedObj = creature.value.speed
    
    // Handle walk speed (show even if 0 or missing)
    const walkSpeed = speedObj.walk || 0
    speeds.push(`${walkSpeed} ft.`)
    
    // Handle other movement types
    Object.entries(speedObj)
      .filter(([key, value]) => 
        key !== 'walk' && 
        key !== 'speedConditions' && 
        key !== 'canHover' && 
        typeof value === 'number' && 
        value > 0
      )
      .forEach(([type, value]) => {
        let speedText = `${type.charAt(0).toUpperCase() + type.slice(1)} ${value} ft.`
        
        // Check for speed conditions (like hover)
        if (speedObj.speedConditions && speedObj.speedConditions[type]) {
          speedText += ` ${speedObj.speedConditions[type]}`
        }
        
        speeds.push(speedText)
      })
    
    return speeds.join(', ')
  })

  // Skills formatting
  const formatSkills = computed(() => {
    if (!creature.value?.skills) return null
    
    const skillEntries = Object.entries(creature.value.skills)
    if (skillEntries.length === 0) return null
    
    return skillEntries
      .map(([skill, modifier]) => `${skill.charAt(0).toUpperCase() + skill.slice(1)} ${modifier}`)
      .join(', ')
  })

  // Senses formatting
  const formatSenses = computed(() => {
    if (!creature.value?.senses) return null
    
    const senses = Object.entries(creature.value.senses)
      .filter(([key]) => key !== 'passivePerception')
      .map(([type, value]) => `${type} ${value} ft.`)
    
    if (creature.value.senses.passivePerception) {
      senses.push(`Passive Perception ${creature.value.senses.passivePerception}`)
    }
    
    return senses.length > 0 ? senses.join(', ') : null
  })

  // Languages formatting
  const formatLanguages = computed(() => {
    return creature.value?.languages && creature.value.languages.length 
      ? creature.value.languages.join(', ') 
      : null
  })

  // Damage immunities
  const formatImmunities = computed(() => {
    return creature.value?.immunities && creature.value.immunities.length 
      ? creature.value.immunities.join(', ') 
      : null
  })

  // Damage resistances
  const formatResistances = computed(() => {
    return creature.value?.resistances && creature.value.resistances.length 
      ? creature.value.resistances.join(', ') 
      : null
  })

  // Damage vulnerabilities
  const formatVulnerabilities = computed(() => {
    return creature.value?.vulnerabilities && creature.value.vulnerabilities.length 
      ? creature.value.vulnerabilities.join(', ') 
      : null
  })

  // Condition immunities
  const formatConditionImmunities = computed(() => {
    return creature.value?.conditionImmunities && creature.value.conditionImmunities.length 
      ? creature.value.conditionImmunities.join(', ') 
      : null
  })

  // Challenge Rating with XP and proficiency bonus - returns object
  const formatCR = computed(() => displayCR.value)

  // Full creature descriptor (size, type, alignment)
  const creatureDescriptor = computed(() => {
    if (!creature.value) return ''
    
    const size = expandSize(creature.value.size)
    const type = creature.value.type.charAt(0).toUpperCase() + creature.value.type.slice(1)
    const alignment = expandAlignment(creature.value.alignment)
    
    return `${size} ${type}, ${alignment}`
  })

  // Combat stats for quick reference
  const combatStats = computed(() => {
    if (!creature.value) return null
    
    return {
      ac: displayAC.value,
      hp: displayHP.value,
      speed: formatSpeed.value,
      cr: creature.value.cr,
      initiative: displayInitiative.value
    }
  })

  // Check if creature has spellcasting
  const hasSpellcasting = computed(() => {
    return creature.value?.spellcasting && creature.value.spellcasting.length > 0
  })

  // Get creature token image URL
  const tokenUrl = computed(() => {
    if (!creature.value) return null
    
    // Normalize special characters to regular ASCII but keep hyphens and spaces
    const normalizedName = creature.value.name
      .normalize('NFD') // Decompose accented characters
      .replace(/[\u0300-\u036f]/g, '') // Remove accent marks
      .replace(/[^a-zA-Z0-9\s\-()''',]/g, '') // Keep letters, numbers, spaces, hyphens, parentheses, apostrophes, and commas
    
    // URL encode the normalized name
    const encodedName = encodeURIComponent(normalizedName)
    
    // Map common source abbreviations
    const sourceMap: Record<string, string> = {
      'MM': 'MM',
      'VGM': 'VGM', 
      'MTF': 'MTF',
      'TCE': 'TCE',
      'FTD': 'FTD',
      'MPMM': 'MPMM',
      'EGW': 'EGW',
      'TftYP': 'TftYP'
      // Add more as needed
    }
    
    const source = sourceMap[creature.value.source] || creature.value.source
    
    return `https://5e.tools/img/bestiary/tokens/${source}/${encodedName}.webp`
  })

  // Check if token image exists (you could use this for fallbacks)
  const hasToken = computed(() => {
    return creature.value?.hasToken || false
  })

  // Get available attack names for quick reference
  const attackNames = computed(() => {
    if (!creature.value?.actions?.attacks) return []
    return creature.value.actions.attacks.map(attack => attack.name)
  })

  // Environment list for encounter building
  const environments = computed(() => {
    return creature.value?.environment || []
  })

  return {
    // Display formatters - now return objects with separate parts
    ac: displayAC,
    hp: displayHP,
    initiative: displayInitiative,
    speed: formatSpeed,
    skills: formatSkills,
    senses: formatSenses,
    languages: formatLanguages,
    immunities: formatImmunities,
    resistances: formatResistances,
    vulnerabilities: formatVulnerabilities,
    conditionImmunities: formatConditionImmunities,
    cr: formatCR,
    descriptor: creatureDescriptor,
    
    // Utility functions
    abilityModifier,
    
    // URLs and assets
    tokenUrl,
    
    // Computed objects
    combatStats,
    
    // Boolean checks
    hasSpellcasting,
    hasLegendaryActions: computed(() => creature.value?.legendary && creature.value.legendary !== null),
    hasToken: computed(() => creature.value?.hasToken || false),
    
    // Arrays
    attackNames,
    environments
  }
}