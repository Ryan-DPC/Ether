const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const CloudinaryService = require(path.join(__dirname, '../services/cloudinary.service'));
const fs = require('fs');

async function uploadCover() {
    const args = process.argv.slice(2);

    if (args.length < 2) {
        console.log('Usage: node src/scripts/upload_cover.js <gameId> <imagePath>');
        console.log('Example: node src/scripts/upload_cover.js ether-chess ./my-cover.png');
        process.exit(1);
    }

    const gameId = args[0];
    const imagePath = args[1];

    if (!fs.existsSync(imagePath)) {
        console.error(`❌ Error: Image file not found at ${imagePath}`);
        process.exit(1);
    }

    console.log(`🚀 Uploading cover for game: ${gameId}`);
    console.log(`📁 Image: ${imagePath}`);

    try {
        const cloudinaryService = new CloudinaryService();

        if (!cloudinaryService.isEnabled()) {
            console.error('❌ Error: Cloudinary is not configured in .env');
            process.exit(1);
        }

        // Upload to games/{gameId}/cover
        // CloudinaryService.uploadFile(filePath, publicId, options)
        const publicId = `games/${gameId}/cover`; // This will result in games/ether-chess/cover

        const result = await cloudinaryService.uploadFile(imagePath, publicId, {
            folder: `games/${gameId}`, // Redundant if publicId contains slashes but harmless
            resource_type: 'image'
        });

        console.log('\n✅ Upload Successful!');
        console.log(`🔗 URL: ${result.url}`);
        console.log(`🆔 Public ID: ${result.publicId}`);
        console.log('\nThe launcher will now automatically pick this up as the game cover.');

    } catch (error) {
        console.error('\n❌ Upload Failed:', error.message);
        process.exit(1);
    }
}

uploadCover();
