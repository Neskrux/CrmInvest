const { supabaseAdmin } = require('../config/database');
const { STORAGE_BUCKET_MATERIAIS } = require('../config/constants');
const path = require('path');

// GET /api/materiais - Listar todos os materiais
const getAllMateriais = async (req, res) => {
  try {
    console.log('🔧 GET /api/materiais recebido');
    console.log('🔧 Usuário autenticado:', req.user);

    const { data, error } = await supabaseAdmin
      .from('materiais')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar materiais:', error);
      return res.status(500).json({ error: 'Erro ao buscar materiais' });
    }

    console.log('🔧 Materiais encontrados:', data.length);
    res.json(data);
  } catch (error) {
    console.error('Erro ao buscar materiais:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// POST /api/materiais - Criar novo material
const createMaterial = async (req, res) => {
  try {
    console.log('🔧 POST /api/materiais recebido');
    console.log('🔧 Body:', req.body);
    console.log('🔧 File:', req.file ? req.file.originalname : 'nenhum');

    const { titulo, descricao, tipo } = req.body;

    if (!titulo || !tipo) {
      return res.status(400).json({ error: 'Título e tipo são obrigatórios' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo é obrigatório' });
    }

    // Gerar nome único para o arquivo no Supabase Storage
    const timestamp = Date.now();
    const randomId = Math.round(Math.random() * 1E9);
    const fileExt = path.extname(req.file.originalname);
    const fileName = `${tipo}_${timestamp}_${randomId}${fileExt}`;

    const fileSizeMB = (req.file.size / (1024 * 1024)).toFixed(2);
    console.log('📤 Fazendo upload para Supabase Storage:', fileName);
    console.log('📦 Tamanho do arquivo:', fileSizeMB, 'MB');
    console.log('🎬 Tipo:', req.file.mimetype);

    // Fazer upload para Supabase Storage com timeout de 4 minutos
    const uploadPromise = supabaseAdmin.storage
      .from(STORAGE_BUCKET_MATERIAIS)
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        cacheControl: '3600',
        upsert: false
      });

    // Timeout de 4 minutos para uploads grandes (vídeos)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Upload timeout - arquivo muito grande ou conexão lenta')), 240000);
    });

    let uploadData, uploadError;
    try {
      const result = await Promise.race([uploadPromise, timeoutPromise]);
      uploadData = result.data;
      uploadError = result.error;
    } catch (error) {
      console.error('Erro ou timeout no upload:', error.message);
      return res.status(500).json({ 
        error: 'Tempo de upload excedido. Tente com um arquivo menor ou verifique sua conexão.' 
      });
    }

    if (uploadError) {
      console.error('Erro ao fazer upload no Supabase Storage:', uploadError);
      return res.status(500).json({ error: 'Erro ao fazer upload do arquivo: ' + uploadError.message });
    }

    console.log('✅ Upload realizado com sucesso:', uploadData.path);

    const materialData = {
      titulo,
      descricao: descricao || '',
      tipo,
      url: null,
      arquivo_nome: req.file.originalname,
      arquivo_url: fileName, // Salvar apenas o nome do arquivo no Storage
      created_by: req.user.id
    };

    const { data, error } = await supabaseAdmin
      .from('materiais')
      .insert([materialData])
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar material:', error);
      // Tentar remover arquivo do storage se falhou salvar no banco
      await supabaseAdmin.storage.from(STORAGE_BUCKET_MATERIAIS).remove([fileName]);
      return res.status(500).json({ error: 'Erro ao criar material' });
    }

    console.log('🔧 Material criado com sucesso:', data.id);
    res.status(201).json(data);
  } catch (error) {
    console.error('Erro ao criar material:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// GET /api/materiais/:id/download - Download de arquivo
const downloadMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔧 GET /api/materiais/:id/download recebido');
    console.log('🔧 ID do material:', id);

    const { data: material, error } = await supabaseAdmin
      .from('materiais')
      .select('arquivo_url, arquivo_nome, titulo')
      .eq('id', id)
      .single();

    if (error || !material) {
      return res.status(404).json({ error: 'Material não encontrado' });
    }

    if (!material.arquivo_url) {
      return res.status(400).json({ error: 'Este material não possui arquivo para download' });
    }

    console.log('📥 Baixando arquivo do Supabase Storage:', material.arquivo_url);

    // Baixar arquivo do Supabase Storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET_MATERIAIS)
      .download(material.arquivo_url);

    if (downloadError) {
      console.error('Erro ao baixar arquivo do Supabase Storage:', downloadError);
      return res.status(500).json({ error: 'Erro ao baixar arquivo' });
    }

    // Detectar tipo de conteúdo baseado na extensão
    const ext = path.extname(material.arquivo_nome || material.arquivo_url).toLowerCase();
    const contentTypes = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.txt': 'text/plain',
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime'
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';
    const fileName = material.arquivo_nome || material.titulo;

    // Configurar headers para download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    // Converter blob para buffer e enviar
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.send(buffer);
  } catch (error) {
    console.error('Erro ao fazer download do material:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// DELETE /api/materiais/:id - Excluir material
const deleteMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔧 DELETE /api/materiais/:id recebido');
    console.log('🔧 ID do material:', id);

    // Buscar o material para obter informações do arquivo
    const { data: material, error: fetchError } = await supabaseAdmin
      .from('materiais')
      .select('arquivo_url')
      .eq('id', id)
      .single();

    if (fetchError || !material) {
      return res.status(404).json({ error: 'Material não encontrado' });
    }

    // Excluir arquivo do Supabase Storage se existir
    if (material.arquivo_url) {
      console.log('🗑️ Deletando arquivo do Supabase Storage:', material.arquivo_url);
      const { error: storageError } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET_MATERIAIS)
        .remove([material.arquivo_url]);
      
      if (storageError) {
        console.error('Erro ao deletar arquivo do storage:', storageError);
        // Continuar mesmo se falhar a exclusão do arquivo
      } else {
        console.log('✅ Arquivo deletado do Supabase Storage com sucesso');
      }
    }

    // Excluir o material do banco
    const { error: deleteError } = await supabaseAdmin
      .from('materiais')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Erro ao excluir material:', deleteError);
      return res.status(500).json({ error: 'Erro ao excluir material' });
    }

    res.json({ message: 'Material excluído com sucesso!' });
  } catch (error) {
    console.error('Erro ao excluir material:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

module.exports = {
  getAllMateriais,
  createMaterial,
  downloadMaterial,
  deleteMaterial
};

