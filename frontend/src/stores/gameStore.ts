import { defineStore } from 'pinia'
import axios from 'axios'

export const useGameStore = defineStore('game', {
    state: () => ({
        games: [] as any[],
        myGames: [] as any[],
        newGames: [] as any[],
        isLoading: false
    }),
    actions: {
        async fetchHomeData() {
            this.isLoading = true
            try {
                const response = await axios.get('/api/games/all')
                this.games = response.data || []
                this.newGames = response.data.newGames || []
            } catch (error) {
                console.error('Failed to fetch home data:', error)
            } finally {
                this.isLoading = false
            }
        },
        async fetchMyGames() {
            this.isLoading = true
            try {
                const response = await axios.get('/api/library/my-games')
                this.myGames = response.data || []
            } catch (error) {
                console.error('Failed to fetch my games:', error)
            } finally {
                this.isLoading = false
            }
        }
    }
})
