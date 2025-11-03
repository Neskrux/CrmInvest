const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticateToken } = require('../middleware/auth');
const { loginLimiter, verifyTokenLimiter } = require('../middleware/rateLimiter');

// Middleware de log para TODAS as requisições no authRoutes
router.use((req, res, next) => {
  if (req.path.includes('validar-biometria')) {
    console.log('🔍 [AUTH-ROUTES] Requisição chegou no authRoutes');
    console.log('🔍 [AUTH-ROUTES] Method:', req.method);
    console.log('🔍 [AUTH-ROUTES] Path:', req.path);
    console.log('🔍 [AUTH-ROUTES] URL:', req.url);
  }
  next();
});

// Middleware de log para debug (apenas para validar-biometria)
router.use('/validar-biometria', (req, res, next) => {
  console.log('🔍 [ROUTER] Requisição chegou em /validar-biometria');
  console.log('🔍 [ROUTER] Method:', req.method);
  console.log('🔍 [ROUTER] Path:', req.path);
  console.log('🔍 [ROUTER] URL:', req.url);
  next();
});

// Rotas de autenticação (caminhos relativos - /api é adicionado no index.js)
router.post('/login', loginLimiter, authController.login);
router.post('/logout', authenticateToken, authController.logout);
router.get('/verify-token', verifyTokenLimiter, authenticateToken, authController.verifyToken);
router.post('/forgot-password', loginLimiter, authController.forgotPassword);
router.post('/validate-reset-token', authController.validateResetToken);
router.post('/reset-password', authController.resetPassword);
router.post('/validar-biometria', loginLimiter, authController.validarBiometria); // Endpoint público para primeiro login

// TEMPORÁRIO: Endpoint para resetar biometria (REMOVER EM PRODUÇÃO!)
if (process.env.NODE_ENV === 'development') {
  router.post('/reset-biometria/:pacienteId', async (req, res) => {
    try {
      const { pacienteId } = req.params;
      const { supabaseAdmin } = require('../config/database');
      
      const { data, error } = await supabaseAdmin
        .from('pacientes')
        .update({
          biometria_aprovada: false,
          biometria_aprovada_em: null,
          biometria_erro: null
        })
        .eq('id', pacienteId)
        .select();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.json({ 
        success: true, 
        message: `Biometria resetada para paciente ID ${pacienteId}`,
        paciente: data[0]
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

module.exports = router;

