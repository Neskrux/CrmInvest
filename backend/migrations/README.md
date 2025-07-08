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

## 🎉 **Próximos Passos**

1. Execute `run_all_migrations.sql` no Supabase
2. Reinicie o backend: `cd backend && node server.js`
3. Teste o cadastro público de consultores
4. Teste o login com email real
5. Verifique se os campos PIX aparecem no admin

**✨ Pronto! Seu CRM estará 100% atualizado!** 