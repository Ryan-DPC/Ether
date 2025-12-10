<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import axios from 'axios'
// import defaultGameImg from '@/assets/images/default-game.svg'
import { getApiUrl } from '../utils/url';
const defaultGameImg = `${getApiUrl()}/public/default-game.svg`;
import { statsService } from '../services/stats.service';

const route = useRoute()
const gameId = route.params.id as string
const game = ref<any>(null)
const isLoading = ref(true)
const error = ref<string | null>(null)
const userOwnsGame = ref(false)
const isPurchasing = ref(false)

// Installation state
const isInstalled = ref(false)
const hasUpdate = ref(false)
const installingGameId = ref<string | null>(null)
const isInstalling = ref(false)
const installProgress = ref({
  progress: 0,
  speed: '',
  downloaded: '',
  total: '',
  eta: '',
  type: 'download'
})

onMounted(async () => {
    try {
        // Try to fetch from regular games API first
        try {
            const response = await axios.get(`/games/details/${gameId}`)
            if (response.data && response.data.game) {
                const rawGame = response.data.game
                // Normalize data (backend uses snake_case, frontend uses camelCase)
                game.value = {
                    ...rawGame,
                    gameName: rawGame.gameName || rawGame.game_name,
                    imageUrl: rawGame.imageUrl || rawGame.image_url,
                    slug: rawGame.slug || rawGame.folder_name,
                    isMultiplayer: rawGame.isMultiplayer || rawGame.is_multiplayer,
                    maxPlayers: rawGame.maxPlayers || rawGame.max_players,
                    // Ensure other fields are present
                    description: rawGame.description,
                    developer: rawGame.developer,
                    price: rawGame.price,
                    version: rawGame.version || rawGame.manifestVersion,
                    genre: rawGame.genre,
                    enabled: rawGame.status === 'disponible' || rawGame.enabled
                }
            }
        } catch (err: any) {
            // If 404, try dev-games API
            if (err.response && err.response.status === 404) {
                console.log('Game not found in DB, trying dev-games API...')
                const response = await axios.get(`/dev-games/${gameId}`)
                if (response.data && response.data.success && response.data.game) {
                    const rawGame = response.data.game
                    game.value = {
                        ...rawGame,
                        gameName: rawGame.gameName || rawGame.game_name,
                        imageUrl: rawGame.imageUrl || rawGame.image_url,
                        slug: rawGame.slug || rawGame.folder_name,
                        isMultiplayer: rawGame.isMultiplayer || rawGame.is_multiplayer,
                        maxPlayers: rawGame.maxPlayers || rawGame.max_players,
                        version: rawGame.version || rawGame.manifestVersion
                    }
                } else {
                    throw new Error('Game not found in dev-games')
                }
            } else {
                throw err // Re-throw other errors
            }
        }

        if (game.value) {
            // Check if user owns this game
            try {
                const libraryResponse = await axios.get('/library/my-games')
                const myGames = libraryResponse.data
                // Check by ID or folder name
                userOwnsGame.value = myGames.some((g: any) => 
                    g._id === game.value._id || 
                    g.folder_name === game.value.folder_name
                )
            } catch (e) {
                console.error('Error checking ownership:', e)
            }

            // Check installation status
            if (window.electronAPI) {
                await checkInstallationStatus()
                setupInstallListeners()
            }
        }
    } catch (err: any) {
        error.value = err.message || 'Erreur lors du chargement du jeu'
        console.error('Error fetching game details:', err)
    } finally {
        isLoading.value = false
    }
})

const checkInstallationStatus = async () => {
    const installPath = localStorage.getItem('etherInstallPath')
    if (!installPath || !game.value) return

    // Check if folder exists
    const isFolderExists = await window.electronAPI?.checkGameInstalled(installPath, game.value.slug)
    
    if (isFolderExists) {
        // TODO: Read installed.json to check version
        // For now, assume installed if folder exists
        isInstalled.value = true
        
        // If we could read installed.json, we would compare versions here
        // hasUpdate.value = installedVersion.value !== game.value.version
    }
}

const setupInstallListeners = () => {
    window.electronAPI?.onInstallProgress((data: any) => {
        if (data.gameId === game.value.slug) {
            installingGameId.value = data.gameId
            isInstalling.value = true
            installProgress.value = {
                progress: data.progress,
                speed: data.speed || '',
                downloaded: data.downloaded || '',
                total: data.total || '',
                eta: data.eta || '',
                type: data.type || 'download'
            }
        }
    })

    window.electronAPI?.onInstallComplete((data: any) => {
        if (data.gameId === game.value.slug) {
            isInstalling.value = false
            installingGameId.value = null
            isInstalled.value = true
            hasUpdate.value = false
            
            new Notification('Ether Desktop', {
                body: `✅ ${data.gameName} installé avec succès!`,
                silent: false
            })
        }
    })

    window.electronAPI?.onInstallError((data: any) => {
        if (data.gameId === game.value.slug) {
            isInstalling.value = false
            installingGameId.value = null
            alert(`Erreur d'installation: ${data.error}`)
        }
    })
}

const installGame = async () => {
    if (!window.electronAPI) {
        alert('L\'installation nécessite l\'application desktop Electron')
        return
    }

    try {
        // 1. Get Install Path
        let installPath = localStorage.getItem('etherInstallPath')
        if (!installPath) {
            // Show path selector (we need to add the component to template)
            // For now, alert if not set
            alert('Veuillez d\'abord définir un dossier d\'installation dans la bibliothèque')
            return
        }

        isInstalling.value = true

        // 2. Fetch Manifest
        console.log('Fetching manifest for game:', game.value.slug)
        const manifestResponse = await axios.get(`/games/${game.value.slug}/manifest`)
        const manifest = manifestResponse.data

        // Support both downloadUrl and zipUrl
        const downloadUrl = manifest.downloadUrl || manifest.zipUrl
        const version = manifest.version

        if (!downloadUrl) {
            throw new Error('Download URL not found in manifest')
        }

        // 4. Start Installation via Electron
        await window.electronAPI?.installGame(
            downloadUrl,
            installPath,
            game.value.slug, // folder name
            game.value.slug, // game id
            game.value.gameName,
            version
        )

    } catch (err: any) {
        console.error('Installation failed:', err)
        isInstalling.value = false
        alert(err.message || 'Erreur lors de l\'initialisation de l\'installation')
    }
}

const launchGame = async () => {
    if (!window.electronAPI) return
    
    const installPath = localStorage.getItem('etherInstallPath')
    if (!installPath) return

    try {
        await statsService.startSession(game.value.slug);
        await window.electronAPI?.launchGame(installPath, game.value.slug)
    } catch (err: any) {
        alert(`Erreur de lancement: ${err.message}`)
    }
}

const purchaseGame = async () => {
    if (!game.value) return
    
    isPurchasing.value = true
    try {
        const response = await axios.post('/library/purchase-game', {
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
                <img :src="game.imageUrl || defaultGameImg" 
                     :alt="game.gameName"
                     class="game-banner"
                     @error="($event.target as HTMLImageElement).src=defaultGameImg">
                
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
                        
                        <!-- Installation / Play Buttons -->
                        <div v-else-if="userOwnsGame" class="install-actions">
                            <div v-if="installingGameId === (game.slug || game.gameId)" class="install-progress">
                                <div class="progress-info">
                                    <span class="progress-status">
                                        {{ installProgress.type === 'download' ? 'Téléchargement' : 'Extraction' }} 
                                        {{ installProgress.progress }}%
                                    </span>
                                    <span class="progress-details">
                                        {{ installProgress.speed }} - ETA: {{ installProgress.eta }}
                                    </span>
                                </div>
                                <div class="progress-bar-container">
                                    <div class="progress-bar" :style="{ width: installProgress.progress + '%' }"></div>
                                </div>
                                <div class="progress-stats">
                                    {{ installProgress.downloaded }} / {{ installProgress.total }}
                                </div>
                            </div>

                            <div v-else class="action-buttons">
                                <button 
                                    v-if="!isInstalled" 
                                    @click="installGame" 
                                    class="btn-primary btn-install"
                                    :disabled="isInstalling"
                                >
                                    {{ isInstalling ? 'Installation...' : '⬇️ Installer' }}
                                </button>
                                
                                <button 
                                    v-else-if="hasUpdate" 
                                    @click="installGame" 
                                    class="btn-primary btn-update"
                                    :disabled="isInstalling"
                                >
                                    {{ isInstalling ? 'Mise à jour...' : '🔄 Mettre à jour' }}
                                </button>

                                <button 
                                    v-if="isInstalled" 
                                    @click="launchGame" 
                                    class="btn-primary btn-play"
                                >
                                    ▶ Jouer
                                </button>
                            </div>
                        </div>

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
