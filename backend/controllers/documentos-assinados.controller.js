const { supabaseAdmin } = require('../config/database');
const crypto = require('crypto');

// Salvar documento assinado
const salvarDocumentoAssinado = async (req, res) => {
  try {
    const { 
      nome, 
      assinante, 
      documento, 
      hashSHA1, 
      chaveValidacao, 
      dataAssinatura,
      ip_assinatura,
      dispositivo_info,
      hash_anterior,
      auditoria_log
    } = req.body;
    
    const usuarioId = req.user?.id || null;

    if (!nome || !assinante || !documento || !hashSHA1 || !chaveValidacao) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    }

    // Validar formato do hash SHA1
    if (!/^[A-F0-9]{40}$/.test(hashSHA1)) {
      return res.status(400).json({ error: 'Hash SHA1 inválido' });
    }

    // Obter IP do cliente se não fornecido
    const ipCliente = ip_assinatura || req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'desconhecido';

    const { data, error } = await supabaseAdmin
      .from('documentos_assinados')
      .insert({
        nome,
        assinante,
        documento,
        hash_sha1: hashSHA1,
        chave_validacao: chaveValidacao,
        data_assinatura: dataAssinatura || new Date().toISOString(),
        usuario_id: usuarioId,
        ip_assinatura: ipCliente,
        dispositivo_info: dispositivo_info || null,
        hash_anterior: hash_anterior || null,
        auditoria_log: auditoria_log || [{
          tipo: 'criacao',
          data: new Date().toISOString(),
          ip: ipCliente,
          dispositivo: dispositivo_info || null
        }],
        integridade_status: 'nao_verificado',
        validade_juridica: 'simples'
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao salvar documento assinado:', error);
      
      // Se for erro de duplicata, retornar sucesso (documento já existe)
      if (error.code === '23505') {
        return res.status(200).json({ 
          message: 'Documento já cadastrado',
          data: { chave_validacao: chaveValidacao }
        });
      }
      
      return res.status(500).json({ error: 'Erro ao salvar documento assinado' });
    }

    res.status(201).json({ 
      message: 'Documento salvo com sucesso',
      data 
    });
  } catch (error) {
    console.error('Erro ao salvar documento assinado:', error);
    res.status(500).json({ error: 'Erro interno ao salvar documento' });
  }
};

// Validar documento por chave
const validarDocumento = async (req, res) => {
  try {
    const { k } = req.query; // chave de validação

    if (!k) {
      return res.status(400).json({ error: 'Chave de validação não fornecida' });
    }

    const { data, error } = await supabaseAdmin
      .from('documentos_assinados')
      .select('*')
      .eq('chave_validacao', k)
      .single();

    if (error || !data) {
      return res.status(404).json({ 
        valido: false,
        error: 'Documento não encontrado ou chave inválida' 
      });
    }

    // Registrar validação no log
    const auditoriaLog = data.auditoria_log || [];
    auditoriaLog.push({
      tipo: 'validacao_por_chave',
      data: new Date().toISOString(),
      ip: req.ip || req.headers['x-forwarded-for'] || 'desconhecido',
      userAgent: req.headers['user-agent']
    });

    await supabaseAdmin
      .from('documentos_assinados')
      .update({ auditoria_log: auditoriaLog })
      .eq('id', data.id);

    res.json({
      valido: true,
      documento: {
        nome: data.nome,
        assinante: data.assinante,
        documento: data.documento,
        hashSHA1: data.hash_sha1,
        dataAssinatura: data.data_assinatura,
        integridadeStatus: data.integridade_status || 'nao_verificado'
      }
    });
  } catch (error) {
    console.error('Erro ao validar documento:', error);
    res.status(500).json({ error: 'Erro interno ao validar documento' });
  }
};

// Validar documento por hash SHA1
const validarDocumentoPorHash = async (req, res) => {
  try {
    const { hash } = req.query;

    if (!hash) {
      return res.status(400).json({ error: 'Hash SHA1 não fornecido' });
    }

    const { data, error } = await supabaseAdmin
      .from('documentos_assinados')
      .select('*')
      .eq('hash_sha1', hash.toUpperCase())
      .single();

    if (error || !data) {
      return res.status(404).json({ 
        valido: false,
        error: 'Documento não encontrado ou hash inválido' 
      });
    }

    // Registrar validação no log
    const auditoriaLog = data.auditoria_log || [];
    auditoriaLog.push({
      tipo: 'validacao_por_hash',
      data: new Date().toISOString(),
      ip: req.ip || req.headers['x-forwarded-for'] || 'desconhecido',
      userAgent: req.headers['user-agent']
    });

    await supabaseAdmin
      .from('documentos_assinados')
      .update({ auditoria_log: auditoriaLog })
      .eq('id', data.id);

    res.json({
      valido: true,
      documento: {
        nome: data.nome,
        assinante: data.assinante,
        documento: data.documento,
        hashSHA1: data.hash_sha1,
        chaveValidacao: data.chave_validacao,
        dataAssinatura: data.data_assinatura,
        integridadeStatus: data.integridade_status || 'nao_verificado'
      }
    });
  } catch (error) {
    console.error('Erro ao validar documento por hash:', error);
    res.status(500).json({ error: 'Erro interno ao validar documento' });
  }
};

// Listar documentos assinados do usuário
const listarDocumentosAssinados = async (req, res) => {
  try {
    const usuarioId = req.user?.id;

    if (!usuarioId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const { data, error } = await supabaseAdmin
      .from('documentos_assinados')
      .select('*')
      .eq('usuario_id', usuarioId)
      .order('data_assinatura', { ascending: false });

    if (error) {
      console.error('Erro ao listar documentos:', error);
      return res.status(500).json({ error: 'Erro ao listar documentos' });
    }

    res.json({ documentos: data || [] });
  } catch (error) {
    console.error('Erro ao listar documentos assinados:', error);
    res.status(500).json({ error: 'Erro interno ao listar documentos' });
  }
};

// Validar integridade de um documento PDF enviado
const validarIntegridadeDocumento = async (req, res) => {
  try {
    const { hash } = req.query;
    
    if (!hash) {
      return res.status(400).json({ error: 'Hash SHA1 não fornecido' });
    }

    const { data: documento, error } = await supabaseAdmin
      .from('documentos_assinados')
      .select('*')
      .eq('hash_sha1', hash.toUpperCase())
      .single();

    if (error || !documento) {
      return res.status(404).json({ 
        integro: false,
        encontrado: false,
        error: 'Documento não encontrado no sistema' 
      });
    }

    // Registrar validação no log de auditoria
    const auditoriaLog = documento.auditoria_log || [];
    auditoriaLog.push({
      tipo: 'validacao_integridade',
      data: new Date().toISOString(),
      ip: req.ip || req.headers['x-forwarded-for'] || 'desconhecido',
      userAgent: req.headers['user-agent'],
      resultado: 'integro'
    });

    await supabaseAdmin
      .from('documentos_assinados')
      .update({
        integridade_verificada: new Date().toISOString(),
        integridade_status: 'integro',
        auditoria_log: auditoriaLog
      })
      .eq('id', documento.id);

    res.json({
      integro: true,
      encontrado: true,
      documento: {
        nome: documento.nome,
        assinante: documento.assinante,
        documento: documento.documento,
        hashSHA1: documento.hash_sha1,
        chaveValidacao: documento.chave_validacao,
        dataAssinatura: documento.data_assinatura,
        integridadeStatus: 'integro',
        integridadeVerificada: new Date().toISOString()
      },
      mensagem: 'Documento íntegro - não foi alterado desde a assinatura'
    });
  } catch (error) {
    console.error('Erro ao validar integridade:', error);
    res.status(500).json({ error: 'Erro interno ao validar integridade' });
  }
};

// Validar integridade enviando PDF (POST com arquivo)
const validarIntegridadePorArquivo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo PDF não fornecido' });
    }

    // Gerar hash do PDF enviado
    const hashEnviado = crypto.createHash('sha1')
      .update(req.file.buffer)
      .digest('hex')
      .toUpperCase();

    // Buscar documento no banco
    const { data: documento, error } = await supabaseAdmin
      .from('documentos_assinados')
      .select('*')
      .eq('hash_sha1', hashEnviado)
      .single();

    if (error || !documento) {
      return res.json({
        integro: false,
        encontrado: false,
        hashEnviado: hashEnviado,
        error: 'Documento não encontrado ou foi alterado. Hash não corresponde a nenhum documento assinado no sistema.'
      });
    }

    // Registrar validação no log de auditoria
    const auditoriaLog = documento.auditoria_log || [];
    auditoriaLog.push({
      tipo: 'validacao_por_arquivo',
      data: new Date().toISOString(),
      ip: req.ip || req.headers['x-forwarded-for'] || 'desconhecido',
      userAgent: req.headers['user-agent'],
      hashEnviado: hashEnviado,
      resultado: 'integro'
    });

    await supabaseAdmin
      .from('documentos_assinados')
      .update({
        integridade_verificada: new Date().toISOString(),
        integridade_status: 'integro',
        auditoria_log: auditoriaLog
      })
      .eq('id', documento.id);

    res.json({
      integro: true,
      encontrado: true,
      documento: {
        nome: documento.nome,
        assinante: documento.assinante,
        documento: documento.documento,
        hashSHA1: documento.hash_sha1,
        chaveValidacao: documento.chave_validacao,
        dataAssinatura: documento.data_assinatura,
        integridadeStatus: 'integro',
        integridadeVerificada: new Date().toISOString()
      },
      mensagem: 'Documento íntegro - não foi alterado desde a assinatura'
    });
  } catch (error) {
    console.error('Erro ao validar integridade por arquivo:', error);
    res.status(500).json({ error: 'Erro interno ao validar integridade' });
  }
};

// Detectar alteração no documento
const detectarAlteracao = async (req, res) => {
  try {
    const { hash } = req.query;

    if (!hash) {
      return res.status(400).json({ error: 'Hash SHA1 não fornecido' });
    }

    const { data: documento, error } = await supabaseAdmin
      .from('documentos_assinados')
      .select('*')
      .eq('hash_sha1', hash.toUpperCase())
      .single();

    if (error || !documento) {
      return res.json({
        alterado: true,
        motivo: 'Documento não encontrado no sistema. Pode ter sido alterado ou nunca foi assinado.'
      });
    }

    res.json({
      alterado: false,
      integro: true,
      documento: {
        nome: documento.nome,
        assinante: documento.assinante,
        dataAssinatura: documento.data_assinatura,
        integridadeStatus: documento.integridade_status || 'integro'
      },
      mensagem: 'Documento íntegro - hash corresponde ao documento original'
    });
  } catch (error) {
    console.error('Erro ao detectar alteração:', error);
    res.status(500).json({ error: 'Erro interno ao verificar alteração' });
  }
};

module.exports = {
  salvarDocumentoAssinado,
  validarDocumento,
  validarDocumentoPorHash,
  validarIntegridadeDocumento,
  validarIntegridadePorArquivo,
  detectarAlteracao,
  listarDocumentosAssinados
};

