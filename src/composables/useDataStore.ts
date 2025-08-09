// composables/useDataStore.ts
import { useStorage, useLocalStorage } from '@vueuse/core'
import { computed, watch, ref } from 'vue'
import LZString from 'lz-string'
import type { Creature } from '@/types/Creatures'

// Types for our stored data
interface StoredData {
  version: string
  timestamp: number
  creatures: Creature[]
  favorites: number[]
}

// Current app version for migrations
const APP_VERSION = '1.0.0'

// Custom serializer with compression and error handling
const compressedSerializer = {
  read: (value: string) => {
    try {
      if (!value) return []
      
      const decompressed = LZString.decompress(value)
      if (!decompressed) {
        console.warn('Failed to decompress data, returning empty array')
        return []
      }
      
      const parsed = JSON.parse(decompressed)
      if (!Array.isArray(parsed)) {
        console.warn('Decompressed data is not an array, returning empty array')
        return []
      }
      
      return parsed
    } catch (error) {
      console.error('Failed to read compressed data:', error)
      return []
    }
  },
  
  write: (value: any) => {
    try {
      if (!Array.isArray(value)) {
        console.warn('Attempting to store non-array data')
        return ''
      }
      
      const json = JSON.stringify(value)
      const compressed = LZString.compress(json)
      
      // Log compression stats
      const originalSize = new Blob([json]).size
      const compressedSize = new Blob([compressed]).size
      const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1)
      
      console.log(`Compression: ${(originalSize / 1024).toFixed(1)}KB → ${(compressedSize / 1024).toFixed(1)}KB (${ratio}% reduction)`)
      
      return compressed
    } catch (error) {
      console.error('Failed to compress data:', error)
      return ''
    }
  }
}

// Global reactive data (singleton pattern)
const _creatures = ref<Creature[]>([])
const _favorites = useLocalStorage<string[]>('app-favorites', [], {
  onError: (error) => {
    console.error('Favorites storage error:', error)
  }
})

// Loading states
const isLoading = ref(false)
const isInitialized = ref(false)

export function useDataStore() {

  // Expose creatures as computed (read-only until initialized)
  const creatures = computed(() => _creatures.value)
  const favorites = computed(() => _favorites.value)

  // Initialize data on first access - now truly async
  const initialize = async (): Promise<void> => {
    if (isInitialized.value) {
      // Even if initialized, ensure loading state is false
      console.log("already inits")
      isLoading.value = false
      return
    }
    console.log('stillt ries')
    isLoading.value = true
    try {
      // Do the decompression work in the background
      await new Promise(resolve => setTimeout(resolve, 0)) // Let UI update first
      
      const stored = localStorage.getItem('app-creatures')
      if (stored) {
        // Do decompression async
        const decompressed = await new Promise<Creature[]>((resolve) => {
          setTimeout(() => {
            try {
              const result = compressedSerializer.read(stored)
              resolve(result || [])
            } catch (error) {
              console.error('Decompression failed:', error)
              resolve([])
            }
          }, 10) // Small delay to let UI update
        })
        
        _creatures.value = decompressed
        console.log(`Loaded ${decompressed.length} creatures from compressed storage`)
      }
      
      isInitialized.value = true
    } catch (error) {
      console.error('Failed to initialize data store:', error)
      isInitialized.value = true // Still mark as initialized to prevent loops
    } finally {
      isLoading.value = false
    }
  }

  // Save creatures (now we need to handle the compression manually)
  const saveCreatures = (newCreatures: Creature[]) => {
    try {
      _creatures.value = newCreatures
      const compressed = compressedSerializer.write(newCreatures)
      localStorage.setItem('app-creatures', compressed)
      return true
    } catch (error) {
      console.error('Failed to save creatures:', error)
      return false
    }
  }

  // Computed properties
  const hasData = computed(() => _creatures.value.length > 0)

  // Add creatures (merge with existing, avoid duplicates by name)
  const addCreatures = async (newCreatures: Creature[]): Promise<{ success: boolean; errors: string[]; skippedCreatures?: string[] }> => {
    isLoading.value = true
    const errors: string[] = []
    
    try {
      // Use name-based duplicate detection since IDs are just loop indices
      const existingNames = new Set(_creatures.value.map(c => c.name.toLowerCase().trim()))
      const uniqueCreatures = newCreatures.filter(c => !existingNames.has(c.name.toLowerCase().trim()))
      const skippedCreatures = newCreatures.filter(c => existingNames.has(c.name.toLowerCase().trim())).map(c => c.name)
      
      if (uniqueCreatures.length === 0) {
        // Don't treat this as an error - it's a successful operation with all duplicates
        console.log(`No new creatures added - all ${newCreatures.length} were duplicates by name`)
      } else {
        // Reassign IDs to be sequential from current max
        const maxId = _creatures.value.length > 0 ? Math.max(..._creatures.value.map(c => c.id)) : 0
        uniqueCreatures.forEach((creature, index) => {
          creature.id = maxId + index + 1
        })
        
        const combined = [..._creatures.value, ...uniqueCreatures]
        const success = saveCreatures(combined)
        if (!success) {
          errors.push('Failed to save creatures to storage')
        } else {
          console.log(`Added ${uniqueCreatures.length} new creatures (${newCreatures.length - uniqueCreatures.length} duplicates skipped)`)
        }
      }
      
      return { success: errors.length === 0, errors, skippedCreatures }
    } catch (error) {
      console.error('Failed to add creatures:', error)
      return { success: false, errors: ['Failed to save creatures'] }
    } finally {
      isLoading.value = false
    }
  }

  // Replace all creatures
  const replaceCreatures = async (newCreatures: Creature[]): Promise<boolean> => {
    isLoading.value = true
    try {
      const success = saveCreatures(newCreatures)
      if (success) {
        console.log(`Replaced with ${newCreatures.length} creatures`)
      }
      return success
    } catch (error) {
      console.error('Failed to replace creatures:', error)
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Toggle favorite by creature name (more stable than ID)
  const toggleFavorite = (creatureId: number): void => {
    const creature = _creatures.value.find(c => c.id === creatureId)
    if (!creature) return
    
    const creatureName = creature.name.toLowerCase().trim()
    const index = _favorites.value.indexOf(creatureName)
    if (index > -1) {
      _favorites.value.splice(index, 1)
    } else {
      _favorites.value.push(creatureName)
    }
    // Automatically saves due to VueUse reactivity for favorites!
  }

  // Check if creature is favorited by name (more stable than ID)
  const isFavorite = (creatureId: number): boolean => {
    const creature = _creatures.value.find(c => c.id === creatureId)
    if (!creature) return false
    
    const creatureName = creature.name.toLowerCase().trim()
    return _favorites.value.includes(creatureName)
  }

  // Clear all data
  const clearAllData = (): boolean => {
    try {
      _creatures.value = []
      _favorites.value = []
      localStorage.removeItem('app-creatures')
      console.log('All data cleared')
      return true
    } catch (error) {
      console.error('Failed to clear data:', error)
      return false
    }
  }

  // Clear just favorites
  const clearFavorites = (): boolean => {
    try {
      _favorites.value = []
      console.log('Favorites cleared')
      return true
    } catch (error) {
      console.error('Failed to clear favorites:', error)
      return false
    }
  }

  // Storage info computed property
  const storageInfo = computed(() => {
    const info: Record<string, any> = {}
    
    // Get storage info
    const creaturesData = localStorage.getItem('app-creatures')
    const favoritesData = localStorage.getItem('app-favorites')
    
    if (creaturesData) {
      info.CREATURES = {
        size: `${(new Blob([creaturesData]).size / 1024).toFixed(1)}KB`,
        length: creaturesData.length
      }
    }
    
    if (favoritesData) {
      info.FAVORITES = {
        size: `${(new Blob([favoritesData]).size / 1024).toFixed(1)}KB`,
        length: favoritesData.length
      }
    }
    
    // Calculate total usage
    let totalSize = 0
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalSize += localStorage.getItem(key)!.length
      }
    }
    
    info.TOTAL = {
      size: `${(totalSize / 1024).toFixed(1)}KB`,
      items: Object.keys(localStorage).length
    }
    
    return info
  })

  // Export data
  const exportData = (): string => {
    const exportData: StoredData = {
      version: APP_VERSION,
      timestamp: Date.now(),
      creatures: _creatures.value,
      favorites: _favorites.value
    }
    
    return JSON.stringify(exportData, null, 2)
  }

  // Import data
  const importData = async (jsonData: string): Promise<{ success: boolean; errors: string[] }> => {
    const errors: string[] = []
    
    try {
      const data: StoredData = JSON.parse(jsonData)
      
      // Validate data structure
      if (!data.creatures || !Array.isArray(data.creatures)) {
        errors.push('Invalid creatures data')
      }
      
      // Import creatures
      if (data.creatures && data.creatures.length > 0) {
        const success = await replaceCreatures(data.creatures)
        if (!success) {
          errors.push('Failed to save creatures')
        }
      }
      
      // Import favorites
      if (data.favorites && Array.isArray(data.favorites)) {
        _favorites.value = data.favorites
      }
      
      return { success: errors.length === 0, errors }
    } catch (error) {
      console.error('Import failed:', error)
      return { success: false, errors: ['Failed to parse import data'] }
    }
  }

  // Error recovery
  const recover = async (): Promise<boolean> => {
    try {
      const stored = localStorage.getItem('app-creatures')
      if (stored) {
        const recovered = compressedSerializer.read(stored)
        if (Array.isArray(recovered)) {
          _creatures.value = recovered
          console.log('Successfully recovered creatures from localStorage')
          return true
        }
      }
      return false
    } catch (error) {
      console.error('Recovery failed:', error)
      return false
    }
  }

  // Watch for storage quota errors - only when data actually changes
  let lastCreaturesLength = 0
  watch(_creatures, () => {
    // Skip if just loading same data (no length change)
    if (_creatures.value.length === lastCreaturesLength) return
    lastCreaturesLength = _creatures.value.length
    
    try {
      const compressed = compressedSerializer.write(_creatures.value)
      const actualStorageSize = new Blob([compressed]).size
      
      if (actualStorageSize > 4 * 1024 * 1024) { // 4MB warning for actual compressed size
        console.warn('Approaching localStorage size limits:', `${(actualStorageSize / 1024 / 1024).toFixed(1)}MB`)
      }
    } catch (error) {
      console.error('Error checking storage size:', error)
    }
  }, { immediate: true })

  return {
    // Reactive state (automatically persisted)
    creatures,
    favorites,
    isLoading,
    isInitialized,
    
    // Computed
    hasData,
    storageInfo,
    
    // Core operations  
    addCreatures,
    replaceCreatures,
    toggleFavorite,
    isFavorite,
    
    // Data management
    clearAllData,
    clearFavorites,
    exportData,
    importData,
    recover,
    
    // Initialization
    initialize,
  }
}