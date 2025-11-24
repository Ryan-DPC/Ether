const https = require('https');
const fs = require('fs');

const url = 'https://res.cloudinary.com/dp2ehihtw/raw/upload/games/dev/spludbuster/spludbuster.zip';
const dest = 'test_download.zip';

console.log(`Downloading ${url}...`);

const file = fs.createWriteStream(dest);
const request = https.get(url, {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
}, function (response) {
    console.log('Status:', response.statusCode);
    console.log('Headers:', response.headers);

    if (response.statusCode !== 200) {
        console.error('Download failed.');
        return;
    }

    response.pipe(file);

    file.on('finish', function () {
        file.close(() => {
            console.log('Download completed.');
        });
    });
}).on('error', function (err) { // Handle errors
    fs.unlink(dest, () => { }); // Delete the file async. (But we don't check the result)
    console.error('Error:', err.message);
});
