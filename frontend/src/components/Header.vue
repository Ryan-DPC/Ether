<script setup>
import { ref, computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { useFriendsStore } from '@/stores/friendsStore'

const route = useRoute()
const userStore = useUserStore()
const friendsStore = useFriendsStore()

const isGamePage = computed(() => route.meta.isGamePage)
const activeTab = computed(() => route.name)

const isMenuOpen = ref(false)

// Computed property for profile picture to avoid infinite reload
const profilePicUrl = computed(() => {
  return userStore.user?.profile_pic || '/assets/images/default-game.png'
})

const toggleMenu = () => {
  console.log('Burger menu toggled. Current state:', isMenuOpen.value)
  isMenuOpen.value = !isMenuOpen.value
}

const toggleFriendsMenu = () => {
  friendsStore.togglePopup()
}

const logout = () => {
  userStore.logout()
}
</script>

<template>
  <nav :class="[isGamePage ? 'game-page-nav' : 'default-nav']">
    <div class="logo-container">
      <img src="@/assets/images/Logo.png" alt="Mini Games Store Logo" class="logo">
    </div>

    <div v-if="!isGamePage" class="search-bar">
      <input type="search" id="search" placeholder="Rechercher">
      <button id="search-btn"><i class="fas fa-search"></i></button>
    </div>

    <div class="user-info">
      <div v-if="userStore.isAuthenticated" class="profile-section">
        <div class="photo">
          <img :src="profilePicUrl" 
               alt="Photo de profil" 
               class="profile-pic">
        </div>
        <div class="info compact">
          <div class="profile-row">
            <p class="user-username">{{ userStore.user.username }}</p>
            <span class="dot-sep">•</span>
            <span class="user-chf">CHF: {{ userStore.user.balances?.chf?.toFixed(2) || 0 }}</span>
            <span class="dot-sep">•</span>
            <span class="user-elo">Elo: {{ userStore.user.elo }}</span>
            
            <button @click="toggleFriendsMenu" class="friends-btn" aria-label="Amis">
              <i class="fas fa-user-friends"></i>
              <span v-if="userStore.friendRequests.length" class="badge">{{ userStore.friendRequests.length }}</span>
            </button>
            
            <button @click.stop="toggleMenu" class="burger-btn" aria-label="Menu utilisateur">
              <span class="burger-line"></span>
              <span class="burger-line"></span>
              <span class="burger-line"></span>
            </button>
          </div>

          <!-- Burger Menu -->
          <div v-if="isMenuOpen" class="burger-menu show">
            <div class="burger-header">
                <strong>{{ userStore.user.username }}</strong>
            </div>
            <div class="burger-info">
                <span>CHF: {{ userStore.user.balances?.chf?.toFixed(2) || 0 }}</span>
                <span>Elo: {{ userStore.user.elo }}</span>
            </div>
            <div class="burger-actions">
                <RouterLink to="/profile" class="burger-link">Profil</RouterLink>
                <button @click="logout" class="burger-link danger">Déconnexion</button>
            </div>
          </div>
        </div>
      </div>
      
      <div v-else>
        <RouterLink to="/login" class="login-btn">Se connecter</RouterLink>
      </div>
    </div>

    <button v-if="isGamePage" id="back-home-btn" class="back-home">Retour à l'accueil</button>
  </nav>

  <nav v-if="!isGamePage" class="tabs-container">
    <ul class="tabs">
      <li><RouterLink to="/home" :class="{ active: activeTab === 'home' }">Accueil</RouterLink></li>
      <li><RouterLink to="/library" :class="{ active: activeTab === 'library' }">Bibliothèque</RouterLink></li>
      <li><RouterLink to="/marketplace" :class="{ active: activeTab === 'marketplace' }">Marketplace</RouterLink></li>
      <li><RouterLink to="/store" :class="{ active: activeTab === 'store' }">Store</RouterLink></li>
      <li v-if="userStore.user?.isAdmin">
        <RouterLink to="/admin" :class="{ active: activeTab === 'admin' }">Admin</RouterLink>
      </li>
      <li v-if="userStore.isAuthenticated">
        <RouterLink to="/profile" :class="{ active: activeTab === 'profile' }">{{ userStore.user.username }}</RouterLink>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
/* Scoped styles if needed, otherwise relies on global CSS */
</style>
