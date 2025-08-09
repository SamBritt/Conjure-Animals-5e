<script setup lang="ts">
import { ref, computed, onMounted, onBeforeMount } from 'vue'
import Button from './Button.vue'
import Counter from '@/components/Counter.vue'
import CreatureDetailModal from '@/components/CreatureDetailModal.vue'
import DataImporter from '@/components/DataImporter.vue'
import { useDataStore } from '@/composables/useDataStore'

import type { Creature } from '@/types/Creatures'

const emits = defineEmits<{
  summon: [count: number, creature: Creature]
}>()

// Use the new VueUse data store
const dataStore = useDataStore()

// All reactive data is now directly from the store
const allCreatures = computed(() => dataStore.creatures.value)
const loading = computed(() => dataStore.isLoading.value)
const favorites = computed(() => dataStore.favorites.value)
const isInitialized = computed(() => dataStore.isInitialized.value)

// Search and filter state
const searchQuery = ref('')
const selectedTypes = ref<string[]>(['beast'])
const selectedCR = ref<string>('any')
const movementFilters = ref({
  walk: false,
  swim: false,
  fly: false
})
const showFavoritesOnly = ref(false)

// Sorting state
const sortBy = ref<'name' | 'cr'>('name')
const sortDirection = ref<'asc' | 'desc'>('asc')

// Modal state
const showDetailModal = ref(false)
const detailCreature = ref<Creature | null>(null)
const summonCount = ref<number>(8)
const selectedCreature = ref<Creature | null>(null)
const showImportMode = ref(false)

// Available filter options
const availableTypes = ['beast', 'fey', 'monstrosity', 'elemental', 'celestial', 'fiend', 'undead', 'humanoid', 'dragon', 'giant', 'aberration', 'construct', 'ooze', 'plant']

// CR options
const crOptions = [
  { value: 'any', label: 'Any CR' },
  { value: '0', label: 'CR 0' },
  { value: '0.125', label: 'CR 1/8' },
  { value: '0.25', label: 'CR 1/4' },
  { value: '0.5', label: 'CR 1/2' },
  { value: '1', label: 'CR 1' },
  { value: '2', label: 'CR 2' },
  { value: '3', label: 'CR 3' },
  { value: '4', label: 'CR 4' },
  { value: '5', label: 'CR 5' },
  { value: '6-10', label: 'CR 6-10' },
  { value: '11-15', label: 'CR 11-15' },
  { value: '16-20', label: 'CR 16-20' },
  { value: '21+', label: 'CR 21+' }
]

// Helper function to parse CR string to numeric value
const parseCRValue = (cr: string | number): number => {
  const crStr = cr.toString()
  if (crStr.includes('/')) {
    const [numerator, denominator] = crStr.split('/')
    return parseFloat(numerator) / parseFloat(denominator)
  }
  return parseFloat(crStr)
}

// Helper function to check if creature matches CR filter
const matchesCRFilter = (creature: Creature) => {
  if (selectedCR.value === 'any') return true
  
  const cr = parseCRValue(creature.cr)
  const filter = selectedCR.value
  
  if (filter === '6-10') return cr >= 6 && cr <= 10
  if (filter === '11-15') return cr >= 11 && cr <= 15
  if (filter === '16-20') return cr >= 16 && cr <= 20
  if (filter === '21+') return cr >= 21
  
  // Handle fractional CRs
  if (filter === '0.125') return cr === 0.125 // 1/8
  if (filter === '0.25') return cr === 0.25   // 1/4
  if (filter === '0.5') return cr === 0.5     // 1/2
  
  return cr === parseFloat(filter)
}

// Helper function to check movement capabilities
const hasMovementType = (creature: Creature, movementType: string) => {
  const speed = creature.speed
  if (!speed) return false
  
  switch (movementType) {
    case 'walk':
      return speed.walk > 0
    case 'swim':
      return !!speed.swim && speed.swim > 0
    case 'fly':
      return !!speed.fly && speed.fly > 0
    default:
      return false
  }
}

// Sorting functions
const toggleSort = (column: 'name' | 'cr') => {
  if (sortBy.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = column
    sortDirection.value = 'asc'
  }
}

const sortCreatures = (creatures: Creature[]) => {
  return creatures.sort((a, b) => {
    let aValue: string | number
    let bValue: string | number
    
    if (sortBy.value === 'name') {
      aValue = a.name.toLowerCase()
      bValue = b.name.toLowerCase()
    } else { // sortBy.value === 'cr'
      aValue = parseCRValue(a.cr)
      bValue = parseCRValue(b.cr)
    }
    
    let comparison: number
    if (typeof aValue === 'string') {
      comparison = aValue.localeCompare(bValue as string)
    } else {
      comparison = aValue - (bValue as number)
    }
    
    return sortDirection.value === 'desc' ? -comparison : comparison
  })
}

// Main filtered creatures computation
const filteredCreatures = computed<Creature[]>(() => {
  const startTime = performance.now()
  
  // Don't compute when still loading
  if (loading.value || !isInitialized.value) {
    return []
  }
  
  let filtered = allCreatures.value

  // Search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    filtered = filtered.filter(creature => 
      creature.name.toLowerCase().includes(query)
    )
  }

  // Type filter
  if (selectedTypes.value.length > 0) {
    filtered = filtered.filter(creature =>
      selectedTypes.value.some(type => 
        creature.type.toLowerCase().includes(type.toLowerCase())
      )
    )
  }

  // CR filter
  if (selectedCR.value !== 'any') {
    filtered = filtered.filter(creature => matchesCRFilter(creature))
  }

  // Movement filters
  const activeMovementFilters = Object.entries(movementFilters.value)
    .filter(([_, active]) => active)
    .map(([type, _]) => type)

  if (activeMovementFilters.length > 0) {
    filtered = filtered.filter(creature =>
      activeMovementFilters.every(movementType =>
        hasMovementType(creature, movementType)
      )
    )
  }

  // Favorites filter
  if (showFavoritesOnly.value) {
    filtered = filtered.filter(creature => dataStore.isFavorite(creature.id))
  }

  // Apply sorting
  const result = sortCreatures(filtered)
  
  const endTime = performance.now()
  console.log(`filteredCreatures computed in ${endTime - startTime}ms, returned ${result.length} creatures`)
  
  return result
})

// Toggle favorite using data store (much simpler now!)
const toggleFavorite = (creature: Creature, event: Event) => {
  event.stopPropagation()
  dataStore.toggleFavorite(creature.id)
}

// Check if creature is favorited
const isFavorite = (creature: Creature) => {
  return dataStore.isFavorite(creature.id)
}

// Toggle type filter
const toggleType = (type: string) => {
  const index = selectedTypes.value.indexOf(type)
  if (index > -1) {
    selectedTypes.value.splice(index, 1)
  } else {
    selectedTypes.value.push(type)
  }
}

// Toggle movement filter
const toggleMovementFilter = (movementType: keyof typeof movementFilters.value) => {
  movementFilters.value[movementType] = !movementFilters.value[movementType]
}

// Clear all filters
const clearAllFilters = () => {
  searchQuery.value = ''
  selectedTypes.value = []
  selectedCR.value = 'any'
  movementFilters.value = { walk: false, swim: false, fly: false }
  showFavoritesOnly.value = false
}

// Show creature details
const showCreatureDetails = (creature: Creature) => {
  selectedCreature.value = creature
  detailCreature.value = creature
  showDetailModal.value = true
}

const closeDetailModal = () => {
  showDetailModal.value = false
  detailCreature.value = null
}

const quickSummon = (count: number, creature: Creature) => {
  emits('summon', count, creature)
  closeDetailModal()
}

const summon = (): void => {
  if (selectedCreature.value) {
    emits('summon', summonCount.value, selectedCreature.value)
  }
}

const handleImporterClose = () => {
  showImportMode.value = false
}


const disableSummon = computed<boolean>(() => {
  return !selectedCreature.value
})

// Active filters count for UI
const activeFiltersCount = computed(() => {
  let count = 0
  if (searchQuery.value.trim()) count++
  if (selectedTypes.value.length > 0) count++
  if (selectedCR.value !== 'any') count++
  if (Object.values(movementFilters.value).some(v => v)) count++
  if (showFavoritesOnly.value) count++
  return count
})
console.log("created")
onBeforeMount(() => {
  console.log("opened")
})

// Much simpler initialization with proper loading state
onMounted(() => {
  console.log('CreatureSelect mounted, isInitialized:', dataStore.isInitialized.value)
  console.log('DOM rendering complete')
  // Initialize the data store (handles decompression) - don't await so UI renders immediately
  dataStore.initialize().then(() => {
    console.log('Initialize complete')
    // If no creatures exist after loading, show import mode
    if (!dataStore.hasData.value) {
      showImportMode.value = true
    }
  })
})
</script>

<template>
  <div class="p-4 max-w-4xl">
    <!-- Show DataImporter only when explicitly in import mode -->
    <div v-if="showImportMode">
      <DataImporter @close="handleImporterClose" />
    </div>

    <!-- Show normal creature browser when NOT in import mode -->
    <div v-else>
      <!-- Search Bar -->
      <div class="mb-4">
        <div class="relative">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search creatures by name..."
            class="w-full px-4 py-2 bg-zinc-600 text-white rounded-lg border border-zinc-500 focus:border-blue-400 focus:outline-none"
          />
          <div class="absolute right-3 top-2.5 text-gray-400">
            🔍
          </div>
        </div>
      </div>

      <!-- Quick Actions Row -->
      <div class="flex justify-between items-center mb-4">
        <div class="flex gap-2">
          <Button
            :primary="showFavoritesOnly"
            :outline="!showFavoritesOnly"
            @click="showFavoritesOnly = !showFavoritesOnly"
            class="text-sm"
          >
            ⭐ Favorites {{ favorites.length > 0 ? `(${favorites.length})` : '' }}
          </Button>
          
          <Button
            @click="showImportMode = true"
            outline
            info
            class="text-sm"
          >
            📥 Import More
          </Button>
          
          <Button
            v-if="activeFiltersCount > 0"
            outline
            danger
            @click="clearAllFilters"
            class="text-sm"
          >
            Clear Filters ({{ activeFiltersCount }})
          </Button>
        </div>

        <div class="flex items-center gap-4">
          <span class="text-sm text-gray-300">
            <span v-if="loading">Loading creatures...</span>
            <span v-else>{{ filteredCreatures.length }} of {{ allCreatures.length }} creatures</span>
          </span>
          <Counter
            @increase="(count: number) => (summonCount = count)"
            @decrease="(count: number) => (summonCount = count)" 
          />
        </div>
      </div>

      <!-- Filters Section -->
      <div class="bg-zinc-700 rounded-lg p-4 mb-4 space-y-4">
        <!-- Type Filters -->
        <div>
          <label class="block text-sm font-medium mb-2">Creature Types:</label>
          <div class="flex flex-wrap gap-2">
            <Button
              v-for="type in availableTypes"
              :key="type"
              :primary="selectedTypes.includes(type)"
              :outline="!selectedTypes.includes(type)"
              @click="toggleType(type)"
              class="text-xs py-1 px-2"
            >
              {{ type.charAt(0).toUpperCase() + type.slice(1) }}
            </Button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- CR Filter -->
          <div>
            <label class="block text-sm font-medium mb-2">Challenge Rating:</label>
            <select 
              v-model="selectedCR"
              class="w-full px-3 py-2 bg-zinc-600 text-white rounded border border-zinc-500 focus:border-blue-400 focus:outline-none"
            >
              <option v-for="cr in crOptions" :key="cr.value" :value="cr.value">
                {{ cr.label }}
              </option>
            </select>
          </div>

          <!-- Movement Filters -->
          <div>
            <label class="block text-sm font-medium mb-2">Movement Types:</label>
            <div class="flex gap-4">
              <label class="flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  :checked="movementFilters.walk"
                  @change="toggleMovementFilter('walk')"
                  class="mr-2"
                />
                🚶 Walk
              </label>
              <label class="flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  :checked="movementFilters.swim"
                  @change="toggleMovementFilter('swim')"
                  class="mr-2"
                />
                🏊 Swim
              </label>
              <label class="flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  :checked="movementFilters.fly"
                  @change="toggleMovementFilter('fly')"
                  class="mr-2"
                />
                🦅 Fly
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Results Loading State -->
      <div v-if="loading" class="text-center py-8">
        <div class="animate-spin w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full mx-auto mb-4"></div>
        Loading creatures...
      </div>

      <!-- No Results State -->
      <div v-else-if="filteredCreatures.length === 0" class="text-center py-8 text-gray-400">
        <div class="text-4xl mb-4">🔍</div>
        <h3 class="text-lg font-medium mb-2">No creatures found</h3>
        <p class="text-sm">Try adjusting your filters or search terms</p>
      </div>

      <!-- Results List -->
      <div v-else class="bg-zinc-800 rounded-lg">
        <!-- Sortable Headers -->
        <div class="flex items-center justify-between px-4 py-2 bg-zinc-700 border-b border-zinc-600">
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <div class="w-8"></div> <!-- Spacer for star column -->
            
            <button 
              @click="toggleSort('name')"
              class="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white transition-colors min-w-0 flex-1"
            >
              <span>Name</span>
              <span class="text-xs">
                <span v-if="sortBy === 'name'" :class="sortDirection === 'asc' ? 'text-blue-400' : 'text-blue-400'">
                  {{ sortDirection === 'asc' ? '↑' : '↓' }}
                </span>
                <span v-else class="text-gray-500">↕</span>
              </span>
            </button>
          </div>
          
          <button 
            @click="toggleSort('cr')"
            class="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white transition-colors ml-4"
          >
            <span>CR</span>
            <span class="text-xs">
              <span v-if="sortBy === 'cr'" :class="sortDirection === 'asc' ? 'text-blue-400' : 'text-blue-400'">
                {{ sortDirection === 'asc' ? '↑' : '↓' }}
              </span>
              <span v-else class="text-gray-500">↕</span>
            </span>
          </button>
        </div>

        <div class="max-h-96 overflow-y-auto">
          <div
            v-for="creature in filteredCreatures"
            :key="creature.id"
            :class="[
              'flex items-center justify-between px-4 py-3 border-b border-zinc-700 hover:bg-zinc-600 cursor-pointer transition-colors',
              { 'bg-zinc-600 border-blue-400': selectedCreature === creature }
            ]"
            @click="showCreatureDetails(creature)"
          >
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <!-- Favorite Star -->
              <button
                @click="toggleFavorite(creature, $event)"
                :class="[
                  'text-lg hover:scale-110 transition-transform',
                  isFavorite(creature) ? 'text-yellow-400' : 'text-gray-500 hover:text-yellow-300'
                ]"
              >
                {{ isFavorite(creature) ? '⭐' : '☆' }}
              </button>

              <!-- Creature Info -->
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <span class="font-medium truncate">{{ creature.name }}</span>
                </div>
                
                <div class="flex items-center gap-4 text-xs text-gray-400">
                  <span>{{ creature.type }}</span>
                  
                  <!-- Movement Icons -->
                  <div class="flex gap-1">
                    <span v-if="hasMovementType(creature, 'walk')" title="Can walk">🚶</span>
                    <span v-if="hasMovementType(creature, 'swim')" title="Can swim">🏊</span>
                    <span v-if="hasMovementType(creature, 'fly')" title="Can fly">🦅</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Quick Info -->
            <div class="text-right text-xs ml-4">
              <div class="text-lg font-medium text-white mb-1">CR {{ creature.cr }}</div>
              <div class="text-gray-400">HP: {{ creature.hp.average }}</div>
              <div class="text-gray-400">AC: {{ typeof creature.ac === 'object' ? creature.ac.value : creature.ac }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Summon Button -->
      <div class="flex justify-between items-center pt-4 border-t border-zinc-600 mt-4">
        <div v-if="selectedCreature" class="text-sm text-gray-300">
          Selected: <span class="text-white font-medium">{{ selectedCreature.name }}</span>
        </div>
        <div v-else class="text-sm text-gray-500">
          Click a creature to select
        </div>
        
        <Button
          primary
          :disabled="disableSummon"
          @click="summon()"
          class="px-6"
        >
          Summon {{ summonCount }} {{ selectedCreature?.name || 'Creature' }}{{ summonCount > 1 ? 's' : '' }}
        </Button>
      </div>
    </div>

    <!-- Detail Modal (always as modal) -->
    <CreatureDetailModal
      v-if="showDetailModal"
      :creature="detailCreature"
      @close="closeDetailModal"
      @summon="quickSummon"
    />
  </div>
</template>

<style scoped>
/* Custom scrollbar for results list */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #374151;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #6B7280;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #9CA3AF;
}
</style>