<script setup lang="ts">
import { ref } from 'vue'
import { useUserStore } from '../stores/userStore'
import { useRouter } from 'vue-router'

const username = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const userStore = useUserStore()
const router = useRouter()

const handleRegister = async () => {
    error.value = ''
    
    if (password.value !== confirmPassword.value) {
        error.value = 'Les mots de passe ne correspondent pas'
        return
    }
    
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: username.value,
                email: email.value,
                password: password.value
            })
        })
        
        const data = await response.json()
        
        if (!response.ok) {
            error.value = data.message || 'Registration failed'
            return
        }
        
        if (data.success) {
            // Auto-login after registration using username
            await userStore.login(username.value, password.value)
            router.push('/home')
        }
    } catch (e: any) {
        error.value = e.message || 'Registration failed'
    }
}

const loginWithGithub = () => {
    window.location.href = 'http://localhost:5000/api/auth/github'
}
</script>

<template>
    <div class="register-container">
        <div class="register-card">
            <h1>Register to Ether</h1>
            <form @submit.prevent="handleRegister">
                <div class="form-group">
                    <label>Username</label>
                    <input type="text" v-model="username" required placeholder="Choose a username" />
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" v-model="email" required placeholder="Enter your email" />
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" v-model="password" required placeholder="Choose a password" />
                </div>
                <div class="form-group">
                    <label>Confirm Password</label>
                    <input type="password" v-model="confirmPassword" required placeholder="Confirm your password" />
                </div>
                <div v-if="error" class="error">{{ error }}</div>
                <button type="submit" :disabled="userStore.isLoading">
                    {{ userStore.isLoading ? 'Creating account...' : 'Register' }}
                </button>
                
                <div class="divider">OR</div>
                
                <button type="button" @click="loginWithGithub" class="github-btn">
                    Register with GitHub
                </button>
                
                <div class="login-link">
                    Already have an account? 
                    <router-link to="/login">Login here</router-link>
                </div>
            </form>
        </div>
    </div>
</template>

<style scoped>
.register-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background-color: #1a1a1a;
    color: white;
    padding: 1rem;
}

.register-card {
    background: #2a2a2a;
    padding: 2rem;
    border-radius: 8px;
    width: 100%;
    max-width: 400px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
}

h1 {
    margin-bottom: 1.5rem;
    text-align: center;
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
    box-sizing: border-box;
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

.error {
    color: #ff5252;
    margin-bottom: 1rem;
    text-align: center;
}

.login-link {
    margin-top: 1.5rem;
    text-align: center;
    color: #888;
}

.login-link a {
    color: #4CAF50;
    text-decoration: none;
}

.login-link a:hover {
    text-decoration: underline;
}
</style>
