<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useFriendsStore } from '../stores/friendsStore'
import { useLobbyStore } from '../stores/lobbyStore'
import { socketService } from '../services/socket'
import { RouterLink } from 'vue-router'

const friendsStore = useFriendsStore()
const lobbyStore = useLobbyStore()

const activeTab = ref<'friends' | 'requests'>('friends')
const newFriendUsername = ref('')
const isAddingFriend = ref(false)
const errorMessage = ref('')

onMounted(async () => {
  await friendsStore.fetchFriends()
  await friendsStore.fetchFriendRequests()
})

const filteredFriends = computed(() => {
  return friendsStore.friends
})

async function addFriend() {
  if (!newFriendUsername.value.trim()) return
  
  isAddingFriend.value = true
  errorMessage.value = ''
  
  try {
    await friendsStore.sendFriendRequest(newFriendUsername.value.trim())
    newFriendUsername.value = ''
    alert('Demande d\'ami envoyée !')
  } catch (error: any) {
    errorMessage.value = error.message || 'Erreur lors de l\'envoi'
  } finally {
    isAddingFriend.value = false
  }
}

async function acceptRequest(requestId: string) {
  try {
    await friendsStore.acceptFriendRequest(requestId)
  } catch (error) {
    alert('Erreur lors de l\'acceptation')
  }
}

async function rejectRequest(requestId: string) {
  try {
    await friendsStore.rejectFriendRequest(requestId)
  } catch (error) {
    alert('Erreur lors du refus')
  }
}

async function removeFriend(friendId: string, friendName: string) {
  if (confirm(`Supprimer ${friendName} de vos amis ?`)) {
    try {
      await friendsStore.removeFriend(friendId)
    } catch (error) {
      alert('Erreur lors de la suppression')
    }
  }
}

function joinLobby(lobbyId: string) {
  if (!lobbyId) return
  lobbyStore.joinLobby(lobbyId)
}

function inviteToLobby(friendId: string) {
  if (!lobbyStore.currentLobby) return
  socketService.sendLobbyInvite(friendId, lobbyStore.currentLobby.id)
  alert('Invitation envoyée !')
}

function getStatusColor(status: string) {
  switch (status) {
    case 'online': return '#00ff00'
    case 'in-game': return '#ffa500'
    case 'offline': return '#808080'
    default: return '#808080'
  }
}

function closePopup() {
  friendsStore.togglePopup()
}
</script>

<template>
  <div v-if="friendsStore.isPopupOpen" class="friends-popup-overlay" @click.self="closePopup">
    <div class="friends-popup">
      <!-- Header -->
      <div class="popup-header">
        <h2>👥 Amis</h2>
        <button class="close-btn" @click="closePopup">✕</button>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button 
          :class="['tab', { active: activeTab === 'friends' }]" 
          @click="activeTab = 'friends'"
        >
          Amis ({{ friendsStore.friends.length }})
        </button>
        <button 
          :class="['tab', { active: activeTab === 'requests' }]" 
          @click="activeTab = 'requests'"
        >
          Demandes ({{ friendsStore.friendRequests.length }})
        </button>
      </div>

      <!-- Add Friend Form -->
      <div class="add-friend-section">
        <input 
          v-model="newFriendUsername" 
          type="text" 
          placeholder="Nom d'utilisateur..."
          @keyup.enter="addFriend"
          class="add-friend-input"
        >
        <button @click="addFriend" :disabled="isAddingFriend" class="add-btn">
          {{ isAddingFriend ? '...' : '➕ Ajouter' }}
        </button>
      </div>
      <p v-if="errorMessage" class="error-msg">{{ errorMessage }}</p>

      <!-- Friends List Tab -->
      <div v-if="activeTab === 'friends'" class="content-section">
        <div v-if="friendsStore.friends.length === 0" class="empty-state">
          Aucun ami pour l'instant
        </div>
        <div v-else class="friends-list">
          <div 
            v-for="friend in filteredFriends" 
            :key="friend.id" 
            class="friend-item"
          >
            <div class="friend-info">
              <div class="friend-avatar">
                <img :src="friend.profile_pic || '/assets/images/default-game.png'" :alt="friend.username">
                <span 
                  class="status-dot" 
                  :style="{ backgroundColor: getStatusColor(friend.status) }"
                ></span>
              </div>
              <div class="friend-details">
                <div class="friend-name">{{ friend.username }}</div>
                <div class="friend-status">
                  {{ friend.status === 'in-game' ? '🎮 En jeu' : friend.status === 'online' ? '🟢 En ligne' : '⚫ Hors ligne' }}
                </div>
              </div>
            </div>
            
            <div class="friend-actions">
              <button 
                v-if="friend.status === 'in-game' && friend.currentLobby"
                @click="joinLobby(friend.currentLobby)" 
                class="action-btn join-btn"
                title="Rejoindre la partie"
              >
                🎮
              </button>
              <button 
                v-if="lobbyStore.isInLobby && friend.status === 'online'"
                @click="inviteToLobby(friend.id)" 
                class="action-btn invite-btn"
                title="Inviter au lobby"
              >
                📨
              </button>
              <RouterLink 
                :to="`/chat/${friend.id}`" 
                class="action-btn chat-btn"
                title="Ouvrir le chat"
                @click="friendsStore.togglePopup()"
              >
                💬
              </RouterLink>
              <button 
                @click="removeFriend(friend.id, friend.username)" 
                class="action-btn remove-btn"
                title="Retirer des amis"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Friend Requests Tab -->
      <div v-if="activeTab === 'requests'" class="content-section">
        <div v-if="friendsStore.friendRequests.length === 0" class="empty-state">
          Aucune demande en attente
        </div>
        <div v-else class="requests-list">
          <div 
            v-for="request in friendsStore.friendRequests" 
            :key="request.request_id" 
            class="request-item"
          >
            <RouterLink :to="`/profile/${request.user_id}`" class="request-link" @click="friendsStore.togglePopup()">
              <img 
                :src="request.profile_pic || '/assets/images/default-game.png'" 
                :alt="request.username"
                class="request-avatar"
              >
              <div class="request-info">
                <div class="request-username">{{ request.username }}</div>
                <div class="request-date">Demande d'ami</div>
              </div>
            </RouterLink>
            <div class="request-actions">
              <button @click="acceptRequest(request.request_id)" class="accept-btn" title="Accepter">✓</button>
              <button @click="rejectRequest(request.request_id)" class="reject-btn" title="Refuser">✕</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.friends-popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.friends-popup {
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 12px;
  width: 400px;
  max-height: 600px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #333;
}

.popup-header h2 {
  margin: 0;
  font-size: 18px;
  color: #fff;
}

.close-btn {
  background: none;
  border: none;
  color: #999;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #fff;
}

.tabs {
  display: flex;
  border-bottom: 1px solid #333;
}

.tab {
  flex: 1;
  padding: 12px;
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.tab.active {
  color: #4a9eff;
  border-bottom: 2px solid #4a9eff;
}

.add-friend-section {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-bottom: 1px solid #333;
}

.add-friend-input {
  flex: 1;
  padding: 8px 12px;
  background: #252525;
  border: 1px solid #333;
  border-radius: 6px;
  color: #fff;
  font-size: 14px;
}

.add-friend-input:focus {
  outline: none;
  border-color: #4a9eff;
}

.add-btn {
  padding: 8px 16px;
  background: #4a9eff;
  border: none;
  border-radius: 6px;
  color: #fff;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: background 0.2s;
}

.add-btn:hover:not(:disabled) {
  background: #3a8eef;
}

.add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-msg {
  color: #ff4444;
  font-size: 12px;
  padding: 0 12px;
  margin: 0;
}

.content-section {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #666;
}

.friends-list, .requests-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.friend-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: #252525;
  border-radius: 8px;
  transition: background 0.2s;
}

.friend-item:hover {
  background: #2a2a2a;
}

.friend-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.friend-avatar {
  position: relative;
  width: 40px;
  height: 40px;
}

.friend-avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.status-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid #1a1a1a;
}

.friend-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.friend-name {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}

.friend-status {
  font-size: 12px;
  color: #999;
}

.friend-actions {
  display: flex;
  gap: 6px;
}

.action-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  background: #333;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  color: #fff;
}

.action-btn:hover {
  background: #444;
  transform: scale(1.1);
}

.join-btn:hover {
  background: #00aa00;
}

.invite-btn:hover {
  background: #4a9eff;
}

.chat-btn {
  background: #4a9eff;
}

.chat-btn:hover {
  background: #3a8eef;
}

.remove-btn:hover {
  background: #ff4444;
}

.request-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #252525;
  border-radius: 8px;
}

.request-link {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  text-decoration: none;
  color: inherit;
  transition: opacity 0.2s;
  cursor: pointer;
}

.request-link:hover {
  opacity: 0.7;
}

.request-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.request-info {
  flex: 1;
}

.request-username {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}

.request-date {
  font-size: 12px;
  color: #999;
}

.request-actions {
  display: flex;
  gap: 8px;
}

.accept-btn, .reject-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 6px;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.accept-btn {
  background: #00aa00;
  color: #fff;
}

.accept-btn:hover {
  background: #00cc00;
  transform: scale(1.1);
}

.reject-btn {
  background: #aa0000;
  color: #fff;
}

.reject-btn:hover {
  background: #cc0000;
  transform: scale(1.1);
}
</style>
