const bcrypt = require('bcrypt');
const { supabase, supabaseAdmin } = require('../config/database');

// Buscar cidades
const getCidades = async (req, res) => {
  try {
    const { estado } = req.query;
    console.log('🏙️ GET /api/clinicas/cidades - Estado filtro:', estado || 'nenhum');
    
    let query = supabaseAdmin
      .from('clinicas')
      .select('cidade')
      .not('cidade', 'is', null);

    // Filtrar por estado se especificado
    if (estado) {
      query = query.eq('estado', estado);
    }

    const { data, error } = await query;

    if (error) throw error;
    
    // Extrair cidades únicas e ordenar, filtrando vazios
    const cidadesUnicas = [...new Set(data.map(c => c.cidade).filter(c => c && c.trim() !== ''))].sort();
    console.log('🏙️ Cidades encontradas:', cidadesUnicas.length);
    res.json(cidadesUnicas);
  } catch (error) {
    console.error('❌ Erro ao buscar cidades:', error);
    res.status(500).json({ error: error.message });
  }
};

// Buscar estados
const getEstados = async (req, res) => {
  try {
    console.log('📍 GET /api/clinicas/estados');
    const { data, error } = await supabaseAdmin
      .from('clinicas')
      .select('estado')
      .not('estado', 'is', null);

    if (error) throw error;
    
    // Extrair estados únicos e ordenar, filtrando vazios
    const estadosUnicos = [...new Set(data.map(c => c.estado).filter(e => e && e.trim() !== ''))].sort();
    console.log('📍 Estados encontrados:', estadosUnicos.length, estadosUnicos);
    res.json(estadosUnicos);
  } catch (error) {
    console.error('❌ Erro ao buscar estados:', error);
    res.status(500).json({ error: error.message });
  }
};

// Buscar clínicas em análise
const getClinicasEmAnalise = async (req, res) => {
  try {
    // Verificar permissões
    const isConsultorInterno = req.user.tipo === 'consultor' && req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true;
    const isAdmin = req.user.tipo === 'admin' || req.user.tipo === 'root';
    const isFreelancer = req.user.tipo === 'consultor' && !isConsultorInterno && req.user.is_freelancer === true;
    
    if (!isAdmin && !isConsultorInterno && !isFreelancer) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    let query = supabase
      .from('clinicas')
      .select(`
        *,
        consultores!consultor_id(
          nome, 
          empresa_id
        )
      `)
      .eq('em_analise', true)
      .order('created_at', { ascending: false });

    // Se for freelancer, filtrar apenas suas clínicas
    if (isFreelancer) {
      console.log('👥 Freelancer buscando clínicas em análise - ID:', req.user.id);
      query = query.eq('consultor_id', req.user.id);
    }

    const { data, error } = await query;

    if (error) throw error;
    
    // Reformatar dados
    const formattedData = data.map(clinica => ({
      ...clinica,
      consultor_nome: clinica.consultores?.nome,
      empresa_id: clinica.empresa_id || clinica.consultores?.empresa_id || null
    }));
    
    res.json(formattedData);
  } catch (error) {
    console.error('Erro ao buscar clínicas em análise:', error);
    res.status(500).json({ error: error.message });
  }
};

// Buscar clínica por ID
const getClinicaById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabaseAdmin
      .from('clinicas')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) throw error;
    
    // Clínicas só podem ver seus próprios dados
    if (req.user.tipo === 'clinica' && req.user.clinica_id !== parseInt(id)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Buscar todas as clínicas
const getAllClinicas = async (req, res) => {
  try {
    const { cidade, estado } = req.query;
    
    let query = supabase
      .from('clinicas')
      .select(`
        *,
        consultores!consultor_id(
          nome, 
          empresa_id
        )
      `)
      .eq('em_analise', false)
      .order('nome');

    // Filtrar por estado se especificado
    if (estado) {
      query = query.eq('estado', estado);
    }

    // Filtrar por cidade se especificado
    if (cidade) {
      query = query.ilike('cidade', `%${cidade}%`);
    }

    // Se for consultor freelancer (não tem as duas permissões), mostrar apenas suas próprias clínicas
    const isConsultorInterno = req.user.tipo === 'consultor' && req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true;
    const isFreelancer = req.user.tipo === 'consultor' && !isConsultorInterno && req.user.is_freelancer === true;
    
    console.log('🔍 GET /api/clinicas - Verificando usuário:');
    console.log('   - ID:', req.user.id);
    console.log('   - Nome:', req.user.nome);
    console.log('   - Tipo:', req.user.tipo);
    console.log('   - is_freelancer:', req.user.is_freelancer);
    console.log('   - É consultor interno?', isConsultorInterno);
    console.log('   - É freelancer?', isFreelancer);
    
    let data, error;
    
    if (isFreelancer) {
      console.log('👥 Buscando clínicas do freelancer ID:', req.user.id);
      query = query.eq('consultor_id', req.user.id);
      const result = await query;
      data = result.data;
      error = result.error;
      console.log('   Clínicas encontradas:', data?.length || 0);
    } else {
      const result = await query;
      data = result.data;
      error = result.error;
    }

    if (error) throw error;
    
    // Reformatar dados para incluir nome do consultor, empresa_id e nome da parceiro
    const formattedData = data.map(clinica => ({
      ...clinica,
      consultor_nome: clinica.consultores?.nome,
      empresa_id: clinica.empresa_id || clinica.consultores?.empresa_id || null
    }));
    
    // Filtrar por empresa se necessário
    let finalData = formattedData;
    
    // Se for empresa, filtrar apenas clínicas de consultores vinculados a ela OU cadastradas diretamente pela empresa
    if (req.user.tipo === 'empresa') {
      finalData = formattedData.filter(clinica => 
        clinica.empresa_id === req.user.id
      );
    }
    // Se for FUNCIONÁRIO de empresa (não freelancer E não consultor interno), filtrar clínicas de toda a empresa
    else if (req.user.tipo === 'consultor' && req.user.empresa_id && req.user.is_freelancer === false && !isConsultorInterno) {
      finalData = formattedData.filter(clinica => 
        clinica.empresa_id === req.user.empresa_id &&
        clinica.consultor_id !== null
      );
    }
    
    res.json(finalData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Criar clínica
const createClinica = async (req, res) => {
  try {
    console.log('📥 POST /api/clinicas - Body recebido:', req.body);
    
    let { 
      nome, endereco, bairro, cidade, estado, nicho, telefone, email, status, em_analise, cnpj, responsavel,
      telefone_socios, email_socios, banco_nome, banco_conta, banco_agencia, banco_pix, limite_credito
    } = req.body;
    
    // Normalizar email
    if (email) {
      email = email.toLowerCase().trim();
    }
    
    // Geocodificar endereço se tiver cidade e estado
    let latitude = null;
    let longitude = null;
    
    if (cidade && estado) {
      try {
        const address = `${endereco ? endereco + ', ' : ''}${cidade}, ${estado}, Brasil`;
        const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
        const geocodeResponse = await fetch(geocodeUrl);
        const geocodeData = await geocodeResponse.json();
        
        if (geocodeData && geocodeData.length > 0) {
          latitude = parseFloat(geocodeData[0].lat);
          longitude = parseFloat(geocodeData[0].lon);
        }
      } catch (geocodeError) {
        console.error('Erro ao geocodificar:', geocodeError);
      }
    }
    
    const clinicaData = { 
      nome, 
      endereco, 
      bairro, 
      cidade, 
      estado, 
      nicho, 
      telefone, 
      email, 
      status: status || 'ativo',
      latitude,
      longitude,
      tipo_origem: 'direta',
      em_analise: em_analise || false
    };

    // Adicionar campos opcionais se fornecidos
    if (cnpj) clinicaData.cnpj = cnpj;
    if (responsavel) clinicaData.responsavel = responsavel;
    if (telefone_socios) clinicaData.telefone_socios = telefone_socios;
    if (email_socios) clinicaData.email_socios = email_socios?.toLowerCase().trim();
    if (banco_nome) clinicaData.banco_nome = banco_nome;
    if (banco_conta) clinicaData.banco_conta = banco_conta;
    if (banco_agencia) clinicaData.banco_agencia = banco_agencia;
    if (banco_pix) clinicaData.banco_pix = banco_pix;
    if (limite_credito) clinicaData.limite_credito = parseFloat(limite_credito);

    // Se for consultor interno criando, adicionar consultor_id
    const isConsultorInterno = req.user.tipo === 'consultor' && req.user.pode_ver_todas_novas_clinicas === true && req.user.podealterarstatus === true;
    if (isConsultorInterno) {
      clinicaData.consultor_id = req.user.id;
    }

    console.log('📝 Dados que serão inseridos:', clinicaData);

    const { data, error } = await supabaseAdmin
      .from('clinicas')
      .insert([clinicaData])
      .select();

    if (error) {
      console.error('❌ Erro ao inserir clínica:', error);
      throw error;
    }
    
    console.log('✅ Clínica inserida com sucesso:', data[0].id);
    res.json({ clinica: data[0], message: 'Clínica cadastrada com sucesso!' });
  } catch (error) {
    console.error('❌ Erro geral ao cadastrar clínica:', error);
    res.status(500).json({ error: error.message });
  }
};

// Criar acesso de clínica
const criarAcesso = async (req, res) => {
  try {
    const { id } = req.params;
    let { email, senha } = req.body;
    
    console.log('🔑 Criando acesso para clínica:', id);
    
    // Validar entrada
    if (!email || !senha) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }
    
    // Normalizar email para minúsculas
    email = email.toLowerCase().trim();
    
    // Verificar se a clínica existe
    const { data: clinica, error: clinicaError } = await supabaseAdmin
      .from('clinicas')
      .select('*')
      .eq('id', id)
      .single();
      
    if (clinicaError || !clinica) {
      return res.status(404).json({ error: 'Clínica não encontrada' });
    }
    
    // Verificar se o email já está em uso por outra clínica
    const { data: emailExistente } = await supabaseAdmin
      .from('clinicas')
      .select('id')
      .eq('email_login', email)
      .neq('id', id)
      .single();
      
    if (emailExistente) {
      return res.status(400).json({ error: 'Este email já está em uso por outra clínica' });
    }
    
    // Hash da senha
    const saltRounds = 10;
    const senhaHash = await bcrypt.hash(senha, saltRounds);
    
    // Atualizar clínica com dados de acesso
    const { error: updateError } = await supabaseAdmin
      .from('clinicas')
      .update({
        email_login: email,
        senha_hash: senhaHash,
        ativo_no_sistema: true,
        criado_por_admin_id: req.user.id,
        data_criacao_acesso: new Date().toISOString()
      })
      .eq('id', id);
      
    if (updateError) {
      console.error('❌ Erro ao criar acesso:', updateError);
      throw updateError;
    }
    
    console.log('✅ Acesso criado com sucesso para clínica:', clinica.nome);
    res.json({ 
      success: true, 
      message: 'Acesso criado com sucesso',
      clinica: {
        id: clinica.id,
        nome: clinica.nome,
        email_login: email
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao criar acesso de clínica:', error);
    res.status(500).json({ error: 'Erro interno ao criar acesso' });
  }
};

// Upload de documento de clínica
const uploadDocumento = async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo } = req.body;
    const file = req.file;
    
    console.log('📄 Upload de documento para clínica:', id, 'tipo:', tipo);
    
    // Validar se é uma clínica acessando seus próprios dados
    if (req.user.tipo === 'clinica' && req.user.clinica_id !== parseInt(id)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    if (!file) {
      return res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
    }
    
    if (!tipo) {
      return res.status(400).json({ error: 'Tipo de documento não informado' });
    }
    
    // Validar tipo de arquivo
    if (file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Apenas arquivos PDF são permitidos' });
    }
    
    // Usar o buffer do arquivo diretamente (sem salvar temporariamente)
    const fileName = `${tipo}_${Date.now()}.pdf`;
    const filePath = `clinicas/${id}/${fileName}`;
    
    // Upload direto para o Supabase Storage usando o buffer
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('documentos')
      .upload(filePath, file.buffer, {
        contentType: 'application/pdf',
        upsert: true
      });
    
    if (uploadError) {
      console.error('❌ Erro ao fazer upload:', uploadError);
      throw uploadError;
    }
    
    // Atualizar campo do documento na tabela clinicas
    const updateData = {};
    updateData[tipo] = true;
    updateData[`${tipo}_aprovado`] = null; // Resetar aprovação ao reenviar
    
    const { error: updateError } = await supabaseAdmin
      .from('clinicas')
      .update(updateData)
      .eq('id', id);
    
    if (updateError) {
      console.error('❌ Erro ao atualizar status do documento:', updateError);
      throw updateError;
    }
    
    console.log('✅ Documento enviado com sucesso:', fileName);
    res.json({ success: true, message: 'Documento enviado com sucesso', file: fileName });
    
  } catch (error) {
    console.error('❌ Erro ao enviar documento:', error);
    res.status(500).json({ error: 'Erro ao enviar documento' });
  }
};

// Download de documento de clínica
const downloadDocumento = async (req, res) => {
  try {
    const { id, tipo } = req.params;
    
    console.log('📥 Download de documento da clínica:', id, 'tipo:', tipo);
    
    // Validar se é uma clínica acessando seus próprios dados ou admin
    if (req.user.tipo === 'clinica' && req.user.clinica_id !== parseInt(id)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    // Listar arquivos do tipo na pasta da clínica
    const { data: files, error: listError } = await supabaseAdmin.storage
      .from('documentos')
      .list(`clinicas/${id}`, {
        search: tipo
      });
    
    if (listError) {
      console.error('❌ Erro ao listar arquivos:', listError);
      throw listError;
    }
    
    if (!files || files.length === 0) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }
    
    // Pegar o arquivo mais recente
    const latestFile = files.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    const filePath = `clinicas/${id}/${latestFile.name}`;
    
    // Download do arquivo
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('documentos')
      .download(filePath);
    
    if (downloadError) {
      console.error('❌ Erro ao baixar arquivo:', downloadError);
      throw downloadError;
    }
    
    // Converter blob para buffer
    const buffer = Buffer.from(await fileData.arrayBuffer());
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${latestFile.name}"`);
    res.send(buffer);
    
  } catch (error) {
    console.error('❌ Erro ao baixar documento:', error);
    res.status(500).json({ error: 'Erro ao baixar documento' });
  }
};

// Aprovar documento de clínica
const aprovarDocumento = async (req, res) => {
  try {
    const { id, tipo } = req.params;
    
    console.log(`✅ Aprovando documento ${tipo} da clínica ${id}`);
    
    // Validar tipo de documento
    const tiposValidos = [
      'doc_cartao_cnpj', 'doc_contrato_social', 'doc_alvara_sanitario', 
      'doc_balanco', 'doc_comprovante_endereco', 'doc_dados_bancarios',
      'doc_socios', 'doc_certidao_resp_tecnico', 'doc_resp_tecnico'
    ];
    
    if (!tiposValidos.includes(tipo)) {
      return res.status(400).json({ error: 'Tipo de documento inválido' });
    }
    
    // Atualizar status de aprovação
    const updateData = {};
    updateData[`${tipo}_aprovado`] = true;
    
    const { error: updateError } = await supabaseAdmin
      .from('clinicas')
      .update(updateData)
      .eq('id', id);
    
    if (updateError) {
      console.error('❌ Erro ao aprovar documento:', updateError);
      throw updateError;
    }
    
    console.log(`✅ Documento ${tipo} aprovado com sucesso`);
    res.json({ success: true, message: 'Documento aprovado com sucesso' });
    
  } catch (error) {
    console.error('❌ Erro ao aprovar documento:', error);
    res.status(500).json({ error: 'Erro ao aprovar documento' });
  }
};

// Reprovar documento de clínica
const reprovarDocumento = async (req, res) => {
  try {
    const { id, tipo } = req.params;
    const { motivo } = req.body;
    
    console.log(`❌ Reprovando documento ${tipo} da clínica ${id}`);
    
    // Validar tipo de documento
    const tiposValidos = [
      'doc_cartao_cnpj', 'doc_contrato_social', 'doc_alvara_sanitario', 
      'doc_balanco', 'doc_comprovante_endereco', 'doc_dados_bancarios',
      'doc_socios', 'doc_certidao_resp_tecnico', 'doc_resp_tecnico'
    ];
    
    if (!tiposValidos.includes(tipo)) {
      return res.status(400).json({ error: 'Tipo de documento inválido' });
    }
    
    // Atualizar status de aprovação
    const updateData = {};
    updateData[`${tipo}_aprovado`] = false;
    
    const { error: updateError } = await supabaseAdmin
      .from('clinicas')
      .update(updateData)
      .eq('id', id);
    
    if (updateError) {
      console.error('❌ Erro ao reprovar documento:', updateError);
      throw updateError;
    }
    
    console.log(`❌ Documento ${tipo} reprovado com sucesso`);
    res.json({ success: true, message: 'Documento reprovado com sucesso', motivo });
    
  } catch (error) {
    console.error('❌ Erro ao reprovar documento:', error);
    res.status(500).json({ error: 'Erro ao reprovar documento' });
  }
};

// Remover acesso de clínica
const removerAcesso = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🔒 Removendo acesso da clínica:', id);
    
    // Verificar se a clínica existe
    const { data: clinica, error: clinicaError } = await supabaseAdmin
      .from('clinicas')
      .select('*')
      .eq('id', id)
      .single();
      
    if (clinicaError || !clinica) {
      return res.status(404).json({ error: 'Clínica não encontrada' });
    }
    
    // Remover dados de acesso
    const { error: updateError } = await supabaseAdmin
      .from('clinicas')
      .update({
        email_login: null,
        senha_hash: null,
        ativo_no_sistema: false,
        ultimo_acesso: null
      })
      .eq('id', id);
      
    if (updateError) {
      console.error('❌ Erro ao remover acesso:', updateError);
      throw updateError;
    }
    
    console.log('✅ Acesso removido com sucesso da clínica:', clinica.nome);
    res.json({ 
      success: true, 
      message: 'Acesso removido com sucesso'
    });
    
  } catch (error) {
    console.error('❌ Erro ao remover acesso de clínica:', error);
    res.status(500).json({ error: 'Erro interno ao remover acesso' });
  }
};

// Atualizar clínica
const updateClinica = async (req, res) => {
  try {
    const { id } = req.params;
    const { evidencia_id } = req.body;
    console.log('🔧 PUT /api/clinicas/:id recebido');
    console.log('🔧 ID da clínica:', id);
    console.log('🔧 Body recebido:', req.body);
    console.log('🔧 Usuário autenticado:', req.user);
    
    // Verificar se é admin, ou se é a própria clínica editando seus dados
    const isAdmin = req.user.tipo === 'admin';
    const isPropriaClinica = req.user.tipo === 'clinica' && req.user.clinica_id === parseInt(id);
    
    if (!isAdmin && !isPropriaClinica) {
      return res.status(403).json({ error: 'Acesso negado. Você não tem permissão para editar esta clínica.' });
    }
    
    // Campos que apenas admin pode editar
    const camposApenasAdmin = ['nome', 'cnpj', 'status', 'em_analise', 'limite_credito'];
    
    // Campos que clínicas podem editar sobre si mesmas
    const camposClinicaPodeEditar = [
      'telefone_socios', 'email_socios', 'banco_nome', 'banco_conta', 'banco_agencia', 'banco_pix'
    ];
    
    // Todos os campos permitidos (para admin)
    const camposPermitidos = [
      'nome', 'endereco', 'bairro', 'cidade', 'estado', 'nicho', 'telefone', 'email', 'status', 'em_analise', 'cnpj', 'responsavel',
      'telefone_socios', 'email_socios', 'banco_nome', 'banco_conta', 'banco_agencia', 'banco_pix', 'limite_credito'
    ];
    const updateData = {};
    for (const campo of camposPermitidos) {
      if (req.body[campo] !== undefined) {
        // Se for clínica, verificar se pode editar este campo
        if (isPropriaClinica && !isAdmin) {
          if (!camposClinicaPodeEditar.includes(campo)) {
            console.log(`⚠️ Clínica tentou editar campo não permitido: ${campo}`);
            continue;
          }
        }
        
        // Normalizar email se for o campo email ou email_socios
        if ((campo === 'email' || campo === 'email_socios') && req.body[campo]) {
          updateData[campo] = req.body[campo].toLowerCase().trim();
        } else if (campo === 'limite_credito' && req.body[campo]) {
          updateData[campo] = parseFloat(req.body[campo]);
        } else {
          updateData[campo] = req.body[campo];
        }
      }
    }
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'Nenhum campo válido para atualizar.' });
    }
    console.log('🔧 Dados para atualizar:', updateData);
    
    const { data, error } = await supabaseAdmin
      .from('clinicas')
      .update(updateData)
      .eq('id', id)
      .select();

    console.log('🔧 Resultado do Supabase:');
    console.log('🔧 Data:', data);
    console.log('🔧 Error:', error);

    if (error) {
      console.error('❌ Erro do Supabase:', error);
      return res.status(500).json({ error: error.message });
    }
    
    if (!data || data.length === 0) {
      console.error('❌ Nenhuma linha foi atualizada! Verifique as policies do Supabase.');
      return res.status(403).json({ error: 'Nenhuma linha atualizada! Verifique as policies do Supabase.' });
    }
    
    console.log('✅ Clínica atualizada com sucesso:', data[0]);
    res.json({ id: data[0].id, message: 'Clínica atualizada com sucesso!' });
  } catch (error) {
    console.error('❌ Erro geral:', error);
    res.status(500).json({ error: error.message });
  }
};

// Deletar clínica
const deleteClinica = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ DELETE /api/clinicas/:id recebido');
    console.log('🗑️ ID da clínica:', id);
    console.log('🗑️ Usuário autenticado:', req.user);

    // Verificar se existem agendamentos associados a esta clínica
    const { data: agendamentos, error: agendamentosError } = await supabaseAdmin
      .from('agendamentos')
      .select('id')
      .eq('clinica_id', id)
      .limit(1);

    if (agendamentosError) throw agendamentosError;

    if (agendamentos && agendamentos.length > 0) {
      return res.status(400).json({ error: 'Não é possível excluir a clínica pois existem agendamentos associados.' });
    }

    // Verificar se existem fechamentos associados a esta clínica
    const { data: fechamentos, error: fechamentosError } = await supabaseAdmin
      .from('fechamentos')
      .select('id')
      .eq('clinica_id', id)
      .limit(1);

    if (fechamentosError) throw fechamentosError;

    if (fechamentos && fechamentos.length > 0) {
      return res.status(400).json({ error: 'Não é possível excluir a clínica pois existem fechamentos associados.' });
    }

    // Se não há dados associados, pode excluir
    const { error } = await supabaseAdmin
      .from('clinicas')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Erro do Supabase:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Clínica excluída com sucesso:', id);
    res.json({ message: 'Clínica excluída com sucesso!' });
  } catch (error) {
    console.error('❌ Erro geral:', error);
    res.status(500).json({ error: error.message });
  }
};

// Buscar clínicas negativas
const getClinicasNegativas = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('clinicas')
      .select('*')
      .eq('status', 'negativa')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Erro ao buscar clínicas negativas:', error);
    res.status(500).json({ error: error.message });
  }
};

// Cadastro público de clínica
const cadastroPublico = async (req, res) => {
  try {
    console.log('📝 Cadastro de clínica recebido:', req.body);
    let { 
      nome, 
      cnpj, 
      endereco, 
      bairro, 
      cidade, 
      estado, 
      telefone, 
      email, 
      nicho, 
      responsavel, 
      observacoes, 
      ref_consultor 
    } = req.body;
    
    // Normalizar email
    if (email) {
      email = email.toLowerCase().trim();
    }
    
    // Validar campos obrigatórios
    if (!nome || !cnpj || !telefone || !email || !responsavel) {
      return res.status(400).json({ error: 'Nome da clínica, CNPJ, telefone, email e responsável são obrigatórios!' });
    }
    
    // Validar nome (mínimo 2 caracteres)
    if (nome.trim().length < 2) {
      return res.status(400).json({ error: 'Nome da clínica deve ter pelo menos 2 caracteres!' });
    }
    
    // Validar CNPJ (14 dígitos)
    const cnpjNumeros = cnpj.replace(/\D/g, '');
    if (cnpjNumeros.length !== 14) {
      return res.status(400).json({ error: 'CNPJ deve ter 14 dígitos!' });
    }
    
    // Validar telefone (formato básico)
    const telefoneRegex = /^[\(\)\s\-\+\d]{10,15}$/;
    if (!telefoneRegex.test(telefone.replace(/\s/g, ''))) {
      return res.status(400).json({ error: 'Telefone inválido!' });
    }
    
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Email inválido!' });
    }
    
    // Normalizar telefone (remover formatação)
    const telefoneNumeros = telefone.replace(/\D/g, '');
    
    // Verificar se telefone já existe em novas_clinicas
    const { data: telefoneNovas, error: telefoneErrorNovas } = await supabaseAdmin
      .from('novas_clinicas')
      .select('id, nome, created_at')
      .eq('telefone', telefoneNumeros)
      .limit(1);

    if (telefoneErrorNovas) {
      console.error('❌ Erro ao verificar telefone em novas_clinicas:', telefoneErrorNovas);
      throw telefoneErrorNovas;
    }
    
    // Verificar se telefone já existe em clinicas
    const { data: telefoneClinicas, error: telefoneErrorClinicas } = await supabaseAdmin
      .from('clinicas')
      .select('id, nome, created_at')
      .eq('telefone', telefoneNumeros)
      .limit(1);

    if (telefoneErrorClinicas) {
      console.error('❌ Erro ao verificar telefone em clinicas:', telefoneErrorClinicas);
      throw telefoneErrorClinicas;
    }
    
    const telefoneExistente = telefoneNovas?.length > 0 ? telefoneNovas[0] : (telefoneClinicas?.length > 0 ? telefoneClinicas[0] : null);
    
    if (telefoneExistente) {
      const dataCadastro = new Date(telefoneExistente.created_at).toLocaleDateString('pt-BR');
      console.log('❌ Telefone já cadastrado:', { 
        telefone: telefoneNumeros, 
        clinica: telefoneExistente.nome,
        data: dataCadastro
      });
      return res.status(400).json({ 
        error: `Este número de telefone já está cadastrado para ${telefoneExistente.nome} (cadastrado em ${dataCadastro}).` 
      });
    }
    
    // Buscar consultor pelo código de referência se fornecido
    let consultorId = null;
    let consultorNome = null;
    let isFreelancer = false;
    if (ref_consultor && ref_consultor.trim() !== '') {
      console.log('🔍 Buscando consultor pelo código de referência:', ref_consultor);
      console.log('📋 ref_consultor recebido:', { ref_consultor, tipo: typeof ref_consultor });
      
      const { data: consultorData, error: consultorError } = await supabaseAdmin
        .from('consultores')
        .select('id, nome, codigo_referencia, ativo, is_freelancer')
        .eq('codigo_referencia', ref_consultor.trim())
        .eq('ativo', true)
        .single();
      
      if (consultorError) {
        console.error('❌ Erro ao buscar consultor:', consultorError);
      } else if (consultorData) {
        consultorId = consultorData.id;
        consultorNome = consultorData.nome;
        isFreelancer = consultorData.is_freelancer === true;
        console.log('✅ Consultor encontrado:', { 
          id: consultorData.id, 
          nome: consultorData.nome,
          codigo_referencia: consultorData.codigo_referencia,
          ativo: consultorData.ativo,
          is_freelancer: isFreelancer
        });
      } else {
        console.log('⚠️ Consultor não encontrado para o código:', ref_consultor);
      }
    } else {
      console.log('ℹ️ Nenhum código de referência fornecido');
    }
    
    // Geocodificar endereço se tiver cidade e estado
    let latitude = null;
    let longitude = null;
    
    if (cidade && estado) {
      try {
        const address = `${endereco ? endereco + ', ' : ''}${cidade}, ${estado}, Brasil`;
        const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
        const geocodeResponse = await fetch(geocodeUrl);
        const geocodeData = await geocodeResponse.json();
        
        if (geocodeData && geocodeData.length > 0) {
          latitude = parseFloat(geocodeData[0].lat);
          longitude = parseFloat(geocodeData[0].lon);
        }
      } catch (geocodeError) {
        console.error('Erro ao geocodificar:', geocodeError);
      }
    }
    
    // SEMPRE inserir em novas_clinicas com status "tem_interesse" para cadastros via link
    const tabelaDestino = 'novas_clinicas';
    console.log(`💾 Inserindo clínica na tabela ${tabelaDestino}`);
    console.log(`   - Consultor ID: ${consultorId}`);
    console.log(`   - Consultor Nome: ${consultorNome}`);
    console.log(`   - É Freelancer: ${isFreelancer}`);
    
    // Preparar dados base
    const dadosBase = {
      nome: nome.trim(), 
      cnpj: cnpjNumeros,
      endereco: endereco ? endereco.trim() : null,
      bairro: bairro ? bairro.trim() : null,
      cidade: cidade ? cidade.trim() : null,
      estado: estado ? estado.trim() : null,
      telefone: telefoneNumeros,
      email: email.trim(),
      nicho: nicho || null,
      responsavel: responsavel.trim(),
      observacoes: observacoes ? observacoes.trim() : null,
      status: 'tem_interesse',
      criado_por_consultor_id: consultorId,
      tipo_origem: 'aprovada',
      latitude,
      longitude
    };

    // Inserir na tabela novas_clinicas
    const result = await supabaseAdmin
      .from('novas_clinicas')
      .insert([dadosBase])
      .select();
    
    const data = result.data;
    const error = result.error;

    if (error) {
      console.error('❌ Erro ao inserir clínica:', error);
      throw error;
    }
    
    console.log(`✅ Clínica inserida com sucesso na tabela ${tabelaDestino}:`, data[0]);
    console.log(`📊 Status da clínica: ${data[0].status} | Origem: ${data[0].tipo_origem}`);
    
    // Emitir evento Socket.IO para notificar admins sobre nova clínica (cadastro público)
    if (req.io) {
      console.log('📢 Emitindo evento new-clinica via Socket.IO (cadastro público)');
      req.io.to('clinicas-notifications').emit('new-clinica', {
        clinicaId: data[0].id,
        nome: data[0].nome,
        cidade: data[0].cidade,
        estado: data[0].estado,
        telefone: data[0].telefone,
        email: data[0].email,
        nicho: data[0].nicho,
        status: data[0].status,
        observacoes: data[0].observacoes,
        responsavel: data[0].responsavel,
        criado_por_consultor_id: data[0].criado_por_consultor_id,
        created_at: data[0].created_at,
        origem: 'cadastro_publico'
      });
    }
    
    res.json({ 
      id: data[0].id, 
      message: 'Cadastro realizado com sucesso! Entraremos em contato em até 24 horas.',
      nome: nome.trim(),
      consultor_referencia: consultorNome
    });
  } catch (error) {
    console.error('Erro no cadastro de clínica:', error);
    res.status(500).json({ error: 'Erro interno do servidor. Tente novamente.' });
  }
};

module.exports = {
  getCidades,
  getEstados,
  getClinicasEmAnalise,
  getClinicaById,
  getAllClinicas,
  createClinica,
  criarAcesso,
  uploadDocumento,
  downloadDocumento,
  aprovarDocumento,
  reprovarDocumento,
  removerAcesso,
  updateClinica,
  deleteClinica,
  getClinicasNegativas,
  cadastroPublico
};

