<script setup>
import { RouterView } from 'vue-router'
import ToastNotification from './components/ToastNotification.vue'
import SakuraBackground from './components/SakuraBackground.vue'
import ChatPopup from '@/components/ChatPopup.vue'
import { useUserStore } from '@/stores/userStore'
import { useChatStore } from '@/stores/chatStore'

const userStore = useUserStore()
const chatStore = useChatStore()
</script>

<template>
  <RouterView />
  <SakuraBackground />
  <ToastNotification />
  
  <Transition name="chat-pop">
    <ChatPopup 
      v-if="userStore.isAuthenticated && chatStore.activeChatFriend" 
      :friend="chatStore.activeChatFriend" 
      @close="chatStore.closeChat()" 
    />
  </Transition>
</template>
