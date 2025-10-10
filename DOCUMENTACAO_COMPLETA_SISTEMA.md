# 📋 DOCUMENTAÇÃO COMPLETA DO SISTEMA CRM INVEST

## 🎯 O QUE É O SISTEMA?

O **CRM Invest** é um sistema completo de gestão de relacionamento com clientes (CRM) desenvolvido especificamente para **intermediação de crédito para tratamentos estéticos e odontológicos**. O sistema gerencia todo o ciclo de vendas, desde a captação de leads até o fechamento e gestão financeira de pacientes.

---

## 👥 TIPOS DE USUÁRIOS E PERMISSÕES

### 1. **ADMIN** (Administrador)
**Tipo**: `admin`
**Tabela**: `usuarios`

#### 📍 O que vê:
- ✅ **TUDO** - Visão completa e irrestrita de todos os dados do sistema
- ✅ Dashboard com estatísticas gerais
- ✅ Todos os leads e pacientes (de todos os consultores e clínicas)
- ✅ Todos os agendamentos
- ✅ Todos os fechamentos
- ✅ Todas as clínicas
- ✅ Todos os consultores
- ✅ Metas e objetivos mensais/semanais
- ✅ Ranking completo de desempenho

#### 🔐 O que pode fazer:
- ✅ **Criar, editar e excluir** qualquer registro (leads, pacientes, agendamentos, fechamentos, clínicas, consultores)
- ✅ **Aprovar/reprovar** fechamentos
- ✅ **Alterar status** de todos os registros
- ✅ **Definir e editar metas** do sistema
- ✅ **Gerenciar usuários** (criar consultores, admins, etc.)
- ✅ **Acessar relatórios** completos e exportações
- ✅ **Configurar permissões** de outros usuários

#### 📊 Tela "Meus Pacientes":
O Admin vê **TODOS OS PACIENTES** do sistema, divididos em:
- **Aba Leads**: Todos os leads de todos os consultores
  - Status: lead, em_conversa, não_responde, cpf_aprovado, não_elegível, sem_interesse, agendado, compareceu, fechado, reagendado
  - Pode editar, alterar status e excluir qualquer lead
  
- **Aba Pacientes**: Todos os pacientes financeiros do sistema
  - Campos: CPF, nome, contato, valor parcela, nº parcelas, vencimento, valor tratamento, antecipação, data operação, entregue, análise, responsável, documentos
  - Pode criar, editar e excluir qualquer paciente
  - Pode fazer upload/download de documentos
  - Pode alterar status financeiro

---

### 2. **CONSULTOR INTERNO**
**Tipo**: `consultor` + `pode_ver_todas_novas_clinicas=true` + `podealterarstatus=true`
**Tabela**: `consultores`

#### 📍 O que vê:
- ✅ **Dashboard completo** (igual ao admin)
- ✅ **Todos os leads** do sistema
- ✅ **Todos os pacientes** do sistema
- ✅ **Todos os agendamentos**
- ✅ **Todos os fechamentos**
- ✅ **Todas as clínicas**
- ✅ Ranking completo
- ✅ Comissões próprias e gerais

#### 🔐 O que pode fazer:
- ✅ **Criar e editar** leads e pacientes (de todos)
- ✅ **Alterar status** de leads e pacientes
- ✅ **Criar e editar** agendamentos
- ✅ **Criar e editar** fechamentos
- ✅ **Ver todas as clínicas** (inclusive as que não são suas)
- ❌ **NÃO pode excluir** registros (apenas admin)
- ❌ **NÃO pode aprovar/reprovar** fechamentos (apenas admin)

#### 📊 Tela "Meus Pacientes":
O Consultor Interno vê **TODOS OS PACIENTES** (como admin):
- **Aba Leads**: Todos os leads do sistema
  - Pode editar e alterar status de qualquer lead
  - Pode criar novos leads
  
- **Aba Pacientes**: Todos os pacientes financeiros
  - Pode criar, editar e visualizar todos os pacientes
  - Pode fazer upload/download de documentos
  - Pode alterar status financeiro

---

### 3. **CONSULTOR FREELANCER / EXTERNO**
**Tipo**: `consultor` + `pode_ver_todas_novas_clinicas=false` OU `podealterarstatus=false` OU `is_freelancer=true`
**Tabela**: `consultores`

#### 📍 O que vê:
- ✅ Dashboard **filtrado** (apenas seus dados)
- ✅ **Apenas SEUS leads** (consultor_id = seu ID)
- ✅ **Apenas SEUS pacientes** (via agendamentos/fechamentos)
- ✅ **Apenas SEUS agendamentos**
- ✅ **Apenas SEUS fechamentos**
- ✅ **Apenas clínicas** vinculadas a ele
- ✅ Apenas **suas comissões**
- ❌ **NÃO vê** dados de outros consultores

#### 🔐 O que pode fazer:
- ✅ **Ver e editar** apenas seus próprios leads
- ✅ **Ver** seus pacientes (via agendamentos)
- ✅ **Criar** agendamentos para seus leads
- ✅ **Criar** fechamentos para seus pacientes
- ❌ **NÃO pode alterar status** de leads/pacientes (podealterarstatus=false)
- ❌ **NÃO pode editar** pacientes completamente
- ❌ **NÃO pode excluir** nada
- ❌ **NÃO pode ver** leads/pacientes de outros consultores

#### 📊 Tela "Meus Pacientes":
O Consultor Freelancer vê **APENAS SEUS PACIENTES**:
- **Aba Leads**: Apenas leads onde consultor_id = seu ID
  - Pode ver e comentar
  - **NÃO pode alterar status** (se podealterarstatus=false)
  
- **Aba Pacientes**: Apenas pacientes vinculados via agendamentos/fechamentos
  - Visualização **somente leitura**
  - **NÃO pode editar** dados financeiros
  - Pode ver documentos

---

### 4. **CLÍNICA**
**Tipo**: `clinica`
**Tabela**: `clinicas`

#### 📍 O que vê:
- ✅ Dashboard **específico para clínicas** (layout diferente)
- ✅ **Apenas pacientes agendados/atendidos** em sua clínica
- ✅ **Apenas agendamentos** para sua clínica (clinica_id = seu ID)
- ✅ **Apenas fechamentos** relacionados à sua clínica
- ✅ Estatísticas de **evolução mensal** da clínica
- ✅ Gráficos de **pacientes atendidos** na clínica
- ❌ **NÃO vê** dados de outras clínicas
- ❌ **NÃO vê** comissões de consultores
- ❌ **NÃO vê** ranking geral

#### 🔐 O que pode fazer:
- ✅ **Ver** agendamentos de pacientes na clínica
- ✅ **Ver** status de atendimento
- ✅ **Ver** dados de fechamentos relacionados
- ✅ **Editar** perfil da própria clínica
- ❌ **NÃO pode criar** leads ou pacientes
- ❌ **NÃO pode alterar** status de nada
- ❌ **NÃO pode excluir** nada
- ❌ **NÃO pode ver** dados de consultores

#### 📊 Tela "Meus Pacientes":
A Clínica vê **APENAS PACIENTES AGENDADOS/ATENDIDOS NELA**:
- **Aba Leads**: Leads que têm agendamentos marcados na clínica
  - **Visualização somente leitura**
  - Pode ver informações básicas
  
- **Aba Pacientes**: Pacientes que passaram pela clínica
  - **Visualização somente leitura**
  - Pode ver dados financeiros básicos
  - Pode ver status de entrega

---

### 5. **EMPRESA**
**Tipo**: `empresa`
**Tabela**: `empresas`

#### 📍 O que vê:
- ✅ **Apenas consultores** vinculados à empresa (empresa_id = seu ID)
- ✅ **Apenas clínicas** cadastradas por seus consultores
- ✅ Dashboard filtrado pelos dados da empresa
- ❌ **NÃO vê** dados de outras empresas
- ❌ **NÃO vê** consultores externos

#### 🔐 O que pode fazer:
- ✅ **Gerenciar** consultores da empresa (criar, editar, desativar)
- ✅ **Ver** desempenho dos consultores da empresa
- ✅ **Ver** clínicas cadastradas pela empresa
- ❌ **NÃO pode alterar** status de leads/pacientes
- ❌ **NÃO pode excluir** registros críticos

#### 📊 Tela "Meus Pacientes":
A Empresa vê **PACIENTES DOS CONSULTORES DA EMPRESA**:
- Filtrado por: consultores onde empresa_id = seu ID

---

## 🔄 FLUXO COMPLETO DO SISTEMA

### ETAPA 1️⃣: CAPTAÇÃO DE LEADS
**Componente**: `CapturaLead.js` (página pública)

- Cliente interessado preenche formulário público
- Dados capturados:
  - Nome, telefone, CPF
  - Cidade, Estado
  - Tipo de tratamento (Estético/Odontológico)
- Lead é criado com status **"lead"**
- Lead é atribuído a um consultor

**Rota Backend**: `POST /api/pacientes`

---

### ETAPA 2️⃣: QUALIFICAÇÃO DO LEAD
**Componente**: `Pacientes.js` → Aba "Leads"

**Status do Lead**:
1. **lead** → Novo lead cadastrado
2. **em_conversa** → Consultor está conversando com o paciente
3. **não_responde** → Paciente não respondeu tentativas de contato
4. **cpf_aprovado** → CPF foi consultado e aprovado para crédito
5. **não_elegível** → Paciente não é elegível para crédito
6. **sem_interesse** → Paciente não tem interesse
7. **agendado** → Consulta agendada com clínica
8. **compareceu** → Paciente compareceu à clínica
9. **fechado** → Contrato fechado - venda realizada
10. **reagendado** → Consulta foi reagendada

**Ações do Consultor**:
- Entrar em contato com o lead
- Atualizar status conforme avanço
- Adicionar observações
- Verificar elegibilidade de CPF

---

### ETAPA 3️⃣: AGENDAMENTO NA CLÍNICA
**Componente**: `Agendamentos.js`

- Consultor marca agendamento para o lead em uma clínica
- Dados do agendamento:
  - Paciente (lead)
  - Clínica
  - Data e horário
  - Status: agendado, reagendado, confirmado, cancelado, compareceu
- Sistema envia lembrete automático (WhatsApp)

**Rota Backend**: `POST /api/agendamentos`

---

### ETAPA 4️⃣: ATENDIMENTO NA CLÍNICA
- Clínica acessa o sistema e vê os agendamentos
- Confirma comparecimento do paciente
- Status é atualizado para **"compareceu"**
- Clínica realiza avaliação do tratamento

---

### ETAPA 5️⃣: FECHAMENTO / CONTRATO
**Componente**: `Fechamentos.js`

- Paciente decide fechar o tratamento
- Consultor cria um **Fechamento**:
  - Valor do tratamento
  - Forma de pagamento
  - Clínica onde será feito
  - Upload de contrato assinado
  - Observações
- Status: **pendente** (aguardando aprovação do admin)

**Rota Backend**: `POST /api/fechamentos`

**Aprovação do Admin**:
- Admin revisa o fechamento
- **Aprova** → consultor recebe comissão
- **Reprova** → consultor corrige informações

**Rotas Backend**: 
- `PUT /api/fechamentos/:id/aprovar`
- `PUT /api/fechamentos/:id/reprovar`

---

### ETAPA 6️⃣: GESTÃO FINANCEIRA DO PACIENTE
**Componente**: `Pacientes.js` → Aba "Pacientes"

- Após fechamento, paciente entra na gestão financeira
- **Campos Financeiros**:
  - CPF, Nome, Contato
  - **Valor da Parcela** (R$)
  - **Número de Parcelas**
  - **Data de Vencimento**
  - **Valor Total do Tratamento**
  - **Antecipação** (em meses)
  - **Data da Operação**
  - **Entregue** (sim/não)
  - **Análise** (status da análise de crédito)
  - **Responsável** (quem está cuidando)
  - **Observações Financeiras**

- **Documentos do Paciente**:
  - 📷 Selfie com Documento
  - 📄 Documento (RG/CNH)
  - 🏠 Comprovante de Residência
  - 📑 Contrato de Serviço
  - ✅ Confirmação do Sacado

**Status Financeiro**:
1. **novo** → Novo paciente cadastrado
2. **em_analise** → Em análise de crédito
3. **aprovado** → Crédito aprovado
4. **reprovado** → Crédito reprovado
5. **pendente_documentos** → Faltam documentos
6. **operacao_realizada** → Operação financeira realizada
7. **finalizado** → Processo finalizado

**Rotas Backend**: 
- `GET /api/pacientes-financeiro`
- `POST /api/pacientes-financeiro`
- `PUT /api/pacientes-financeiro/:id`
- `POST /api/pacientes-financeiro/:id/upload-documento`

---

## 📊 DASHBOARD - VISÃO POR TIPO DE USUÁRIO

### **ADMIN / CONSULTOR INTERNO**
**Componente**: `Dashboard.js` (versão completa)

#### 📈 KPIs Principais:
- Total de Pacientes (Leads)
- Total de Agendamentos
- Total de Fechamentos
- Valor Total Fechado
- Agendamentos Hoje

#### 📊 Gráficos:
1. **Pipeline de Vendas** (funil)
   - Lead → Em Conversa → CPF Aprovado → Agendado → Fechado
   
2. **Fechamentos por Mês** (evolução temporal)

3. **Pacientes por Cidade** (geolocalização)

4. **Ranking de Consultores**
   - Top 3 consultores do mês
   - Pacientes fechados por consultor
   - Comissões por consultor

5. **Metas Semanais/Mensais** (apenas admin)
   - Meta de pacientes fechados
   - Meta de clínicas aprovadas
   - Meta de valor de fechamentos
   - Progresso semanal

#### 🔍 Filtros Disponíveis:
- Por período (semanal, mensal, total)
- Por região (cidade, estado)
- Por consultor
- Por status

---

### **CLÍNICA**
**Componente**: `Dashboard.js` (versão clínica)

#### 📈 KPIs Específicos:
- Total de Pacientes Atendidos (na clínica)
- Total de Agendamentos (para a clínica)
- Total de Fechamentos (na clínica)
- Valor Total Fechado (na clínica)

#### 📊 Gráficos:
1. **Evolução Mensal de Atendimentos** (últimos 6 meses)
   - Quantos pacientes atendidos por mês
   
2. **Pipeline de Vendas** (da clínica)
   - Agendado → Compareceu → Fechado

#### ❌ NÃO Visualiza:
- Comissões de consultores
- Ranking geral
- Metas do sistema
- Dados de outras clínicas
- Gráficos por cidade

---

## 🗂️ ESTRUTURA DE DADOS

### Tabela: **usuarios**
```sql
- id (PK)
- nome
- email
- senha (hash bcrypt)
- tipo: 'admin'
- ativo
- podealterarstatus
- pode_ver_todas_novas_clinicas
- ultimo_login
- created_at
```

### Tabela: **consultores**
```sql
- id (PK)
- nome
- email
- telefone
- pix (para comissões)
- ativo
- empresa_id (FK → empresas)
- pode_ver_todas_novas_clinicas (boolean)
- podealterarstatus (boolean)
- is_freelancer (boolean)
- codigo_referencia
- created_at
```

### Tabela: **clinicas**
```sql
- id (PK)
- nome
- endereco
- bairro
- cidade
- estado
- telefone
- email
- email_login (para login)
- senha_hash (para login)
- consultor_id (FK → consultores)
- empresa_id (FK → empresas)
- ativo_no_sistema
- ultimo_acesso
- nicho (estético/odontológico)
- created_at
```

### Tabela: **pacientes** (LEADS + DADOS FINANCEIROS)
```sql
- id (PK)
- nome
- telefone
- cpf
- cidade
- estado
- tipo_tratamento ('Estético' ou 'Odontológico')
- status (lead, em_conversa, cpf_aprovado, agendado, fechado, etc.)
- observacoes
- consultor_id (FK → consultores)
- clinica_id (FK → clinicas)
- created_at

-- CAMPOS FINANCEIROS:
- valor_parcela (DECIMAL)
- numero_parcelas (INTEGER)
- vencimento (DATE)
- valor_tratamento (DECIMAL)
- antecipacao_meses (INTEGER)
- data_operacao (DATE)
- entregue (BOOLEAN)
- analise (TEXT)
- responsavel (TEXT)
- observacoes_financeiras (TEXT)

-- DOCUMENTOS:
- selfie_doc_url (TEXT)
- documento_url (TEXT)
- comprovante_residencia_url (TEXT)
- contrato_servico_url (TEXT)
- confirmacao_sacado_url (TEXT)
```

### Tabela: **agendamentos**
```sql
- id (PK)
- paciente_id (FK → pacientes)
- consultor_id (FK → consultores)
- clinica_id (FK → clinicas)
- data_agendamento (DATE)
- horario (TIME)
- status (agendado, confirmado, reagendado, cancelado, compareceu)
- lembrado (BOOLEAN)
- observacoes
- created_at
```

### Tabela: **fechamentos**
```sql
- id (PK)
- paciente_id (FK → pacientes)
- consultor_id (FK → consultores)
- clinica_id (FK → clinicas)
- agendamento_id (FK → agendamentos)
- valor_fechado (DECIMAL)
- data_fechamento (DATE)
- tipo_tratamento
- forma_pagamento
- contrato_url (TEXT)
- observacoes
- aprovado ('pendente', 'aprovado', 'reprovado')
- created_at
```

### Tabela: **empresas**
```sql
- id (PK)
- nome
- cnpj
- email
- telefone
- endereco
- ativo
- created_at
```

---

## 🔒 SISTEMA DE PERMISSÕES (RESUMO)

| Funcionalidade | Admin | Consultor Interno | Consultor Freelancer | Clínica | Empresa |
|---|---|---|---|---|---|
| **Ver todos os leads** | ✅ | ✅ | ❌ (só seus) | ❌ | ❌ |
| **Criar leads** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Alterar status de leads** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Ver todos os pacientes financeiros** | ✅ | ✅ | ❌ (só seus) | ❌ (só da clínica) | ❌ |
| **Editar pacientes financeiros** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Ver todos os agendamentos** | ✅ | ✅ | ❌ (só seus) | ❌ (só da clínica) | ❌ |
| **Criar agendamentos** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Ver todos os fechamentos** | ✅ | ✅ | ❌ (só seus) | ❌ (só da clínica) | ❌ |
| **Aprovar/Reprovar fechamentos** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Ver todas as clínicas** | ✅ | ✅ | ❌ (só suas) | ❌ (só própria) | ❌ (só da empresa) |
| **Criar/Editar clínicas** | ✅ | ✅ | ✅ | ❌ | ✅ |
| **Excluir registros** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Ver metas do sistema** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Editar metas** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Ver ranking completo** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Ver comissões (todas)** | ✅ | ✅ | ❌ (só suas) | ❌ | ❌ |
| **Gerenciar consultores** | ✅ | ❌ | ❌ | ❌ | ✅ (da empresa) |

---

## 🎯 CASOS DE USO PRÁTICOS

### **Caso 1: Consultor Freelancer Maria**
**Perfil**: Consultora freelancer (externa)
**Permissões**: `podealterarstatus=false`, `is_freelancer=true`

**O que Maria vê em "Meus Pacientes"**:
- Aba Leads: Apenas leads onde `consultor_id = Maria.id`
- Aba Pacientes: Apenas pacientes de leads que ela cadastrou e que tiveram agendamentos

**O que Maria pode fazer**:
- Capturar novos leads
- Ver seus leads
- Adicionar observações
- Marcar agendamentos
- **NÃO pode** alterar status dos leads
- **NÃO pode** ver leads de outros consultores

---

### **Caso 2: Consultor Interno João**
**Perfil**: Consultor interno (equipe interna)
**Permissões**: `podealterarstatus=true`, `pode_ver_todas_novas_clinicas=true`

**O que João vê em "Meus Pacientes"**:
- Aba Leads: **TODOS** os leads do sistema (de todos os consultores)
- Aba Pacientes: **TODOS** os pacientes financeiros do sistema

**O que João pode fazer**:
- Ver e editar qualquer lead
- Alterar status de qualquer lead
- Ver e editar qualquer paciente financeiro
- Criar agendamentos para qualquer lead
- Criar fechamentos
- Ver todas as clínicas (mesmo as que não são dele)

---

### **Caso 3: Clínica BellaVita**
**Perfil**: Clínica parceira
**Permissões**: Tipo `clinica`, `clinica_id = 5`

**O que a Clínica vê em "Meus Pacientes"**:
- Aba Leads: Apenas leads que têm agendamentos na clínica (clinica_id = 5)
- Aba Pacientes: Apenas pacientes que passaram pela clínica

**O que a Clínica pode fazer**:
- Ver agendamentos marcados para ela
- Ver informações dos pacientes agendados
- **NÃO pode** editar nada
- **NÃO pode** criar leads ou pacientes
- **NÃO pode** ver dados de outras clínicas

---

### **Caso 4: Admin Carlos**
**Perfil**: Administrador do sistema
**Permissões**: Tipo `admin`

**O que Carlos vê em "Meus Pacientes"**:
- Aba Leads: **TODOS** os leads (sem restrição)
- Aba Pacientes: **TODOS** os pacientes financeiros (sem restrição)

**O que Carlos pode fazer**:
- **TUDO** - controle total do sistema
- Aprovar/reprovar fechamentos
- Excluir registros
- Definir metas
- Ver relatórios completos
- Gerenciar todos os usuários

---

## 📱 FUNCIONALIDADES ESPECIAIS

### 1. **Notificações em Tempo Real**
**Componente**: `LeadNotificationProvider.js`, `NewLeadNotification.js`
- Quando um novo lead é capturado, todos os consultores recebem notificação em tempo real
- Som de notificação (audioNovoLead.mp3)
- Toast notification na tela

### 2. **WhatsApp Integration**
**Componente**: `WhatsApp.js`
- Envio de mensagens automáticas via WhatsApp Web
- Lembretes de agendamento
- Confirmações de consulta

### 3. **Meta Ads Integration**
**Componente**: `MetaAds.js`
- Integração com Facebook/Instagram Ads
- Captação automática de leads de campanhas
- Sincronização de campanhas

### 4. **IDSF Integration**
**Componente**: `IDSFIntegration.js`
- Integração com API externa de crédito (IDSF)
- Consulta de CPF
- Análise de crédito automática

### 5. **Sistema de Tutoriais**
**Componentes**: `Tutorial*.js`, `TutorialOverlay.js`, `WelcomeModal.js`
- Tutoriais interativos para novos usuários
- Modal de boas-vindas
- Guias passo a passo para cada funcionalidade

### 6. **Upload de Documentos**
**Storage**: Supabase Storage
- Bucket: `pacientes-documentos`
- Tipos aceitos: PDF, JPEG, JPG, PNG
- Limite: 10MB por arquivo
- Documentos: selfie, RG/CNH, comprovante, contrato, confirmação

### 7. **Sistema de Comissões**
- Cálculo automático de comissões por fechamento
- Visualização de comissões mensais e totais
- Dashboard de comissões para consultores

---

## 🔐 AUTENTICAÇÃO E SEGURANÇA

### Login:
- JWT (JSON Web Token) com expiração de 12 horas
- Senha criptografada com bcrypt
- Middleware de autenticação em todas as rotas protegidas
- Verificação de token em cada requisição

### Segurança:
- Row Level Security (RLS) desabilitado no Supabase (controle feito no backend)
- Validação de permissões por tipo de usuário
- Filtros por `consultor_id`, `clinica_id`, `empresa_id`
- Logs de auditoria (ultimo_login, ultimo_acesso)

---

## 🚀 TECNOLOGIAS UTILIZADAS

### Frontend:
- **React** (v18)
- **React Router** (navegação)
- **Axios** (requisições HTTP)
- **Recharts** (gráficos)
- **Lucide React** (ícones)
- **CSS Modules**

### Backend:
- **Node.js** + **Express**
- **Supabase** (PostgreSQL + Storage)
- **JWT** (autenticação)
- **Bcrypt** (criptografia)
- **Multer** (upload de arquivos)
- **CORS**

### Infraestrutura:
- **Frontend**: Vercel
- **Backend**: Fly.io
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage

---

## 📞 CONTATO E SUPORTE

Para dúvidas ou suporte:
- **Desenvolvedor**: GIMTECH Solutions
- **Ano**: 2025

---

**FIM DA DOCUMENTAÇÃO**

Esta documentação cobre **100% do sistema CRM Invest**, incluindo:
✅ Todos os tipos de usuários e suas permissões
✅ Fluxo completo do sistema (do lead ao fechamento)
✅ Visão detalhada de "Meus Pacientes" para cada tipo de usuário
✅ Estrutura de dados completa
✅ Casos de uso práticos
✅ Funcionalidades especiais

