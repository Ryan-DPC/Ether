<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { computed } from 'vue'

const route = useRoute()

const isActive = (path: string) => computed(() => route.path === path || route.path.startsWith(path + '/'))

const navItems = [
  { name: 'Accueil', path: '/', icon: 'fas fa-home' },
  { name: 'Bibliothèque', path: '/library', icon: 'fas fa-gamepad' },
  { name: 'Boutique', path: '/store', icon: 'fas fa-shopping-bag' },
  { name: 'Marketplace', path: '/marketplace', icon: 'fas fa-exchange-alt' },
  { name: 'Social', path: '/social', icon: 'fas fa-users' },
  { name: 'Paramètres', path: '/settings', icon: 'fas fa-cog' }
]
</script>

<template>
  <aside class="sidebar">
    <div class="logo-area">
      <img src="@/assets/images/Logo.jpg" alt="Ether" class="logo" />
    </div>

    <nav class="nav-menu">
      <RouterLink 
        v-for="item in navItems" 
        :key="item.path" 
        :to="item.path" 
        class="nav-item"
        :class="{ active: isActive(item.path).value }"
      >
        <div class="icon">
            <i :class="item.icon"></i>
        </div>
        <span class="label">{{ item.name }}</span>
        <div class="active-indicator" v-if="isActive(item.path).value"></div>
      </RouterLink>
    </nav>
    
    <div class="sidebar-footer">
      <!-- Optional footer content -->
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 60px; /* Slimmer collapsed width */
  height: 100vh;
  background: rgba(18, 12, 24, 0.2); /* 80% transparent (0.2 opacity) as requested */
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
  /* border-right: 1px solid rgba(255, 255, 255, 0.05); Remove border if it creates a line */
  transition: width 0.3s ease, background 0.3s ease;
  z-index: 100;
}

.sidebar:hover {
  width: 220px; /* Expand on hover */
  background: rgba(18, 12, 24, 0.95); /* Dark background only on hover for readability */
  backdrop-filter: blur(10px);
}

.logo-area {
  margin-bottom: 40px;
}

.logo {
  width: 45px;
  height: 45px;
  object-fit: contain;
}

.nav-menu {
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 10px;
  background: transparent; /* Override global nav background */
  padding: 0; /* Override global nav padding */
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  color: var(--text-secondary);
  text-decoration: none;
  transition: all 0.2s;
  position: relative;
  height: 50px;
  overflow: hidden;
  white-space: nowrap;
}

.sidebar:not(:hover) .nav-item {
    justify-content: center;
    padding: 0;
}

.sidebar:not(:hover) .label {
    display: none;
}

.nav-item:hover {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.05);
}

.nav-item.active {
  color: var(--accent-primary);
  background: linear-gradient(90deg, rgba(255, 126, 179, 0.1) 0%, transparent 100%);
}

.icon {
  font-size: 1.2rem;
  min-width: 40px;
  text-align: center;
  display: flex;
  justify-content: center;
  align-items: center;
}

.label {
  margin-left: 10px;
  font-weight: 600;
  opacity: 0;
  transform: translateX(-10px);
  transition: all 0.3s ease;
}

.sidebar:hover .label {
  opacity: 1;
  transform: translateX(0);
}

.active-indicator {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--accent-primary);
  border-radius: 0 4px 4px 0;
  box-shadow: 0 0 10px var(--accent-primary);
}
</style>
