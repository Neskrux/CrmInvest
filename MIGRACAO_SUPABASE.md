# 🔄 Migração do Supabase - Conta Pessoal → Conta Empresa

## 📋 **Resumo da Situação**

Você criou o banco de dados do CRM na sua conta pessoal do Supabase e precisa migrá-lo para uma conta da empresa. Este guia te ajudará a fazer essa migração de forma segura e completa.

## 🚀 **Passo a Passo da Migração**

### **1. Preparar a Nova Conta da Empresa**

#### **1.1 Criar Projeto no Supabase da Empresa**

1. **Acesse** [supabase.com](https://supabase.com) com a conta da empresa
2. **Clique em "New Project"**
3. **Configure o projeto:**
   - **Nome**: `crm-empresa` (ou nome desejado)
   - **Database Password**: Crie uma senha forte
   - **Region**: Escolha a região mais próxima (Brasil)
4. **Aguarde** a criação do projeto (pode levar alguns minutos)

#### **1.2 Obter Credenciais da Nova Conta**

1. **No painel do novo projeto**, vá em **Settings** → **API**
2. **Copie as seguintes informações:**
   - **Project URL** (ex: `https://abc123.supabase.co`)
   - **anon public key** (chave pública)
   - **service_role secret key** (chave secreta - mantenha segura!)

### **2. Configurar Estrutura no Novo Banco**

#### **2.1 Executar Migrações**

1. **No novo projeto**, vá em **SQL Editor**
2. **Execute as migrações** em ordem:

```sql
-- Execute o arquivo completo:
-- backend/migrations/run_migrations.sql
```

3. **Verifique** se todas as tabelas foram criadas corretamente

#### **2.2 Configurar Storage**

1. **Vá em Storage** no painel do Supabase
2. **Crie o bucket** `contratos` (se não existir)
3. **Configure as permissões** necessárias

### **3. Configurar Script de Migração**

#### **3.1 Criar Arquivo de Configuração**

Crie um arquivo `.env` na raiz do projeto:

```env
# Credenciais da NOVA conta da empresa
NEW_SUPABASE_URL=https://sua-nova-conta-empresa.supabase.co
NEW_SUPABASE_SERVICE_KEY=sua-nova-service-key-aqui

# Manter as antigas para migração
OLD_SUPABASE_URL=https://yomvfjabpomcvfnusgm.supabase.co
OLD_SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvbXZmamJhcGJvbWN2Zm51c2dtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTM5MTIzNywiZXhwIjoyMDY2OTY3MjM3fQ.l_dMjGQRQjJDsqUdH-BwbqctZZFeZ8kyX1cVgKSgibc
```

#### **3.2 Executar Migração**

```bash
# Instalar dependências se necessário
npm install @supabase/supabase-js dotenv

# Executar script de migração
node migrate_supabase.js
```

### **4. Atualizar Configurações do Projeto**

#### **4.1 Atualizar Backend**

Edite o arquivo `backend/.env`:

```env
# Supabase Configuration (NOVA CONTA)
SUPABASE_URL=https://sua-nova-conta-empresa.supabase.co
SUPABASE_SERVICE_KEY=sua-nova-service-key-aqui

# Outras configurações
JWT_SECRET=seu-jwt-secret-aqui
PORT=5000
NODE_ENV=development
```

#### **4.2 Atualizar Frontend (se necessário)**

Edite o arquivo `frontend/.env`:

```env
REACT_APP_SUPABASE_URL=https://sua-nova-conta-empresa.supabase.co
REACT_APP_SUPABASE_ANON_KEY=sua-nova-anon-key-aqui
```

### **5. Testar a Migração**

#### **5.1 Verificar Dados**

1. **Acesse** o painel da nova conta do Supabase
2. **Verifique** se todas as tabelas têm dados:
   - `clinicas`
   - `consultores`
   - `usuarios`
   - `pacientes`
   - `agendamentos`
   - `fechamentos`

#### **5.2 Testar Sistema**

1. **Inicie o backend:**
   ```bash
   cd backend
   npm start
   ```

2. **Inicie o frontend:**
   ```bash
   cd frontend
   npm start
   ```

3. **Teste o login** com as credenciais existentes
4. **Verifique** se todos os dados estão aparecendo corretamente

### **6. Limpeza Final**

#### **6.1 Remover Credenciais Antigas**

Após confirmar que tudo funciona:

1. **Remova** o arquivo `migrate_supabase.js`
2. **Remova** as credenciais antigas dos arquivos `.env`
3. **Atualize** a documentação

#### **6.2 Desativar Projeto Antigo (Opcional)**

1. **No projeto antigo**, vá em **Settings** → **General**
2. **Clique em "Delete Project"** (apenas se tiver certeza)

## ⚠️ **Pontos Importantes**

### **🔒 Segurança**
- **Nunca** commite credenciais no Git
- **Use** variáveis de ambiente
- **Mantenha** as chaves seguras

### **📊 Backup**
- **Faça backup** antes da migração
- **Teste** tudo antes de remover o projeto antigo
- **Mantenha** o projeto antigo por alguns dias após a migração

### **🔄 Rollback**
Se algo der errado:
1. **Mantenha** o projeto antigo ativo
2. **Reverta** as configurações
3. **Execute** a migração novamente

## 🆘 **Solução de Problemas**

### **Erro de Conexão**
```bash
# Verificar se as credenciais estão corretas
# Verificar se o projeto está ativo
# Verificar se as tabelas foram criadas
```

### **Dados Não Aparecem**
```bash
# Verificar se a migração foi executada completamente
# Verificar permissões das tabelas
# Verificar se há dados na tabela antiga
```

### **Erro de Storage**
```bash
# Verificar se o bucket foi criado
# Verificar permissões do bucket
# Verificar se os arquivos existem no bucket antigo
```

## 📞 **Suporte**

Se encontrar problemas:
1. **Verifique** os logs do script de migração
2. **Confirme** que as credenciais estão corretas
3. **Teste** a conexão manualmente
4. **Consulte** a documentação do Supabase

---

**✅ Migração concluída com sucesso!**

Agora seu CRM está rodando na conta da empresa e você pode remover as credenciais antigas com segurança.
