# 📄 Sistema de Upload de Contratos

Esta pasta armazena os contratos PDF dos fechamentos do CRM.

## 🔧 Como funciona

### 1. **Upload de Contratos**
- Ao cadastrar um fechamento, é **obrigatório** enviar um contrato em PDF
- Arquivos são validados (apenas PDF, máximo 10MB)
- Nome único é gerado automaticamente para evitar conflitos

### 2. **Armazenamento**
- Contratos são salvos nesta pasta (`backend/uploads/`)
- Banco de dados armazena:
  - `contrato_arquivo`: Nome do arquivo no servidor
  - `contrato_nome_original`: Nome original do arquivo
  - `contrato_tamanho`: Tamanho em bytes
  - `contrato_upload_data`: Data do upload

### 3. **Acesso aos Contratos**
- Rota: `GET /api/fechamentos/:id/contrato`
- Autenticação obrigatória via JWT token
- Download direto do arquivo PDF

## 📋 Migração Necessária

Execute no **Supabase SQL Editor**:

```sql
-- Migração 006: Adicionar campos de contrato
ALTER TABLE fechamentos ADD COLUMN IF NOT EXISTS contrato_arquivo TEXT;
ALTER TABLE fechamentos ADD COLUMN IF NOT EXISTS contrato_nome_original TEXT;
ALTER TABLE fechamentos ADD COLUMN IF NOT EXISTS contrato_tamanho INTEGER;
ALTER TABLE fechamentos ADD COLUMN IF NOT EXISTS contrato_upload_data TIMESTAMP DEFAULT NOW();

-- Comentários para documentação
COMMENT ON COLUMN fechamentos.contrato_arquivo IS 'Nome do arquivo do contrato armazenado no servidor';
COMMENT ON COLUMN fechamentos.contrato_nome_original IS 'Nome original do arquivo enviado pelo usuário';
COMMENT ON COLUMN fechamentos.contrato_tamanho IS 'Tamanho do arquivo em bytes';
COMMENT ON COLUMN fechamentos.contrato_upload_data IS 'Data e hora do upload do contrato';
```

## 🛡️ Segurança

- ✅ Apenas arquivos PDF são aceitos
- ✅ Limite de 10MB por arquivo
- ✅ Autenticação obrigatória para download
- ✅ Nomes únicos previnem conflitos
- ✅ Limpeza automática em caso de erro

## 📱 Interface

### **Formulário de Fechamento:**
- Campo de upload com drag & drop
- Validação em tempo real
- Preview do arquivo selecionado
- Obrigatório para novos fechamentos

### **Listagem de Fechamentos:**
- Botão "📄 Contrato" para fechamentos com arquivo
- Download direto ao clicar
- Tooltip com nome original do arquivo

## ⚠️ Observações Importantes

1. **Backup**: Esta pasta contém documentos importantes - inclua no backup
2. **Permissões**: Certifique-se de que o servidor tem permissão de escrita
3. **Migração**: Execute a migração antes de usar o sistema
4. **Edições**: Para editar fechamentos, o contrato é opcional (mantém o atual se não alterar)

## 🚀 Como Testar

1. Acesse a tela de Fechamentos
2. Clique em "➕ Novo Fechamento"
3. Preencha os dados obrigatórios
4. Selecione um arquivo PDF no campo "Contrato"
5. Salve o fechamento
6. Verifique o botão "📄 Contrato" na listagem

---
*Sistema implementado com multer, validação de arquivos e interface moderna.* 