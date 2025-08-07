<template>
  <div class="bg-zinc-800 rounded-lg p-6 max-w-2xl mx-auto">
    <div class="text-center mb-6">
      <h2 class="text-2xl font-bold mb-2">Import Creature Data</h2>
      <p class="text-gray-400">
        Import your creature data from 5etools JSON files
      </p>
    </div>

    <!-- Import Status -->
    <div v-if="importStatus" class="mb-6">
      <div class="bg-zinc-700 rounded-lg p-4">
        <div class="flex items-center justify-between mb-2">
          <span class="font-medium">{{ importStatus.phase }}</span>
          <span class="text-sm text-gray-400">
            {{ importStatus.processed }} / {{ importStatus.total }}
          </span>
        </div>
        
        <!-- Progress Bar -->
        <div class="w-full bg-zinc-600 rounded-full h-2 mb-3">
          <div 
            class="bg-blue-500 h-2 rounded-full transition-all duration-300"
            :style="{ width: `${importStatus.progress}%` }"
          ></div>
        </div>
        
        <!-- Current Item -->
        <div v-if="importStatus.currentItem" class="text-sm text-gray-400">
          Processing: {{ importStatus.currentItem }}
        </div>
      </div>
    </div>

    <!-- Results Summary -->
    <div v-if="importResults" class="mb-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-green-900/30 border border-green-600 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-green-400">{{ importResults.successful }}</div>
          <div class="text-sm text-green-300">Successfully Mapped</div>
        </div>
        
        <div class="bg-yellow-900/30 border border-yellow-600 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-yellow-400">{{ importResults.skipped }}</div>
          <div class="text-sm text-yellow-300">Skipped (Duplicates)</div>
        </div>
        
        <div class="bg-red-900/30 border border-red-600 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-red-400">{{ importResults.failed }}</div>
          <div class="text-sm text-red-300">Failed to Map</div>
        </div>
      </div>

      <!-- Error Details -->
      <div v-if="importResults.errors.length > 0" class="mt-4">
        <details class="bg-red-900/20 border border-red-600 rounded-lg">
          <summary class="p-4 cursor-pointer font-medium text-red-400 hover:bg-red-900/30">
            View Mapping Errors ({{ importResults.errors.length }})
          </summary>
          <div class="p-4 pt-0 max-h-40 overflow-y-auto">
            <div v-for="error in importResults.errors" :key="error.name" class="mb-2 text-sm">
              <span class="font-medium">{{ error.name }}:</span>
              <span class="text-gray-400 ml-2">{{ error.error }}</span>
            </div>
          </div>
        </details>
      </div>
    </div>

    <!-- File Drop Zone -->
    <div 
      v-if="!isImporting && !importResults"
      @drop="handleDrop"
      @dragover.prevent
      @dragenter.prevent
      :class="[
        'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
        isDragOver 
          ? 'border-blue-400 bg-blue-900/20' 
          : 'border-zinc-600 hover:border-zinc-500'
      ]"
      @dragenter="isDragOver = true"
      @dragleave="isDragOver = false"
    >
      <div class="mb-4">
        <div class="text-4xl mb-2">📁</div>
        <h3 class="text-lg font-medium mb-2">Drop 5etools JSON files here</h3>
        <p class="text-gray-400 text-sm mb-4">
          Or click to browse for files
        </p>
      </div>
      
      <input
        ref="fileInput"
        type="file"
        multiple
        accept=".json"
        @change="handleFileSelect"
        class="hidden"
      />
      
      <Button
        @click="$refs.fileInput?.click()"
        primary
        class="mb-4"
      >
        Choose Files
      </Button>
      
      <div class="text-xs text-gray-500">
        <p>Select any JSON files from 5etools</p>
        <p>Multiple files can be imported at once</p>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="flex justify-between items-center mt-6">
      <div class="flex gap-2">
        <Button
          v-if="importResults"
          @click="resetImport"
          outline
        >
          Import More
        </Button>
        
        <Button
          v-if="dataStore.hasData.value"
          @click="showDataManager = true"
          outline
          info
        >
          Manage Data
        </Button>
      </div>
      
      <div class="flex gap-2">
        <Button
          v-if="importResults?.successful > 0"
          @click="$emit('close')"
          success
        >
          Done ({{ importResults.successful }} creatures imported)
        </Button>
        
        <Button
          v-else
          @click="$emit('close')"
          outline
        >
          Cancel
        </Button>
      </div>
    </div>

    <!-- Data Manager Modal -->
    <DataManager
      v-if="showDataManager"
      @close="showDataManager = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Button from './Button.vue'
import DataManager from './DataManager.vue'
import { useDataStore } from '@/composables/useDataStore'
import mapCreature from '@/utils/creatureMapper' // Your existing mapper
import type { Creature } from '@/types/Creatures'

const emits = defineEmits<{
  close: []
}>()

// State
const dataStore = useDataStore()
const fileInput = ref<HTMLInputElement>()
const isDragOver = ref(false)
const isImporting = ref(false)
const showDataManager = ref(false)

// Import tracking
interface ImportStatus {
  phase: string
  processed: number
  total: number
  progress: number
  currentItem: string
}

interface ImportResults {
  successful: number
  skipped: number
  failed: number
  errors: Array<{ name: string; error: string }>
}

const importStatus = ref<ImportStatus | null>(null)
const importResults = ref<ImportResults | null>(null)

// File handling
const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = false
  
  const files = Array.from(event.dataTransfer?.files || [])
  processFiles(files)
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files || [])
  processFiles(files)
}

const processFiles = async (files: File[]) => {
  if (files.length === 0) return
  
  isImporting.value = true
  importResults.value = null
  
  const results: ImportResults = {
    successful: 0,
    skipped: 0, 
    failed: 0,
    errors: []
  }
  
  const allCreatures: Creature[] = []
  const existingCreatures = await dataStore.loadCreatures()
  const existingIds = new Set(existingCreatures.map(c => c.id))
  
  // Count total creatures across all files
  let totalCreatures = 0
  const fileContents: Array<{ filename: string; creatures: any[] }> = []
  
  // Read all files first
  importStatus.value = {
    phase: 'Reading files...',
    processed: 0,
    total: files.length,
    progress: 0,
    currentItem: ''
  }
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    importStatus.value.currentItem = file.name
    
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      
      // Handle different 5etools file structures
      let creatures: any[] = []
      if (data.monster && Array.isArray(data.monster)) {
        creatures = data.monster
      } else if (Array.isArray(data)) {
        creatures = data
      } else if (data.creatures && Array.isArray(data.creatures)) {
        creatures = data.creatures
      }
      
      fileContents.push({ filename: file.name, creatures })
      totalCreatures += creatures.length
    } catch (error) {
      console.error(`Failed to read ${file.name}:`, error)
      results.errors.push({ 
        name: file.name, 
        error: 'Failed to parse JSON file' 
      })
    }
    
    importStatus.value.processed = i + 1
    importStatus.value.progress = ((i + 1) / files.length) * 30 // 30% for file reading
  }
  
  // Process creatures
  importStatus.value.phase = 'Mapping creatures...'
  importStatus.value.total = totalCreatures
  importStatus.value.processed = 0
  
  let processedCount = 0
  
  for (const fileContent of fileContents) {
    for (let i = 0; i < fileContent.creatures.length; i++) {
      const rawCreature = fileContent.creatures[i]
      processedCount++
      
      importStatus.value.currentItem = rawCreature.name || `Creature ${i + 1}`
      importStatus.value.processed = processedCount
      importStatus.value.progress = 30 + ((processedCount / totalCreatures) * 60) // 30-90% for processing
      
      try {
        const mappedCreature = mapCreature(rawCreature, rawCreature.id || processedCount)
        
        // Check for duplicates
        if (existingIds.has(mappedCreature.id)) {
          results.skipped++
          continue
        }
        
        allCreatures.push(mappedCreature)
        existingIds.add(mappedCreature.id)
        results.successful++
        
      } catch (error) {
        console.error(`Failed to map creature ${rawCreature.name}:`, error)
        results.failed++
        results.errors.push({
          name: rawCreature.name || `Creature ${i + 1}`,
          error: error.message || 'Unknown mapping error'
        })
      }
      
      // Small delay to keep UI responsive
      if (processedCount % 50 === 0) {
        await new Promise(resolve => setTimeout(resolve, 10))
      }
    }
  }
  
  // Save to storage
  importStatus.value.phase = 'Saving to storage...'
  importStatus.value.progress = 90
  
  if (allCreatures.length > 0) {
    const combinedCreatures = [...existingCreatures, ...allCreatures]
    const success = await dataStore.saveCreatures(combinedCreatures)
    
    if (!success) {
      results.errors.push({
        name: 'Storage',
        error: 'Failed to save creatures to localStorage'
      })
    }
  }
  
  importStatus.value.progress = 100
  importResults.value = results
  isImporting.value = false
  
  // Clear status after a moment
  setTimeout(() => {
    importStatus.value = null
  }, 2000)
}

const resetImport = () => {
  importResults.value = null
  importStatus.value = null
  isImporting.value = false
  
  // Reset file input
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}
</script>