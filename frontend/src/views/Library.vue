<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { useCategoryStore } from '../stores/categoryStore'
import { RouterLink } from 'vue-router'
import axios from 'axios'
import InstallPathSelector from '../components/InstallPathSelector.vue'

const gameStore = useGameStore()
const categoryStore = useCategoryStore()

const selectedGameIndex = ref(0)
const showAddGameModal = ref(false)
const showCategoryModal = ref(false)
const newGameKey = ref('')
const newGameName = ref('')
const newCategoryName = ref('')
const newCategoryIcon = ref('')
const pathSelector = ref<InstanceType<typeof InstallPathSelector> | null>(null)

// Installation state
const installingGameId = ref<string | null>(null)
const installProgress = ref({
  progress: 0,
  speed: '',
  downloaded: '',
  total: '',
  eta: '',
  type: 'download' // 'download' or 'extract'
})

const selectedGame = computed(() => {
  return gameStore.myGames[selectedGameIndex.value] || null
})

const organizedGames = computed(() => {
  if (!gameStore.myGames || gameStore.myGames.length === 0) return { installed: [], notInstalled: [] }
  
  const installed = gameStore.myGames.filter((g: any) => g.installed)
  const notInstalled = gameStore.myGames.filter((g: any) => !g.installed)
  
  return { installed, notInstalled }
})

onMounted(async () => {
  await gameStore.fetchMyGames()
  await categoryStore.fetchCategories()

  // Setup Electron installation event listeners
  if (window.electronAPI) {
    window.electronAPI.onInstallProgress((data) => {
      console.log('Installation progress:', data)
      if (installingGameId.value) {
        installProgress.value = {
          progress: data.progress,
          speed: data.speed || '',
          downloaded: data.downloaded || '',
          total: data.total || '',
          eta: data.eta || '',
          type: data.type || 'download'
        }
      }
    })

    window.electronAPI.onInstallComplete(async (data) => {
      try {
        // Sync status with backend
        await axios.post('/api/installation/status', {
          gameId: data.gameId,
          status: 'installed',
          path: data.path
        })
        
        // Update local state immediately to reflect "Installed" status in UI
        const game = gameStore.myGames.find(g => (g._id === data.gameId || g.folder_name === data.gameId))
        if (game) {
          game.installed = true
          game.status = 'installed'
        }

        // Show native notification
        new Notification('Ether Desktop', {
          body: `✅ ${data.gameName} installé avec succès!`,
          silent: false
        })

        installingGameId.value = null
        // Refresh game list in background
        await gameStore.fetchMyGames()
      } catch (error) {
        console.error('Failed to sync installation status:', error)
      }
    })

    window.electronAPI.onInstallError((data) => {
      new Notification('Ether Desktop', {
        body: `❌ Erreur lors de l'installation de ${data.gameName}: ${data.error}`
      })
      installingGameId.value = null
    })

    // Check installation status for all games
    const checkInstallations = async () => {
      const installPath = localStorage.getItem('etherInstallPath')
      if (!installPath) return

      for (const game of gameStore.myGames) {
        if (game.folder_name) {
          const isInstalled = await window.electronAPI.checkGameInstalled(installPath, game.folder_name)
          if (isInstalled) {
            game.installed = true
            game.status = 'installed'
          }
        }
      }
    }
    
    // Run check when games are loaded
    watch(() => gameStore.myGames, () => {
      if (gameStore.myGames.length > 0) {
        checkInstallations()
      }
    }, { immediate: true })
  }
})

const selectGame = (index: number) => {
  selectedGameIndex.value = index
}

const handleAddGame = async () => {
  try {
    // Call API to add game with key
    const response = await fetch('/api/game-ownership/redeem-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: newGameKey.value,
        gameName: newGameName.value
      })
    })
    
    if (response.ok) {
      alert('Jeu ajouté avec succès!')
      showAddGameModal.value = false
      newGameKey.value = ''
      newGameName.value = ''
      await gameStore.fetchHomeData()
    } else {
      const data = await response.json()
      alert(data.message || 'Erreur lors de l\'ajout')
    }
  } catch (error) {
    alert('Erreur réseau')
  }
}

const handleCreateCategory = async () => {
  try {
    await categoryStore.createCategory(newCategoryName.value, newCategoryIcon.value)
    newCategoryName.value = ''
    newCategoryIcon.value = ''
    alert('Catégorie créée!')
  } catch (error) {
    alert('Erreur lors de la création')
  }
}

const installGame = async (gameId: string, gameName: string) => {
  if (!confirm(`Installer ${gameName}?`)) return

  try {
    // Check if running in Electron
    if (!window.electronAPI) {
      alert('L\'installation nécessite l\'application desktop Electron')
      return
    }

    // Get install path from localStorage or ask user
    let installPath = localStorage.getItem('etherInstallPath')
    
    if (!installPath) {
      // Show path selector modal
      const selectedPath = await pathSelector.value?.show()
      installPath = selectedPath || null
      
      if (!installPath) return // User cancelled
      
      // Save path for future installations
      localStorage.setItem('etherInstallPath', installPath)
    }

    // Get game metadata from backend
    const gameResponse = await axios.get(`/api/games/${gameId}`)
    const game = gameResponse.data
    
    if (!game.zipUrl) {
      alert('Fichier d\'installation non disponible')
      return
    }

    // Start installation via Electron
    const result = await window.electronAPI.installGame(
      game.zipUrl,
      installPath,
      game.folder_name || gameId,
      gameId,
      gameName
    )

    if (result.success) {
      installingGameId.value = gameId
      // Reset progress
      installProgress.value = {
        progress: 0,
        speed: '0 MB/s',
        downloaded: '0 MB',
        total: '...',
        eta: '...',
        type: 'download'
      }
    }
  } catch (error: any) {
    console.error('Installation error:', error)
    alert(error.message || 'Erreur lors de l\'installation')
  }
}

const launchGame = (folderName: string) => {
  // In Electron, we could launch the executable directly
  // For now, just show an alert or open folder
  if (window.electronAPI) {
    alert(`Lancement de ${folderName}... (Fonctionnalité à venir)`)
  } else {
    window.open(`/games/${folderName}`, '_blank')
  }
}
</script>

<template>
  <div class="library-layout">
    <!-- Header with actions -->
    <div class="library-header">
      <h2>Ma Bibliothèque</h2>
      <div class="header-actions">
        <button @click="showCategoryModal = true" class="btn-secondary">
          Gérer les catégories
        </button>
        <button @click="showAddGameModal = true" class="btn-primary">
          Ajouter un jeu
        </button>
      </div>
    </div>

    <!-- Main content -->
    <div class="library-content">
      <!-- Game list sidebar -->
      <div class="games-list-sidebar">
        <div v-if="gameStore.isLoading" class="loading">Chargement...</div>
        <div v-else-if="gameStore.myGames.length === 0" class="empty-library">
          <p>Aucun jeu possédé.</p>
        </div>
        <div v-else>
          <!-- Installed games -->
          <div v-if="organizedGames.installed.length > 0" class="category-group">
            <div class="category-header">
              <span>▼ Installé</span>
              <span class="count">{{ organizedGames.installed.length }}</span>
            </div>
            <div class="category-games">
              <div 
                v-for="(game, index) in organizedGames.installed" 
                :key="game.game_key || index"
                :class="['game-item', { active: selectedGameIndex === gameStore.myGames.indexOf(game) }]"
                @click="selectGame(gameStore.myGames.indexOf(game))"
              >
                <img :src="game.image_url || '/assets/images/default-game.png'" class="game-thumb">
                <div class="game-info">
                  <div class="game-name">{{ game.game_name }}</div>
                  <div class="game-status">Installé</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Not installed games -->
          <div v-if="organizedGames.notInstalled.length > 0" class="category-group">
            <div class="category-header">
              <span>▼ Non installé</span>
              <span class="count">{{ organizedGames.notInstalled.length }}</span>
            </div>
            <div class="category-games">
              <div 
                v-for="(game, index) in organizedGames.notInstalled" 
                :key="game.game_key || index"
                :class="['game-item', { active: selectedGameIndex === gameStore.myGames.indexOf(game) }]"
                @click="selectGame(gameStore.myGames.indexOf(game))"
              >
                <img :src="game.image_url || '/assets/images/default-game.png'" class="game-thumb">
                <div class="game-info">
                  <div class="game-name">{{ game.game_name }}</div>
                  <div class="game-status not-installed">Non installé</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Game details panel -->
      <div class="game-details-panel">
        <div v-if="selectedGame" class="details-content">
          <div class="game-header-image">
            <img :src="selectedGame.image_url || '/assets/images/default-game.png'">
          </div>
          <div class="game-details-info">
            <h1>{{ selectedGame.game_name || 'Jeu sans nom' }}</h1>
            <div class="game-metadata">
              <p><strong>Prix d'achat:</strong> {{ (selectedGame.purchase_price || 0).toFixed(2) }} CHF</p>
              <p v-if="selectedGame.is_manual_add && selectedGame.game_key">
                <strong>Clé de jeu:</strong> <code>{{ selectedGame.game_key }}</code>
              </p>
            </div>
            <div class="game-actions">
              <div v-if="installingGameId === (selectedGame._id || selectedGame.folder_name)" class="install-progress">
                <div class="progress-info">
                  <span class="progress-status">
                    {{ installProgress.type === 'download' ? 'Téléchargement' : 'Extraction' }} 
                    {{ installProgress.progress }}%
                  </span>
                  <span class="progress-details">
                    {{ installProgress.speed }} - ETA: {{ installProgress.eta }}
                  </span>
                </div>
                <div class="progress-bar-container">
                  <div class="progress-bar" :style="{ width: installProgress.progress + '%' }"></div>
                </div>
                <div class="progress-stats">
                  {{ installProgress.downloaded }} / {{ installProgress.total }}
                </div>
              </div>
              <button 
                v-else-if="!selectedGame.installed" 
                @click="installGame(selectedGame._id || selectedGame.folder_name, selectedGame.game_name)"
                class="btn-action btn-install"
                :disabled="!!installingGameId"
              >
                {{ installingGameId ? 'Installation en cours...' : 'Installer' }}
              </button>
              <button 
                v-else
                @click="launchGame(selectedGame.folder_name)"
                class="btn-action btn-play"
              >
                ▶ Jouer
              </button>
              <RouterLink 
                v-if="selectedGame.folder_name" 
                :to="`/games/details/${selectedGame.folder_name}`" 
                class="btn-link"
              >
                Voir les détails
              </RouterLink>
            </div>
          </div>
        </div>
        <div v-else class="empty-details">
          <p>Sélectionnez un jeu pour voir ses détails</p>
        </div>
      </div>
    </div>

    <!-- Add Game Modal -->
    <div v-if="showAddGameModal" class="modal-overlay" @click="showAddGameModal = false">
      <div class="modal-content">
        <span class="close" @click="showAddGameModal = false">&times;</span>
        <h3>Ajouter un jeu avec une clé</h3>
        <form @submit.prevent="handleAddGame">
          <div class="form-group">
            <label>Clé de jeu (depuis un site externe):</label>
            <input 
              v-model="newGameKey" 
              type="text" 
              placeholder="XXXX-XXXX-XXXX-XXXX" 
              pattern="[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}"
              required
            >
          </div>
          <div class="form-group">
            <label>Nom du jeu (optionnel):</label>
            <input v-model="newGameName" type="text" placeholder="Nom du jeu">
          </div>
          <div class="form-actions">
            <button type="submit" class="btn-primary">Ajouter</button>
            <button type="button" @click="showAddGameModal = false" class="btn-secondary">Annuler</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Install Path Selector Modal -->
    <InstallPathSelector ref="pathSelector" />

    <!-- Category Management Modal -->
    <div v-if="showCategoryModal" class="modal" @click.self="showCategoryModal = false">
      <div class="modal-content">
        <span class="close" @click="showCategoryModal = false">&times;</span>
        <h3>Gérer les catégories</h3>
        <div class="categories-list">
          <div v-for="category in categoryStore.categories" :key="category.id" class="category-item">
            <div class="category-header">
              <strong>{{ category.icon }} {{ category.name }}</strong>
              <button @click="categoryStore.deleteCategory(category.id)" class="btn-danger-sm">Supprimer</button>
            </div>
          </div>
          <p v-if="!categoryStore.categories.length">Aucune catégorie</p>
        </div>
        <hr>
        <h4>Créer une nouvelle catégorie</h4>
        <form @submit.prevent="handleCreateCategory" class="create-category-form">
          <input v-model="newCategoryName" type="text" placeholder="Nom de la catégorie" required>
          <input v-model="newCategoryIcon" type="text" placeholder="Icône (optionnel)" style="width: 60px;">
          <button type="submit" class="btn-primary">Créer</button>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.library-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1a1a1a;
  color: #fff;
}

.library-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: #2a2a2a;
  border-bottom: 1px solid #3a3a3a;
}

.library-header h2 {
  margin: 0;
  font-size: 1.8rem;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.library-content {
  display: grid;
  grid-template-columns: 350px 1fr;
  flex: 1;
  overflow: hidden;
}

.games-list-sidebar {
  background: #1e1e1e;
  border-right: 1px solid #3a3a3a;
  overflow-y: auto;
}

.category-group {
  margin-bottom: 10px;
}

.category-header {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  background: #2a2a2a;
  cursor: pointer;
  font-weight: 600;
}

.category-header .count {
  color: #888;
  font-size: 0.9rem;
}

.category-games {
  background: #1a1a1a;
}

.game-item {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.game-item:hover {
  background: #2a2a2a;
}

.game-item.active {
  background: #3a3a4a;
}

.game-thumb {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 4px;
}

.game-info {
  flex: 1;
  overflow: hidden;
}

.game-name {
  font-weight: 600;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.game-status {
  font-size: 0.85rem;
  color: #4CAF50;
}

.game-status.not-installed {
  color: #888;
}

.game-details-panel {
  overflow-y: auto;
  background: #0a0a0a;
}

.details-content {
  padding: 20px;
}

.game-header-image {
  width: 100%;
  height: 400px;
  margin-bottom: 20px;
  border-radius: 8px;
  overflow: hidden;
}

.game-header-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.game-details-info h1 {
  font-size: 2rem;
  margin-bottom: 16px;
}

.game-metadata {
  margin-bottom: 24px;
  color: #aaa;
}

.game-metadata code {
  background: #2a2a2a;
  padding: 4px 8px;
  border-radius: 3px;
  font-family: monospace;
}

.game-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.btn-action {
  padding: 12px 24px;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-install {
  background: #4CAF50;
  color: white;
}

.btn-install:hover {
  background: #45a049;
}

.btn-play {
  background: #4a9eff;
  color: white;
}

.btn-play:hover {
  background: #3a8eef;
}

.btn-link {
  padding: 12px 24px;
  background: transparent;
  border: 1px solid #555;
  color: #fff;
  text-decoration: none;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-link:hover {
  background: #2a2a2a;
}

.empty-library, .empty-details, .loading {
  padding: 40px;
  text-align: center;
  color: #888;
}

/* Modal styles */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: #2a2a2a;
  padding: 30px;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
}

.close {
  position: absolute;
  top: 10px;
  right: 20px;
  font-size: 28px;
  cursor: pointer;
  color: #fff;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #ccc;
}

.form-group input {
  width: 100%;
  padding: 10px;
  background: #1e1e1e;
  border: 1px solid #555;
  border-radius: 4px;
  color: #fff;
  font-family: inherit;
}

.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.btn-primary, .btn-secondary, .btn-danger-sm {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
}

.btn-primary {
  background: #4CAF50;
  color: white;
}

.btn-secondary {
  background: #666;
  color: white;
}

.btn-danger-sm {
  padding: 5px 10px;
  background: #d32f2f;
  color: white;
  font-size: 0.85rem;
}

.categories-list {
  margin: 20px 0;
}

.category-item {
  background: #1e1e1e;
  padding: 16px;
  margin-bottom: 12px;
  border-radius: 6px;
}

.category-item .category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.create-category-form {
  display: flex;
  gap: 10px;
  align-items: flex-end;
  margin-top: 16px;
}

.create-category-form input {
  flex: 1;
  padding: 10px;
  background: #1e1e1e;
  border: 1px solid #555;
  border-radius: 4px;
  color: #fff;
}


.install-progress {
  width: 100%;
  background: #1e1e1e;
  padding: 12px;
  border-radius: 4px;
  border: 1px solid #333;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 0.9rem;
}

.progress-status {
  font-weight: 600;
  color: #4CAF50;
}

.progress-details {
  color: #888;
}

.progress-bar-container {
  height: 8px;
  background: #333;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 6px;
}

.progress-bar {
  height: 100%;
  background: #4CAF50;
  transition: width 0.3s ease;
}

.progress-stats {
  font-size: 0.8rem;
  color: #666;
  text-align: right;
}
</style>
