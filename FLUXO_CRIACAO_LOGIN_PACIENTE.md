# Fluxo de Criação de Login para Pacientes

## Visão Geral

Este documento descreve o fluxo completo de criação de login para pacientes, que permite que pacientes façam login no portal do sistema para visualizar seus boletos e informações.

---

## 1. Acesso ao Fluxo

### Localização
- **Frontend**: Aba "Meus Pacientes" → Visualizar paciente → Botão "Gerar Login"
- **Backend**: `POST /api/pacientes/:id/criar-login`

### Permissões
- **Apenas clínicas** podem criar login para pacientes
- Clínica só pode criar login para **seus próprios pacientes** (`clinica_id`)

---

## 2. Dois Modos de Criação

### Modo 1: Geração Automática (Recomendado)
- **Quando**: Clínica clica em "Gerar Login" sem fornecer email/senha
- **Como funciona**:
  - Sistema gera email automaticamente: `primeiroNome.segundoNome@grupoim.com.br`
  - Sistema usa CPF como senha (11 dígitos)
- **Requisitos**:
  - Paciente deve ter CPF cadastrado
  - Paciente deve ter nome completo cadastrado

### Modo 2: Criação Manual
- **Quando**: Clínica abre modal e preenche email/senha manualmente
- **Como funciona**:
  - Clínica fornece email e senha personalizados
  - Validações: email válido, senha mínimo 6 caracteres

---

## 3. Fluxo Completo - Geração Automática

### Frontend (`Pacientes.js` - linhas 7133-7175)

```
1. Clínica visualiza paciente na aba "Meus Pacientes"
   ↓
2. Sistema verifica se paciente tem CPF cadastrado
   ↓
3. Se não tem CPF: Exibe aviso "É necessário cadastrar o CPF"
   ↓
4. Se tem CPF: Mostra botão "Gerar Login"
   ↓
5. Clínica clica em "Gerar Login"
   ↓
6. Sistema chama API POST /pacientes/:id/criar-login
   Body: {} (vazio - para gerar automaticamente)
   ↓
7. Backend processa e gera credenciais
   ↓
8. Frontend recebe resposta com credenciais
   ↓
9. Frontend abre modal mostrando:
   - Email gerado
   - Senha gerada (CPF)
   ↓
10. Clínica pode copiar credenciais para enviar ao paciente
```

### Backend (`pacientes.controller.js` - linhas 1618-1784)

```
1. Recebe requisição POST /pacientes/:id/criar-login
   ↓
2. Verifica se usuário é clínica (tipo === 'clinica')
   ↓
3. Busca paciente no banco de dados
   ↓
4. Verifica se paciente pertence à clínica
   ↓
5. Verifica se email/senha foram fornecidos
   ↓
6. SE NÃO FORNECIDOS (geração automática):
   a. Valida se paciente tem CPF cadastrado
   b. Valida se paciente tem nome cadastrado
   c. Normaliza CPF (remove formatação)
   d. Normaliza nome (remove acentos, espaços, etc.)
   e. Gera email: primeiroNome.segundoNome@grupoim.com.br
   f. Define senha: CPF completo (11 dígitos)
   ↓
7. Valida formato de email
   ↓
8. Verifica se email já existe (exceto para o próprio paciente)
   ↓
9. Gera hash da senha com bcrypt
   ↓
10. Atualiza paciente no banco:
    - email_login: email gerado
    - senha_hash: hash da senha
    - tem_login: true
    - login_ativo: true
    ↓
11. Retorna resposta com credenciais
```

---

## 4. Geração de Email Automático

### Função `normalizarNomeParaEmail`
- Remove acentos e caracteres especiais
- Converte para minúsculas
- Remove espaços extras
- Formato final: `primeiroNome.segundoNome@grupoim.com.br`

### Exemplos:
- **Nome**: "João Silva Santos"
  - **Email**: `joao.silva@grupoim.com.br`
  
- **Nome**: "Maria da Silva"
  - **Email**: `maria.silva@grupoim.com.br`

### Regras:
- Se nome tiver apenas uma palavra: `primeiroNome@grupoim.com.br`
- Se nome tiver múltiplas palavras: `primeiroNome.segundoNome@grupoim.com.br`

---

## 5. Geração de Senha Automática

### Regra:
- **Senha = CPF completo** (11 dígitos, sem formatação)
- Exemplo: CPF `123.456.789-00` → Senha `12345678900`

### Validação:
- CPF deve ter exatamente 11 dígitos após normalização
- Se não tiver 11 dígitos, retorna erro 400

---

## 6. Recriar Login Existente

### Quando acontece:
- Paciente já tem login (`tem_login === true` e `login_ativo === true`)
- Clínica clica em "Gerar Novo Login"

### Fluxo:
1. Sistema confirma com clínica: "Deseja gerar um novo login? O login atual será substituído"
2. Se confirmado, procede com criação
3. Login anterior é **substituído** (não é desativado, é sobrescrito)
4. Resposta inclui flag `recriado: true`

### Importante:
- Login anterior **não** pode mais ser usado
- Paciente precisa usar as novas credenciais

---

## 7. Validações e Erros

### Validações no Backend:

| Validação | Erro | Mensagem |
|-----------|------|----------|
| Usuário não é clínica | 403 | "Apenas clínicas podem criar login para pacientes" |
| Paciente não encontrado | 404 | "Paciente não encontrado" |
| Paciente não pertence à clínica | 403 | "Você só pode criar login para pacientes da sua clínica" |
| CPF não cadastrado (auto) | 400 | "Paciente não possui CPF cadastrado. É necessário cadastrar o CPF antes de gerar o login." |
| Nome não cadastrado (auto) | 400 | "Paciente não possui nome cadastrado. É necessário cadastrar o nome antes de gerar o login." |
| CPF inválido (< 11 dígitos) | 400 | "CPF inválido. O CPF deve ter 11 dígitos." |
| Email inválido | 400 | "Email inválido" |
| Email já existe | 400 | "Email já cadastrado" + nome do outro paciente |
| Senha < 6 caracteres (manual) | 400 | "A senha deve ter pelo menos 6 caracteres" |

---

## 8. Resposta da API

### Sucesso (200 OK):
```json
{
  "success": true,
  "message": "Login criado com sucesso" ou "Login recriado com sucesso",
  "recriado": false, // true se estava recriando
  "autoGerado": true, // true se foi gerado automaticamente
  "credenciais": {
    "email": "joao.silva@grupoim.com.br",
    "senha": "12345678900" // CPF completo
  },
  "paciente": {
    "id": 123,
    "nome": "João Silva",
    "email": "joao.silva@grupoim.com.br",
    "tem_login": true,
    "login_ativo": true
  }
}
```

### Erro (400/403/404/500):
```json
{
  "error": "Mensagem de erro",
  "message": "Descrição adicional (opcional)"
}
```

---

## 9. Modal de Credenciais Geradas

### Localização: `Pacientes.js` (linhas ~7176+)

### O que mostra:
- Email gerado
- Senha gerada (CPF)
- Botão para copiar credenciais
- Informação de que credenciais devem ser enviadas ao paciente

### Ações disponíveis:
- Copiar email
- Copiar senha
- Copiar ambas credenciais
- Fechar modal

---

## 10. Campos no Banco de Dados

### Campos atualizados na tabela `pacientes`:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `email_login` | string | Email usado para login |
| `senha_hash` | string | Hash bcrypt da senha |
| `tem_login` | boolean | Indica se paciente tem login |
| `login_ativo` | boolean | Indica se login está ativo |

---

## 11. Segurança

### Proteções Implementadas:
1. **Autenticação**: Apenas usuários autenticados podem criar login
2. **Autorização**: Apenas clínicas podem criar login
3. **Isolamento**: Clínica só pode criar login para seus próprios pacientes
4. **Hash de senha**: Senha nunca é armazenada em texto plano
5. **Validação de email**: Verifica se email já existe antes de criar
6. **Validação de CPF**: Valida formato antes de usar como senha

---

## 12. Fluxo de Login do Paciente

### Após criar login, paciente pode:
1. Acessar portal do paciente
2. Fazer login com:
   - **Email**: `primeiroNome.segundoNome@grupoim.com.br`
   - **Senha**: CPF completo (11 dígitos)
3. Visualizar seus boletos
4. Ver histórico de pagamentos
5. Acessar documentos

---

## 13. Casos de Uso

### Caso 1: Cadastro Completo de Paciente
```
1. Clínica cadastra paciente
2. Clínica preenche CPF obrigatório
3. Clínica visualiza paciente
4. Clínica clica em "Gerar Login"
5. Sistema gera credenciais automaticamente
6. Clínica copia credenciais e envia ao paciente
7. Paciente faz login e acessa portal
```

### Caso 2: Recriar Login Perdido
```
1. Paciente perdeu credenciais
2. Clínica visualiza paciente
3. Clínica clica em "Gerar Novo Login"
4. Sistema confirma substituição
5. Sistema gera novas credenciais
6. Clínica envia novas credenciais ao paciente
```

### Caso 3: Criar Login Manual (raro)
```
1. Clínica quer email personalizado
2. Clínica abre modal de criação manual
3. Clínica preenche email e senha
4. Sistema valida e cria login
5. Login é criado com credenciais personalizadas
```

---

## 14. Referências de Código

### Frontend
- Componente principal: `frontend/src/components/Pacientes.js`
- Modal de criação manual: `frontend/src/components/ModalCriarLoginPaciente.js`
- Botão gerar login: Linhas 7133-7175
- Modal credenciais geradas: Linhas ~7176+

### Backend
- Controller: `backend/controllers/pacientes.controller.js`
- Função `criarLoginPaciente`: Linhas 1618-1784
- Rota: `backend/routes/pacientes.routes.js` (linha 24)

### Funções Auxiliares
- `normalizarNomeParaEmail`: Normaliza nome para email
- `normalizarEmail`: Normaliza email (lowercase, trim)

---

## 15. Observações Importantes

1. **CPF obrigatório**: Para geração automática, CPF é obrigatório
2. **Nome completo**: Nome deve ter pelo menos 2 palavras para gerar email no formato `primeiro.segundo@grupoim.com.br`
3. **Senha = CPF**: Senha gerada automaticamente é sempre o CPF completo
4. **Email único**: Email não pode ser duplicado entre pacientes
5. **Substituição**: Recriar login substitui o anterior (não desativa)
6. **Segurança**: Senha nunca é retornada após criação (apenas na resposta inicial)

---

**Documento criado em**: 2025-01-27
**Última atualização**: 2025-01-27
