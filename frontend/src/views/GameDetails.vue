<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const gameId = route.params.id as string
const game = ref<any>(null)
const isLoading = ref(true)
const error = ref<string | null>(null)
const userOwnsGame = ref(false)
const isPurchasing = ref(false)

onMounted(async () => {
    try {
        // Try dev games first
        const response = await fetch(`/api/dev-games/${gameId}`)
        if (response.ok) {
            const data = await response.json()
            if (data.success && data.game) {
                game.value = data.game
                
                // Check if user owns this game
                try {
                    const libraryResponse = await axios.get('/api/library/my-games')
                    const ownedGames = libraryResponse.data.games || []
                    userOwnsGame.value = ownedGames.some((g: any) => g.folder_name === game.value.slug || g.game_name === game.value.gameName)
                } catch (err) {
                    console.log('Could not fetch library (user may not be logged in)')
                }
            }
        } else {
            // Fallback to normal games?
            error.value = 'Jeu non trouvé'
        }
    } catch (err) {
        console.error('Error fetching game details:', err)
        error.value = 'Erreur lors du chargement du jeu'
    } finally {
        isLoading.value = false
    }
})

const purchaseGame = async () => {
    if (!game.value) return
    
    isPurchasing.value = true
    try {
        const response = await axios.post('/api/library/purchase-game', {
            gameId: game.value.slug,
            price: game.value.price
        })
        
        if (response.data.success) {
            alert(`Jeu acheté avec succès ! Solde restant : ${response.data.remainingBalance} CHF`)
            userOwnsGame.value = true
        }
    } catch (err: any) {
        alert(err.response?.data?.message || 'Erreur lors de l\'achat')
    } finally {
        isPurchasing.value = false
    }
}
</script>

<template>
    <div class="game-details">
        <div v-if="isLoading" class="loading">Chargement...</div>
        
        <div v-else-if="error" class="error">
            <p>{{ error }}</p>
            <RouterLink to="/home" class="back-btn">← Retour à l'accueil</RouterLink>
        </div>

        <div v-else-if="game" class="details-content">
            <!-- Header Section -->
            <div class="game-header">
                <img :src="game.imageUrl || '/games/default-game.png'" 
                     :alt="game.gameName"
                     class="game-banner"
                     @error="($event.target as HTMLImageElement).src='/games/default-game.png'">
                
                <div class="header-overlay">
                    <div class="header-content">
                        <span v-if="game.version" class="dev-badge">DEV v{{ game.version }}</span>
                        <h1>{{ game.gameName }}</h1>
                        <p class="developer">Développeur: {{ game.developer || 'Inconnu' }}</p>
                    </div>
                </div>
            </div>

            <!-- Game Info -->
            <div class="game-info">
                <div class="info-main">
                    <h2>À propos</h2>
                    <p class="description">{{ game.description || 'Pas de description disponible' }}</p>

                    <div class="features">
                        <div class="feature">
                            <span class="label">Version:</span>
                            <span class="value">{{ game.version || 'N/A' }}</span>
                        </div>
                        <div class="feature" v-if="game.maxPlayers">
                            <span class="label">Joueurs:</span>
                            <span class="value">{{ game.isMultiplayer ? `1-${game.maxPlayers}` : '1' }}</span>
                        </div>
                        <div class="feature" v-if="game.genre">
                            <span class="label">Genre:</span>
                            <span class="value">{{ game.genre }}</span>
                        </div>
                    </div>

                    <div class="actions">
                        <button v-if="!userOwnsGame && game.price > 0" @click="purchaseGame" :disabled="isPurchasing" class="btn-primary">
                            {{ isPurchasing ? '⏳ Achat en cours...' : `💳 Acheter (${game.price} CHF)` }}
                        </button>
                        <a v-else-if="userOwnsGame && game.zipUrl" :href="game.zipUrl" download class="btn-primary">
                            ⬇️ Télécharger le jeu
                        </a>
                        <button v-else-if="!userOwnsGame && game.price === 0" @click="purchaseGame" :disabled="isPurchasing" class="btn-primary">
                            {{ isPurchasing ? '⏳ Ajout en cours...' : '🎁 Ajouter à la bibliothèque' }}
                        </button>
                        <RouterLink to="/home" class="btn-secondary">← Retour</RouterLink>
                    </div>
                </div>

                <div class="info-sidebar">
                    <div class="price-box" v-if="game.price !== undefined">
                        <span class="price-label">Prix</span>
                        <span class="price">{{ game.price > 0 ? `${game.price} CHF` : 'Gratuit' }}</span>
                    </div>

                    <div class="meta-info">
                        <h3>Informations</h3>
                        <div class="meta-item">
                            <span class="meta-label">Statut:</span>
                            <span class="meta-value" :class="{ 'status-active': game.enabled, 'status-inactive': !game.enabled }">
                                {{ game.enabled ? 'Disponible' : 'Indisponible' }}
                            </span>
                        </div>
                        <div class="meta-item" v-if="game.updated">
                            <span class="meta-label">Mise à jour:</span>
                            <span class="meta-value">{{ new Date(game.updated).toLocaleDateString() }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.game-details {
    padding: 20px;
    max-width: 1400px;
    margin: 0 auto;
}

.loading, .error {
    text-align: center;
    padding: 60px 20px;
    color: #aaa;
}

.error p {
    font-size: 1.2rem;
    margin-bottom: 20px;
}

.back-btn {
    display: inline-block;
    padding: 12px 24px;
    background: #4CAF50;
    color: white;
    text-decoration: none;
    border-radius: 6px;
    transition: background 0.3s;
}

.back-btn:hover {
    background: #45a049;
}

.game-header {
    position: relative;
    height: 400px;
    border-radius: 12px;
    overflow: hidden;
    margin-bottom: 30px;
}

.game-banner {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.header-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(to top, rgba(0,0,0,0.9), transparent);
    padding: 40px;
}

.header-content {
    color: white;
}

.dev-badge {
    display: inline-block;
    background: #ff9800;
    padding: 6px 12px;
    border-radius: 4px;
    font-size: 0.85rem;
    font-weight: bold;
    margin-bottom: 10px;
}

.game-header h1 {
    font-size: 3rem;
    margin-bottom: 10px;
}

.developer {
    font-size: 1.1rem;
    opacity: 0.8;
}

.game-info {
    display: grid;
    grid-template-columns: 1fr 350px;
    gap: 30px;
}

.info-main h2 {
    font-size: 1.8rem;
    margin-bottom: 15px;
    color: #fff;
}

.description {
    font-size: 1.1rem;
    line-height: 1.6;
    color: #ccc;
    margin-bottom: 30px;
}

.features {
    display: flex;
    flex-direction: column;
    gap: 15px;
    margin-bottom: 30px;
}

.feature {
    display: flex;
    justify-content: space-between;
    padding: 12px;
    background: #1a1a1a;
    border-radius: 6px;
}

.label {
    font-weight: 600;
    color: #888;
}

.value {
    color: #fff;
}

.actions {
    display: flex;
    gap: 15px;
}

.btn-primary, .btn-secondary {
    padding: 15px 30px;
    border-radius: 8px;
    text-decoration: none;
    font-size: 1.1rem;
    font-weight: 600;
    transition: all 0.3s;
    display: inline-block;
}

.btn-primary {
    background: #4CAF50;
    color: white;
}

.btn-primary:hover {
    background: #45a049;
    transform: translateY(-2px);
}

.btn-secondary {
    background: #333;
    color: white;
}

.btn-secondary:hover {
    background: #444;
}

.info-sidebar {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.price-box {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 30px;
    border-radius: 12px;
    text-align: center;
}

.price-label {
    display: block;
    font-size: 0.9rem;
    text-transform: uppercase;
    color: rgba(255,255,255,0.8);
    margin-bottom: 10px;
}

.price {
    display: block;
    font-size: 2.5rem;
    font-weight: 700;
    color: white;
}

.meta-info {
    background: #1a1a1a;
    padding: 20px;
    border-radius: 12px;
}

.meta-info h3 {
    font-size: 1.2rem;
    margin-bottom: 15px;
    color: #fff;
}

.meta-item {
    display: flex;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px solid #333;
}

.meta-item:last-child {
    border-bottom: none;
}

.meta-label {
    color: #888;
}

.meta-value {
    color: #fff;
}

.status-active {
    color: #4CAF50;
    font-weight: bold;
}

.status-inactive {
    color: #f44336;
}

@media (max-width: 768px) {
    .game-info {
        grid-template-columns: 1fr;
    }

    .game-header h1 {
        font-size: 2rem;
    }
}
</style>
