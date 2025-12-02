<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useUserStore } from '../stores/userStore'
import { useItemStore } from '../stores/itemStore'
import axios from 'axios'

const userStore = useUserStore()
const itemStore = useItemStore()

const activeTab = ref('about')
const typeFilter = ref('')
const friends = ref<any[]>([])
const recentGames = ref<any[]>([])
const fileInput = ref<HTMLInputElement | null>(null)

const isOwnProfile = computed(() => {
  return true // Simplified - in real app would check route params
})

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return

  const file = target.files[0]
  if (!file) return

  const formData = new FormData()
  formData.append('avatar', file as Blob)

  try {
    // Optimistic update
    const reader = new FileReader()
    reader.onload = (e) => {
      if (userStore.user && e.target?.result) {
        userStore.user.profile_pic = e.target.result as string
      }
    }
    reader.readAsDataURL(file)

    const response = await axios.post('/users/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    if (response.data.success) {
      userStore.user.profile_pic = response.data.profile_pic
      alert('Avatar mis à jour !')
    }
  } catch (error) {
    console.error('Upload failed:', error)
    alert('Erreur lors de l\'upload de l\'avatar')
    // Revert optimistic update if needed (requires storing previous state)
    await userStore.fetchProfile()
  }
}

onMounted(async () => {
  await userStore.fetchProfile()
  if (activeTab.value === 'inventory') {
    await itemStore.fetchMyItems()
  }
  // Fetch friends and recent games
  fetchFriends()
  fetchRecentGames()
})

const switchTab = (tab: string) => {
  activeTab.value = tab
  if (tab === 'inventory') {
    itemStore.fetchMyItems()
  }
}

const fetchFriends = async () => {
  try {
    const response = await axios.get('/friends/list')
    friends.value = response.data.friends || []
  } catch (error) {
    console.error('Failed to fetch friends')
  }
}

const fetchRecentGames = async () => {
  try {
    const response = await axios.get('/users/recent-games')
    recentGames.value = response.data.games || []
  } catch (error) {
    console.error('Failed to fetch recent games')
  }
}

const filteredInventory = computed(() => {
  if (!typeFilter.value) return itemStore.myItems
  return itemStore.myItems.filter((item: any) => item.item?.item_type === typeFilter.value)
})

const equipItem = async (itemId: string) => {
  try {
    await itemStore.equipItem(itemId)
    alert('Item équipé!')
    setTimeout(() => location.reload(), 500)
  } catch (error: any) {
    alert(error.response?.data?.message || 'Erreur')
  }
}

const unequipItem = async (itemId: string) => {
  try {
    await itemStore.unequipItem(itemId)
    alert('Item déséquipé!')
    setTimeout(() => location.reload(), 500)
  } catch (error: any) {
    alert(error.response?.data?.message || 'Erreur')
  }
}
</script>

<template>
  <div class="profile-page">
    <!-- Profile Header -->
    <header class="profile-header">
      <div class="profile-header-section">
        <div class="profile-avatar-container">
          <div class="profile-avatar">
            <img :src="userStore.user?.profile_pic || '/assets/images/default-game.png'">
            <div v-if="isOwnProfile" class="avatar-overlay" @click="triggerFileInput">
              <span>Modifier</span>
            </div>
          </div>
          <input 
            type="file" 
            ref="fileInput" 
            class="hidden-input" 
            accept="image/*"
            @change="handleFileUpload"
          >
        </div>
        <div class="profile-info">
          <h1>{{ userStore.user?.username || 'Utilisateur' }}</h1>
          <p class="profile-title">Joueur</p>
          <div class="profile-stats">
            <span class="stat-item">
              <strong>Elo:</strong> {{ userStore.user?.elo || 1600 }}
            </span>
            <span class="stat-item">
              <strong>Tokens:</strong> {{ userStore.user?.tokens || 0 }}
            </span>
            <span class="stat-item" v-if="userStore.user?.balances">
              <strong>CHF:</strong> {{ (userStore.user.balances?.chf || 0).toFixed(2) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <nav class="profile-nav">
        <ul>
          <li>
            <a 
              :class="{ active: activeTab === 'about' }" 
              @click="switchTab('about')"
            >
              À propos
            </a>
          </li>
          <li v-if="isOwnProfile">
            <a 
              :class="{ active: activeTab === 'inventory' }" 
              @click="switchTab('inventory')"
            >
              Inventaire
            </a>
          </li>
        </ul>
      </nav>
    </header>

    <!-- Main Content -->
    <main class="profile-main">
      <!-- About Tab -->
      <div v-show="activeTab === 'about'" class="about-section">
        <div class="profile-left-column">
          <!-- Friends Section -->
          <section class="profile-section">
            <h3>Amis</h3>
            <div class="friends-list-container">
              <ul v-if="friends.length > 0" class="friends-list">
                <li v-for="friend in friends.slice(0, 10)" :key="friend.id" class="friend-item">
                  <img :src="friend.profile_pic || '/assets/images/default-game.png'" class="friend-avatar">
                  <span class="friend-name">{{ friend.username }}</span>
                  <span class="friend-elo">Elo: {{ friend.elo || 1600 }}</span>
                </li>
              </ul>
              <p v-else class="no-friends">Aucun ami</p>
              <p v-if="friends.length > 10" class="friends-more">
                Et {{ friends.length - 10 }} autre(s) ami(s)
              </p>
            </div>
          </section>

          <!-- Information Section -->
          <section class="profile-section">
            <h3>Informations</h3>
            <div class="info-detail">
              <div class="info-row">
                <span class="info-label">Jeux possédés</span>
                <span class="info-value">{{ userStore.user?.games_owned || 0 }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Temps de jeu</span>
                <span class="info-value">{{ userStore.user?.total_playtime || 0 }} heures</span>
              </div>
              <div class="info-row">
                <span class="info-label">Elo</span>
                <span class="info-value">{{ userStore.user?.elo || 1600 }}</span>
              </div>
            </div>
          </section>

          <!-- Badges Section -->
          <section class="badges profile-section">
            <h3>Badges</h3>
            <ul v-if="userStore.user?.badges && userStore.user.badges.length > 0">
              <li v-for="badge in userStore.user.badges" :key="badge.id">
                <img :src="badge.image_url" :alt="badge.name" :title="badge.name">
              </li>
            </ul>
            <p v-else>Aucun badge</p>
          </section>
        </div>

        <div class="profile-right-column">
          <!-- Recent Activity -->
          <section class="recent-activity profile-section">
            <h2>Activité récente</h2>
            <div v-if="recentGames.length > 0">
              <div v-for="game in recentGames" :key="game.id" class="recent-game">
                <img :src="game.image_url || '/assets/images/default-game.png'">
                <div class="game-info">
                  <h3>{{ game.game_name || game.name }}</h3>
                  <p v-if="game.winner_name || game.loser_name">
                    Partie: {{ game.winner_name }} vs {{ game.loser_name }}
                  </p>
                </div>
              </div>
            </div>
            <p v-else>Aucune activité récente.</p>
          </section>

          <!-- Skills Section -->
          <section class="profile-section">
            <h3>Compétences</h3>
            <ul class="skills-list">
              <li>Jeux multijoueurs</li>
              <li>Jeux de stratégie</li>
              <li>Jeux de réflexion</li>
              <li>Jeux compétitifs</li>
            </ul>
          </section>
        </div>
      </div>

      <!-- Inventory Tab -->
      <div v-show="activeTab === 'inventory'" class="inventory-section">
        <h2>Mon Inventaire</h2>
        <div class="inventory-filters">
          <select v-model="typeFilter">
            <option value="">Tous les types</option>
            <option value="profile_picture">Photos de profil</option>
            <option value="badge">Badges</option>
            <option value="banner">Bannières</option>
            <option value="avatar_frame">Cadres d'avatar</option>
          </select>
        </div>
        <div class="inventory-items-grid">
          <div 
            v-for="item in filteredInventory" 
            :key="item.item?.id" 
            :class="['inventory-item-card', { equipped: item.is_equipped }]"
          >
            <div class="inventory-item-image">
              <img :src="item.item?.image_url || '/assets/images/default-game.png'">
              <div v-if="item.is_equipped" class="equipped-badge-inv">Équipé</div>
              <div :class="['rarity-badge-inv', `rarity-${item.item?.rarity}`]">
                {{ item.item?.rarity }}
              </div>
            </div>
            <h4>{{ item.item?.name }}</h4>
            <p class="item-description">{{ item.item?.description || '' }}</p>
            <button 
              v-if="item.is_equipped" 
              @click="unequipItem(item.item?.id)" 
              class="unequip-btn"
            >
              Déséquiper
            </button>
            <button 
              v-else 
              @click="equipItem(item.item?.id)" 
              class="equip-btn"
            >
              Équiper
            </button>
          </div>
          <p v-if="filteredInventory.length === 0">
            Votre inventaire est vide. Visitez le <RouterLink to="/store">store</RouterLink> pour acheter des items !
          </p>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.profile-page {
  color: #fff;
}

.profile-header {
  background: #2a2a2a;
  padding: 30px;
  border-bottom: 1px solid #3a3a3a;
}

.profile-header-section {
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
}

.profile-avatar-container {
  position: relative;
  width: 120px;
  height: 120px;
  flex-shrink: 0;
}

.profile-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  position: relative;
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  cursor: pointer;
}

.profile-avatar:hover .avatar-overlay {
  opacity: 1;
}

.hidden-input {
  display: none;
}

.profile-info h1 {
  font-size: 2rem;
  margin-bottom: 8px;
}

.profile-title {
  color: #aaa;
  margin-bottom: 16px;
}

.profile-stats {
  display: flex;
  gap: 20px;
}

.stat-item {
  color: #ccc;
}

.profile-nav ul {
  list-style: none;
  display: flex;
  gap: 20px;
  margin: 0;
  padding: 0;
}

.profile-nav a {
  padding: 12px 20px;
  color: #aaa;
  text-decoration: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.profile-nav a.active {
  color: #4a9eff;
  border-bottom-color: #4a9eff;
}

.profile-main {
  padding: 30px;
  max-width: 1400px;
  margin: 0 auto;
}

.about-section {
  display: grid;
  grid-template-columns: 1fr 350px;
  gap: 30px;
}

.profile-section {
  background: #2a2a2a;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.profile-section h3 {
  margin-bottom: 16px;
  font-size: 1.3rem;
}

.friends-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.friend-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #3a3a3a;
}

.friend-item:last-child {
  border-bottom: none;
}

.friend-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.friend-name {
  flex: 1;
}

.friend-elo {
  color: #aaa;
  font-size: 0.9rem;
}

.info-detail .info-row {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #3a3a3a;
}

.info-label {
  color: #aaa;
}

.badges ul {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  list-style: none;
  padding: 0;
}

.badges img {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 8px;
}

.recent-game {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
}

.recent-game img {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 6px;
}

.recent-game .game-info h3 {
  font-size: 1rem;
  margin-bottom: 6px;
}

.skills-list {
  list-style: none;
  padding: 0;
}

.skills-list li {
  padding: 8px 0;
  color: #ccc;
}

/* Inventory */
.inventory-section {
  width: 100%;
}

.inventory-filters {
  margin-bottom: 20px;
}

.inventory-filters select {
  padding: 8px 12px;
  background: #2a2a2a;
  border: 1px solid #555;
  border-radius: 4px;
  color: #fff;
}

.inventory-items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 20px;
}

.inventory-item-card {
  background: #1a1a1a;
  border: 2px solid #333;
  border-radius: 8px;
  padding: 15px;
  text-align: center;
  transition: transform 0.2s, border-color 0.2s;
}

.inventory-item-card:hover {
  transform: translateY(-5px);
  border-color: #4a9eff;
}

.inventory-item-card.equipped {
  border-color: #00ff00;
}

.inventory-item-image {
  position: relative;
  width: 100%;
  height: 150px;
  margin-bottom: 10px;
  border-radius: 8px;
  overflow: hidden;
  background: #0a0a0a;
}

.inventory-item-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.equipped-badge-inv {
  position: absolute;
  top: 5px;
  left: 5px;
  background: #00ff00;
  color: #000;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: bold;
}

.rarity-badge-inv {
  position: absolute;
  bottom: 5px;
  right: 5px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: bold;
  text-transform: uppercase;
}

.rarity-badge-inv.rarity-common { background: #808080; color: #fff; }
.rarity-badge-inv.rarity-rare { background: #4a9eff; color: #fff; }
.rarity-badge-inv.rarity-epic { background: #9d4edd; color: #fff; }
.rarity-badge-inv.rarity-legendary { background: #ffd700; color: #000; }

.inventory-item-card h4 {
  color: #fff;
  margin: 10px 0 5px;
  font-size: 14px;
}

.item-description {
  color: #aaa;
  font-size: 12px;
  margin: 5px 0;
  min-height: 30px;
}

.equip-btn, .unequip-btn {
  width: 100%;
  padding: 8px;
  margin-top: 10px;
  border: none;
  border-radius: 4px;
  color: #fff;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.2s;
}

.equip-btn {
  background: #4a9eff;
}

.equip-btn:hover {
  background: #3a8eef;
}

.unequip-btn {
  background: #ff4444;
}

.unequip-btn:hover {
  background: #cc3333;
}
</style>
