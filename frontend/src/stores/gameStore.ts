import { defineStore } from 'pinia'
import axios from 'axios'


export const useGameStore = defineStore('game', {
    state: () => ({
        games: [] as any[],
        myGames: [] as any[],
        newGames: [] as any[],
        featuredGames: [] as any[],
        isLoading: false
    }),
    actions: {
        async fetchHomeData() {
            this.isLoading = true
            try {
                const response = await axios.get('/games/all')
                this.games = Array.isArray(response.data) ? response.data : (response.data.games || [])
                this.newGames = response.data.newGames || []

                // Populate featuredGames
                // 1. Start with real games from backend
                let featured = [...this.games]

                // 2. Mock games removed. Only showing real games.

                this.featuredGames = featured.slice(0, 4)

                this.featuredGames = featured.slice(0, 4)
            } catch (error) {
                console.error('Failed to fetch home data:', error)
            } finally {
                this.isLoading = false
            }
        },
        async fetchMyGames() {
            this.isLoading = true
            try {
                const response = await axios.get('/library/my-games')
                this.myGames = response.data || []
            } catch (error) {
                console.error('Failed to fetch my games:', error)
            } finally {
                this.isLoading = false
            }
        }
    }
})
