<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from '../stores/userStore'
import { useRouter, useRoute } from 'vue-router'

const email = ref('')
const password = ref('')
const error = ref('')
const userStore = useUserStore()
const router = useRouter()
const route = useRoute()

onMounted(async () => {
    // Check for token in URL (from GitHub callback)
    const token = route.query.token as string | undefined
    const errorMsg = route.query.error as string | undefined
    
    if (errorMsg) {
        error.value = decodeURIComponent(errorMsg)
    } else if (token) {
        try {
            localStorage.setItem('token', token)
            userStore.initializeAuth()
            await userStore.fetchProfile()
            if (userStore.isAuthenticated) {
                router.push('/home')
            }
        } catch (e) {
            console.error('GitHub login failed:', e)
            error.value = 'Failed to login with GitHub'
            localStorage.removeItem('token')
        }
    }
})

const handleLogin = async () => {
    error.value = ''
    try {
        await userStore.login(email.value, password.value)
        router.push('/home')
    } catch (e: any) {
        error.value = e.response?.data?.message || 'Login failed'
    }
}

const loginWithGithub = () => {
    window.location.href = 'https://backend-ether.onrender.com/api/auth/github'
}
</script>

<template>
    <div class="login-container">
        <div class="login-card">
            <h1>Login to Ether</h1>
            <form @submit.prevent="handleLogin">
                <div class="form-group">
                    <label>Username or Email</label>
                    <input type="text" v-model="email" required placeholder="Enter your username or email" />
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" v-model="password" required placeholder="Enter your password" />
                </div>
                <div v-if="error" class="error">{{ error }}</div>
                <button type="submit" :disabled="userStore.isLoading">
                    {{ userStore.isLoading ? 'Logging in...' : 'Login' }}
                </button>
                
                <div class="divider">OR</div>
                
                <button type="button" @click="loginWithGithub" class="github-btn">
                    Login with GitHub
                </button>
                
                <div class="register-link">
                    Don't have an account? 
                    <router-link to="/register">Register here</router-link>
                </div>
            </form>
        </div>
    </div>
</template>

<style scoped>
.login-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    background-color: #1a1a1a;
    color: white;
}

.login-card {
    background: #2a2a2a;
    padding: 2rem;
    border-radius: 8px;
    width: 100%;
    max-width: 400px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
}

.form-group {
    margin-bottom: 1rem;
}

label {
    display: block;
    margin-bottom: 0.5rem;
}

input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #444;
    background: #333;
    color: white;
    border-radius: 4px;
}

button {
    width: 100%;
    padding: 0.75rem;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
}

.divider {
    margin: 1rem 0;
    text-align: center;
    color: #888;
    font-size: 0.9rem;
}

.github-btn {
    background-color: #24292e;
    color: white;
    margin-top: 0.5rem;
}

.github-btn:hover {
    background-color: #1a1e22;
}

button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

.register-link {
    margin-top: 1.5rem;
    text-align: center;
    color: #888;
}

.register-link a {
    color: #4CAF50;
    text-decoration: none;
}

.register-link a:hover {
    text-decoration: underline;
}

.error {
    color: #ff5252;
    margin-bottom: 1rem;
    text-align: center;
}
</style>
