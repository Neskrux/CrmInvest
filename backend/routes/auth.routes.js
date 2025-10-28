const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticateToken } = require('../middleware/auth');
const { loginLimiter, verifyTokenLimiter } = require('../middleware/rateLimiter');

// Rotas de autenticação (caminhos relativos - /api é adicionado no index.js)
router.post('/login', loginLimiter, authController.login);
router.post('/logout', authenticateToken, authController.logout);
router.get('/verify-token', verifyTokenLimiter, authenticateToken, authController.verifyToken);
router.post('/forgot-password', loginLimiter, authController.forgotPassword);
router.post('/validate-reset-token', authController.validateResetToken);
router.post('/reset-password', authController.resetPassword);

module.exports = router;

