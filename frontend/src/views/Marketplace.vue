<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useMarketplaceStore } from '../stores/marketplaceStore'

const marketplaceStore = useMarketplaceStore()

const activeTab = ref('marketplace')
const showSellModal = ref(false)
const selectedGameForSale = ref('')
const sellPrice = ref(0)

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
  showSellModal.value = true
}

const handleSellGame = async () => {
  if (!selectedGameForSale.value || sellPrice.value <= 0) {
    alert('Please fill all fields')
    return
  }

  try {
    await marketplaceStore.sellGame(selectedGameForSale.value, sellPrice.value)
    
    if (window.electronAPI) {
      const installPath = localStorage.getItem('etherInstallPath')
      const game = marketplaceStore.ownedGames.find((g: any) => g.game_key === selectedGameForSale.value)
      
      if (installPath && game) {
        try {
          await window.electronAPI.uninstallGame(installPath, game.game_key)
          new Notification('Ether Desktop', { body: `🗑️ ${game.game_name} uninstalled (listed for sale).` })
        } catch (err) {
          console.error('Failed to uninstall game:', err)
        }
      }
    }

    alert('Game listed for sale!')
    showSellModal.value = false
    selectedGameForSale.value = ''
    sellPrice.value = 0
    
    await marketplaceStore.fetchOwnedGames()
    await marketplaceStore.fetchActiveSales()
  } catch (error: any) {
    alert(error.response?.data?.message || 'Error listing game')
  }
}

const buyUsedGame = async (game: any) => {
  const price = game.asking_price || 0
  if (confirm(`Buy "${game.game_name}" for ${price.toFixed(2)} CHF?`)) {
    try {
      await marketplaceStore.buyUsedGame(game.ownership_token, game.seller_id)
      alert('Purchase successful!')
      await marketplaceStore.fetchUsedGames()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Purchase failed')
    }
  }
}

const cancelSale = async (ownershipToken: string) => {
  if (confirm('Cancel this sale?')) {
    try {
      await marketplaceStore.cancelSale(ownershipToken)
      alert('Sale cancelled.')
      await marketplaceStore.fetchActiveSales()
      await marketplaceStore.fetchOwnedGames()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error')
    }
  }
}

// Stats logic
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

// Watch for selection change to update stats
watch(selectedGameForSale, () => {
    updateGameStats()
})
</script>

<template>
  <div class="marketplace-container">
    <!-- Background Glows -->
    <div class="bg-glow pink-glow"></div>
    <div class="bg-glow cyan-glow"></div>

    <div class="marketplace-layout">
        
        <!-- Header -->
        <div class="header-section">
            <h1>Community Market</h1>
            <div class="tabs">
                <button :class="{ active: activeTab === 'marketplace' }" @click="switchTab('marketplace')">Buy Games</button>
                <button :class="{ active: activeTab === 'selling' }" @click="switchTab('selling')">My Listings</button>
                <button :class="{ active: activeTab === 'transactions' }" @click="switchTab('transactions')">History</button>
            </div>
            <button @click="openSellModal" class="btn-neon"><i class="fas fa-plus"></i> Sell Game</button>
        </div>

        <!-- Buy Tab -->
        <div v-if="activeTab === 'marketplace'" class="tab-content">
            <div class="filters-bar">
                <input v-model="genreFilter" placeholder="Filter by Genre" class="glass-input">
                <div class="range-filter">
                    <label>Max Price: {{ priceRange }} CHF</label>
                    <input type="range" v-model="priceRange" min="0" max="200" class="slider">
                </div>
                <button @click="applyFilters" class="btn-glass">Apply</button>
            </div>

            <div v-if="marketplaceStore.isLoading" class="loading"><i class="fas fa-circle-notch fa-spin"></i></div>
            
            <div v-else class="listings-grid">
                <div v-for="game in marketplaceStore.usedGames" :key="game.ownership_token" class="listing-card">
                    <div class="card-img">
                        <img :src="game.image_url || '/games/default-game.png'">
                        <div class="price-tag">{{ game.asking_price }} CHF</div>
                    </div>
                    <div class="card-body">
                        <h3>{{ game.game_name }}</h3>
                        <div class="seller-info">
                            <span>Seller: {{ game.seller_name }}</span>
                        </div>
                        <button @click="buyUsedGame(game)" class="btn-buy">BUY NOW</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Selling Tab -->
        <div v-if="activeTab === 'selling'" class="tab-content">
            <div class="listings-grid">
                <div v-for="sale in marketplaceStore.activeSales" :key="sale.ownership_token" class="listing-card my-listing">
                    <div class="card-img">
                        <img :src="sale.image_url || '/games/default-game.png'">
                        <div class="price-tag">{{ sale.asking_price }} CHF</div>
                    </div>
                    <div class="card-body">
                        <h3>{{ sale.game_name }}</h3>
                        <div class="status-badge">Active</div>
                        <button @click="cancelSale(sale.ownership_token)" class="btn-cancel">CANCEL SALE</button>
                    </div>
                </div>
            </div>
             <div v-if="marketplaceStore.activeSales.length === 0" class="empty-state">
                You have no active listings.
            </div>
        </div>

        <!-- Transactions Tab -->
        <div v-if="activeTab === 'transactions'" class="tab-content">
            <div class="transactions-list">
                <div v-for="tx in marketplaceStore.transactions" :key="tx.id" class="tx-item">
                    <div class="tx-info">
                        <span class="tx-type" :class="tx.type">{{ tx.type }}</span>
                        <span class="tx-game">{{ tx.game_name }}</span>
                    </div>
                    <div class="tx-amount">{{ tx.amount }} CHF</div>
                    <div class="tx-date">{{ new Date(tx.created_at).toLocaleDateString() }}</div>
                </div>
            </div>
        </div>

    </div>

    <!-- Sell Modal -->
    <div v-if="showSellModal" class="modal-overlay" @click.self="showSellModal = false">
        <div class="modal-glass">
            <h3>Sell a Game</h3>
            <div class="form-group">
                <label>Select Game</label>
                <select v-model="selectedGameForSale" class="glass-select">
                    <option v-for="game in marketplaceStore.ownedGames" :key="game.game_key" :value="game.game_key">
                        {{ game.game_name }}
                    </option>
                </select>
            </div>
            
            <div class="form-group">
                <label>Price (CHF)</label>
                <input type="number" v-model="sellPrice" @input="updateCommissions" class="glass-input">
            </div>

            <div class="commission-info" v-if="sellPrice > 0">
                <div class="row"><span>Platform Fee (5%)</span> <span>-{{ platformCommission.toFixed(2) }}</span></div>
                <div class="row"><span>Dev Fee (2%)</span> <span>-{{ developerCommission.toFixed(2) }}</span></div>
                <div class="row total"><span>You Receive</span> <span>{{ netAmount.toFixed(2) }}</span></div>
            </div>

            <div class="stats-info" v-if="gameStats">
                <p>Avg Price: {{ gameStats.avg_price }} CHF</p>
                <p>Active Listings: {{ gameStats.active_listings }}</p>
            </div>

            <button @click="handleSellGame" class="btn-neon full-width">List for Sale</button>
        </div>
    </div>

  </div>
</template>

<style scoped>
/* Variables */
:root {
  --neon-pink: #ff7eb3;
  --neon-cyan: #7afcff;
  --glass-bg: rgba(30, 25, 40, 0.6);
}

.marketplace-container {
  height: 100%; width: 100%;
  position: relative; overflow: hidden;
  background-color: #120c18; color: white;
  padding: 20px;
}

.bg-glow {
  position: absolute; width: 600px; height: 600px;
  border-radius: 50%; filter: blur(120px); opacity: 0.1; pointer-events: none;
}
.pink-glow { top: -200px; left: -200px; background: #ff7eb3; }
.cyan-glow { bottom: -200px; right: -200px; background: #7afcff; }

.marketplace-layout {
    position: relative; z-index: 1;
    height: 100%; display: flex; flex-direction: column;
}

.header-section {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 30px;
}
.header-section h1 { margin: 0; font-size: 2rem; }

.tabs { display: flex; gap: 10px; background: rgba(255,255,255,0.05); padding: 4px; border-radius: 12px; }
.tabs button {
    background: transparent; border: none; color: #b0b9c3;
    padding: 8px 20px; border-radius: 8px; cursor: pointer; font-weight: 600;
    transition: all 0.2s;
}
.tabs button.active { background: rgba(255,255,255,0.1); color: white; }

.tab-content { flex: 1; overflow-y: auto; }

/* Filters */
.filters-bar {
    display: flex; gap: 20px; align-items: center; margin-bottom: 20px;
    background: rgba(30, 25, 40, 0.6); padding: 15px; border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.05);
}
.glass-input {
    background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);
    color: white; padding: 8px 12px; border-radius: 6px;
}
.range-filter { display: flex; align-items: center; gap: 10px; color: #b0b9c3; }
.slider { accent-color: #7afcff; }

/* Grid */
.listings-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 20px;
}
.listing-card {
    background: rgba(30, 25, 40, 0.6);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px; overflow: hidden;
    transition: all 0.3s;
}
.listing-card:hover { transform: translateY(-5px); border-color: #7afcff; }

.card-img { height: 140px; position: relative; }
.card-img img { width: 100%; height: 100%; object-fit: cover; }
.price-tag {
    position: absolute; bottom: 10px; right: 10px;
    background: #7afcff; color: #120c18;
    padding: 4px 8px; border-radius: 4px; font-weight: 800;
}

.card-body { padding: 16px; }
.card-body h3 { margin: 0 0 10px 0; font-size: 1.1rem; }
.seller-info { font-size: 0.85rem; color: #b0b9c3; margin-bottom: 15px; }

.btn-buy {
    width: 100%; background: #7afcff; color: #120c18; border: none;
    padding: 10px; border-radius: 8px; font-weight: 800; cursor: pointer;
}
.btn-cancel {
    width: 100%; background: rgba(255, 77, 77, 0.2); color: #ff4d4d; border: 1px solid #ff4d4d;
    padding: 10px; border-radius: 8px; font-weight: 800; cursor: pointer;
}

/* Transactions */
.transactions-list { display: flex; flex-direction: column; gap: 10px; }
.tx-item {
    display: flex; justify-content: space-between; align-items: center;
    background: rgba(255,255,255,0.03); padding: 15px; border-radius: 8px;
}
.tx-type { text-transform: uppercase; font-size: 0.8rem; padding: 2px 6px; border-radius: 4px; margin-right: 10px; }
.tx-amount { font-weight: 700; color: #7afcff; }

/* Modal */
.modal-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.8); z-index: 100;
  display: flex; align-items: center; justify-content: center;
}
.modal-glass {
  background: #1e1928; padding: 30px; border-radius: 16px; width: 450px;
  border: 1px solid rgba(255,255,255,0.1);
}
.form-group { margin-bottom: 20px; }
.form-group label { display: block; margin-bottom: 8px; color: #b0b9c3; }
.glass-select { width: 100%; padding: 10px; background: rgba(0,0,0,0.3); border: 1px solid #444; color: white; border-radius: 6px; }

.commission-info {
    background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; margin-bottom: 20px;
}
.row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 0.9rem; color: #b0b9c3; }
.row.total { border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px; margin-top: 10px; color: #7afcff; font-weight: 700; }

.btn-neon {
  background: #ff7eb3; color: white; border: none; padding: 10px 24px; border-radius: 8px; font-weight: 700; cursor: pointer;
}
.btn-glass {
    background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white;
    padding: 8px 16px; border-radius: 6px; cursor: pointer;
}
.full-width { width: 100%; }
.loading, .empty-state { text-align: center; padding: 40px; color: #777; }
</style>
