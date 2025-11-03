# Fluxo de Validação Biométrica no Primeiro Login do Paciente

## Visão Geral

Este documento descreve o fluxo completo de validação biométrica que será implementado no primeiro login do paciente. O paciente precisa fazer upload de uma selfie e foto do RG para validar sua identidade antes de acessar o sistema.

---

## Fluxo Completo

```
1. Paciente recebe credenciais da clínica (email e senha)
   ↓
2. Paciente acessa página de login
   ↓
3. Paciente preenche email e senha
   ↓
4. Sistema valida credenciais no backend
   ↓
5. Backend verifica se é primeiro login (biometria_aprovada === false/null)
   ↓
6. SE É PRIMEIRO LOGIN:
   - Backend retorna flag: { primeiroLogin: true, requerBiometria: true }
   - Frontend redireciona para tela de validação biométrica
   ↓
7. Tela de Validação Biométrica:
   a. Passo 1: Capturar Selfie (câmera)
      - Instruções: "Posicione seu rosto na câmera"
      - Botão "Tirar Foto"
      - Preview da foto
      - Botão "Usar esta foto" ou "Tirar novamente"
   ↓
   b. Passo 2: Capturar Foto do RG
      - Instruções: "Tire uma foto do seu RG/CNH"
      - Botão "Tirar Foto" ou "Escolher arquivo"
      - Preview da foto
      - Botão "Usar esta foto" ou "Tirar novamente"
   ↓
   c. Passo 3: Enviar para validação
      - Botão "Validar Identidade"
      - Sistema converte imagens para base64
      - Envia para API BigDataCorp Facematch
   ↓
8. Sistema processa validação:
   - BASE_FACE_IMG: Foto do RG (base64)
   - MATCH_IMG: Selfie (base64)
   - Chama API BigDataCorp
   ↓
9. Sistema avalia resposta:
   - Code 80 → Match confirmado → Aprovar login
   - Code -800 → No Match → Mostrar erro e permitir tentar novamente
   - Outros códigos → Mostrar erro específico
   ↓
10. SE APROVADO:
    - Backend atualiza paciente: biometria_aprovada = true
    - Backend gera token JWT
    - Frontend salva token e redireciona para dashboard do paciente
    ↓
11. SE NÃO APROVADO:
    - Frontend mostra mensagem de erro
    - Permite tentar novamente (novas fotos)
    - Ou cancelar e sair
```

---

## Alterações no Banco de Dados

### Tabela: `pacientes`

Adicionar campo para marcar validação biométrica:

```sql
ALTER TABLE pacientes 
ADD COLUMN IF NOT EXISTS biometria_aprovada BOOLEAN DEFAULT FALSE;

ALTER TABLE pacientes 
ADD COLUMN IF NOT EXISTS biometria_aprovada_em TIMESTAMP;

ALTER TABLE pacientes 
ADD COLUMN IF NOT EXISTS biometria_erro TEXT;

COMMENT ON COLUMN pacientes.biometria_aprovada IS 'Indica se a validação biométrica foi aprovada no primeiro login';
COMMENT ON COLUMN pacientes.biometria_aprovada_em IS 'Data/hora da aprovação da validação biométrica';
COMMENT ON COLUMN pacientes.biometria_erro IS 'Mensagem de erro da última tentativa de validação biométrica';
```

---

## Estrutura de Arquivos

### Backend

```
backend/
├── services/
│   └── bigdatacorp-facematch.service.js (NOVO)
├── controllers/
│   ├── auth.controller.js (MODIFICAR)
│   └── pacientes.controller.js (ADICIONAR endpoint)
└── routes/
    └── auth.routes.js (ADICIONAR rota)
```

### Frontend

```
frontend/src/
├── components/
│   ├── Login.js (MODIFICAR)
│   └── ValidacaoBiometrica.js (NOVO)
└── contexts/
    └── AuthContext.js (MODIFICAR)
```

---

## Serviço BigDataCorp Facematch

### Arquivo: `backend/services/bigdatacorp-facematch.service.js`

```javascript
const axios = require('axios');

const BIGDATACORP_API_URL = process.env.BIGDATACORP_API_URL || 'https://app.bigdatacorp.com.br/bigid/biometrias/facematch';
const BIGDATACORP_TOKEN = process.env.BIGDATACORP_TOKEN; // Token de autenticação

/**
 * Compara duas imagens usando API BigDataCorp Facematch
 * @param {string} baseImageBase64 - Imagem base (RG) em base64
 * @param {string} matchImageBase64 - Imagem de comparação (selfie) em base64
 * @returns {Promise<{success: boolean, code: number, message: string}>}
 */
async function compararFaces(baseImageBase64, matchImageBase64) {
  try {
    const response = await axios.post(
      BIGDATACORP_API_URL,
      {
        Parameters: [
          `BASE_FACE_IMG=${baseImageBase64}`,
          `MATCH_IMG=${matchImageBase64}`
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${BIGDATACORP_TOKEN}` // Ajustar conforme autenticação BigDataCorp
        }
      }
    );

    const { code, message } = response.data;

    if (code === 80) {
      return {
        success: true,
        match: true,
        code: 80,
        message: 'Face picture match - Identidade validada'
      };
    } else if (code === -800) {
      return {
        success: true,
        match: false,
        code: -800,
        message: 'The face pictures does not match - Faces não correspondem'
      };
    } else {
      return {
        success: false,
        match: false,
        code: code,
        message: message || 'Erro na validação biométrica'
      };
    }
  } catch (error) {
    console.error('Erro ao comparar faces:', error);
    return {
      success: false,
      match: false,
      code: -999,
      message: error.message || 'Erro ao conectar com serviço de validação biométrica'
    };
  }
}

module.exports = {
  compararFaces
};
```

---

## Modificações no Controller de Login

### Arquivo: `backend/controllers/auth.controller.js`

Modificar função `login` para detectar primeiro login:

```javascript
// Após validar senha, antes de gerar token:

// Verificar se é paciente e se precisa validar biométrica
if (tipoLogin === 'paciente') {
  const precisaValidarBiometria = !usuario.biometria_aprovada;
  
  if (precisaValidarBiometria) {
    // Retornar resposta especial indicando que precisa validar biométrica
    return res.json({
      primeiroLogin: true,
      requerBiometria: true,
      paciente_id: usuario.id,
      message: 'É necessário validar sua identidade antes de acessar o sistema'
    });
  }
}

// Se chegou aqui, pode gerar token normalmente
// ... resto do código de geração de token
```

---

## Novo Endpoint: Validar Biométrica

### Arquivo: `backend/controllers/auth.controller.js`

```javascript
// POST /api/auth/validar-biometria - Validar biométrica do paciente
const validarBiometria = async (req, res) => {
  try {
    const { paciente_id, selfie_base64, documento_base64 } = req.body;

    // Validar campos obrigatórios
    if (!paciente_id || !selfie_base64 || !documento_base64) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: paciente_id, selfie_base64, documento_base64' 
      });
    }

    // Buscar paciente
    const { data: paciente, error: pacienteError } = await supabaseAdmin
      .from('pacientes')
      .select('id, nome, cpf, tem_login, login_ativo, biometria_aprovada')
      .eq('id', paciente_id)
      .single();

    if (pacienteError || !paciente) {
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }

    // Verificar se paciente tem login ativo
    if (!paciente.tem_login || !paciente.login_ativo) {
      return res.status(400).json({ error: 'Paciente não possui login ativo' });
    }

    // Verificar se já foi aprovado
    if (paciente.biometria_aprovada) {
      return res.status(400).json({ error: 'Biometria já foi validada anteriormente' });
    }

    // Chamar serviço BigDataCorp
    const resultadoValidacao = await compararFaces(documento_base64, selfie_base64);

    // Atualizar paciente com resultado
    if (resultadoValidacao.success && resultadoValidacao.match) {
      // APROVADO
      await supabaseAdmin
        .from('pacientes')
        .update({
          biometria_aprovada: true,
          biometria_aprovada_em: new Date().toISOString(),
          biometria_erro: null
        })
        .eq('id', paciente_id);

      // Gerar token JWT para o paciente
      const payload = {
        id: paciente.id,
        nome: paciente.nome,
        email: paciente.email_login,
        tipo: 'paciente',
        paciente_id: paciente.id,
        empresa_id: paciente.empresa_id,
        podealterarstatus: false,
        pode_ver_todas_novas_clinicas: false,
        is_freelancer: false
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });

      res.json({
        success: true,
        aprovado: true,
        message: 'Identidade validada com sucesso!',
        token: token,
        usuario: {
          ...paciente,
          tipo: 'paciente',
          biometria_aprovada: true
        }
      });
    } else {
      // NÃO APROVADO
      await supabaseAdmin
        .from('pacientes')
        .update({
          biometria_aprovada: false,
          biometria_erro: resultadoValidacao.message || 'Validação biométrica falhou'
        })
        .eq('id', paciente_id);

      res.status(400).json({
        success: false,
        aprovado: false,
        error: resultadoValidacao.message || 'As faces não correspondem. Por favor, tente novamente.',
        code: resultadoValidacao.code,
        podeTentarNovamente: true
      });
    }
  } catch (error) {
    console.error('Erro ao validar biométrica:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
```

---

## Componente de Validação Biométrica

### Arquivo: `frontend/src/components/ValidacaoBiometrica.js`

Componente que:
1. Captura selfie usando câmera
2. Captura foto do RG usando câmera ou upload
3. Envia para validação
4. Mostra resultado

**Estrutura básica:**
- Estado para controlar passo atual (selfie, documento, validando)
- Estado para armazenar imagens capturadas
- Função para capturar foto da câmera
- Função para fazer upload de arquivo
- Função para converter imagem para base64
- Função para enviar validação
- UI com instruções claras e feedback visual

---

## Modificações no Componente Login

### Arquivo: `frontend/src/components/Login.js`

Modificar função `handleSubmit`:

```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  setLoading(true);

  const result = await login(formData.email, formData.senha);
  
  if (!result.success) {
    // Verificar se é primeiro login e requer biométrica
    if (result.primeiroLogin && result.requerBiometria) {
      // Redirecionar para tela de validação biométrica
      navigate('/validacao-biometrica', {
        state: {
          paciente_id: result.paciente_id,
          email: formData.email,
          senha: formData.senha // Para tentar login novamente após validação
        }
      });
      return;
    }
    
    setError(result.error || 'Credenciais inválidas. Verifique email e senha.');
  }
  
  setLoading(false);
};
```

---

## Rota no Frontend

### Arquivo: `frontend/src/App.js` ou router principal

Adicionar rota:

```javascript
<Route path="/validacao-biometrica" element={<ValidacaoBiometrica />} />
```

---

## Variáveis de Ambiente

### Arquivo: `backend/.env`

```env
# BigDataCorp API
BIGDATACORP_API_URL=https://app.bigdatacorp.com.br/bigid/biometrias/facematch
BIGDATACORP_TOKEN=seu_token_aqui
```

---

## Próximos Passos de Implementação

1. ✅ Criar script SQL para adicionar campos no banco
2. ✅ Criar serviço BigDataCorp Facematch
3. ✅ Modificar controller de login
4. ✅ Criar endpoint de validação biométrica
5. ✅ Criar componente ValidacaoBiometrica.js
6. ✅ Modificar componente Login.js
7. ✅ Adicionar rota no frontend
8. ✅ Testar fluxo completo

---

**Documento criado em**: 2025-01-27
**Última atualização**: 2025-01-27
