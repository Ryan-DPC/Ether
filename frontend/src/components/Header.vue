<script setup>
import { ref, computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { useNotificationStore } from '@/stores/notificationStore'

const route = useRoute()
const userStore = useUserStore()
const notificationStore = useNotificationStore()

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

const toggleNotifications = () => {
  notificationStore.togglePopup()
}

const logout = () => {
  userStore.logout()
}
</script>

<template>
  <header class="app-header">
    <!-- Search bar removed as views handle their own search -->
    <div class="spacer"></div>

    <div class="user-info">
      <div v-if="userStore.isAuthenticated" class="profile-section">
        <div class="info compact">
          <div class="profile-row">
            <span class="user-username">{{ userStore.user.username }}</span>
            
            <button @click="toggleNotifications" class="icon-btn" aria-label="Notifications">
              <i class="fas fa-bell"></i>
              <span v-if="notificationStore.unreadCount > 0" class="notification-badge"></span>
            </button>
            
            <button @click.stop="toggleMenu" class="icon-btn" aria-label="Menu utilisateur">
               <img :src="profilePicUrl" alt="Profile" class="header-avatar">
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
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  padding: 20px 40px;
  background: transparent;
  z-index: 50;
}

.search-bar {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  padding: 8px 16px;
  width: 400px;
  transition: all 0.3s ease;
}

.search-bar:focus-within {
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--accent-primary);
  box-shadow: 0 0 15px rgba(255, 126, 179, 0.2);
}

.search-icon {
  color: var(--text-muted);
  margin-right: 10px;
}

.search-bar input {
  background: transparent;
  border: none;
  color: var(--text-primary);
  width: 100%;
  outline: none;
  font-size: 0.95rem;
}

.spacer {
  flex: 1;
}

.profile-row {
  display: flex;
  align-items: center;
  gap: 15px;
}

.user-username {
  font-weight: 600;
  color: var(--text-secondary);
}

.icon-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 1.2rem;
  cursor: pointer;
  padding: 5px;
  transition: color 0.2s;
  position: relative;
}

.icon-btn:hover {
  color: var(--text-primary);
}

.notification-badge {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 8px;
  height: 8px;
  background: #ff7eb3;
  border-radius: 50%;
  border: 2px solid var(--bg-secondary);
}

.header-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--accent-primary);
}

/* Keep existing burger menu styles but ensure they fit the theme */
/* Dropdown Menu (formerly burger-menu) */
.burger-menu {
  position: absolute;
  top: 60px;
  right: 0;
  width: 220px;
  background: rgba(30, 25, 40, 0.95);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 100;
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.burger-header {
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  text-align: center;
}

.burger-header strong {
  color: var(--text-primary);
  font-size: 1.1rem;
  display: block;
}

.burger-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.05);
  padding: 8px 12px;
  border-radius: 8px;
}

.burger-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.burger-link {
  display: block;
  width: 100%;
  padding: 10px;
  text-align: center;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: var(--text-primary);
  text-decoration: none;
  transition: all 0.2s ease;
  cursor: pointer;
  font-size: 0.95rem;
}

.burger-link:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--text-primary);
}

.burger-link.danger {
  border-color: rgba(255, 71, 87, 0.3);
  color: #ff4757;
}

.burger-link.danger:hover {
  background: rgba(255, 71, 87, 0.1);
  border-color: #ff4757;
}
</style>
