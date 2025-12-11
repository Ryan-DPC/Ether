<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import axios from 'axios'
// import defaultGameImg from '@/assets/images/default-game.svg'
import { getApiUrl } from '../utils/url';
const defaultGameImg = `${getApiUrl()}/public/default-game.svg`;
import { statsService } from '../services/stats.service';
import { useUserStore } from '@/stores/userStore';
import { useAlertStore } from '@/stores/alertStore';

const userStore = useUserStore();
const alertStore = useAlertStore();
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
                    version: rawGame.latestVersion || rawGame.manifestVersion,
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
                        version: rawGame.latestVersion || rawGame.manifestVersion
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
            installingGameId.value = null
            alertStore.showAlert({
                title: 'Erreur d\'installation',
                message: data.error,
                type: 'error'
            })
        }
    })
}

const installGame = async () => {
    if (!window.electronAPI) {
        alertStore.showAlert({
            title: 'Application requise',
            message: 'L\'installation nécessite l\'application desktop Electron',
            type: 'warning'
        })
        return
    }

    try {
        // 1. Get Install Path
        let installPath = localStorage.getItem('etherInstallPath')
        if (!installPath) {
            // Show path selector (we need to add the component to template)
            // For now, alert if not set
            alertStore.showAlert({
                title: 'Configuration requise',
                message: 'Veuillez d\'abord définir un dossier d\'installation dans la bibliothèque',
                type: 'info'
            })
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
        alertStore.showAlert({
            title: 'Erreur',
            message: err.message || 'Erreur lors de l\'initialisation de l\'installation',
            type: 'error'
        })
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
        alertStore.showAlert({
            title: 'Erreur de lancement',
            message: err.message,
            type: 'error'
        })
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
            alertStore.showAlert({
                title: 'Achat réussi !',
                message: `Jeu acheté avec succès ! Solde restant : ${response.data.remainingBalance} CHF`,
                type: 'success'
            })
            userOwnsGame.value = true
            // Refresh user tokens immediately
            await userStore.fetchProfile()
        }
    } catch (err: any) {
        alertStore.showAlert({
            title: 'Erreur d\'achat',
            message: err.response?.data?.message || 'Erreur lors de l\'achat',
            type: 'error'
        })
    } finally {
        isPurchasing.value = false
    }
}

const uninstallGame = async () => {
    if (!window.electronAPI || !game.value) return
    const installPath = localStorage.getItem('etherInstallPath')
    if (!installPath) return

    if (await alertStore.showConfirm({
        title: 'Désinstallation',
        message: 'Voulez-vous vraiment désinstaller ce jeu ?',
        type: 'warning',
        confirmText: 'Désinstaller',
        cancelText: 'Annuler'
    })) {
        try {
            await window.electronAPI.uninstallGame(installPath, game.value.slug)
            isInstalled.value = false
            alertStore.showAlert({
                title: 'Succès',
                message: 'Jeu désinstallé',
                type: 'success'
            })
        } catch (e: any) {
            alertStore.showAlert({
                title: 'Erreur',
                message: 'Erreur: ' + e,
                type: 'error'
            })
        }
    }
}
</script>

<template>
    <div class="game-details-container">
        <div v-if="isLoading" class="loading-state">
            <div class="spinner"></div>
            <p>Chargement du jeu...</p>
        </div>
        
        <div v-else-if="error" class="error-state">
            <div class="glass-card error-card">
                <p>{{ error }}</p>
                <RouterLink to="/home" class="btn-secondary">← Retour à l'accueil</RouterLink>
            </div>
        </div>

        <div v-else-if="game" class="content-wrapper">
            <!-- Hero Section -->
            <div class="hero-section">
                <div class="hero-bg">
                    <img :src="game.imageUrl || defaultGameImg" 
                         :alt="game.gameName"
                         class="hero-image"
                         @error="($event.target as HTMLImageElement).src=defaultGameImg">
                    <div class="hero-overlay"></div>
                </div>
                
                <div class="hero-content">
                    <div class="game-title-card glass-panel">
                        <span v-if="game.latestVersion" class="version-badge">DEV {{ game.latestVersion }}</span>
                        <h1 class="game-title">{{ game.gameName }}</h1>
                        <div class="developer-info">
                            <span class="dev-label">Développé par</span>
                            <span class="dev-name">{{ game.developer || 'Ryan-DPC' }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Main Grid Layout -->
            <div class="main-grid">
                <!-- Left Column: Content -->
                <div class="left-column">
                    <section class="info-section">
                        <h2 class="section-title">À propos</h2>
                        <div class="description-text">
                            {{ game.description || 'Aucune description disponible pour ce jeu.' }}
                        </div>
                    </section>

                    <section class="media-section" v-if="false">
                        <!-- Placeholder for future media gallery -->
                        <h2 class="section-title">Galerie</h2>
                        <div class="media-grid">
                            <div class="media-placeholder"></div>
                            <div class="media-placeholder"></div>
                        </div>
                    </section>
                </div>

                <!-- Right Column: Sidebar -->
                <div class="right-column">
                    <div class="sidebar-sticky">
                        <!-- Action Card -->
                        <div class="action-card glass-panel">
                            <div class="price-tag">
                                {{ game.price > 0 ? `${game.price} CHF` : 'Gratuit' }}
                            </div>

                            <div class="action-buttons">
                                <button v-if="!userOwnsGame && game.price > 0" 
                                        @click="purchaseGame" 
                                        :disabled="isPurchasing" 
                                        class="btn-primary btn-block btn-glow">
                                    {{ isPurchasing ? 'Traitement...' : 'Acheter maintenant' }}
                                </button>
                                
                                <div v-else-if="userOwnsGame" class="install-flow">
                                    <div v-if="installingGameId === (game.slug || game.gameId)" class="install-status">
                                        <div class="progress-header">
                                            <span>{{ installProgress.type === 'download' ? 'Téléchargement' : 'Installation' }}</span>
                                            <span>{{ installProgress.progress }}%</span>
                                        </div>
                                        <div class="progress-track">
                                            <div class="progress-fill" :style="{ width: installProgress.progress + '%' }"></div>
                                        </div>
                                        <div class="progress-meta">
                                            <span>{{ installProgress.speed }}</span>
                                            <span>ETA: {{ installProgress.eta }}</span>
                                        </div>
                                    </div>

                                    <div v-else class="game-actions">
                                        <button v-if="!isInstalled" 
                                                @click="installGame" 
                                                class="btn-primary btn-block btn-glow"
                                                :disabled="isInstalling">
                                            {{ isInstalling ? 'Préparation...' : 'Installer' }}
                                        </button>
                                        
                                        <button v-else-if="hasUpdate" 
                                                @click="installGame" 
                                                class="btn-info btn-block"
                                                :disabled="isInstalling">
                                            Mettre à jour
                                        </button>

                                        <button v-if="isInstalled" 
                                                @click="launchGame" 
                                                class="btn-success btn-block btn-glow play-btn">
                                            <span class="play-icon">▶</span> Jouer
                                        </button>
                                        
                                        <button v-if="isInstalled" 
                                                @click="uninstallGame" 
                                                class="btn-text btn-sm">
                                            Désinstaller
                                        </button>
                                    </div>
                                </div>

                                <button v-else-if="!userOwnsGame && game.price === 0" 
                                        @click="purchaseGame" 
                                        :disabled="isPurchasing" 
                                        class="btn-primary btn-block btn-glow">
                                    {{ isPurchasing ? 'Ajout...' : 'Ajouter à la bibliothèque' }}
                                </button>
                            </div>
                            
                            <div class="refund-note">
                                <span v-if="game.price > 0">Remboursable sous 14 jours si < 2h de jeu</span>
                            </div>
                        </div>

                        <!-- Game Meta Card -->
                        <div class="meta-card glass-panel">
                            <div class="meta-row">
                                <span class="meta-label">Version</span>
                                <span class="meta-value">{{ game.latestVersion || '1.0.0' }}</span>
                            </div>
                            <div class="meta-row">
                                <span class="meta-label">Genre</span>
                                <span class="meta-value">{{ game.genre || 'Strategy' }}</span>
                            </div>
                            <div class="meta-row">
                                <span class="meta-label">Joueurs</span>
                                <span class="meta-value">{{ game.isMultiplayer ? `1-${game.maxPlayers}` : 'Solo' }}</span>
                            </div>
                            <div class="meta-row">
                                <span class="meta-label">Statut</span>
                                <span class="meta-value" :class="game.enabled ? 'text-success' : 'text-danger'">
                                    {{ game.enabled ? 'Disponible' : 'Indisponible' }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Variables & Base */
:root {
    --primary-color: #00dc82;
    --primary-glow: rgba(0, 220, 130, 0.5);
    --glass-bg: rgba(20, 20, 20, 0.6);
    --glass-border: rgba(255, 255, 255, 0.1);
    --text-main: #ffffff;
    --text-muted: #a0a0a0;
}

.game-details-container {
    min-height: 100vh;
    background-color: #0a0a0a;
    color: var(--text-main);
    font-family: 'Inter', sans-serif;
    padding-bottom: 80px;
}

/* Hero Section */
.hero-section {
    position: relative;
    height: 60vh;
    min-height: 500px;
    width: 100%;
    overflow: hidden;
}

.hero-bg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
}

.hero-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: brightness(0.8);
}

.hero-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(to top, #0a0a0a 0%, rgba(10,10,10,0.8) 20%, transparent 100%);
}

.hero-content {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    max-width: 1400px;
    margin: 0 auto;
    padding: 40px;
    display: flex;
    align-items: flex-end;
    pointer-events: none; /* Let clicks pass through to image if needed */
}

/* Glassmorphism Panels */
.glass-panel {
    background: rgba(30, 30, 30, 0.6);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    pointer-events: auto;
}

/* Game Title Card */
.game-title-card {
    margin-bottom: -40px; /* Overlap with grid */
    min-width: 400px;
    transform: translateY(0);
    animation: slideUp 0.6s ease-out;
}

.version-badge {
    background: #ff9800;
    color: #000;
    font-weight: 800;
    font-size: 0.75rem;
    padding: 4px 8px;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.game-title {
    font-size: 3.5rem;
    font-weight: 800;
    margin: 10px 0;
    line-height: 1.1;
    background: linear-gradient(to right, #fff, #ccc);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.developer-info {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 1.1rem;
}

.dev-label {
    color: var(--text-muted);
}

.dev-name {
    color: #fff;
    font-weight: 600;
}

/* Main Grid */
.main-grid {
    max-width: 1400px;
    margin: 80px auto 0;
    padding: 0 40px;
    display: grid;
    grid-template-columns: 1fr 380px;
    gap: 60px;
}

/* Left Column */
.section-title {
    font-size: 1.8rem;
    font-weight: 700;
    margin-bottom: 24px;
    color: #fff;
    border-left: 4px solid #00dc82;
    padding-left: 16px;
}

.description-text {
    font-size: 1.15rem;
    line-height: 1.8;
    color: #d0d0d0;
    white-space: pre-line;
}

/* Right Column (Sidebar) */
.sidebar-sticky {
    position: sticky;
    top: 20px;
    display: flex;
    flex-direction: column;
    gap: 24px;
}

.action-card {
    display: flex;
    flex-direction: column;
    gap: 20px;
    text-align: center;
}

.price-tag {
    font-size: 2.5rem;
    font-weight: 800;
    color: #fff;
}

.btn-block {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 16px;
    font-size: 1.1rem;
    font-weight: 700;
    border-radius: 12px;
    border: none;
    cursor: pointer;
    transition: all 0.3s ease;
}

.btn-primary {
    background: linear-gradient(135deg, #00dc82 0%, #00a86b 100%);
    color: #000;
}

.btn-glow:hover {
    transform: translateY(-2px);
    box-shadow: 0 0 20px rgba(0, 220, 130, 0.4);
}

.btn-success {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
}

.play-btn {
    font-size: 1.3rem;
    padding: 20px;
}

.play-icon {
    margin-right: 10px;
}

.btn-text {
    background: none;
    border: none;
    color: #666;
    text-decoration: underline;
    cursor: pointer;
    font-size: 0.9rem;
}

.refund-note {
    font-size: 0.8rem;
    color: #666;
}

/* Meta Card */
.meta-row {
    display: flex;
    justify-content: space-between;
    padding: 12px 0;
    border-bottom: 1px solid rgba(255,255,255,0.05);
}

.meta-row:last-child {
    border-bottom: none;
}

.meta-label {
    color: #888;
}

.meta-value {
    color: #fff;
    font-weight: 500;
}

.text-success { color: #00dc82; }
.text-danger { color: #ff4444; }

/* Progress Bar */
.install-status {
    background: rgba(0,0,0,0.2);
    padding: 15px;
    border-radius: 8px;
}

.progress-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 0.9rem;
    color: #ccc;
}

.progress-track {
    height: 6px;
    background: rgba(255,255,255,0.1);
    border-radius: 3px;
    overflow: hidden;
    margin-bottom: 8px;
}

.progress-fill {
    height: 100%;
    background: #00dc82;
    transition: width 0.3s ease;
}

.progress-meta {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    color: #888;
}

/* Loading / Error */
.loading-state, .error-state {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 60vh;
}

.spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(255,255,255,0.1);
    border-top-color: #00dc82;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 20px;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

@keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}

/* Responsive */
@media (max-width: 1024px) {
    .main-grid {
        grid-template-columns: 1fr;
        padding: 0 20px;
    }
    
    .game-title-card {
        min-width: auto;
        width: 100%;
        margin-bottom: 0;
    }

    .hero-content {
        padding: 20px;
    }
}
</style>
