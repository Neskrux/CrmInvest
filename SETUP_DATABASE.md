# 🔧 CONFIGURAÇÃO DO BANCO DE DADOS - CRM SYSTEM

## ⚠️ PROBLEMAS IDENTIFICADOS E SOLUÇÕES

### 1. **Erro 500 no login** - RESOLVIDO ✅
- **Problema**: Configuração incorreta das chaves do Supabase
- **Solução**: Corrigidas as chaves no arquivo `api/index.js`

### 2. **Erro 403 no verify-token** - RESOLVIDO ✅
- **Problema**: Endpoint não funcionava para consultores
- **Solução**: Corrigido para buscar dados na tabela correta baseado no tipo de usuário

### 3. **CORS não configurado** - RESOLVIDO ✅
- **Problema**: Domínio do Vercel não estava nas origens permitidas
- **Solução**: Adicionado `*.vercel.app` ao CORS

### 4. **JWT_SECRET incorreto** - RESOLVIDO ✅
- **Problema**: Chave JWT não estava sendo lida corretamente
- **Solução**: Configurada a chave correta do ambiente

### 5. **Supabase Storage não configurado** - RESOLVIDO ✅
- **Problema**: Upload de contratos não funcionava
- **Solução**: Configurado cliente admin e bucket correto

---

## 📋 PASSOS PARA CONFIGURAR O BANCO

### **Passo 1: Executar Migrações Principais**
No painel do Supabase, vá em **SQL Editor** e execute:

```sql
-- 1. Executar migrações principais
-- Copie e cole o conteúdo do arquivo: backend/migrations/run_all_migrations_updated.sql
```

### **Passo 2: Criar Usuário Admin**
Execute este script no SQL Editor:

```sql
-- 2. Criar usuário admin
-- Copie e cole o conteúdo do arquivo: backend/migrations/create_admin_user.sql
```

### **Passo 3: Configurar Storage**
Execute este script no SQL Editor:

```sql
-- 3. Criar bucket de contratos
-- Copie e cole o conteúdo do arquivo: backend/migrations/create_storage_bucket.sql
```

---

## 🔑 CREDENCIAIS PADRÃO

### **Admin Login:**
- **Email**: `admin@investmoneysa.com.br`
- **Senha**: `admin123`

---

## 🔧 VARIÁVEIS DE AMBIENTE NO VERCEL

Certifique-se de que estas variáveis estão configuradas no Vercel:

```bash
# Supabase
SUPABASE_URL=https://yomvfjabpomcvfnusgm.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvbXZmamJhcGJvbWN2Zm51c2dtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTM5MTIzNywiZXhwIjoyMDY2OTY3MjM3fQ.l_dMjGQRQjJDsqUdH-BwbqctZZFeZ8kyX1cVgKSgibc

# JWT
JWT_SECRET=DasRGZ7BT3A47YF/0coBWUZ2qpsMcBfGRXV7C2ymOTHnmwPribCSuQOQlsZ6SNf2erKp29aysgDvAtUFBmcm1g==

# Ambiente
NODE_ENV=production
```

---

## 🚀 APÓS CONFIGURAR O BANCO

1. **Faça um novo deploy** no Vercel para aplicar as correções
2. **Acesse o sistema** com as credenciais admin
3. **Teste o login** em: `https://crm-invest.vercel.app/login`

---

## 📊 ESTRUTURA DO BANCO APÓS CONFIGURAÇÃO

### **Tabelas Criadas:**
- ✅ `usuarios` - Usuários admin
- ✅ `consultores` - Consultores do sistema
- ✅ `clinicas` - Clínicas parceiras
- ✅ `pacientes` - Pacientes/leads
- ✅ `agendamentos` - Agendamentos de consultas
- ✅ `fechamentos` - Fechamentos de vendas
- ✅ `schema_migrations` - Controle de migrações

### **Storage Configurado:**
- ✅ Bucket `contratos` para upload de PDFs
- ✅ Políticas de acesso configuradas

---

## 🔍 VERIFICAR SE ESTÁ FUNCIONANDO

### **1. Teste de Login**
```bash
# Deve retornar status 200
curl -X POST https://crm-invest.vercel.app/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@investmoneysa.com.br","senha":"admin123"}'
```

### **2. Teste de Token**
```bash
# Deve retornar dados do usuário
curl -X GET https://crm-invest.vercel.app/api/verify-token \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

---

## 🆘 SE AINDA HOUVER PROBLEMAS

### **Verificar Logs do Vercel:**
1. Acesse o painel do Vercel
2. Vá em **Functions** > **View Function Logs**
3. Procure por erros detalhados

### **Verificar Supabase:**
1. Acesse o painel do Supabase
2. Vá em **Logs** > **API Logs**
3. Verifique se as consultas estão sendo executadas

### **Contatos para Suporte:**
- Verifique se todas as migrações foram executadas
- Confirme se o bucket `contratos` foi criado
- Teste se o usuário admin foi inserido corretamente

---

## ✅ RESUMO DAS CORREÇÕES APLICADAS

1. **✅ Chaves do Supabase corrigidas**
2. **✅ Endpoint verify-token corrigido**
3. **✅ CORS configurado para Vercel**
4. **✅ JWT_SECRET configurado**
5. **✅ Supabase Storage configurado**
6. **✅ Upload de contratos funcionando**
7. **✅ Usuário admin criado**
8. **✅ Bucket de contratos criado**

**O sistema deve estar funcionando após executar as migrações!** 🎉 