const express = require('express');
const router = express.Router();
const idsfController = require('../controllers/idsf.controller');

// GET /api/idsf/test-connection - Testar conexão com IDSF
router.get('/test-connection', idsfController.testConnection);

// GET /api/idsf/clinica/:cnpj - Buscar informações de uma clínica no IDSF
router.get('/clinica/:cnpj', idsfController.getClinica);

// POST /api/idsf/clinica - Enviar dados de uma clínica para o IDSF
router.post('/clinica', idsfController.createClinica);

// PUT /api/idsf/clinica/:cnpj - Atualizar dados de uma clínica no IDSF
router.put('/clinica/:cnpj', idsfController.updateClinica);

// GET /api/idsf/financiamento/:cnpj - Buscar status de financiamento
router.get('/financiamento/:cnpj', idsfController.getFinanciamento);

// POST /api/idsf/financiamento - Solicitar financiamento
router.post('/financiamento', idsfController.createFinanciamento);

// GET /api/idsf/documentos-necessarios/:tipo - Buscar documentos necessários
router.get('/documentos-necessarios/:tipo', idsfController.getDocumentosNecessarios);

// GET /api/idsf/analise/:cnpj - Verificar status de análise
router.get('/analise/:cnpj', idsfController.getAnalise);

module.exports = router;
