const express = require('express');
const router = express.Router();
const AuthController = require('./auth.controller');
const verifyToken = require('../../middleware/auth');

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/logout', verifyToken, AuthController.logout);

router.get('/github', AuthController.githubLogin);
router.get('/github/callback', AuthController.githubCallback);

module.exports = router;
