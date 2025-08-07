// composables/useDataStore.ts
import { ref, computed, watch } from 'vue'
import LZString from 'lz-string'
import type { Creature } from '@/types/Creatures'

// Types for our stored data
interface StoredData {
  version: string
  timestamp: number
  creatures: Creature[]
  favorites: number[]
}

// Storage keys
const STORAGE_KEYS = {
  CREATURES: 'app-creatures',
  FAVORITES: 'app-favorites',
  VERSION: 'app-version'
} as const

// Current app version for migrations
const APP_VERSION = '1.0.0'

export function useDataStore() {
  // Reactive state
  const creatures = ref<Creature[]>([])
  const favorites = ref<number[]>([])
  const isLoading = ref(false)
  const lastSaved = ref<Date | null>(null)

  // Compression utilities
  const compress = (data: any): string => {
    try {
      const json = JSON.stringify(data)
      const compressed = LZString.compress(json)
      
      // Log compression stats
      const originalSize = new Blob([json]).size
      const compressedSize = new Blob([compressed]).size
      const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1)
      
      console.log(`Compression: ${(originalSize / 1024).toFixed(1)}KB → ${(compressedSize / 1024).toFixed(1)}KB (${ratio}% reduction)`)
      
      return compressed
    } catch (error) {
      console.error('Compression failed:', error)
      throw new Error('Failed to compress data')
    }
  }

  const decompress = (compressed: string): any => {
    try {
      const json = LZString.decompress(compressed)
      if (!json) throw new Error('Decompression returned null')
      return JSON.parse(json)
    } catch (error) {
      console.error('Decompression failed:', error)
      throw new Error('Failed to decompress data')
    }
  }

  // Storage utilities with error handling
  const safeStore = (key: string, data: any, useCompression = true): boolean => {
    try {
      const dataToStore = useCompression ? compress(data) : JSON.stringify(data)
      localStorage.setItem(key, dataToStore)
      
      // Verify storage worked
      const stored = localStorage.getItem(key)
      if (!stored) throw new Error('Data was not stored')
      
      return true
    } catch (error) {
      console.error(`Failed to store ${key}:`, error)
      
      // Check if we're hitting storage limits
      if (error.name === 'QuotaExceededError') {
        console.error('localStorage quota exceeded!')
      }
      
      return false
    }
  }

  const safeRetrieve = (key: string, useCompression = true): any | null => {
    try {
      const stored = localStorage.getItem(key)
      if (!stored) return null
      
      return useCompression ? decompress(stored) : JSON.parse(stored)
    } catch (error) {
      console.error(`Failed to retrieve ${key}:`, error)
      return null
    }
  }

  // Core storage operations
  const saveCreatures = async (creatureData: Creature[]): Promise<boolean> => {
    isLoading.value = true
    try {
      const success = safeStore(STORAGE_KEYS.CREATURES, creatureData)
      if (success) {
        creatures.value = creatureData
        lastSaved.value = new Date()
        console.log(`Saved ${creatureData.length} creatures to localStorage`)
      }
      return success
    } finally {
      isLoading.value = false
    }
  }

  const loadCreatures = async (): Promise<Creature[]> => {
    isLoading.value = true
    try {
      const stored = safeRetrieve(STORAGE_KEYS.CREATURES)
      if (stored && Array.isArray(stored)) {
        creatures.value = stored
        console.log(`Loaded ${stored.length} creatures from localStorage`)
        return stored
      }
      return []
    } finally {
      isLoading.value = false
    }
  }

  const saveFavorites = (favoriteIds: number[]): boolean => {
    const success = safeStore(STORAGE_KEYS.FAVORITES, favoriteIds, false) // Small data, no compression needed
    if (success) {
      favorites.value = favoriteIds
    }
    return success
  }

  const loadFavorites = (): number[] => {
    const stored = safeRetrieve(STORAGE_KEYS.FAVORITES, false)
    if (stored && Array.isArray(stored)) {
      favorites.value = stored
      return stored
    }
    return []
  }

  // Data management
  const clearAllData = (): boolean => {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key)
      })
      
      // Reset state
      creatures.value = []
      favorites.value = []
      lastSaved.value = null
      
      console.log('All data cleared from localStorage')
      return true
    } catch (error) {
      console.error('Failed to clear data:', error)
      return false
    }
  }

  const exportData = (): string => {
    const exportData: StoredData = {
      version: APP_VERSION,
      timestamp: Date.now(),
      creatures: creatures.value,
      favorites: favorites.value
    }
    
    return JSON.stringify(exportData, null, 2)
  }

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
        const success = await saveCreatures(data.creatures)
        if (!success) {
          errors.push('Failed to save creatures')
        }
      }
      
      // Import favorites
      if (data.favorites && Array.isArray(data.favorites)) {
        saveFavorites(data.favorites)
      }
      
      return { success: errors.length === 0, errors }
    } catch (error) {
      console.error('Import failed:', error)
      return { success: false, errors: ['Failed to parse import data'] }
    }
  }

  // Storage info for debugging
  const getStorageInfo = () => {
    const info: Record<string, any> = {}
    
    Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
      const item = localStorage.getItem(key)
      if (item) {
        const sizeKB = (new Blob([item]).size / 1024).toFixed(1)
        info[name] = {
          size: `${sizeKB}KB`,
          length: item.length
        }
      }
    })
    
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
  }

  // Auto-save watches - Always enabled!
  watch(favorites, (newFavorites) => {
    saveFavorites(newFavorites)
  }, { deep: true })

  // Initialize data on first use
  const initialize = async (): Promise<void> => {
    loadFavorites() 
    await loadCreatures()
  }

  // Computed properties
  const hasData = computed(() => creatures.value.length > 0)
  const storageInfo = computed(() => getStorageInfo())

  return {
    // State
    creatures,
    favorites,
    isLoading,
    lastSaved,
    hasData,
    storageInfo,
    
    // Core operations
    saveCreatures,
    loadCreatures,
    saveFavorites,
    loadFavorites,
    
    // Data management
    clearAllData,
    exportData,
    importData,
    initialize,
    
    // Utilities
    getStorageInfo
  }
}