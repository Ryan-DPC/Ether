<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { RouterLink } from 'vue-router'

const gameStore = useGameStore()
const devGames = ref<any[]>([])
const isLoadingDev = ref(false)

onMounted(async () => {
    // Fetch normal games
    await gameStore.fetchHomeData()
    
    // Fetch dev games
    isLoadingDev.value = true
    try {
        const response = await fetch('/api/dev-games')
        const data = await response.json()
        if (data.success && data.games) {
            devGames.value = data.games
        }
    } catch (error) {
        console.error('Failed to fetch dev games:', error)
    } finally {
        isLoadingDev.value = false
    }
})
</script>

<template>
    <div class="main-container">
        <!-- Main Banner -->
        <div class="banner">
            <div class="banner-overlay"></div>
            <div class="banner-text">
                <h2>Découvrez nos nouveaux jeux</h2>
                <p>Explorez une nouvelle expérience chaque jour.</p>
                <RouterLink to="/library" class="banner-btn">Voir la bibliothèque</RouterLink>
            </div>
        </div>

        <!-- Popular & Recommended Section -->
        <section class="games-section">
            <h2>Populaires et Recommandés</h2>
            <div class="horizontal-scroll">
                <div v-if="gameStore.isLoading" class="loading">Chargement...</div>
                <div v-else-if="gameStore.games && gameStore.games.length > 0" class="games-list">
                    <div v-for="game in gameStore.games" :key="game.id || game.folder_name" class="game-card">
                        <img :src="game.image_url || '/assets/images/default-game.png'" 
                             :alt="game.game_name"
                             @error="($event.target as HTMLImageElement).src='/assets/images/default-game.png'">
                        <h3>{{ game.game_name }}</h3>
                        <p>{{ game.description || 'Description non disponible' }}</p>
                        <RouterLink v-if="game.folder_name" :to="`/games/details/${game.folder_name}`" class="play-button">Voir</RouterLink>
                    </div>
                </div>
                <p v-else>Aucun jeu disponible pour le moment.</p>
            </div>
        </section>

        <!-- Dev Games Section -->
        <section class="games-section">
            <h2>Jeux en Développement 🎮</h2>
            <div class="horizontal-scroll">
                <div v-if="isLoadingDev" class="loading">Chargement...</div>
                <div v-else-if="devGames && devGames.length > 0" class="games-list">
                    <div v-for="game in devGames" :key="game.gameId" class="game-card dev-card">
                        <img :src="game.imageUrl || game.defaultImageUrl || '/games/default-game.png'" 
                             :alt="game.gameName"
                             @error="(e) => {
                                 const target = e.target as HTMLImageElement;
                                 // Prevent infinite loop if default image also fails
                                 if (target.src.includes('default-game.png')) return;
                                 target.src = game.defaultImageUrl || '/games/default-game.png';
                             }">
                        <span class="dev-badge">DEV v{{ game.version || '1.0.0' }}</span>
                        <h3>{{ game.gameName }}</h3>
                        <p>{{ game.description || 'Description non disponible' }}</p>
                        <RouterLink :to="`/games/details/${game.gameId}`" class="play-button">Voir</RouterLink>
                    </div>
                </div>
                <p v-else>Aucun jeu de dev à découvrir pour le moment.</p>
            </div>
        </section>
    </div>
</template>

<style scoped>
.main-container {
    padding: 20px;
}

.banner {
    position: relative;
    height: 400px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 12px;
    margin-bottom: 40px;
    overflow: hidden;
}

.banner-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.3);
}

.banner-text {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100%;
    color: white;
    text-align: center;
    padding: 20px;
}

.banner-text h2 {
    font-size: 3rem;
    margin-bottom: 1rem;
    font-weight: 700;
}

.banner-text p {
    font-size: 1.5rem;
    margin-bottom: 2rem;
    opacity: 0.9;
}

.banner-btn {
    padding: 15px 40px;
    background: #4CAF50;
    color: white;
    text-decoration: none;
    border-radius: 8px;
    font-size: 1.1rem;
    font-weight: 600;
    transition: background 0.3s;
}

.banner-btn:hover {
    background: #45a049;
}

.games-section {
    margin-bottom: 40px;
}

.games-section h2 {
    font-size: 2rem;
    margin-bottom: 20px;
    color: #fff;
}

.horizontal-scroll {
    overflow-x: auto;
    padding-bottom: 10px;
}

.games-list {
    display: flex;
    gap: 20px;
    min-width: min-content;
}

.game-card {
    background: #1a1a1a;
    border-radius: 8px;
    padding: 15px;
    min-width: 250px;
    max-width: 250px;
    transition: transform 0.2s;
    position: relative;
}

.game-card:hover {
    transform: translateY(-5px);
}

.dev-card {
    border: 2px solid #ff9800;
}

.dev-badge {
    position: absolute;
    top: 10px;
    right: 10px;
    background: #ff9800;
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: bold;
}

.game-card img {
    width: 100%;
    height: 150px;
    object-fit: cover;
    border-radius: 6px;
    margin-bottom: 10px;
}

.game-card h3 {
    font-size: 1.1rem;
    margin-bottom: 8px;
    color: #fff;
}

.game-card p {
    font-size: 0.9rem;
    color: #aaa;
    margin-bottom: 12px;
}

.play-button {
    display: inline-block;
    padding: 8px 20px;
    background: #4CAF50;
    color: white;
    text-decoration: none;
    border-radius: 4px;
    font-size: 0.9rem;
    transition: background 0.3s;
}

.play-button:hover {
    background: #45a049;
}

.download-btn {
    background: #ff9800;
}

.download-btn:hover {
    background: #f57c00;
}

.loading {
    text-align: center;
    padding: 40px;
    color: #aaa;
}
</style>
