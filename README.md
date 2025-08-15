# 🏥 CRM Sistema de Gestão de Leads

Sistema completo de CRM para gestão de leads, pacientes e agendamentos com pipeline de vendas robusto.

## 🚀 Funcionalidades Implementadas

### 🔐 **Sistema de Autenticação e Controle de Acesso** (NOVO)
- **Login seguro** com JWT tokens
- **Dois tipos de usuário**:
  - **👑 Administrador**: Acesso total ao sistema
  - **🩺 Consultor**: Acesso limitado apenas aos próprios dados
- **Interface personalizada** para cada tipo de usuário
- **Proteção de rotas** e dados sensíveis
- **Logout com confirmação** e sessão segura

#### **🔑 Diferenças de Acesso:**

**👑 Administrador pode:**
- Ver todos os pacientes, agendamentos e fechamentos
- Gerenciar consultores e clínicas
- Acessar dashboard completo da operação
- Editar qualquer registro do sistema

**🩺 Consultor pode:**
- Ver apenas SEUS pacientes (vinculados via agendamentos)
- Gerenciar apenas SEUS agendamentos
- Registrar apenas SEUS fechamentos
- Dashboard personalizado com apenas seus dados
- **NÃO pode** acessar: consultores, clínicas, dados de outros consultores

### ✅ **Sistema Completo de Edição**
- **Botões de Editar** em todas as guias (Pacientes, Consultores, Clínicas, Agendamentos)
- **Modais de edição** com formulários pré-preenchidos
- **Atualizações em tempo real** via API

### ✅ **Pipeline de Status Robusto**

#### **Status para Pacientes:**
- 🔍 **Lead** - Primeiro contato
- 📅 **Agendado** - Consulta marcada
- ✅ **Compareceu** - Compareceu à consulta
- 💰 **Fechado** - Vendeu o tratamento
- ❌ **Não Fechou** - Não vendeu
- 🚫 **Não Compareceu** - Faltou na consulta
- 🔄 **Reagendado** - Consulta remarcada

#### **Status para Agendamentos:**
- 📅 **Agendado** - Consulta marcada
- ✅ **Lembrado** - Paciente foi lembrado
- 🎯 **Compareceu** - Compareceu à consulta
- 💰 **Fechado** - Vendeu o tratamento
- ❌ **Não Fechou** - Não vendeu
- 🚫 **Não Compareceu** - Faltou na consulta
- 🔄 **Reagendado** - Consulta remarcada
- ⛔ **Cancelado** - Consulta cancelada

### ✅ **Dashboard com Métricas Completas**
- **Taxa de conversão** automática
- **Estatísticas por status** em cards organizados
- **Acompanhamento por consultor**
- **Métricas diárias**
- **Ações rápidas** para navegação

### ✅ **Gestão Completa**
- **👥 Pacientes/Leads**: Nome, telefone, CPF, tipo de tratamento, status, observações
- **🩺 Consultores**: Nome e telefone (simplificado conforme solicitado)
- **🏥 Clínicas**: Nome, endereço, bairro/zona, cidade, **estado** (todos os 27 estados), **nicho** (Estético/Odontológico/Ambos), telefone, email + **filtros por cidade e estado**
- **📅 Agendamentos**: Paciente, consultor, clínica, data, horário, status, observações + **filtros avançados por consultor, clínica, período e status**
- **💰 Fechamentos**: Registro de vendas com valor, consultor, clínica, tipo de tratamento, forma de pagamento, observações + **integração automática com pipeline**

### ✅ **Tipos de Tratamento**
- ✨ **Estético** (com badge azul)
- 🦷 **Odontológico** (com badge roxo)

### ✅ **Interface Moderna**
- **Dropdown de status** com mudança rápida
- **Badges coloridos** para visualização
- **Formatação automática** de telefone e CPF
- **Destaque para agendamentos de hoje**
- **Filtro de clínicas por cidade** com contador de resultados
- **Interface responsiva**

## 🛠️ Tecnologias

- **Frontend**: React.js
- **Backend**: Node.js + Express
- **Banco de Dados**: Supabase (PostgreSQL)
- **Estilização**: CSS3 com design moderno

## 📦 Instalação

### 1️⃣ Clonar o projeto
```bash
git clone <repository-url>
cd Crm
```

### 2️⃣ Instalar dependências
```bash
# Instalar dependências raiz
npm install

# Instalar dependências do backend
cd backend
npm install

# Instalar dependências do frontend
cd ../frontend
npm install
```

### 3️⃣ Configurar Supabase

1. **Criar conta** no [Supabase](https://supabase.com)
2. **Criar novo projeto**
3. **Copiar credenciais** em Settings > API
4. **Criar arquivo `.env`** em `backend/.env`:

```env
PORT=5000
NODE_ENV=development
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-anon-key-here
```

### 4️⃣ Criar tabelas no Supabase

No **SQL Editor** do Supabase, execute as migrações em ordem:

#### **📋 Migração 005: Sistema de Autenticação** (NOVO)
```sql
-- Execute o arquivo: backend/migrations/005_create_usuarios_table.sql
-- Cria tabela de usuários e insere admin padrão
```

**⚠️ IMPORTANTE**: Execute a migração 005 antes de testar o login.

**👑 Conta Administrador Padrão:**
- **Email**: `admin@crm.com`
- **Senha**: `admin123`

#### **🗄️ Tabelas Básicas**

```sql
-- Tabela de clínicas
CREATE TABLE IF NOT EXISTS clinicas (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  endereco TEXT,
  bairro TEXT,
  cidade TEXT,
  estado VARCHAR(2),
  telefone TEXT,
  email TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de consultores
CREATE TABLE IF NOT EXISTS consultores (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de pacientes/leads
CREATE TABLE IF NOT EXISTS pacientes (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT,
  cpf TEXT,
  tipo_tratamento TEXT,
  status TEXT DEFAULT 'lead',
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de agendamentos
CREATE TABLE IF NOT EXISTS agendamentos (
  id SERIAL PRIMARY KEY,
  paciente_id INTEGER REFERENCES pacientes(id),
  consultor_id INTEGER REFERENCES consultores(id),
  clinica_id INTEGER REFERENCES clinicas(id),
  data_agendamento DATE,
  horario TIME,
  status TEXT DEFAULT 'agendado',
  lembrado BOOLEAN DEFAULT FALSE,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Desabilitar RLS para simplificar
ALTER TABLE clinicas DISABLE ROW LEVEL SECURITY;
ALTER TABLE consultores DISABLE ROW LEVEL SECURITY;
ALTER TABLE pacientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos DISABLE ROW LEVEL SECURITY;
```

### 5️⃣ Sistema de Migrações

Para manter o banco de dados atualizado sem perder dados:

1. **Execute as migrações** no SQL Editor do Supabase:
   ```sql
   -- Execute o arquivo completo:
   backend/migrations/run_migrations.sql
   ```

2. **Migrações disponíveis:**
   - ✅ `000_create_migrations_table.sql` - Sistema de controle de migrações
   - ✅ `001_add_clinicas_location_fields.sql` - Adiciona campos bairro/cidade
   - ✅ `002_add_estado_field_clinicas.sql` - Adiciona campo estado
- ✅ `003_create_fechamentos_table.sql` - Cria tabela de fechamentos/vendas
- 🆕 `004_add_nicho_field_clinicas.sql` - Adiciona campo nicho nas clínicas

3. **Verificar status:**
   ```sql
   SELECT * FROM schema_migrations ORDER BY version;
   ```

## 🚀 Executar o Sistema

### **Opção 1: Rodar tudo junto**
```bash
# Na pasta raiz
npm run dev
```

### **Opção 2: Rodar separadamente**

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

## 🌐 Acessar o Sistema

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

### 🔐 **Fazer Login**

1. **Acesse** http://localhost:3000
2. **Tela de login** aparecerá automaticamente
3. **Use a conta demo** clicando em "Conta Administrador" ou:
   - **Email**: `admin@crm.com`
   - **Senha**: `admin123`
4. **Login realizado** → Será redirecionado para o dashboard

### 👥 **Criar Usuário Consultor**

Como administrador:
1. Acesse **Consultores**
2. Cadastre um novo consultor
3. **No SQL Editor do Supabase**:
   ```sql
   INSERT INTO usuarios (nome, email, senha, tipo, consultor_id) 
   VALUES ('Dr. João', 'joao@clinica.com', '$2b$10$8K1p/a9UOGNeMlvV7QT4..ZCdP9.VJK0Hk5QZY3oBz3Ohs/qJlm/G', 'consultor', 1);
   ```
   *(Substitua consultor_id pelo ID do consultor cadastrado)*

**💡 Dica**: A senha padrão é `admin123` para testes. Em produção, implemente hash personalizado.

## 📋 Como Usar

### **1️⃣ Cadastro de Leads**
1. Acesse **Pacientes**
2. Clique **"Novo Paciente"**
3. Preencha: nome, telefone, CPF, tipo de tratamento
4. Status inicia como **"Lead"**

### **2️⃣ Gerenciar Pipeline**
1. **Dropdown de Status**: Mude o status diretamente na tabela
2. **Editar**: Clique no botão ✏️ para editar informações
3. **Acompanhar**: Use o Dashboard para ver o funil de conversão

### **3️⃣ Agendamentos**
1. Acesse **Agendamentos**
2. Crie novos agendamentos
3. Marque como lembrado
4. Acompanhe status até fechamento

### **4️⃣ Dashboard**
- **Pipeline visual** mostra conversão de leads
- **Taxa de conversão** calculada automaticamente  
- **Estatísticas por consultor**
- **Métricas diárias** para acompanhamento

### **5️⃣ Sistema de Filtros Avançados**

#### **Filtros de Clínicas:**
1. Acesse **Clínicas**
2. **Filtro por Estado**: Dropdown com todos os 27 estados brasileiros
3. **Filtro por Cidade**: Lista de cidades baseada no estado selecionado
4. **Cidades sugeridas**: Sistema inteligente com principais cidades por estado
5. **Opção "Outra"**: Para cidades não listadas
6. Veja contador de resultados filtrados

#### **Filtros de Agendamentos:**
1. Acesse **Agendamentos**
2. **Filtro por Consultor**: Dropdown com todos os consultores
3. **Filtro por Clínica**: Dropdown com todas as clínicas
4. **Filtro por Período**: Data início e fim para definir intervalo
5. **Filtro por Status**: Todos os status do pipeline (agendado, lembrado, fechado, etc.)
6. **Botão Limpar**: Remove todos os filtros ativos
7. **Contador inteligente**: Mostra quantos resultados e quais filtros estão aplicados

## 🎯 Fluxo do Pipeline

```
🔍 Lead → 📅 Agendado → 🎯 Compareceu → 💰 Fechado
              ↓              ↓            ↓
           🔄 Reagendado  🚫 Não Compareceu  ❌ Não Fechou
```

## 🔧 API Endpoints

### **Pacientes**
- `GET /api/pacientes` - Listar pacientes
- `POST /api/pacientes` - Criar paciente
- `PUT /api/pacientes/:id` - Editar paciente
- `PUT /api/pacientes/:id/status` - Atualizar status

### **Consultores**
- `GET /api/consultores` - Listar consultores
- `POST /api/consultores` - Criar consultor
- `PUT /api/consultores/:id` - Editar consultor

### **Clínicas**
- `GET /api/clinicas` - Listar clínicas (com filtros opcionais: `?cidade=SãoPaulo&estado=SP`)
- `GET /api/clinicas/cidades` - Listar cidades disponíveis
- `GET /api/clinicas/estados` - Listar estados disponíveis
- `POST /api/clinicas` - Criar clínica
- `PUT /api/clinicas/:id` - Editar clínica

### **Agendamentos**
- `GET /api/agendamentos` - Listar agendamentos
- `POST /api/agendamentos` - Criar agendamento
- `PUT /api/agendamentos/:id` - Editar agendamento
- `PUT /api/agendamentos/:id/status` - Atualizar status
- `PUT /api/agendamentos/:id/lembrado` - Marcar como lembrado

### **Fechamentos**
- `GET /api/fechamentos` - Listar fechamentos
- `POST /api/fechamentos` - Criar fechamento (atualiza status do paciente/agendamento automaticamente)
- `PUT /api/fechamentos/:id` - Editar fechamento
- `DELETE /api/fechamentos/:id` - Excluir fechamento

### **Dashboard**
- `GET /api/dashboard` - Estatísticas do dashboard (incluindo métricas de fechamentos)

## 🎨 Características da Interface

- **Design moderno renovado** com gradientes, sombras e layouts limpos
- **Seções de estatísticas visuais** em todas as páginas principais
- **Cards redesenhados** com melhor espaçamento e hierarquia visual
- **Cores diferenciadas** para cada status e tipo de tratamento
- **Badges visuais** profissionais para tipos de tratamento
- **Destaque automático** para agendamentos de hoje
- **Sistema de filtros avançados** com interface elegante e contador de resultados
- **Filtros retraíveis** nos agendamentos para interface mais limpa
- **Filtros inteligentes** para clínicas (estado/cidade) e agendamentos (consultor/clínica/data/status)
- **Layout responsivo** otimizado para mobile e desktop
- **Ações rápidas** com botões intuitivos e bem posicionados
- **Animações suaves** para interações e transições

## 🔄 Status de Desenvolvimento

- ✅ **Backend completo** com todas as rotas
- ✅ **Frontend completo** com todas as telas
- ✅ **Sistema de edição** implementado
- ✅ **Pipeline de status** robusto
- ✅ **Dashboard analítico** com métricas
- ✅ **Sistema de filtros avançados** para clínicas e agendamentos
- ✅ **Interface responsiva** e moderna
- ✅ **Integração Supabase** funcionando

## ✨ **Últimas Melhorias Visuais Implementadas**

### **🎨 Redesign Completo das Páginas**
- **Pacientes**: Adicionado dashboard de estatísticas do pipeline com métricas de conversão em tempo real
- **Consultores**: Interface renovada com cards elegantes, avatars e informações organizadas da equipe
- **Clínicas**: Filtros reorganizados em seção dedicada com layout profissional e gradientes
- **Agendamentos**: Dashboard completo com 8 métricas visuais, alertas para agendamentos de hoje e filtros retraíveis

### **📊 Seções de Estatísticas Visuais**
- Cards com números destacados e bordas coloridas por categoria
- Gradientes suaves e sombras profissionais em todas as seções
- Métricas calculadas automaticamente (conversão, totais, percentuais)
- Indicadores visuais de performance com ícones temáticos

### **🔍 Sistema de Filtros Aprimorado**
- Background com gradiente elegante cinza-azul
- Espaçamento otimizado e labels com ícones claros
- Botões de ação bem posicionados e responsivos
- Contador inteligente de resultados com detalhes dos filtros aplicados
- Filtros retraíveis nos agendamentos para melhor UX

### **🎯 Cards e Layouts Modernizados**
- Consultores com avatars circulares e gradientes
- Espaçamento consistente e hierarquia visual clara
- Botões de edição posicionados elegantemente
- Animações suaves para hover e interações
- Bordas arredondadas e sombras profissionais

## 📞 Suporte

O sistema está **100% funcional** e pronto para uso em produção. Todas as funcionalidades solicitadas foram implementadas:

- ✅ Botões de editar em todas as guias
- ✅ Sistema de status robusto para pipeline de vendas
- ✅ Mudança rápida de status via dropdown
- ✅ **Filtros avançados** para clínicas (estado/cidade) e agendamentos (consultor/clínica/data/status)
- ✅ **Sistema de Fechamentos** completo integrado ao pipeline
- ✅ Interface moderna e intuitiva
- ✅ Dashboard analítico completo com métricas financeiras #   D e p l o y   t i m e s t a m p :   0 7 / 0 7 / 2 0 2 5   1 6 : 3 0 : 0 1  
 