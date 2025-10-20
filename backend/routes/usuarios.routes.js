const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuarios.controller');
const { authenticateToken } = require('../middleware/auth');

// Rotas de usuários
router.put('/usuarios/perfil', authenticateToken, usuariosController.updatePerfil);
router.get('/usuarios/perfil', authenticateToken, usuariosController.getPerfil);

module.exports = router;

