import { defineStore } from 'pinia'
import axios from 'axios'

export const useMarketplaceStore = defineStore('marketplace', {
    state: () => ({
        usedGames: [] as any[],
        ownedGames: [] as any[],
        activeSales: [] as any[],
        transactions: [] as any[],
        isLoading: false
    }),
    actions: {
        async fetchUsedGames(filters: any = {}) {
            this.isLoading = true
            try {
                const params = new URLSearchParams()
                if (filters.minPrice) params.set('minPrice', filters.minPrice)
                if (filters.maxPrice) params.set('maxPrice', filters.maxPrice)
                if (filters.genre) params.set('genre', filters.genre)
                if (filters.sort) params.set('sort', filters.sort)

                const response = await axios.get(`/api/game-ownership/marketplace?${params}`, {
                    headers: {
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache'
                    }
                })
                this.usedGames = response.data || []
            } catch (error) {
                console.error('Failed to fetch used games:', error)
                this.usedGames = []
            } finally {
                this.isLoading = false
            }
        },
        async fetchOwnedGames() {
            try {
                const response = await axios.get('/api/game-ownership/my-games')
                this.ownedGames = response.data || []
            } catch (error) {
                console.error('Failed to fetch owned games:', error)
                this.ownedGames = []
            }
        },
        async fetchActiveSales() {
            try {
                const response = await axios.get('/api/game-ownership/my-sales')
                this.activeSales = response.data || []
            } catch (error) {
                console.error('Failed to fetch active sales:', error)
                this.activeSales = []
            }
        },
        async fetchTransactions() {
            try {
                const response = await axios.get('/api/game-ownership/transactions')
                this.transactions = response.data || []
            } catch (error) {
                console.error('Failed to fetch transactions:', error)
                this.transactions = []
            }
        },
        async buyUsedGame(ownershipToken: string, sellerId: string) {
            try {
                const response = await axios.post('/api/game-ownership/purchase-used', {
                    ownershipToken,
                    sellerId
                })
                await this.fetchUsedGames()
                return response.data
            } catch (error) {
                throw error
            }
        },
        async sellGame(gameKey: string, askingPrice: number) {
            try {
                const response = await axios.post('/api/game-ownership/sell', {
                    gameKey,
                    askingPrice
                })
                await this.fetchActiveSales()
                return response.data
            } catch (error) {
                throw error
            }
        },
        async cancelSale(ownershipToken: string) {
            try {
                await axios.post('/api/game-ownership/cancel-sale', { ownershipToken })
                await this.fetchActiveSales()
            } catch (error) {
                throw error
            }
        },
        async fetchGameStats(gameKey: string) {
            try {
                const response = await axios.get(`/api/game-ownership/stats/${gameKey}`)
                return response.data
            } catch (error) {
                console.error('Failed to fetch game stats:', error)
                return null
            }
        },
        async deleteListing(ownershipToken: string) {
            try {
                await axios.delete(`/api/game-ownership/marketplace/${ownershipToken}`)
                await this.fetchUsedGames()
            } catch (error) {
                throw error
            }
        }
    }
})
