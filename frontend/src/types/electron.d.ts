// TypeScript definitions for Electron API exposed via preload

export interface ElectronAPI {
    // Folder picker
    selectFolder: () => Promise<string | null>;

    // App info
    getVersion: () => Promise<string>;
    getPath: (name: string) => Promise<string>;
    isElectron: () => Promise<boolean>;

    // Installation

declare global {
    interface Window {
        electronAPI?: ElectronAPI;
    }
}

export { };
