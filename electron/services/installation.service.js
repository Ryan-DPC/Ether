const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const AdmZip = require('adm-zip');

class InstallationService {
    constructor() {
        this.activeDownloads = new Map(); // Track active downloads
    }

    /**
     * Download a game ZIP from Cloudinary
     * @param {string} zipUrl - Cloudinary ZIP URL
     * @param {string} destPath - Destination file path (e.g., C:/Games/Ether/game.zip)
     * @param {Function} onProgress - Progress callback (progress, speed, downloaded, total, eta)
     * @returns {Promise<string>} Downloaded file path
     */
    async downloadGame(zipUrl, destPath, onProgress) {
        console.log(`[Installation] Downloading from ${zipUrl} to ${destPath}`);

        // Create directory if it doesn't exist
        const dir = path.dirname(destPath);
        await fs.mkdir(dir, { recursive: true });

        const response = await axios({
            method: 'get',
            url: zipUrl,
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': '*/*',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive'
            },
            onDownloadProgress: (progressEvent) => {
                const total = progressEvent.total || 0;
                const downloaded = progressEvent.loaded || 0;
                const progress = total > 0 ? Math.round((downloaded / total) * 100) : 0;

                // Calculate speed and ETA
                const currentTime = Date.now();
                if (!this.downloadStart) {
                    this.downloadStart = currentTime;
                }

                const elapsed = (currentTime - this.downloadStart) / 1000; // seconds
                const speed = elapsed > 0 ? downloaded / elapsed : 0; // bytes/sec
                const remaining = total - downloaded;
                const eta = speed > 0 ? remaining / speed : 0; // seconds

                // Format values
                const speedMBps = (speed / 1024 / 1024).toFixed(2);
                const downloadedMB = (downloaded / 1024 / 1024).toFixed(2);
                const totalMB = (total / 1024 / 1024).toFixed(2);
                const etaMin = Math.floor(eta / 60);
                const etaSec = Math.floor(eta % 60);

                if (onProgress) {
                    onProgress({
                        type: 'download',
                        progress,
                        speed: `${speedMBps} MB/s`,
                        downloaded: `${downloadedMB} MB`,
                        total: `${totalMB} MB`,
                        eta: etaMin > 0 ? `${etaMin}m ${etaSec}s` : `${etaSec}s`
                    });
                }
            }
        });

        // Write to file
        const writer = require('fs').createWriteStream(destPath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                console.log(`[Installation] Download complete: ${destPath}`);
                this.downloadStart = null;
                resolve(destPath);
            });
            writer.on('error', reject);
        });
    }

    /**
     * Extract a ZIP file
     * @param {string} zipPath - Path to ZIP file
     * @param {string} extractPath - Destination folder
     * @param {Function} onProgress - Progress callback
     * @returns {Promise<string>} Extract path
     */
    async extractGame(zipPath, extractPath, onProgress) {
        console.log(`[Installation] Extracting ${zipPath} to ${extractPath}`);

        return new Promise((resolve, reject) => {
            try {
                const zip = new AdmZip(zipPath);
                const entries = zip.getEntries();
                const totalEntries = entries.length;
                let extractedCount = 0;

                // Extract all files
                zip.extractAllToAsync(extractPath, true, (error) => {
                    if (error) {
                        console.error('[Installation] Extraction error:', error);
                        return reject(error);
                    }

                    console.log(`[Installation] Extraction complete: ${extractPath}`);

                    if (onProgress) {
                        onProgress({
                            type: 'extract',
                            progress: 100
                        });
                    }

                    resolve(extractPath);
                });

                // Report progress during extraction
                const interval = setInterval(() => {
                    extractedCount++;
                    const progress = Math.min(Math.round((extractedCount / totalEntries) * 100), 99);

                    if (onProgress) {
                        onProgress({
                            type: 'extract',
                            progress
                        });
                    }

                    if (extractedCount >= totalEntries) {
                        clearInterval(interval);
                    }
                }, 50);

            } catch (error) {
                console.error('[Installation] Extraction error:', error);
                reject(error);
            }
        });
    }

    /**
     * Validate installation by checking if key files exist
     * @param {string} gamePath - Game installation path
     * @returns {Promise<boolean>} True if valid
     */
    async validateInstallation(gamePath) {
        try {
            // Check if directory exists
            const stats = await fs.stat(gamePath);
            if (!stats.isDirectory()) {
                return false;
            }

            // Check if there are any files
            const files = await fs.readdir(gamePath);
            if (files.length === 0) {
                return false;
            }

            console.log(`[Installation] Validation passed: ${gamePath}`);
            return true;
        } catch (error) {
            console.error('[Installation] Validation failed:', error);
            return false;
        }
    }

    /**
     * Delete downloaded ZIP file after successful extraction
     * @param {string} zipPath - Path to ZIP file
     */
    async cleanup(zipPath) {
        try {
            await fs.unlink(zipPath);
            console.log(`[Installation] Cleaned up ZIP: ${zipPath}`);
        } catch (error) {
            console.warn('[Installation] Cleanup failed:', error.message);
        }
    }

    /**
     * Full installation process
     * @param {string} zipUrl - Game ZIP URL
     * @param {string} installPath - Base install path (e.g., C:/Games/Ether)
     * @param {string} gameFolderName - Game folder name (e.g., spludbuster)
     * @param {Function} onProgress - Progress callback
     * @returns {Promise<object>} Installation result
     */
    async installGame(zipUrl, installPath, gameFolderName, onProgress) {
        // Ensure we install inside an 'Ether' directory
        const gamePath = path.join(installPath, 'Ether', gameFolderName);
        const zipPath = path.join(gamePath, 'game.zip');

        try {
            // Step 1: Download
            await this.downloadGame(zipUrl, zipPath, onProgress);

            // Step 2: Extract
            await this.extractGame(zipPath, gamePath, onProgress);

            // Step 3: Validate
            const isValid = await this.validateInstallation(gamePath);
            if (!isValid) {
                throw new Error('Installation validation failed');
            }

            // Step 4: Cleanup
            await this.cleanup(zipPath);

            return {
                success: true,
                path: gamePath
            };
        } catch (error) {
            console.error('[Installation] Install failed:', error);
            throw error;
        }
    }
    /**
     * Check if a game is installed
     * @param {string} installPath - Base install path
     * @param {string} gameFolderName - Game folder name
     * @returns {Promise<boolean>} True if installed
     */
    async isGameInstalled(installPath, gameFolderName) {
        try {
            const gamePath = path.join(installPath, 'Ether', gameFolderName);
            const stats = await fs.stat(gamePath);
            return stats.isDirectory();
        } catch (error) {
            return false;
        }
    }

    /**
     * Uninstall a game (delete folder)
     * @param {string} installPath - Base install path
     * @param {string} gameFolderName - Game folder name
     * @returns {Promise<boolean>} True if success
     */
    async uninstallGame(installPath, gameFolderName) {
        try {
            const gamePath = path.join(installPath, 'Ether', gameFolderName);
            console.log(`[Installation] Uninstalling (deleting) ${gamePath}`);

            await fs.rm(gamePath, { recursive: true, force: true });
            return true;
        } catch (error) {
            console.error('[Installation] Uninstall failed:', error);
            throw error;
        }
    }
}

module.exports = new InstallationService();
