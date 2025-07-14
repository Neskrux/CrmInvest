# 🚀 Sistema de Migrações - CRM

## ⚡ **SOLUÇÃO RÁPIDA** (Recomendado)

Se suas migrações não estão funcionando, execute este script completo:

### **1. Verificar Status Atual**
```sql
-- Execute no Supabase SQL Editor:
-- Copie e cole todo o conteúdo de: check_migrations.sql
```

### **2. Executar Todas as Migrações**
```sql
-- Execute no Supabase SQL Editor:
-- Copie e cole todo o conteúdo de: run_all_migrations.sql
```

## 📋 **O que as Migrações Fazem**

| Migração | Descrição | Status |
|----------|-----------|--------|
| **011** | Adiciona campo `pix` na tabela consultores | 🆕 **Necessário** |
| **012** | Adiciona `email`, `senha`, `cpf`, `tipo`, `ativo` | 🆕 **Necessário** |
| **013** | Adiciona campos de contrato para fechamentos | 🆕 **CRÍTICO** |

## 🎯 **Campos Adicionados**

### **Migração 011: PIX Consultores**
```sql
ALTER TABLE consultores 
ADD COLUMN IF NOT EXISTS pix VARCHAR(255);
```

### **Migração 012: Campos Completos**
```sql
-- Para login com email real
ALTER TABLE consultores ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;
ALTER TABLE consultores ADD COLUMN IF NOT EXISTS senha VARCHAR(255);

-- Para dados completos
ALTER TABLE consultores ADD COLUMN IF NOT EXISTS cpf VARCHAR(14) UNIQUE;
ALTER TABLE consultores ADD COLUMN IF NOT EXISTS tipo VARCHAR(50) DEFAULT 'consultor';
ALTER TABLE consultores ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;
```

### **Migração 013: Campos de Contrato (CRÍTICO)**
```sql
-- Para upload de contratos PDF nos fechamentos
ALTER TABLE fechamentos ADD COLUMN IF NOT EXISTS contrato_arquivo TEXT;
ALTER TABLE fechamentos ADD COLUMN IF NOT EXISTS contrato_nome_original TEXT;
ALTER TABLE fechamentos ADD COLUMN IF NOT EXISTS contrato_tamanho INTEGER;
ALTER TABLE fechamentos ADD COLUMN IF NOT EXISTS contrato_upload_data TIMESTAMP DEFAULT NOW();
```

### **Migração 014: Aprovação de Fechamentos**
```sql
ALTER TABLE fechamentos ADD COLUMN IF NOT EXISTS aprovado TEXT DEFAULT 'pendente';
```

## 🔍 **Como Verificar se Funcionou**

Após executar, rode no Supabase:
```sql
-- Verificar campos da tabela consultores
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'consultores';
```

**Deve aparecer:**
- ✅ `pix` (varchar)
- ✅ `email` (varchar) 
- ✅ `senha` (varchar)
- ✅ `cpf` (varchar)
- ✅ `tipo` (varchar)
- ✅ `ativo` (boolean)

**Para verificar campos de contrato:**
```sql
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'fechamentos' AND column_name LIKE 'contrato_%';
```

**Deve aparecer:**
- ✅ `contrato_arquivo` (text)
- ✅ `contrato_nome_original` (text)
- ✅ `contrato_tamanho` (integer)
- ✅ `contrato_upload_data` (timestamp)

## 🚨 **Problemas Comuns**

### **1. "Tabela não existe"**
- Execute `run_all_migrations.sql` completo
- Ele cria todas as tabelas e campos necessários

### **2. "Campo já existe"** 
- Normal! O script usa `IF NOT EXISTS`
- Não vai duplicar campos ou dar erro

### **3. "Migração não aplicada"**
- Verifique com `check_migrations.sql`
- Se necessário, execute `run_all_migrations.sql` novamente

## ✅ **Resultado Final**

Após executar as migrações, você terá:

1. ✅ **Campo PIX** para consultores receberem comissões
2. ✅ **Login com email real** (yahoo, hotmail, etc.)
3. ✅ **Sistema de senhas** para consultores
4. ✅ **Cadastro público** funcionando
5. ✅ **Dados completos** de consultores
6. ✅ **Upload de contratos** funcionando nos fechamentos

## 🎉 **Próximos Passos**

1. Execute `run_all_migrations.sql` no Supabase
2. Reinicie o backend: `cd backend && node server.js`
3. Teste o cadastro público de consultores
4. Teste o login com email real
5. Verifique se os campos PIX aparecem no admin

**✨ Pronto! Seu CRM estará 100% atualizado!** 