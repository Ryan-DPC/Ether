import { defineStore } from 'pinia'
import axios from 'axios'

export const useUserStore = defineStore('user', {
    state: () => ({
        user: null as any,
        isAuthenticated: false,
        isLoading: false,
        friendRequests: [] as any[],
        friends: [] as any[]
    }),
    actions: {
        async fetchProfile() {
            this.isLoading = true
            try {
                const response = await axios.get('/api/users/me')
                if (response.data && response.data.user) {
                    this.user = response.data.user
                    this.isAuthenticated = true
                } else {
                    this.isAuthenticated = false
                    this.user = null
                }
            } catch (error) {
                console.error('Failed to fetch profile:', error)
                this.isAuthenticated = false
                this.user = null
                throw error
            } finally {
                this.isLoading = false
            }
        },
        async login(identifier: string, password: string) {
            this.isLoading = true
            try {
                const response = await axios.post('/api/auth/login', { username: identifier, password })
                if (response.data && response.data.token) {
                    localStorage.setItem('token', response.data.token)
                    axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`
                    this.isAuthenticated = true
                    await this.fetchProfile()
                }
            } catch (error) {
                throw error
            } finally {
                this.isLoading = false
            }
        },
        initializeAuth() {
            const token = localStorage.getItem('token')
            if (token) {
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
            }
        },
        logout() {
            localStorage.removeItem('token')
            delete axios.defaults.headers.common['Authorization']
            this.user = null
            this.isAuthenticated = false
            this.friends = []
            this.friendRequests = []
            // Force reload to clear any other state or redirect
            window.location.href = '/login'
        }
    }
})
