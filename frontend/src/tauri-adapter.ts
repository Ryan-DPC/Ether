import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';



// Define the interface match existing usage if possible, or just strict typing
interface ElectronAPI {
    selectFolder: () => Promise<string | null>;
    isElectron: () => Promise<boolean>;
    installGame: (downloadUrl: string, installPath: string, folderName: string, gameId: string, gameName: string, version: string, manifest: any) => Promise<any>;
    checkGameInstalled: (installPath: string, folderName: string) => Promise<boolean>;
    uninstallGame: (installPath: string, folderName: string) => Promise<boolean>;
    launchGame: (installPath: string, folderName: string, userData: any) => Promise<any>;
    onInstallProgress: (callback: (data: any) => void) => void;
    onInstallComplete: (callback: (data: any) => void) => void;
    onInstallError: (callback: (data: any) => void) => void;
    onGameStatus: (callback: (data: any) => void) => void;
    onGameExited: (callback: (data: any) => void) => void;
}

const electronAPI: ElectronAPI = {
    // ... existing methods ...
    selectFolder: async () => {
        const selected = await invoke('select_folder');
        return selected as string | null;
    },
    isElectron: () => Promise.resolve(true), // Maintain compatibility with existing logic

    installGame: async (downloadUrl, installPath, folderName, gameId, gameName, _version, _manifest) => {
        try {
            return await invoke('install_game', {
                downloadUrl,
                installPath,
                folderName,
                gameId,
                gameName
            });
        } catch (e: any) {
            // Replicate Electron behavior: invoke throws, but we might want to trigger the error listener if components rely on it
            // The original electron code did both (throw and send event).
            // But usually invoke rejection is enough if component handles it.
            // For safety, let's just let it throw.
            throw e;
        }
    },

    checkGameInstalled: (installPath, folderName) =>
        invoke('is_game_installed', { installPath, folderName }),

    uninstallGame: (installPath, folderName) =>
        invoke('uninstall_game', { installPath, folderName }),

    launchGame: (installPath, folderName, userData) =>
        invoke('launch_game', { installPath, folderName, userData }),

    onInstallProgress: (callback) => {
        listen('install:progress', (event: any) => {
            callback(event.payload);
        });
    },
    onInstallComplete: (callback) => {
        listen('install:complete', (event: any) => {
            callback(event.payload);
        });
    },
    onInstallError: (callback) => {
        // Rust might not emit this specific event, usually we rely on invoke promise rejection.
        // But if we want to simulate it from Rust, we should have emitted it.
        // For now, let's leave it compatible but might not trigger if only promise rejects.
        listen('install:error', (event: any) => {
            callback(event.payload);
        });
    },
    onGameStatus: (callback) => {
        listen('game:status', (event: any) => {
            callback(event.payload);
        });
    },
    onGameExited: (callback) => {
        listen('game:exited', (event: any) => {
            callback(event.payload);
        });
    }
};

// Polyfill window.electronAPI
// @ts-ignore
window.electronAPI = electronAPI;

export default electronAPI;
