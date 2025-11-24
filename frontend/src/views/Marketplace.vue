<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useMarketplaceStore } from '../stores/marketplaceStore'
import { useUserStore } from '../stores/userStore'

const marketplaceStore = useMarketplaceStore()
const userStore = useUserStore()

const activeTab = ref('marketplace')
const showSellModal = ref(false)
const showBuyModal = ref(false)
const selectedGameForSale = ref('')
const sellPrice = ref(0)
const selectedGameToBuy = ref(null as any)

// Filters
const genreFilter = ref('')
const priceRange = ref(100)

onMounted(async () => {
  await marketplaceStore.fetchUsedGames()
  await marketplaceStore.fetchActiveSales()
  await marketplaceStore.fetchOwnedGames()
})

const switchTab = (tab: string) => {
  activeTab.value = tab
  if (tab === 'transactions') {
    marketplaceStore.fetchTransactions()
  }
}

const applyFilters = () => {
  marketplaceStore.fetchUsedGames({
    genre: genreFilter.value,
    maxPrice: priceRange.value
  })
}

const openSellModal = async () => {
  await marketplaceStore.fetchOwnedGames()
  console.log('Owned games for sale:', marketplaceStore.ownedGames)
  showSellModal.value = true
}

const handleSellGame = async () => {
  if (!selectedGameForSale.value || sellPrice.value <= 0) {
    alert('Veuillez remplir tous les champs')
    return
  }

  try {
    // 1. List on backend
    await marketplaceStore.sellGame(selectedGameForSale.value, sellPrice.value)
    
    // 2. Uninstall locally if Electron is available
    if (window.electronAPI) {
      const installPath = localStorage.getItem('etherInstallPath')
      // Find the game object to get the folder name (game_key is usually folder_name)
      const game = marketplaceStore.ownedGames.find((g: any) => g.game_key === selectedGameForSale.value)
      
      if (installPath && game) {
        try {
          console.log('Uninstalling game due to sale listing:', game.game_key)
          await window.electronAPI.uninstallGame(installPath, game.game_key)
          new Notification('Ether Desktop', { body: `🗑️ ${game.game_name} a été désinstallé car mis en vente.` })
        } catch (err) {
          console.error('Failed to uninstall game:', err)
        }
      }
    }

    alert('Jeu mis en vente !')
    showSellModal.value = false
    selectedGameForSale.value = ''
    sellPrice.value = 0
    
    // Refresh lists
    await marketplaceStore.fetchOwnedGames()
    await marketplaceStore.fetchActiveSales()
  } catch (error: any) {
    alert(error.response?.data?.message || 'Erreur lors de la mise en vente')
  }
}

const buyUsedGame = async (game: any) => {
  const price = game.asking_price || 0
  if (confirm(`Acheter "${game.game_name}" pour ${price.toFixed(2)} CHF ?`)) {
    try {
      await marketplaceStore.buyUsedGame(game.ownership_token, game.seller_id)
      alert('Achat effectué avec succès!')
      await marketplaceStore.fetchUsedGames()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erreur lors de l\'achat')
    }
  }
}

const cancelSale = async (ownershipToken: string) => {
  if (confirm('Annuler cette vente ?')) {
    try {
      console.log('Cancelling sale for token:', ownershipToken)
      await marketplaceStore.cancelSale(ownershipToken)
      alert('Vente annulée. Vous pouvez maintenant réinstaller le jeu.')
      await marketplaceStore.fetchActiveSales()
      await marketplaceStore.fetchOwnedGames()
    } catch (error: any) {
      console.error('Cancel sale error:', error)
      alert(error.response?.data?.message || 'Erreur')
    }
  }
}

const deleteListing = async (ownershipToken: string) => {
  if (confirm('Êtes-vous sûr de vouloir supprimer cette annonce ? (Action Admin)')) {
    try {
      await marketplaceStore.deleteListing(ownershipToken)
      // Alert removed - already handled by store
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erreur lors de la suppression')
    }
  }
}

const platformCommission = ref(0)
const developerCommission = ref(0)
const netAmount = ref(0)

const updateCommissions = ()  => {
  const price = sellPrice.value
  platformCommission.value = price * 0.05
  developerCommission.value = price * 0.02
  netAmount.value = price - platformCommission.value - developerCommission.value
}

const gameStats = ref(null as any)

const updateGameStats = async () => {
  if (!selectedGameForSale.value) {
    gameStats.value = null
    return
  }
  
  gameStats.value = await marketplaceStore.fetchGameStats(selectedGameForSale.value)
}
</script>

<style scoped>
.market-stats {
  background: #1a1a1a;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 20px;
  border: 1px solid #444;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  font-size: 0.9rem;
}

.stat-item .label {
  color: #aaa;
}

.stat-item .value {
  font-weight: bold;
  color: #4a9eff;
}
</style>

<template>
  <main class="marketplace-container">
    <div class="marketplace-header">
      <h1>Marketplace</h1>
      <p>Achetez et vendez vos jeux en toute sécurité</p>
    </div>

    <!-- Tabs -->
    <div class="marketplace-tabs">
      <button 
        :class="['tab-btn', { active: activeTab === 'marketplace' }]" 
        @click="switchTab('marketplace')"
      >
        Marché d'Occasion
      </button>
      <button 
        :class="['tab-btn', { active: activeTab === 'my-games' }]" 
        @click="switchTab('my-games')"
      >
        Mes Jeux & Ventes
      </button>
      <button 
        :class="['tab-btn', { active: activeTab === 'transactions' }]" 
        @click="switchTab('transactions')"
      >
        Historique
      </button>
    </div>

    <!-- Marché d'Occasion Tab -->
    <div v-show="activeTab === 'marketplace'" class="tab-content">
      <h2>Marché d'Occasion</h2>
      <div class="marketplace-filters">
        <select v-model="genreFilter" @change="applyFilters">
          <option value="">Tous les genres</option>
          <option value="Action">Action</option>
          <option value="Strategy">Stratégie</option>
          <option value="Puzzle">Puzzle</option>
        </select>
        <input 
          v-model="priceRange" 
          type="range" 
          min="0" 
          max="100" 
          @change="applyFilters"
        >
        <span>Prix max: {{ priceRange }} CHF</span>
      </div>
      <div class="games-grid">
        <div v-if="marketplaceStore.isLoading">Chargement...</div>
        <div 
          v-for="game in marketplaceStore.usedGames" 
          :key="game.ownership_token" 
          class="game-card"
        >
          <img :src="game.image_url || '/assets/images/default-game.png'">
          <h3>{{ game.game_name }}</h3>
          <p><strong>{{ (game.asking_price || 0).toFixed(2) }} CHF</strong> • {{ game.genre || '' }}</p>
          <button @click="buyUsedGame(game)" class="btn">Acheter d'occasion</button>
          <button 
            v-if="userStore.user?.isAdmin" 
            @click="deleteListing(game.ownership_token)" 
            class="btn btn-danger" 
            style="margin-top: 10px;"
          >
            Supprimer (Admin)
          </button>
        </div>
        <p v-if="!marketplaceStore.isLoading && marketplaceStore.usedGames.length === 0">
          Aucune annonce disponible.
        </p>
      </div>
    </div>

    <!-- Mes Jeux & Ventes Tab -->
    <div v-show="activeTab === 'my-games'" class="tab-content">
      <!-- My Sales Section -->
      <div class="my-section">
        <div class="section-header">
          <h2>Mes Ventes Actives</h2>
        </div>
        <p class="section-description">Gérez vos jeux mis en vente. Vous pouvez annuler une vente à tout moment.</p>
        <div class="games-grid">
          <div 
            v-for="sale in marketplaceStore.activeSales" 
            :key="sale.ownership_token" 
            class="game-card"
          >
            <img :src="sale.image_url || '/assets/images/default-game.png'">
            <h3>{{ sale.game_name }}</h3>
            <p><strong>{{ (sale.asking_price || 0).toFixed(2) }} CHF</strong></p>
            <button @click="cancelSale(sale.ownership_token)" class="btn btn-danger">Annuler la vente</button>
          </div>
          <p v-if="marketplaceStore.activeSales.length === 0">Aucune vente active.</p>
        </div>
      </div>

      <hr>

      <!-- My Games Section -->
      <div class="my-section">
        <div class="section-header">
          <h2>Mes Jeux</h2>
          <button @click="openSellModal" class="btn btn-primary">Vendre un jeu</button>
        </div>
        <div class="games-grid">
          <div 
            v-for="game in marketplaceStore.ownedGames" 
            :key="game.game_key" 
            class="game-card"
          >
            <img :src="game.image_url || '/assets/images/default-game.png'">
            <h3>{{ game.game_name }}</h3>
            <p>{{ game.genre || 'N/A' }}</p>
          </div>
          <p v-if="marketplaceStore.ownedGames.length === 0">Aucun jeu possédé.</p>
        </div>
      </div>
    </div>

    <!-- Transactions Tab -->
    <div v-show="activeTab === 'transactions'" class="tab-content">
      <h2>Historique des Transactions</h2>
      <div class="transactions-list">
        <div 
          v-for="transaction in marketplaceStore.transactions" 
          :key="transaction.id" 
          class="transaction-item"
        >
          <div class="transaction-info">
            <strong>{{ transaction.game_name }}</strong>
            <span>{{ transaction.type === 'purchase' ? 'Achat' : 'Vente' }}</span>
            <span>{{ (transaction.amount || 0).toFixed(2) }} CHF</span>
            <span>{{ new Date(transaction.created_at).toLocaleDateString() }}</span>
          </div>
        </div>
        <p v-if="marketplaceStore.transactions.length === 0">Aucune transaction.</p>
      </div>
    </div>

    <!-- Sell Modal -->
    <div v-if="showSellModal" class="modal" @click.self="showSellModal = false">
      <div class="modal-content">
        <span class="close" @click="showSellModal = false">&times;</span>
        <h3>Vendre un jeu</h3>
        <form @submit.prevent="handleSellGame">
          <div class="form-group">
            <label>Jeu:</label>
            <select v-model="selectedGameForSale" @change="updateGameStats" required>
              <option value="">-- Sélectionner un jeu --</option>
              <option v-for="game in marketplaceStore.ownedGames" :key="game.game_key" :value="game.game_key">
                {{ game.game_name || `Jeu inconnu (${game.game_key})` }}
              </option>
            </select>
          </div>

          <!-- Market Stats -->
          <div v-if="gameStats" class="market-stats">
            <div class="stat-item">
              <span class="label">Prix moyen:</span>
              <span class="value">{{ (gameStats.averagePrice || 0).toFixed(2) }} CHF</span>
            </div>
            <div class="stat-item">
              <span class="label">Prix le plus bas:</span>
              <span class="value">{{ gameStats.lowestPrice ? gameStats.lowestPrice.toFixed(2) + ' CHF' : 'N/A' }}</span>
            </div>
            <div class="stat-item">
              <span class="label">Offres actives:</span>
              <span class="value">{{ gameStats.totalListings }}</span>
            </div>
          </div>

          <div class="form-group">
            <label>Prix de vente (CHF):</label>
            <input v-model.number="sellPrice" type="number" min="1" step="0.5" @input="updateCommissions" required>
          </div>
          <div class="form-group">
            <label>Commission plateforme (5%):</label>
            <span>{{ platformCommission.toFixed(2) }} CHF</span>
          </div>
          <div class="form-group">
            <label>Commission développeur (2%):</label>
            <span>{{ developerCommission.toFixed(2) }} CHF</span>
          </div>
          <div class="form-group">
            <label>Vous recevrez:</label>
            <span><strong>{{ netAmount.toFixed(2) }} CHF</strong></span>
          </div>
          <button type="submit" class="btn btn-primary">Mettre en vente</button>
        </form>
      </div>
    </div>
  </main>
</template>

<style scoped>
.marketplace-container {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
  color: #fff;
}

.marketplace-header {
  margin-bottom: 30px;
}

.marketplace-header h1 {
  font-size: 2.5rem;
  margin-bottom: 8px;
}

.marketplace-header p {
  color: #aaa;
  font-size: 1.1rem;
}

.marketplace-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 30px;
  border-bottom: 2px solid #3a3a3a;
}

.tab-btn {
  padding: 12px 24px;
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  color: #aaa;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  transition: all 0.2s;
}

.tab-btn.active {
  color: #4a9eff;
  border-bottom-color: #4a9eff;
}

.tab-content {
  padding: 20px 0;
}

.marketplace-filters {
  display: flex;
  gap: 15px;
  align-items: center;
  margin-bottom: 20px;
  padding: 15px;
  background: #2a2a2a;
  border-radius: 8px;
}

.marketplace-filters select,
.marketplace-filters input[type="range"] {
  padding: 8px;
  background: #1a1a1a;
  border: 1px solid #555;
  border-radius: 4px;
  color: #fff;
}

.games-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}

.game-card {
  background: #2a2a2a;
  border-radius: 8px;
  padding: 15px;
  transition: transform 0.2s;
}

.game-card:hover {
  transform: translateY(-5px);
}

.game-card img {
  width: 100%;
  height: 150px;
  object-fit: cover;
  border-radius: 6px;
  margin-bottom: 12px;
}

.game-card h3 {
  font-size: 1.1rem;
  margin-bottom: 8px;
}

.game-card p {
  color: #aaa;
  margin-bottom: 12px;
}

.btn {
  width: 100%;
  padding: 10px;
  background: #4a9eff;
  border: none;
  border-radius: 4px;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn:hover {
  background: #3a8eef;
}

.btn-danger {
  background: #d32f2f;
}

.btn-danger:hover {
  background: #b71c1c;
}

.my-section {
  margin-bottom: 40px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-description {
  color: #aaa;
  font-size: 0.9rem;
  margin-bottom: 20px;
}

hr {
  margin: 40px 0;
  border: none;
  border-top: 1px solid #444;
}

.transactions-list {
  background: #2a2a2a;
  border-radius: 8px;
  padding: 20px;
}

.transaction-item {
  padding: 15px;
  border-bottom: 1px solid #3a3a3a;
}

.transaction-item:last-child {
  border-bottom: none;
}

.transaction-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

/* Modal */
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
  position: relative;
}

.close {
  position: absolute;
  top: 10px;
  right: 20px;
  font-size: 28px;
  cursor: pointer;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #ccc;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px;
  background: #1a1a1a;
  border: 1px solid #555;
  border-radius: 4px;
  color: #fff;
}

.btn-primary {
  background: #4CAF50;
  width: 100%;
  padding: 12px;
  margin-top: 20px;
}

.btn-primary:hover {
  background: #45a049;
}
</style>
