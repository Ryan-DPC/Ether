const Users = require('../users/user.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class AuthService {
    static async registerUser({ username, email, password }) {
        const existingUser = await Users.getUserByUsername(username);
        if (existingUser) {
            throw new Error('Le nom d\'utilisateur est déjà utilisé.');
        }

        const existingEmail = await Users.getUserByEmail(email);
        if (existingEmail) {
            throw new Error('L\'email est déjà utilisé.');
        }

        const newUser = await Users.createUser({ username, email, password });

        const token = jwt.sign(
            { id: newUser.id, username: newUser.username, isAdmin: false },
            process.env.JWT_SECRET || 'default_secret',
            { expiresIn: '24h' }
        );

        return { user: newUser, token };
    }

    static async login(username, password) {
        const user = await Users.getUserByUsername(username);
        if (!user) throw new Error('Utilisateur non trouvé.');

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) throw new Error('Mot de passe incorrect.');

        const token = jwt.sign(
            { id: user.id, username: user.username, isAdmin: user.isAdmin || false },
            process.env.JWT_SECRET || 'default_secret',
            { expiresIn: '24h' }
        );

        return { user, token };
    }

    static async logout() {
        return { message: 'Déconnexion réussie.' };
    }

    static getGithubAuthUrl() {
        const rootUrl = 'https://github.com/login/oauth/authorize';
        const options = {
            client_id: process.env.GITHUB_CLIENT_ID,
            redirect_uri: process.env.GITHUB_CALLBACK_URL,
            scope: 'user:email',
        };
        const qs = new URLSearchParams(options);
        return `${rootUrl}?${qs.toString()}`;
    }

    static async handleGithubCallback(code) {
        // 1. Exchange code for access token
        const tokenUrl = 'https://github.com/login/oauth/access_token';
        const tokenResponse = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code,
            }),
        });

        const tokenData = await tokenResponse.json();
        if (tokenData.error) {
            throw new Error(`GitHub Error: ${tokenData.error_description}`);
        }
        const accessToken = tokenData.access_token;

        // 2. Fetch user profile
        const userResponse = await fetch('https://api.github.com/user', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        const userProfile = await userResponse.json();

        // 3. Fetch user email (if not public)
        let email = userProfile.email;
        if (!email) {
            const emailResponse = await fetch('https://api.github.com/user/emails', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            const emails = await emailResponse.json();

            // Check if emails is an array before using .find()
            if (Array.isArray(emails)) {
                const primaryEmail = emails.find((e) => e.primary && e.verified);
                email = primaryEmail ? primaryEmail.email : null;
            } else {
                console.error('GitHub emails API returned non-array:', emails);
            }
        }

        if (!email) {
            throw new Error('Email not found or not verified on GitHub.');
        }

        // 4. Find or create user
        let user = await Users.getUserByGithubId(userProfile.id.toString());
        if (!user) {
            // Check if email already exists
            const existingUser = await Users.getUserByEmail(email);
            if (existingUser) {
                throw new Error('Un compte avec cet email existe déjà. Veuillez vous connecter avec votre mot de passe.');
            }

            // Create new user
            user = await Users.createUser({
                username: userProfile.login,
                email,
                github_id: userProfile.id.toString(),
                github_username: userProfile.login,
                profile_pic: userProfile.avatar_url,
                password: null,
            });
        }

        // 5. Generate JWT
        const token = jwt.sign(
            { id: user.id, username: user.username, isAdmin: user.isAdmin || false },
            process.env.JWT_SECRET || 'default_secret',
            { expiresIn: '24h' }
        );

        return { user, token };
    }
}

module.exports = AuthService;
