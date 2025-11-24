const fs = require('fs');
const path = require('path');
const https = require('https');
const cloudinary = require('cloudinary').v2;
const axios = require('axios');

// Load env from backend/.env
const envPath = path.join(__dirname, 'backend', '.env');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
}

if (!process.env.CLOUDINARY_URL) {
    console.error('❌ CLOUDINARY_URL not found in backend/.env');
    process.exit(1);
}

console.log('✅ Loaded CLOUDINARY_URL');

// Explicitly configure Cloudinary
const cloudinaryUrl = process.env.CLOUDINARY_URL;
if (cloudinaryUrl) {
    const match = cloudinaryUrl.match(/cloudinary:\/\/([^:]+):([^@]+)@(.+)/);
    if (match) {
        cloudinary.config({
            cloud_name: match[3],
            api_key: match[1],
            api_secret: match[2],
            secure: true
        });
        console.log(`✅ Cloudinary configured for cloud: ${match[3]}`);
    } else {
        console.error('❌ Invalid CLOUDINARY_URL format');
        process.exit(1);
    }
} else {
    console.error('❌ CLOUDINARY_URL is missing');
    process.exit(1);
}

const PUBLIC_ID = 'games/dev/spludbuster/spludbuster.zip';

async function testUrl(name, url) {
    console.log(`\nTesting ${name}:`);
    console.log(`URL: ${url}`);
    try {
        const response = await axios.head(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        console.log(`✅ Status: ${response.status}`);
        return true;
    } catch (error) {
        console.log(`❌ Status: ${error.response ? error.response.status : error.message}`);
        if (error.response && error.response.headers['x-cld-error']) {
            console.log(`   Error: ${error.response.headers['x-cld-error']}`);
        }
        return false;
    }
}

async function run() {
    try {
        // 1. Get Resource Details
        console.log('Fetching resource details...');
        const details = await cloudinary.api.resource(PUBLIC_ID, { resource_type: 'raw' });
        console.log('Resource Details:', {
            public_id: details.public_id,
            version: details.version,
            type: details.type,
            resource_type: details.resource_type
        });

        const version = details.version;
        const config = cloudinary.config();

        // Strategy 1: Standard Signed URL (s--...--)
        const url1 = cloudinary.url(PUBLIC_ID, {
            resource_type: 'raw',
            type: 'upload',
            version: version,
            sign_url: true,
            secure: true
        });
        await testUrl('Strategy 1: Standard Signed URL', url1);

        // Strategy 2: Auth Token (Exact Path)
        const url2Base = cloudinary.url(PUBLIC_ID, {
            resource_type: 'raw',
            type: 'upload',
            version: version,
            sign_url: false,
            secure: true
        });
        const url2Obj = new URL(url2Base);
        const token2 = cloudinary.utils.generate_auth_token({
            key: config.api_key,
            acl: url2Obj.pathname,
            duration: 3600
        });
        const url2 = `${url2Base}?token=${token2}`;
        await testUrl('Strategy 2: Auth Token (Exact Path)', url2);

        // Strategy 3: Auth Token (Wildcard)
        const token3 = cloudinary.utils.generate_auth_token({
            key: config.api_key,
            acl: '/dp2ehihtw/raw/upload/*',
            duration: 3600
        });
        const url3 = `${url2Base}?token=${token3}`;
        await testUrl('Strategy 3: Auth Token (Wildcard)', url3);

        // Strategy 4: Private Download URL (if it was private)
        const url4 = cloudinary.utils.private_download_url(PUBLIC_ID, 'zip', {
            resource_type: 'raw',
            type: 'upload', // Try with upload type but private signer
            expires_at: Math.floor(Date.now() / 1000) + 3600
        });
        await testUrl('Strategy 4: Private Download Helper', url4);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

run();
