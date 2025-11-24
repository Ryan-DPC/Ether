<script setup>
import { ref, onMounted } from 'vue'
import { RouterView } from 'vue-router'
import Header from '@/components/Header.vue'
import Footer from '@/components/Footer.vue'
import FriendsPopup from '@/components/FriendsPopup.vue'
import { useUserStore } from '@/stores/userStore'

const userStore = useUserStore()
const isGamePage = ref(false) // Logic to determine if game page
</script>

<template>
  <div :class="[isGamePage ? 'game-page' : 'store-page']">
    <Header />
    
    <div class="main-content-wrapper">
      <RouterView />
    </div>

    <Footer />
    
    <FriendsPopup v-if="userStore.isAuthenticated" />
  </div>
</template>

<style>
/* Import global styles here or in main.ts */
@import '@/assets/css/global.css';
@import '@/assets/css/games.css';
@import '@/assets/css/header.css';
@import '@/assets/css/footer.css';
</style>
