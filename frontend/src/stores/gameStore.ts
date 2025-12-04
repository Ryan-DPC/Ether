import { defineStore } from 'pinia'
import axios from 'axios'

const BACKEND_URL = 'http://localhost:3001'

const MOCK_GAMES = [
    {
        _id: 'mock-1',
        game_name: 'Neon Racer',
        genre: 'Racing',
        price: 15,
        image_url: `${BACKEND_URL}/public/games/neon-racer.svg`,
        description: 'High speed racing in a neon city.'
    },
    {
        _id: 'mock-2',
        game_name: 'Cyber Legends',
        genre: 'MOBA',
        price: 0,
        image_url: `${BACKEND_URL}/public/default-game.svg`,
        description: '5v5 strategic combat.'
    },
    {
        _id: 'mock-3',
        game_name: 'Space Odyssey',
        genre: 'Adventure',
        price: 25,
        image_url: `${BACKEND_URL}/public/default-game.svg`,
        description: 'Explore the galaxy.'
    },
    {
        _id: 'mock-4',
        game_name: 'Pixel Brawler',
        genre: 'Fighting',
        price: 5,
        image_url: `${BACKEND_URL}/public/default-game.svg`,
        description: 'Retro style fighting game.'
    }
]

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

                // 2. If we don't have enough games (e.g. < 4), fill with MOCK_GAMES
                if (featured.length < 4) {
                    const needed = 4 - featured.length
                    featured = [...featured, ...MOCK_GAMES.slice(0, needed)]
                }

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
