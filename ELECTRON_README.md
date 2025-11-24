# Ether - Desktop App Mode

## Running in Electron (Desktop Mode)

### Prerequisites
Make sure backend and WebSocket server are running:
```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - WebSocket Server
cd server
npm start
```

### Development Mode
```bash
# Run Electron app in development mode
npm run dev:electron
```

This will:
1. Start the Vite dev server (http://localhost:5173)
2. Wait for it to be ready
3. Launch Electron window pointing to the dev server
4. Enable hot-reload for development

### Production Build
```bash
# Build the desktop app
npm run build:electron
```

The installer will be created in `dist-electron/` directory.

## Features Available in Desktop Mode

### Native Folder Picker
- ✅ Use Windows native folder selection dialog
- ✅ Browse button appears automatically in Electron mode
- ✅ Fallback to manual input if needed

### File System Access
- ✅ Full access to local file system
- ✅ Can  download and install games locally
- ✅ Direct path to installation folders

## Architecture

```
Ether/
├── electron/          # Electron main process
│   ├── main.js       # App window & IPC handlers
│   └── preload.js    # Secure bridge to renderer
├── frontend/         # Vue app (renderer process)
├── backend/          # Express API server
└── server/           # WebSocket server
```

The desktop app runs the Vue frontend in Electron, while backend and WebSocket server remain as separate processes running on localhost.
