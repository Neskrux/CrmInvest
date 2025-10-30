# 📋 Plano de Implementação: Portal do Paciente

## 🎯 Objetivo

Permitir que pacientes da empresa_id 3, após aprovação total pela clínica, tenham acesso ao sistema através de login próprio (email e senha), com acesso restrito a 4 páginas:
1. **Dashboard** - Visão geral do paciente
2. **Agendamentos** - Ver seus agendamentos
3. **Meus Documentos** - Gerenciar documentos
4. **Meus Boletos** - Visualizar e gerenciar boletos

---

## 🔄 Fluxo Completo

### 1. **Clínica Cria Login para Paciente**

**Quando:** Após aprovação total do paciente e ele já estar no sistema

**Onde:** Interface da clínica em `Pacientes.js` (modal de visualização/edição)

**Ação:**
- Clínica acessa paciente aprovado
- Botão "Criar Login para Paciente"
- Modal para definir:
  - **Email** (obrigatório, único)
  - **Senha** (obrigatório, mínimo 6 caracteres)
  - **Confirmar senha**

**Backend:** `POST /api/pacientes/:id/criar-login`

---

## 🗄️ Estrutura de Banco de Dados

### Opção 1: Adicionar campos na tabela `pacientes`

```sql
ALTER TABLE pacientes ADD COLUMN email_login VARCHAR(255) UNIQUE;
ALTER TABLE pacientes ADD COLUMN senha_hash VARCHAR(255);
ALTER TABLE pacientes ADD COLUMN tem_login BOOLEAN DEFAULT FALSE;
ALTER TABLE pacientes ADD COLUMN login_ativo BOOLEAN DEFAULT TRUE;
ALTER TABLE pacientes ADD COLUMN ultimo_login TIMESTAMP;
```

### Opção 2: Criar tabela separada `pacientes_login`

```sql
CREATE TABLE pacientes_login (
  id SERIAL PRIMARY KEY,
  paciente_id INTEGER REFERENCES pacientes(id) ON DELETE CASCADE UNIQUE,
  email VARCHAR(255) UNIQUE NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  ativo BOOLEAN DEFAULT TRUE,
  ultimo_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Recomendação:** Usar Opção 1 (mais simples, menos joins)

---

## 🔐 Backend - Autenticação

### 1. **Criar Login para Paciente**

**Endpoint:** `POST /api/pacientes/:id/criar-login`

**Controller:** `backend/controllers/pacientes.controller.js`

**Validações:**
- ✅ Verificar se usuário é clínica e paciente pertence à clínica
- ✅ Verificar se paciente já tem login
- ✅ Verificar se email já existe
- ✅ Validar senha (mínimo 6 caracteres)
- ✅ Hash da senha com bcrypt

**Response:**
```json
{
  "success": true,
  "message": "Login criado com sucesso",
  "email": "paciente@email.com"
}
```

### 2. **Atualizar Login do Paciente**

**Endpoint:** `PUT /api/pacientes/:id/atualizar-login`

**Permitir:**
- Alterar senha
- Alterar email (verificar se não existe)

### 3. **Adicionar Login de Paciente no Sistema de Autenticação**

**Arquivo:** `backend/controllers/auth.controller.js`

**Modificar função `login`:**
```javascript
// Adicionar depois de verificar consultores
if (!usuario && typeof email === 'string' && email.includes('@')) {
  // Buscar em PACIENTES
  const { data: pacientes, error } = await supabaseAdmin
    .from('pacientes')
    .select('*')
    .eq('email_login', emailNormalizado)
    .eq('login_ativo', true)
    .eq('tem_login', true);
  
  if (pacientes && pacientes.length > 0) {
    usuario = pacientes[0];
    tipoLogin = 'paciente';
  }
}
```

**Modificar verificação de senha:**
```javascript
if (tipoLogin === 'clinica') {
  senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
} else if (tipoLogin === 'paciente') {
  senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
} else {
  senhaValida = await bcrypt.compare(senha, usuario.senha);
}
```

**Modificar payload JWT:**
```javascript
const payload = {
  id: usuario.id,
  nome: usuario.nome,
  email: tipoLogin === 'clinica' ? usuario.email_login : 
         tipoLogin === 'paciente' ? usuario.email_login : 
         usuario.email,
  tipo: tipoLogin === 'paciente' ? 'paciente' : (tipoLogin === 'clinica' ? 'clinica' : usuario.tipo),
  paciente_id: tipoLogin === 'paciente' ? usuario.id : null,
  clinica_id: tipoLogin === 'clinica' ? usuario.id : null,
  consultor_id: usuario.consultor_id || null,
  empresa_id: usuario.empresa_id || null,
  // ... outros campos
};
```

**Modificar `verifyToken`:**
```javascript
else if (req.user.tipo === 'paciente') {
  const { data: pacienteData } = await supabaseAdmin
    .from('pacientes')
    .select('*')
    .eq('id', req.user.id)
    .eq('login_ativo', true)
    .eq('tem_login', true)
    .single();
  
  if (pacienteData) {
    usuario = pacienteData;
    tipo = 'paciente';
    consultor_id = null;
  }
}
```

---

## 🎨 Frontend - Interface do Paciente

### 1. **Criar Login no Paciente (Clínica)**

**Componente:** `frontend/src/components/Pacientes.js`

**Adicionar no modal de visualização:**
```javascript
// Botão "Criar Login" quando paciente não tem login
{!viewPaciente.tem_login && isClinica && (
  <button onClick={() => setShowCriarLoginModal(true)}>
    Criar Login para Paciente
  </button>
)}

// Modal para criar login
{showCriarLoginModal && (
  <ModalCriarLoginPaciente
    paciente={viewPaciente}
    onClose={() => setShowCriarLoginModal(false)}
    onSuccess={() => {
      // Recarregar dados do paciente
      fetchPacientes();
    }}
  />
)}
```

### 2. **Rotas do Paciente**

**Arquivo:** `frontend/src/App.js`

**Adicionar no `RenderContent`:**
```javascript
// Pacientes têm acesso limitado: Dashboard, Agendamentos, Meus Documentos, Meus Boletos
if (user?.tipo === 'paciente') {
  return (
    <Routes>
      <Route path="/dashboard" element={<DashboardPaciente />} />
      <Route path="/agendamentos" element={<AgendamentosPaciente />} />
      <Route path="/meus-documentos" element={<MeusDocumentosPaciente />} />
      <Route path="/meus-boletos" element={<MeusBoletosPaciente />} />
      <Route path="/perfil" element={<PerfilPaciente />} />
      {/* Redirecionar qualquer outra rota para dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
```

### 3. **Componentes do Paciente**

#### **DashboardPaciente**
- Visão geral do paciente
- Resumo de agendamentos
- Resumo de boletos (em aberto, pagos, vencidos)
- Últimos documentos

#### **AgendamentosPaciente**
- Listar apenas agendamentos do paciente logado
- Filtros: status, data
- Visualizar detalhes do agendamento

#### **MeusDocumentosPaciente**
- Listar documentos do paciente
- Upload de documentos (se permitido)
- Download de documentos

#### **MeusBoletosPaciente**
- Listar boletos do paciente
- Filtros: status (em aberto, pago, vencido)
- Visualizar boleto (PDF)
- Copiar código de barras
- Visualizar QRCode
- Histórico de pagamentos

### 4. **Atualizar AuthContext**

**Arquivo:** `frontend/src/contexts/AuthContext.js`

**Adicionar helpers:**
```javascript
const value = {
  // ... existentes
  isPaciente: user?.tipo === 'paciente',
  pacienteId: user?.paciente_id || user?.id || null,
  // ... outros
};
```

### 5. **Sidebar do Paciente**

**Arquivo:** `frontend/src/App.js`

**Adicionar navegação específica para paciente:**
```javascript
{user?.tipo === 'paciente' && (
  <>
    <Link to="/dashboard" onClick={handleMobileNavigation}>
      Dashboard
    </Link>
    <Link to="/agendamentos" onClick={handleMobileNavigation}>
      Agendamentos
    </Link>
    <Link to="/meus-documentos" onClick={handleMobileNavigation}>
      Meus Documentos
    </Link>
    <Link to="/meus-boletos" onClick={handleMobileNavigation}>
      Meus Boletos
    </Link>
    <Link to="/perfil" onClick={handleMobileNavigation}>
      Perfil
    </Link>
  </>
)}
```

---

## 📝 Endpoints Backend Necessários

### **Pacientes**

1. `POST /api/pacientes/:id/criar-login` - Criar login para paciente
2. `PUT /api/pacientes/:id/atualizar-login` - Atualizar login do paciente
3. `DELETE /api/pacientes/:id/desativar-login` - Desativar login do paciente

### **Dashboard do Paciente**

1. `GET /api/pacientes/dashboard` - Dashboard do paciente logado
   - Resumo de agendamentos
   - Resumo de boletos
   - Próximos vencimentos

### **Agendamentos do Paciente**

1. `GET /api/pacientes/agendamentos` - Listar agendamentos do paciente logado
   - Filtrar por `paciente_id = req.user.id`

### **Documentos do Paciente**

1. `GET /api/pacientes/documentos` - Listar documentos do paciente logado
2. `POST /api/pacientes/documentos` - Upload de documento (se permitido)

### **Boletos do Paciente**

1. `GET /api/pacientes/boletos` - Listar boletos do paciente logado
   - Filtrar por `paciente_id = req.user.id`
   - Incluir status atualizado da Caixa
2. `GET /api/pacientes/boletos/:id` - Detalhes do boleto
3. `GET /api/pacientes/boletos/:id/pdf` - Download do PDF do boleto

---

## 🔒 Segurança e Validações

### Backend

1. **Middleware de Autenticação:**
   - Verificar se paciente está ativo
   - Verificar se tem login ativo
   - Filtrar dados apenas do paciente logado

2. **Validações:**
   - Email único no sistema
   - Senha mínima 6 caracteres
   - Hash da senha com bcrypt (10 rounds)

3. **Filtros Automáticos:**
   - Paciente só vê seus próprios dados
   - Clínica só cria login para seus pacientes

### Frontend

1. **Rotas Protegidas:**
   - Verificar se é paciente antes de acessar rotas
   - Redirecionar para login se não autenticado

2. **Validações:**
   - Email válido
   - Senha forte
   - Confirmação de senha

---

## 📋 Checklist de Implementação

### Fase 1: Estrutura Base
- [ ] Adicionar campos na tabela `pacientes` (email_login, senha_hash, tem_login, login_ativo)
- [ ] Criar endpoint para criar login (`POST /api/pacientes/:id/criar-login`)
- [ ] Modificar sistema de autenticação para suportar pacientes
- [ ] Adicionar verificação de token para pacientes

### Fase 2: Interface Clínica
- [ ] Adicionar botão "Criar Login" no modal de paciente
- [ ] Criar componente `ModalCriarLoginPaciente`
- [ ] Mostrar status do login no paciente
- [ ] Permitir atualizar/desativar login

### Fase 3: Interface Paciente
- [ ] Criar componente `DashboardPaciente`
- [ ] Criar componente `AgendamentosPaciente`
- [ ] Criar componente `MeusDocumentosPaciente`
- [ ] Criar componente `MeusBoletosPaciente`
- [ ] Adicionar rotas no `App.js`
- [ ] Adicionar navegação específica para paciente

### Fase 4: Endpoints Backend
- [ ] `GET /api/pacientes/dashboard` - Dashboard do paciente
- [ ] `GET /api/pacientes/agendamentos` - Agendamentos do paciente
- [ ] `GET /api/pacientes/documentos` - Documentos do paciente
- [ ] `GET /api/pacientes/boletos` - Boletos do paciente
- [ ] `GET /api/pacientes/boletos/:id` - Detalhes do boleto
- [ ] `GET /api/pacientes/boletos/:id/pdf` - PDF do boleto

### Fase 5: Integração com API Caixa
- [ ] Integrar consulta de boletos na API Caixa
- [ ] Sincronizar status de pagamento
- [ ] Mostrar QRCode e código de barras
- [ ] Download de PDF do boleto

### Fase 6: Testes e Ajustes
- [ ] Testar criação de login pela clínica
- [ ] Testar login do paciente
- [ ] Testar acesso às páginas
- [ ] Testar filtros de segurança
- [ ] Testar integração com API Caixa

---

## 🎨 Considerações de UI/UX

1. **Interface Simplificada:**
   - Design limpo e intuitivo
   - Foco nas informações do paciente
   - Navegação fácil

2. **Mobile First:**
   - Responsivo para mobile
   - Fácil acesso em smartphones

3. **Feedback Visual:**
   - Mensagens de sucesso/erro claras
   - Loading states apropriados
   - Confirmações importantes

---

## ⚠️ Pontos de Atenção

1. **Segurança:**
   - Nunca expor dados de outros pacientes
   - Validar sempre no backend
   - Usar HTTPS em produção

2. **Email:**
   - Email deve ser único no sistema
   - Validar formato de email
   - Enviar email de boas-vindas quando login é criado

3. **Senha:**
   - Mínimo 6 caracteres
   - Hash com bcrypt
   - Não armazenar senha em texto plano

4. **Filtros:**
   - Sempre filtrar por `paciente_id = req.user.id`
   - Verificar no backend mesmo se frontend filtra

---

**Data:** Dezembro 2024
**Status:** ✅ PLANO COMPLETO - PRONTO PARA IMPLEMENTAÇÃO

