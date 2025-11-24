const { createClient: createRedisClient } = require('redis');

class CloudinaryCacheService {
    constructor() {
        this.client = null;
        this.enabled = false;
        this.cachePrefix = 'cloudinary:manifests:';
        this.cacheTTL = 3600; // 1 hour default
        this.init();
    }

    async init() {
        if (!process.env.REDIS_URL) {
            console.log('[CloudinaryCache] Redis not configured, cache disabled');
            return;
        }

        try {
            this.client = createRedisClient({ url: process.env.REDIS_URL });
            this.client.on('error', (err) => {
                console.error('[CloudinaryCache] Redis Error:', err);
                this.enabled = false;
            });

            await this.client.connect();
            this.enabled = true;
            console.log('[CloudinaryCache] ✅ Redis Cache enabled for Cloudinary');
        } catch (error) {
            console.warn('[CloudinaryCache] ⚠️ Cannot connect to Redis, cache disabled:', error.message);
            this.enabled = false;
        }
    }

    async getManifest(folderName) {
        if (!this.enabled || !this.client) return null;

        try {
            const key = `${this.cachePrefix}manifest:${folderName}`;
            const cached = await this.client.get(key);
            if (cached) {
                return JSON.parse(cached);
            }
            return null;
        } catch (error) {
            console.error(`[CloudinaryCache] Error getting cache for ${folderName}:`, error);
            return null;
        }
    }

    async setManifest(folderName, manifest, ttl = null) {
        if (!this.enabled || !this.client) return;

        try {
            const key = `${this.cachePrefix}manifest:${folderName}`;
            const ttlToUse = ttl || this.cacheTTL;
            await this.client.setEx(key, ttlToUse, JSON.stringify(manifest));
        } catch (error) {
            console.error(`[CloudinaryCache] Error setting cache for ${folderName}:`, error);
        }
    }

    async getManifestsList() {
        if (!this.enabled || !this.client) return null;

        try {
            const key = `${this.cachePrefix}list:all`;
            const cached = await this.client.get(key);
            if (cached) {
                return JSON.parse(cached);
            }
            return null;
        } catch (error) {
            console.error('[CloudinaryCache] Error getting list cache:', error);
            return null;
        }
    }

    async setManifestsList(manifests, ttl = null) {
        if (!this.enabled || !this.client) return;

        try {
            const key = `${this.cachePrefix}list:all`;
            const ttlToUse = ttl || this.cacheTTL;
            await this.client.setEx(key, ttlToUse, JSON.stringify(manifests));
        } catch (error) {
            console.error('[CloudinaryCache] Error setting list cache:', error);
        }
    }

    async invalidateManifest(folderName) {
        if (!this.enabled || !this.client) return;

        try {
            const key = `${this.cachePrefix}manifest:${folderName}`;
            await this.client.del(key);
            await this.client.del(`${this.cachePrefix}list:all`);
        } catch (error) {
            console.error(`[CloudinaryCache] Error invalidating ${folderName}:`, error);
        }
    }

    async getGamesList() {
        if (!this.enabled || !this.client) return null;

        try {
            const key = `${this.cachePrefix}games:all`;
            const cached = await this.client.get(key);
            if (cached) {
                return JSON.parse(cached);
            }
            return null;
        } catch (error) {
            console.error('[CloudinaryCache] Error getting games list cache:', error);
            return null;
        }
    }

    async setGamesList(games, ttl = null) {
        if (!this.enabled || !this.client) return;

        try {
            const key = `${this.cachePrefix}games:all`;
            const ttlToUse = ttl || this.cacheTTL;
            await this.client.setEx(key, ttlToUse, JSON.stringify(games));
            console.log(`[CloudinaryCache] ✅ ${games.length} games cached (TTL: ${ttlToUse}s)`);
        } catch (error) {
            console.error('[CloudinaryCache] Error setting games list cache:', error);
        }
    }

    async clearAll() {
        if (!this.enabled || !this.client) return;

        try {
            const keys = await this.client.keys(`${this.cachePrefix}*`);
            if (keys.length > 0) {
                await this.client.del(keys);
                console.log(`[CloudinaryCache] ✅ ${keys.length} cache entries deleted`);
            }
        } catch (error) {
            console.error('[CloudinaryCache] Error clearing cache:', error);
        }
    }

    isEnabled() {
        return this.enabled;
    }

    async disconnect() {
        if (this.client) {
            await this.client.quit();
            this.enabled = false;
        }
    }
}

let cacheInstance = null;

function getCacheInstance() {
    if (!cacheInstance) {
        cacheInstance = new CloudinaryCacheService();
    }
    return cacheInstance;
}

module.exports = getCacheInstance;
