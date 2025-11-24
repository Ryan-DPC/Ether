const cron = require('node-cron');
const CloudinaryService = require('./cloudinary.service');
const SlugService = require('./slug.service');
const mongoose = require('mongoose');
const Games = require('../features/games/games.model');
const ItemsSyncService = require('./itemsSyncService');
const DefaultImageService = require('./defaultImage.service');

/**
 * Service pour gérer les tâches cron
 * - Toutes les heures: vérifie les nouveaux jeux sur Cloudinary et met à jour slug.json
 * - Toutes les 30 minutes: synchronise MongoDB avec slug.json
 */
class CronService {
    constructor() {
        this.cloudinaryService = new CloudinaryService();
        this.slugService = new SlugService();
        this.isRunning = false;
        // Ensure default image exists on Cloudinary at startup
        DefaultImageService.ensureDefaultImage();
    }

    /**
     * Vérifie les nouveaux jeux sur Cloudinary et met à jour slug.json
     */
    async checkNewGames(clearCache = false) {
        if (this.isRunning) {
            console.log('[CronService] ⏸️  Vérification déjà en cours, ignorée');
            return;
        }

        this.isRunning = true;
        console.log('[CronService] 🔍 Vérification des nouveaux jeux sur Cloudinary...');

        try {
            // Ensure the default fallback image exists
            await DefaultImageService.ensureDefaultImage();

            if (!this.cloudinaryService.isEnabled()) {
                console.log('[CronService] ⚠️  Cloudinary non configuré, vérification ignorée');
                return;
            }

            // Vider le cache si demandé
            if (clearCache) {
                const cache = require('./cloudinaryCache.service');
                const cacheService = cache();
                if (cacheService.isEnabled()) {
                    await cacheService.clearAll();
                    console.log('[CronService] 🗑️  Cache Redis vidé');
                }
            }

            // Récupérer tous les jeux depuis Cloudinary (forcer le refresh si demandé)
            const games = await this.cloudinaryService.getAllGames(clearCache);

            // Synchroniser avec slug.json
            await this.slugService.syncFromCloudinary(games);

            console.log(`[CronService] ✅ Vérification terminée: ${games.length} jeu(x) trouvé(s)`);
        } catch (error) {
            console.error('[CronService] ❌ Erreur lors de la vérification:', error.message);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Synchronise MongoDB avec slug.json (met à jour les prix)
     */
    async syncMongoDB() {
        if (this.isRunning) {
            console.log('[CronService] ⏸️  Synchronisation déjà en cours, ignorée');
            return;
        }

        this.isRunning = true;
        console.log('[CronService] 🔄 Synchronisation MongoDB avec slug.json...');

        try {
            // Charger les prix depuis slug.json
            const slugData = await this.slugService.loadSlug();

            let updated = 0;
            let created = 0;

            // Pour chaque jeu dans slug.json, mettre à jour MongoDB
            for (const [slug, gameData] of Object.entries(slugData.games)) {
                if (!gameData.enabled) {
                    console.log(`[CronService] ⏭️  Jeu ${slug} désactivé, ignoré`);
                    continue;
                }

                try {
                    console.log(`[CronService] 🔍 Vérification du jeu: ${slug}`);

                    // Chercher le jeu dans MongoDB
                    const existingGame = await Games.getGameByName(slug);

                    if (existingGame) {
                        console.log(`[CronService] ✅ Jeu trouvé dans MongoDB: ${slug} (prix actuel: ${existingGame.price})`);
                        // Mettre à jour le prix si différent
                        if (existingGame.price !== gameData.price) {
                            const result = await Games.updateOne(
                                { folder_name: slug },
                                { $set: { price: gameData.price } }
                            );
                            if (result && result.modifiedCount > 0) {
                                updated++;
                                console.log(`[CronService] 💰 Prix mis à jour: ${slug} -> ${gameData.price} CHF`);
                            } else {
                                console.log(`[CronService] ℹ️  Prix déjà à jour pour ${slug}`);
                            }
                        } else {
                            console.log(`[CronService] ℹ️  Prix déjà à jour pour ${slug}`);
                        }
                    } else {
                        console.log(`[CronService] ➕ Jeu non trouvé, création: ${slug}`);
                        // Créer le jeu dans MongoDB s'il n'existe pas
                        const gameId = await Games.addGame({
                            folder_name: slug,
                            game_name: gameData.gameName || slug,
                            price: gameData.price || 0,
                            status: 'disponible',
                            description: '',
                            genre: 'Undefined',
                            max_players: 1,
                            is_multiplayer: false,
                            developer: 'Inconnu'
                        });
                        created++;
                        console.log(`[CronService] ✨ Jeu créé dans MongoDB: ${slug} (ID: ${gameId})`);
                    }
                } catch (error) {
                    console.error(`[CronService] ❌ Erreur pour ${slug}:`, error.message);
                    console.error(`[CronService] Stack trace:`, error.stack);
                }
            }

            console.log(`[CronService] ✅ Synchronisation terminée: ${updated} mis à jour, ${created} créés`);
        } catch (error) {
            console.error('[CronService] ❌ Erreur lors de la synchronisation:', error.message);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Démarre les tâches cron
     */
    start() {
        // Vérifier les nouveaux jeux toutes les 3 heures (ou selon variable d'env)
        const gameCheckCron = process.env.CRON_GAME_CHECK_INTERVAL || '0 */3 * * *';
        cron.schedule(gameCheckCron, () => {
            this.checkNewGames();
        });

        // Synchroniser MongoDB toutes les 3 heures
        cron.schedule('0 */3 * * *', () => {
            this.syncMongoDB();
        });

        // Synchroniser les items Cloudinary → MongoDB toutes les 3 heures
        cron.schedule('0 */3 * * *', () => {
            console.log('[CronService] 🏪 Démarrage sync items...');
            ItemsSyncService.syncCloudinaryToMongoDB();
        });

        console.log('[CronService] ✅ Tâches cron démarrées:');
        console.log(`   - Vérification nouveaux jeux: ${gameCheckCron}`);
        console.log('   - Synchronisation MongoDB: toutes les 3 heures');
        console.log('   - Synchronisation items: toutes les 3 heures');

        // Exécuter une première fois au démarrage (après 3 secondes pour laisser le temps au serveur de démarrer)
        setTimeout(() => {
            this.checkNewGames();
            this.syncMongoDB();
            // Sync items on startup
            ItemsSyncService.syncCloudinaryToMongoDB();
        }, 3000);
    }

    /**
     * Arrête les tâches cron
     */
    stop() {
        // Les tâches cron s'arrêtent automatiquement quand le processus se termine
        console.log('[CronService] ⏹️  Tâches cron arrêtées');
    }
}

module.exports = CronService;
