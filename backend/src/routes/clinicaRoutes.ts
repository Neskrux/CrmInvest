import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { 
  listClinicas, 
  createClinica, 
  getClinica, 
  updateClinica,
  getClinicaStats,
  listNovasClinicas,
  createNovaClinica,
  updateNovaClinica,
  aprovarClinica
} from '../controllers/clinicaController';
import { authenticateToken } from '../middleware/auth';
import { AuthenticatedHandler } from '../types';
import { config } from '../config/env';

// Configuração do Supabase
const supabase = createClient(config.supabaseUrl!, config.supabaseServiceKey!);

const router = Router();

// Todas as rotas de clínica requerem autenticação
router.use(authenticateToken);

// Listar clínicas
router.get('/', listClinicas as AuthenticatedHandler);

// Rotas para cidades e estados (DEVEM vir ANTES de /:id)
router.get('/cidades', async (_req, res) => {
  try {
    // Retornar lista de cidades únicas das clínicas
    const { data: clinicas, error } = await supabase
      .from('clinicas')
      .select('cidade')
      .not('cidade', 'is', null);
    
    if (error) throw error;
    
    const cidades = [...new Set(clinicas.map(c => c.cidade))].filter(Boolean);
    res.json(cidades);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar cidades' });
  }
});

router.get('/estados', async (_req, res) => {
  try {
    // Retornar lista de estados únicos das clínicas
    const { data: clinicas, error } = await supabase
      .from('clinicas')
      .select('estado')
      .not('estado', 'is', null);
    
    if (error) throw error;
    
    const estados = [...new Set(clinicas.map(c => c.estado))].filter(Boolean);
    res.json(estados);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar estados' });
  }
});

// Criar clínica
router.post('/', createClinica as AuthenticatedHandler);

// Obter clínica específica
router.get('/:id', getClinica as AuthenticatedHandler);

// Obter estatísticas da clínica
router.get('/:id/stats', getClinicaStats as AuthenticatedHandler);

// Atualizar clínica
router.put('/:id', updateClinica as AuthenticatedHandler);

// ===== ROTAS DE NOVAS CLÍNICAS =====

// Listar novas clínicas
router.get('/novas', listNovasClinicas as AuthenticatedHandler);

// Criar nova clínica
router.post('/novas', createNovaClinica as AuthenticatedHandler);

// Atualizar nova clínica
router.put('/novas/:id', updateNovaClinica as AuthenticatedHandler);

// Aprovar clínica (mover de novas_clinicas para clinicas)
router.put('/novas/:id/aprovar', aprovarClinica as AuthenticatedHandler);

export default router;
