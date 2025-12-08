<script setup>
import { RouterView } from 'vue-router'
import Header from '@/components/Header.vue'
import Sidebar from '@/components/Sidebar.vue'
import FriendsPopup from '@/components/FriendsPopup.vue'
import NotificationPopup from '@/components/NotificationPopup.vue'
import { useUserStore } from '@/stores/userStore'

const userStore = useUserStore()
</script>

<template>
  <div class="app-layout">
    <!-- Global Ambient Background -->
    <div class="bg-glow pink-glow"></div>
    <div class="bg-glow cyan-glow"></div>

    <Sidebar />
    
    <div class="content-area">
      <Header />
      
      <main class="main-content">
        <RouterView />
      </main>
      


      <FriendsPopup v-if="userStore.isAuthenticated" />
      <NotificationPopup v-if="userStore.isAuthenticated" />
    </div>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  padding-top: 32px; /* Space for title bar overlay */
  background: transparent;
  overflow: hidden;
  position: relative;
  box-sizing: border-box;
}

/* Global Glows */
.bg-glow {
  position: absolute;
  width: 800px; height: 800px;
  border-radius: 50%;
  filter: blur(150px);
  opacity: 0.15;
  pointer-events: none;
  z-index: 0;
}
.pink-glow { top: -300px; left: -200px; background: #ff7eb3; }
.cyan-glow { bottom: -300px; right: -200px; background: #7afcff; }

.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  z-index: 1; /* Ensure content is above glows */
  background: transparent; /* Let glows show through */
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 0;
  position: relative;
}

/* Scrollbar styling for main content */
.main-content::-webkit-scrollbar {
  width: 8px;
}

.main-content::-webkit-scrollbar-track {
  background: transparent;
}

.main-content::-webkit-scrollbar-thumb {
  background: var(--bg-tertiary);
  border-radius: 4px;
}

.main-content::-webkit-scrollbar-thumb:hover {
  background: var(--accent-primary);
}
</style>
