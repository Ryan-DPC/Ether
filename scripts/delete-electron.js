const fs = require('fs');
const path = require('path');

const folders = [
    path.join(__dirname, '../frontend/electron'),
    path.join(__dirname, '../frontend/release'),
    path.join(__dirname, '../frontend/build')
];

folders.forEach(folder => {
    if (fs.existsSync(folder)) {
        console.log(`Deleting ${folder}...`);
        try {
            fs.rmSync(folder, { recursive: true, force: true });
            console.log(`Successfully deleted ${folder}`);
        } catch (e) {
            console.error(`Failed to delete ${folder}:`, e.message);
        }
    } else {
        console.log(`${folder} does not exist.`);
    }
});
