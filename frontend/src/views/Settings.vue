<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useUserStore } from '../stores/userStore'
import Logo from '@/assets/images/Logo.svg'
import SakuraBackground from '@/components/SakuraBackground.vue'

const userStore = useUserStore()

const activeTab = ref('Account')
const tabs = ['Account', 'Profile', 'Security', 'Notifications']

const form = reactive({
  username: '',
  email: '',
  language: 'English',
  bio: '',
  social_links: {
    twitter: '',
    discord: '',
    website: ''
  },
  notification_preferences: {
    email_updates: true,
    push_notifications: true,
    marketing_emails: false
  }
})

const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const statusMessage = ref('')
const statusType = ref('')

onMounted(async () => {
  if (!userStore.user) {
    await userStore.fetchProfile()
  }
  if (userStore.user) {
    form.username = userStore.user.username || ''
    form.email = userStore.user.email || ''
    form.language = userStore.user.language || 'English'
    form.bio = userStore.user.bio || ''
    if (userStore.user.social_links) {
      form.social_links = { ...userStore.user.social_links }
    }
    if (userStore.user.notification_preferences) {
      form.notification_preferences = { ...userStore.user.notification_preferences }
    }
  }
})

const saveChanges = async () => {
  statusMessage.value = ''
  try {
    await userStore.updateProfile({
      username: form.username,
      email: form.email,
      language: form.language,
      bio: form.bio,
      social_links: form.social_links,
      notification_preferences: form.notification_preferences
    })
    statusMessage.value = 'Settings saved successfully!'
    statusType.value = 'success'
    
    setTimeout(() => {
      statusMessage.value = ''
    }, 3000)
  } catch (error: any) {
    statusMessage.value = error.response?.data?.message || 'Failed to save settings.'
    statusType.value = 'error'
  }
}

const changePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        statusMessage.value = 'Passwords do not match.'
        statusType.value = 'error'
        return
    }
    // TODO: Implement password change endpoint
    statusMessage.value = 'Password change not yet implemented.'
    statusType.value = 'info'
}
</script>

<template>
  <div class="settings-page">
    <SakuraBackground />

    <div class="settings-container">
      <!-- Sidebar -->
      <div class="settings-sidebar">
        <div class="sidebar-header">
          <img :src="Logo" alt="Ether Logo" class="sidebar-logo" />
        </div>
        <nav class="sidebar-nav">
          <div 
            v-for="tab in tabs" 
            :key="tab"
            class="nav-item"
            :class="{ active: activeTab === tab }"
            @click="activeTab = tab"
          >
            {{ tab }}
          </div>
        </nav>
      </div>

      <!-- Content -->
      <div class="settings-content">
        <h1 class="page-title">{{ activeTab }} SETTINGS</h1>

        <!-- ACCOUNT TAB -->
        <div v-if="activeTab === 'Account'" class="tab-content">
            <div class="form-group">
            <label>Username</label>
            <div class="input-wrapper">
                <input v-model="form.username" type="text" />
            </div>
            </div>

            <div class="form-group">
            <label>Email</label>
            <div class="input-wrapper">
                <input v-model="form.email" type="email" />
            </div>
            </div>

            <div class="form-group">
            <label>Language</label>
            <div class="input-wrapper">
                <select v-model="form.language">
                <option>English</option>
                <option>French</option>
                <option>Spanish</option>
                </select>
                <i class="fas fa-chevron-down input-icon"></i>
            </div>
            </div>
        </div>

        <!-- PROFILE TAB -->
        <div v-if="activeTab === 'Profile'" class="tab-content">
            <div class="form-group">
                <label>Bio</label>
                <div class="input-wrapper">
                    <textarea v-model="form.bio" rows="4" placeholder="Tell us about yourself..."></textarea>
                </div>
            </div>
            
            <div class="section-label">Social Links</div>
            <div class="form-group">
                <label>Twitter</label>
                <div class="input-wrapper">
                    <input v-model="form.social_links.twitter" type="text" placeholder="@username" />
                </div>
            </div>
            <div class="form-group">
                <label>Discord</label>
                <div class="input-wrapper">
                    <input v-model="form.social_links.discord" type="text" placeholder="username#0000" />
                </div>
            </div>
            <div class="form-group">
                <label>Website</label>
                <div class="input-wrapper">
                    <input v-model="form.social_links.website" type="text" placeholder="https://example.com" />
                </div>
            </div>
        </div>

        <!-- SECURITY TAB -->
        <div v-if="activeTab === 'Security'" class="tab-content">
            <div class="form-group">
                <label>Current Password</label>
                <div class="input-wrapper">
                    <input v-model="passwordForm.currentPassword" type="password" />
                </div>
            </div>
            <div class="form-group">
                <label>New Password</label>
                <div class="input-wrapper">
                    <input v-model="passwordForm.newPassword" type="password" />
                </div>
            </div>
            <div class="form-group">
                <label>Confirm Password</label>
                <div class="input-wrapper">
                    <input v-model="passwordForm.confirmPassword" type="password" />
                </div>
            </div>
            <button class="save-btn" @click="changePassword">UPDATE PASSWORD</button>
        </div>

        <!-- NOTIFICATIONS TAB -->
        <div v-if="activeTab === 'Notifications'" class="tab-content">
            <div class="toggle-group">
                <div class="toggle-item">
                    <div class="toggle-info">
                        <span class="toggle-label">Email Updates</span>
                        <span class="toggle-desc">Receive updates about your account activity.</span>
                    </div>
                    <label class="switch">
                        <input type="checkbox" v-model="form.notification_preferences.email_updates">
                        <span class="slider round"></span>
                    </label>
                </div>
                
                <div class="toggle-item">
                    <div class="toggle-info">
                        <span class="toggle-label">Push Notifications</span>
                        <span class="toggle-desc">Receive push notifications on your device.</span>
                    </div>
                    <label class="switch">
                        <input type="checkbox" v-model="form.notification_preferences.push_notifications">
                        <span class="slider round"></span>
                    </label>
                </div>

                <div class="toggle-item">
                    <div class="toggle-info">
                        <span class="toggle-label">Marketing Emails</span>
                        <span class="toggle-desc">Receive news and special offers.</span>
                    </div>
                    <label class="switch">
                        <input type="checkbox" v-model="form.notification_preferences.marketing_emails">
                        <span class="slider round"></span>
                    </label>
                </div>
            </div>
        </div>

        <button v-if="activeTab !== 'Security'" class="save-btn" @click="saveChanges" :disabled="userStore.isLoading">
          {{ userStore.isLoading ? 'SAVING...' : 'SAVE CHANGES' }}
        </button>
        
        <div v-if="statusMessage" class="status-message" :class="statusType">
          {{ statusMessage }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

.settings-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100%;
  padding: 40px;
  font-family: 'Inter', sans-serif;
  color: white;
  position: relative;
}

.settings-container {
  display: flex;
  width: 100%;
  max-width: 900px;
  min-height: 600px;
  background: transparent;
  gap: 40px;
}

/* Sidebar */
.settings-sidebar {
  width: 250px;
  background: rgba(20, 15, 30, 0.6);
  border-radius: 20px;
  padding: 30px 0;
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.sidebar-header {
  padding: 0 30px 40px;
  display: flex;
  justify-content: center;
}

.sidebar-logo {
  width: 60px;
  height: 60px;
  filter: drop-shadow(0 0 10px rgba(255, 126, 179, 0.3));
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  background: transparent;  
}

.nav-item {
  padding: 15px 30px;
  cursor: pointer;
  color: #8a8a9b;
  font-weight: 500;
  transition: all 0.3s ease;
  position: relative;
  font-size: 1.1rem;
}

.nav-item:hover {
  color: white;
  background: rgba(255, 255, 255, 0.03);
}

.nav-item.active {
  color: white;
  font-weight: 600;
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: #ff7eb3;
  box-shadow: 0 0 10px #ff7eb3;
}

/* Content */
.settings-content {
  flex: 1;
  padding: 20px 0;
  width: 100%; /* Ensure full width */
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 40px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.form-group {
  margin-bottom: 25px;
}

.form-group label {
  display: block;
  color: #8a8a9b;
  margin-bottom: 10px;
  font-size: 0.95rem;
}

.input-wrapper {
  position: relative;
  background: rgba(20, 15, 30, 0.6);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  transition: border-color 0.3s;
}

.input-wrapper:focus-within {
  border-color: #ff7eb3;
}

.input-wrapper input,
.input-wrapper select,
.input-wrapper textarea {
  width: 100%;
  background: transparent;
  border: none;
  padding: 15px 20px;
  color: white;
  font-size: 1rem;
  font-family: inherit;
  outline: none;
  appearance: none;
  resize: none; /* For textarea */
}

.change-link {
  color: #ff7eb3;
  padding: 0 20px;
  cursor: pointer;
  font-weight: 600;
  white-space: nowrap;
}

.input-icon {
  padding: 0 20px;
  color: #8a8a9b;
  pointer-events: none;
}

.save-btn {
  margin-top: 20px;
  width: 100%;
  padding: 15px;
  background: #ff7eb3;
  border: none;
  border-radius: 12px;
  color: white;
  font-weight: 700;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.3s;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.save-btn:hover {
  background: #ff5c9e;
  box-shadow: 0 0 20px rgba(255, 126, 179, 0.4);
  transform: translateY(-2px);
}

.save-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

.status-message {
  margin-top: 15px;
  padding: 10px;
  border-radius: 8px;
  text-align: center;
  font-weight: 500;
}

.status-message.success {
  background: rgba(46, 204, 113, 0.2);
  color: #2ecc71;
  border: 1px solid rgba(46, 204, 113, 0.3);
}

.status-message.error {
  background: rgba(231, 76, 60, 0.2);
  color: #e74c3c;
  border: 1px solid rgba(231, 76, 60, 0.3);
}

.status-message.info {
  background: rgba(52, 152, 219, 0.2);
  color: #3498db;
  border: 1px solid rgba(52, 152, 219, 0.3);
}

.section-label {
    color: #fff;
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 20px;
    margin-top: 30px;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    padding-bottom: 10px;
}

/* Toggle Switch */
.toggle-group {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.toggle-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px;
    background: rgba(20, 15, 30, 0.4);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.05);
}

.toggle-info {
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.toggle-label {
    font-weight: 600;
    color: white;
}

.toggle-desc {
    font-size: 0.85rem;
    color: #8a8a9b;
}

.switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 26px;
}

.switch input { 
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #2c2c3a;
  transition: .4s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .4s;
}

input:checked + .slider {
  background-color: #ff7eb3;
}

input:focus + .slider {
  box-shadow: 0 0 1px #ff7eb3;
}

input:checked + .slider:before {
  transform: translateX(24px);
}

/* Rounded sliders */
.slider.round {
  border-radius: 34px;
}

.slider.round:before {
  border-radius: 50%;
}
</style>
