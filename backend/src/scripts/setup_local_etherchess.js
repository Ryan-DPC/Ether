const path = require('path');
const fs = require('fs');
const archiver = require('archiver');

// Configuration
const GAME_NAME = 'Ether Chess';
const GAME_VERSION = '1.0.0';
const DIST_DIR = path.resolve(__dirname, '../../../games/EtherChess/dist');
const PUBLIC_GAMES_DIR = path.resolve(__dirname, '../../public/games');
const OUTPUT_ZIP = path.join(PUBLIC_GAMES_DIR, 'etherchess.zip');

const createManifest = () => {
    const manifest = {
        id: "ether-chess",
        name: GAME_NAME,
        version: GAME_VERSION,
        description: "A classic chess game for Ether.",
        entry: "EtherChess.exe",
        platform: "exe",
        minWidth: 1280,
        minHeight: 720
    };
    fs.writeFileSync(path.join(DIST_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
    console.log('✅ Created manifest.json in dist');
};

const createZip = () => {
    return new Promise((resolve, reject) => {
        // Ensure public/games exists
        if (!fs.existsSync(PUBLIC_GAMES_DIR)) {
            fs.mkdirSync(PUBLIC_GAMES_DIR, { recursive: true });
        }

        const output = fs.createWriteStream(OUTPUT_ZIP);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
            console.log(`✅ Created zip at ${OUTPUT_ZIP} (${archive.pointer()} bytes)`);
            resolve();
        });

        archive.on('error', (err) => reject(err));

        archive.pipe(output);
        archive.directory(DIST_DIR, false); // false = put contents at root
        archive.finalize();
    });
};

const run = async () => {
    try {
        console.log(`🚀 Setting up ${GAME_NAME} locally...`);

        if (!fs.existsSync(DIST_DIR)) {
            throw new Error(`Dist directory not found: ${DIST_DIR}`);
        }

        // 1. Create Manifest
        createManifest();

        // 2. Zip Game to Public Folder
        console.log('📦 Zipping game files to public folder...');
        await createZip();

        console.log('✨ Local Setup Complete!');

    } catch (e) {
        console.error('Fatal Error:', e);
    }
};

run();
