const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const https = require('https');
const { spawn } = require('child_process');

class InstallationService {
    constructor() {
        this.activeDownloads = new Map();
    }

    /**
     * Download a game ZIP from a URL using native Node.js https
     */
    async downloadGame(zipUrl, destPath, onProgress) {
        console.log(`[Installation] Downloading from ${zipUrl} to ${destPath}`);
        const dir = path.dirname(destPath);
        await fsPromises.mkdir(dir, { recursive: true });

        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(destPath);
            const request = https.get(zipUrl, {
                headers: { 'User-Agent': 'EtherLauncher/1.0' }
            }, (response) => {
                // Handle redirects
                if (response.statusCode === 301 || response.statusCode === 302) {
                    file.close();
                    return this.downloadGame(response.headers.location, destPath, onProgress)
                        .then(resolve)
                        .catch(reject);
                }

                if (response.statusCode !== 200) {
                    file.close();
                    fs.unlink(destPath, () => { }); // Verify deletion
                    return reject(new Error(`Download failed with status code: ${response.statusCode}`));
                }

                const total = parseInt(response.headers['content-length'], 10);
                let downloaded = 0;

                response.on('data', (chunk) => {
                    downloaded += chunk.length;
                    file.write(chunk);

                    if (total) {
                        const progress = Math.round((downloaded / total) * 100);
                        if (typeof onProgress === 'function') {
                            onProgress({ type: 'download', progress });
                        }
                    }
                });

                response.on('end', () => {
                    file.end();
                    resolve(destPath);
                });
            });

            request.on('error', (err) => {
                file.close();
                fs.unlink(destPath, () => { });
                reject(err);
            });

            file.on('error', (err) => {
                file.close();
                fs.unlink(destPath, () => { });
                reject(err);
            });
        });
    }

    /**
     * Extract ZIP using PowerShell
     */
    async extractGame(zipPath, extractPath, onProgress) {
        console.log(`[Installation] Extracting ${zipPath} to ${extractPath}`);
        await fsPromises.mkdir(extractPath, { recursive: true });

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
            await fsPromises.unlink(zipPath);

            // 4. Verify Manifest (Strict Rule)
            const manifestPath = path.join(gamePath, 'manifest.json');
            try {
                await fsPromises.access(manifestPath);
            } catch (e) {
                throw new Error('Invalid Game: manifest.json is missing at root.');
            }

            console.log(`[Installation] Success: ${gameFolderName}`);
            return { success: true, path: gamePath };

        } catch (error) {
            console.error('[Installation] Failed:', error);
            // Cleanup on failure
            try { await fsPromises.rm(gamePath, { recursive: true, force: true }); } catch (e) { }
            throw error;
        }
    }

    async uninstallGame(installPath, gameFolderName) {
        const gamePath = path.join(installPath, 'Ether', gameFolderName);
        await fsPromises.rm(gamePath, { recursive: true, force: true });
        return true;
    }

    async isGameInstalled(installPath, gameFolderName) {
        try {
            const manifestPath = path.join(installPath, 'Ether', gameFolderName, 'manifest.json');
            await fsPromises.access(manifestPath);
            return true;
        } catch (e) {
            return false;
        }
    }
}

module.exports = new InstallationService();
