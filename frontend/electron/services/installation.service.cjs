const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const { spawn } = require('child_process');

class InstallationService {
    constructor() {
        this.activeDownloads = new Map();
    }

    /**
     * Download a game ZIP from a URL
     */
    async downloadGame(zipUrl, destPath, onProgress) {
        console.log(`[Installation] Downloading from ${zipUrl} to ${destPath}`);
        const dir = path.dirname(destPath);
        await fs.mkdir(dir, { recursive: true });

        const response = await axios({
            method: 'get',
            url: zipUrl,
            responseType: 'stream',
            headers: { 'User-Agent': 'EtherLauncher/1.0' },
            onDownloadProgress: (progressEvent) => {
                const total = progressEvent.total || 0;
                const downloaded = progressEvent.loaded || 0;
                const progress = total > 0 ? Math.round((downloaded / total) * 100) : 0;
                if (typeof onProgress === 'function') onProgress({ type: 'download', progress });
            }
        });

        const writer = require('fs').createWriteStream(destPath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => resolve(destPath));
            writer.on('error', reject);
        });
    }

    /**
     * Extract ZIP using PowerShell
     */
    async extractGame(zipPath, extractPath, onProgress) {
        console.log(`[Installation] Extracting ${zipPath} to ${extractPath}`);
        await fs.mkdir(extractPath, { recursive: true });

        return new Promise((resolve, reject) => {
            const powershell = spawn('powershell.exe', [
                '-NoProfile', '-NonInteractive', '-Command',
                `Expand-Archive -LiteralPath "${zipPath}" -DestinationPath "${extractPath}" -Force`
            ]);

            powershell.on('close', (code) => {
                if (code === 0) {
                    if (typeof onProgress === 'function') onProgress({ type: 'extract', progress: 100 });
                    resolve(extractPath);
                } else {
                    reject(new Error(`Extraction failed with code ${code}`));
                }
            });
            powershell.on('error', reject);
        });
    }

    /**
     * Main Install Flow
     * 1. Download ZIP
     * 2. Extract
     * 3. Verify manifest.json exists
     */
    async installGame(zipUrl, installPath, gameFolderName, onProgress) {
        const gamePath = path.join(installPath, 'Ether', gameFolderName);
        const zipPath = path.join(gamePath, 'game.zip');

        try {
            // 1. Download
            await this.downloadGame(zipUrl, zipPath, onProgress);

            // 2. Extract
            await this.extractGame(zipPath, gamePath, onProgress);

            // 3. Cleanup ZIP
            await fs.unlink(zipPath);

            // 4. Verify Manifest (Strict Rule)
            const manifestPath = path.join(gamePath, 'manifest.json');
            try {
                await fs.access(manifestPath);
            } catch (e) {
                throw new Error('Invalid Game: manifest.json is missing at root.');
            }

            console.log(`[Installation] Success: ${gameFolderName}`);
            return { success: true, path: gamePath };

        } catch (error) {
            console.error('[Installation] Failed:', error);
            // Cleanup on failure
            try { await fs.rm(gamePath, { recursive: true, force: true }); } catch (e) { }
            throw error;
        }
    }

    async uninstallGame(installPath, gameFolderName) {
        const gamePath = path.join(installPath, 'Ether', gameFolderName);
        await fs.rm(gamePath, { recursive: true, force: true });
        return true;
    }

    async isGameInstalled(installPath, gameFolderName) {
        try {
            const manifestPath = path.join(installPath, 'Ether', gameFolderName, 'manifest.json');
            await fs.access(manifestPath);
            return true;
        } catch (e) {
            return false;
        }
    }
}

module.exports = new InstallationService();
