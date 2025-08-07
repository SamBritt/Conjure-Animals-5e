<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="bg-zinc-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold">Data Management</h2>
        <button 
          @click="$emit('close')"
          class="text-gray-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      <!-- Storage Statistics -->
      <div class="bg-zinc-700 rounded-lg p-4 mb-6">
        <h3 class="text-lg font-medium mb-4">Storage Usage</h3>
        
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-400">{{ dataStore.creatures.value.length }}</div>
            <div class="text-sm text-gray-400">Creatures</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-yellow-400">{{ dataStore.favorites.value.length }}</div>
            <div class="text-sm text-gray-400">Favorites</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-green-400">{{ storageInfo?.TOTAL?.size || '0KB' }}</div>
            <div class="text-sm text-gray-400">Total Storage</div>
          </div>
        </div>

        <!-- Detailed Storage Breakdown -->
        <details class="mt-4">
          <summary class="cursor-pointer text-sm font-medium text-gray-300 hover:text-white">
            Storage Breakdown
          </summary>
          <div class="mt-2 space-y-2">
            <div v-for="(info, key) in storageInfo" :key="key" class="flex justify-between text-sm">
              <span class="text-gray-400">{{ key.replace('_', ' ') }}:</span>
              <span class="text-white">{{ info.size }}</span>
            </div>
          </div>
        </details>
      </div>

      <!-- Data Actions -->
      <div class="space-y-4">
        <!-- Export Data -->
        <div class="bg-zinc-700 rounded-lg p-4">
          <h4 class="font-medium mb-2">Export Data</h4>
          <p class="text-sm text-gray-400 mb-3">
            Download a backup of all your creatures and favorites.
          </p>
          <Button @click="exportData" outline success>
            Download Backup
          </Button>
        </div>

        <!-- Danger Zone -->
        <div class="bg-red-900/20 border border-red-600 rounded-lg p-4">
          <h4 class="font-medium text-red-400 mb-2">Danger Zone</h4>
          <p class="text-sm text-gray-400 mb-3">
            These actions cannot be undone. Make sure to export your data first!
          </p>
          
          <div class="space-y-2">
            <Button @click="clearFavorites" outline danger class="w-full">
              Clear All Favorites ({{ dataStore.favorites.value.length }})
            </Button>
            
            <Button @click="confirmClearData" outline danger class="w-full">
              Clear All Data
            </Button>
          </div>
        </div>
      </div>

      <!-- Confirmation Modal -->
      <div v-if="showConfirmation" class="fixed inset-0 bg-black/75 flex items-center justify-center z-60">
        <div class="bg-zinc-800 rounded-lg p-6 max-w-md mx-4">
          <h3 class="text-lg font-bold mb-4 text-red-400">Confirm Data Deletion</h3>
          <p class="text-gray-300 mb-6">
            This will permanently delete all your creatures and favorites. 
            This action cannot be undone!
          </p>
          <div class="flex gap-3 justify-end">
            <Button @click="showConfirmation = false" outline>
              Cancel
            </Button>
            <Button @click="clearAllData" danger>
              Delete Everything
            </Button>
          </div>
        </div>
      </div>

      <!-- Toast Notifications -->
      <div v-if="showToast" class="fixed top-4 right-4 z-70">
        <div :class="[
          'px-6 py-3 rounded-lg shadow-lg',
          toastType === 'success' ? 'bg-green-600' : 'bg-red-600'
        ]">
          {{ toastMessage }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import Button from './Button.vue'
import { useDataStore } from '@/composables/useDataStore'

const emits = defineEmits<{
  close: []
}>()

const dataStore = useDataStore()

// Local state
const showConfirmation = ref(false)
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref<'success' | 'error'>('success')

// Computed
const storageInfo = computed(() => dataStore.getStorageInfo())

// Toast utility
const showToastMessage = (message: string, type: 'success' | 'error' = 'success') => {
  toastMessage.value = message
  toastType.value = type
  showToast.value = true
  setTimeout(() => {
    showToast.value = false
  }, 3000)
}

// Actions
const exportData = () => {
  try {
    const exportedData = dataStore.exportData()
    const blob = new Blob([exportedData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `creature-data-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    URL.revokeObjectURL(url)
    showToastMessage('Data exported successfully!')
  } catch (error) {
    console.error('Export failed:', error)
    showToastMessage('Failed to export data', 'error')
  }
}

const clearFavorites = () => {
  const success = dataStore.saveFavorites([])
  if (success) {
    showToastMessage('Favorites cleared')
  } else {
    showToastMessage('Failed to clear favorites', 'error')
  }
}

const confirmClearData = () => {
  showConfirmation.value = true
}

const clearAllData = () => {
  const success = dataStore.clearAllData()
  showConfirmation.value = false
  
  if (success) {
    showToastMessage('All data cleared successfully')
  } else {
    showToastMessage('Failed to clear data', 'error')
  }
}
</script>

<style scoped>
.z-60 {
  z-index: 60;
}

.z-70 {
  z-index: 70;
}
</style>