const express = require('express');
const router = express.Router();

// Middleware para passar io para os controllers
router.use((req, res, next) => {
  // Passar io do app.locals para req para uso nos controllers
  req.io = req.app.locals.io;
  next();
});

// Importar todas as rotas
const authRoutes = require('./auth.routes');
const usuariosRoutes = require('./usuarios.routes');
const empresasRoutes = require('./empresas.routes');
const clinicasRoutes = require('./clinicas.routes');
const consultoresRoutes = require('./consultores.routes');
const pacientesRoutes = require('./pacientes.routes');
const pacienteRoutes = require('./paciente.routes');
const agendamentosRoutes = require('./agendamentos.routes');
const fechamentosRoutes = require('./fechamentos.routes');
const dashboardRoutes = require('./dashboard.routes');
const materiaisRoutes = require('./materiais.routes');
const metasRoutes = require('./metas.routes');
const novasClinicasRoutes = require('./novas-clinicas.routes');
const pacientesFinanceiroRoutes = require('./pacientes-financeiro.routes');
const metaAdsRoutes = require('./meta-ads.routes');
const empreendimentosRoutes = require('./empreendimentos.routes');
const movimentacoesRoutes = require('./movimentacoes.routes');

// Importar rotas de APIs externas
const documentsRoutes = require('./documents.routes');
const idsfRoutes = require('./idsf.routes');
const documentosAssinadosRoutes = require('./documentos-assinados.routes');
const assinaturasAdminRoutes = require('./assinaturas-admin.routes');
const boletosGestaoRoutes = require('./boletos-gestao.routes');

// Importar rotas de solicitações de carteira ANTES das outras para evitar conflitos
const solicitacoesCarteiraRoutes = require('./solicitacoes-carteira.routes');

// Agrupar rotas
// Nota: Mantendo os caminhos originais para compatibilidade com o frontend

// Middleware de log para debug (antes de authRoutes)
router.use((req, res, next) => {
  if (req.path.includes('validar-biometria') || req.path.includes('boletos-gestao')) {
    console.log('🔍 [ROUTES-INDEX] Requisição recebida - Path:', req.path);
    console.log('🔍 [ROUTES-INDEX] URL:', req.url);
    console.log('🔍 [ROUTES-INDEX] Method:', req.method);
  }
  next();
});

// IMPORTANTE: authRoutes deve ser a PRIMEIRA rota registrada para evitar conflitos
router.use('/auth', authRoutes); // /api/auth/login, /api/auth/logout, etc.
// Também registrar na raiz para compatibilidade
router.use('/', authRoutes); // /api/login, /api/logout, etc.
router.use('/', usuariosRoutes); // /api/usuarios/perfil
router.use('/', empresasRoutes); // /api/empresas/perfil
router.use('/', clinicasRoutes); // /api/clinicas/*
router.use('/', consultoresRoutes); // /api/consultores/*
router.use('/', pacientesRoutes); // /api/pacientes/*, /api/novos-leads/*, /api/leads/*
router.use('/paciente', pacienteRoutes); // /api/paciente/boletos (rotas específicas do paciente logado)
router.use('/', agendamentosRoutes); // /api/agendamentos/*, /api/evidencias/*
router.use('/', fechamentosRoutes); // /api/fechamentos/*
router.use('/', dashboardRoutes); // /api/dashboard/*
router.use('/', materiaisRoutes); // /api/materiais/*
router.use('/', metasRoutes); // /api/metas/*
router.use('/', novasClinicasRoutes); // /api/novas-clinicas/*
router.use('/', pacientesFinanceiroRoutes); // /api/pacientes-financeiro/*
router.use('/', metaAdsRoutes); // /api/meta-ads/*
router.use('/', solicitacoesCarteiraRoutes); // /api/solicitacoes-carteira/* (ANTES de empreendimentos!)
router.use('/', empreendimentosRoutes); // /api/empreendimentos/*
router.use('/', movimentacoesRoutes); // /api/movimentacoes/*

// Rotas de APIs externas
router.use('/documents', documentsRoutes);
router.use('/idsf', idsfRoutes);
router.use('/documentos-assinados', documentosAssinadosRoutes); // /api/documentos-assinados/*
router.use('/', assinaturasAdminRoutes); // /api/assinaturas-admin/*
router.use('/', boletosGestaoRoutes); // /api/boletos-gestao/*

// Importar rotas de contratos de carteira
const contratosCarteiraRoutes = require('./contratos-carteira.routes');
router.use('/', contratosCarteiraRoutes); // /api/contratos-carteira/*

// Rotas estáticas (imagens, etc)
const staticRoutes = require('./static.routes');
router.use('/', staticRoutes);

// ✅ TODAS AS ROTAS FORAM REFATORADAS COM SUCESSO!
// O backend agora está completamente modularizado e organizado.

module.exports = router;


