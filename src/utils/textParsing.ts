// utils/textParsing.ts

export interface TextPart {
  text: string
  isDamage: boolean
}

export interface ParsedText {
  parts: TextPart[]
}

// Helper function to parse damage from text
export const parseDamageText = (text: string): ParsedText => {
  if (!text) return { parts: [{ text, isDamage: false }] }
  
  // Regex to match damage patterns like (4d8), (2d6 + 3), (1d4 + 1)
  const damagePattern = /\((\d+d\d+(?:\s*[+\-]\s*\d+)?)\)/g
  
  const parts: TextPart[] = []
  let lastIndex = 0
  let match
  
  while ((match = damagePattern.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push({ 
        text: text.slice(lastIndex, match.index), 
        isDamage: false 
      })
    }
    
    // Add opening parenthesis
    parts.push({ text: '(', isDamage: false })
    
    // Add the damage part (just the dice formula, no parentheses)
    parts.push({ 
      text: match[1], // match[1] is the captured group without parentheses
      isDamage: true 
    })
    
    // Add closing parenthesis
    parts.push({ text: ')', isDamage: false })
    
    lastIndex = match.index + match[0].length
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({ 
      text: text.slice(lastIndex), 
      isDamage: false 
    })
  }
  
  // If no damage found, return the whole text as non-damage
  if (parts.length === 0) {
    parts.push({ text, isDamage: false })
  }
  
  return { parts }
}