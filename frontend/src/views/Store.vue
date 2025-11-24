<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useItemStore } from '../stores/itemStore'
import { useUserStore } from '../stores/userStore'

const itemStore = useItemStore()
const userStore = useUserStore()

const typeFilter = ref('')
const rarityFilter = ref('')

onMounted(async () => {
  await itemStore.fetchStoreItems()
})

const applyFilters = () => {
  itemStore.fetchStoreItems({
    type: typeFilter.value,
    rarity: rarityFilter.value
  })
}

const buyItem = async (itemId: string, price: number) => {
  if (confirm(`Acheter cet item pour ${price} tokens ?`)) {
    try {
      const result = await itemStore.purchaseItem(itemId)
      alert(`Item acheté! Tokens restants: ${result.remainingTokens}`)
      await itemStore.fetchStoreItems()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erreur lors de l\'achat')
    }
  }
}

const equipItem = async (itemId: string) => {
  try {
    await itemStore.equipItem(itemId)
    alert('Item équipé!')
    await itemStore.fetchStoreItems()
  } catch (error: any) {
    alert(error.response?.data?.message || 'Erreur')
  }
}
</script>

<template>
  <div class="main-container">
    <h2>Boutique - Photos de Profil</h2>

    <!-- Filters -->
    <div class="store-filters">
      <select v-model="typeFilter" @change="applyFilters">
        <option value="">Tous les types</option>
        <option value="profile_picture">Photos de profil</option>
        <option value="badge">Badges</option>
        <option value="banner">Bannières</option>
        <option value="avatar_frame">Cadres d'avatar</option>
      </select>
      <select v-model="rarityFilter" @change="applyFilters">
        <option value="">Toutes les raretés</option>
        <option value="common">Commun</option>
        <option value="rare">Rare</option>
        <option value="epic">Épique</option>
        <option value="legendary">Légendaire</option>
      </select>
    </div>

    <!-- Items Grid -->
    <div class="items-section">
      <div v-if="itemStore.isLoading" class="loading">Chargement...</div>
      <div 
        v-for="item in itemStore.storeItems" 
        :key="item.id" 
        class="item-card"
      >
        <div class="item-image-container">
          <img :src="item.image_url || '/games/default-game.png'">
          <div v-if="item.owned" class="owned-badge">✓ Possédé</div>
          <div v-if="item.equipped" class="equipped-badge">Équipé</div>
          <div :class="['rarity-badge', `rarity-${item.rarity}`]">{{ item.rarity }}</div>
        </div>
        <h3>{{ item.name }}</h3>
        <p>{{ item.description || 'Aucune description' }}</p>
        <p class="price">Prix : {{ item.price }} tokens</p>
        <button 
          v-if="item.owned && !item.equipped" 
          @click="equipItem(item.id)" 
          class="equip-button"
        >
          Équiper
        </button>
        <button 
          v-else-if="item.equipped" 
          class="equipped-button" 
          disabled
        >
          Équipé
        </button>
        <button 
          v-else 
          @click="buyItem(item.id, item.price)" 
          class="buy-button"
        >
          Acheter ({{ item.price }} tokens)
        </button>
      </div>
      <p v-if="!itemStore.isLoading && itemStore.storeItems.length === 0">
        Aucun article disponible.
      </p>
    </div>
  </div>
</template>

<style scoped>
.main-container {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.store-filters {
  display: flex;
  gap: 15px;
  margin-bottom: 30px;
  padding: 15px;
  background: #2a2a2a;
  border-radius: 8px;
}

.store-filters select {
  padding: 8px 12px;
  background: #1a1a1a;
  border: 1px solid #555;
  border-radius: 4px;
  color: #fff;
}

.items-section {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}

.item-card {
  background: #1a1a1a;
  border: 2px solid #333;
  border-radius: 8px;
  padding: 15px;
  text-align: center;
  transition: transform 0.2s, border-color 0.2s;
}

.item-card:hover {
  transform: translateY(-5px);
  border-color: #4a9eff;
}

.item-image-container {
  position: relative;
  width: 100%;
  height: 150px;
  margin-bottom: 10px;
  border-radius: 8px;
  overflow: hidden;
  background: #0a0a0a;
}

.item-image-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.owned-badge {
  position: absolute;
  top: 5px;
  right: 5px;
  background: #00ff00;
  color: #000;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
}

.equipped-badge {
  position: absolute;
  top: 5px;
  left: 5px;
  background: #4a9eff;
  color: #fff;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
}

.rarity-badge {
  position: absolute;
  bottom: 5px;
  right: 5px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: bold;
  text-transform: uppercase;
}

.rarity-common { background: #808080; color: #fff; }
.rarity-rare { background: #4a9eff; color: #fff; }
.rarity-epic { background: #9d4edd; color: #fff; }
.rarity-legendary { background: #ffd700; color: #000; }

.item-card h3 {
  color: #fff;
  margin: 10px 0 5px;
  font-size: 16px;
}

.item-card p {
  color: #aaa;
  font-size: 14px;
  margin: 5px 0;
}

.price {
  color: #ffd700 !important;
  font-weight: bold;
  font-size: 16px !important;
}

.buy-button, .equip-button, .equipped-button {
  width: 100%;
  padding: 10px;
  margin-top: 10px;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.2s;
}

.buy-button {
  background: #4a9eff;
  color: #fff;
}

.buy-button:hover {
  background: #3a8eef;
}

.equip-button {
  background: #00ff00;
  color: #000;
}

.equip-button:hover {
  background: #00cc00;
}

.equipped-button {
  background: #555;
  color: #fff;
  cursor: not-allowed;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #aaa;
  grid-column: 1 / -1;
}
</style>
