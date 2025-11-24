const CloudinaryService = require('./src/services/cloudinary.service');
const DefaultImageService = require('./src/services/defaultImage.service');
const path = require('path');
const fs = require('fs');

// Mock environment variables if needed, or rely on .env
require('dotenv').config();

async function debugDefaultImage() {
    console.log('--- Debugging Default Image Upload ---');

    const cloudinary = new CloudinaryService();
    if (!cloudinary.isEnabled()) {
        console.error('Cloudinary is NOT enabled. Check CLOUDINARY_URL in .env');
        return;
    }

    console.log('Cloudinary is enabled.');
    console.log('Cloud name:', cloudinary.cloudinary.config().cloud_name);

    // 1. Check local file
    const localPath = path.resolve(__dirname, '../frontend/public/games/default-game.png');
    console.log('Checking local file at:', localPath);
    if (fs.existsSync(localPath)) {
        const stats = fs.statSync(localPath);
        console.log(`Local file exists. Size: ${stats.size} bytes`);
    } else {
        console.error('Local file does NOT exist!');
        return;
    }

    // 2. Force Upload
    console.log('Attempting to force upload...');
    try {
        await DefaultImageService.ensureDefaultImage();
        console.log('DefaultImageService.ensureDefaultImage() execution completed.');
    } catch (error) {
        console.error('Error in ensureDefaultImage:', error);
    }

    // 3. Verify on Cloudinary
    console.log('Verifying resource on Cloudinary...');
    try {
        const result = await cloudinary.api.resource('games/default-game');
        console.log('Resource found on Cloudinary!');
        console.log('Public ID:', result.public_id);
        console.log('URL:', result.secure_url);
        console.log('Format:', result.format);
        console.log('Width:', result.width);
        console.log('Height:', result.height);
    } catch (error) {
        console.error('Resource NOT found on Cloudinary:', error.message);
    }
}

debugDefaultImage();
