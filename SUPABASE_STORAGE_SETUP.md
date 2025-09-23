# Configuração do Supabase Storage para Documentos

## ✅ Sistema Implementado

O sistema de upload de documentos das clínicas foi configurado para usar o **Supabase Storage** em vez de armazenamento local.

### 🏗️ Arquitetura

1. **Frontend**: Interface de upload com botões "Enviar", "Baixar" e "Excluir"
2. **Backend**: API que recebe arquivos e envia para Supabase Storage
3. **Storage**: Supabase Storage com bucket `clinicas-documentos`
4. **Banco**: URLs dos arquivos armazenadas no SQLite

### 📁 Estrutura do Storage

```
clinicas-documentos/
├── 1/
│   ├── cartao_cnpj_1234567890_123456789.pdf
│   ├── contrato_social_1234567890_123456789.pdf
│   └── ...
├── 2/
│   ├── cartao_cnpj_1234567890_123456789.pdf
│   └── ...
└── ...
```

### 🔧 Configuração Realizada

#### 1. Bucket Criado
- **Nome**: `clinicas-documentos`
- **Público**: Sim (URLs acessíveis diretamente)
- **Tipos permitidos**: PDF, DOC, DOCX, JPG, JPEG, PNG
- **Tamanho máximo**: 10MB

#### 2. API Endpoints
- `POST /api/documents/upload/:clinicaId/:docType` - Upload de arquivo
- `GET /api/documents/download/:clinicaId/:docType` - Download (redireciona para URL pública)
- `DELETE /api/documents/delete/:clinicaId/:docType` - Excluir arquivo

#### 3. Documentos Suportados
1. Cartão CNPJ
2. Contrato Social
3. Alvará de Funcionamento Sanitário
4. Balanço/Balancete Assinado
5. Comprovante de Endereço da Clínica
6. Dados Bancários PJ
7. Documentos dos Sócios
8. Certidão de Responsabilidade Técnica
9. Documentos do Responsável Técnico
10. Visita Online (com campos de data e observações)
11. Certidão de Casamento

### 🚀 Como Usar

#### Para o Usuário:
1. Acesse a edição de uma clínica
2. Role até "Documentação da Clínica"
3. Clique em "Enviar" ao lado de cada documento
4. Selecione o arquivo (PDF, DOC, DOCX, JPG, JPEG, PNG)
5. O upload será feito automaticamente para o Supabase Storage
6. Use "Baixar" para abrir o documento em nova aba
7. Use "Excluir" para remover o documento

#### Para Desenvolvedores:
```javascript
// Upload
const formData = new FormData();
formData.append('document', file);
fetch('/api/documents/upload/1/cartao_cnpj', {
  method: 'POST',
  body: formData
});

// Download (redireciona para URL pública)
window.open('https://supabase-url/storage/v1/object/public/clinicas-documentos/1/cartao_cnpj_123.pdf');

// Delete
fetch('/api/documents/delete/1/cartao_cnpj', { method: 'DELETE' });
```

### 🔐 Segurança

- **Autenticação**: Requer token JWT válido
- **Validação**: Tipos de arquivo e tamanho limitados
- **Isolamento**: Arquivos organizados por ID da clínica
- **URLs únicas**: Nomes de arquivo com timestamp e ID aleatório

### 📊 Vantagens do Supabase Storage

1. **Escalabilidade**: Suporta milhões de arquivos
2. **Performance**: CDN global para downloads rápidos
3. **Confiabilidade**: Backup automático e redundância
4. **Segurança**: Controle de acesso granular
5. **Economia**: Sem custos de servidor para armazenamento
6. **URLs públicas**: Acesso direto sem passar pelo servidor

### 🛠️ Manutenção

#### Para configurar políticas no Supabase:
1. Acesse o painel do Supabase
2. Vá em Storage > Policies
3. Crie política para o bucket `clinicas-documentos`:
   - **Nome**: Public read access
   - **Definição**: `true`
   - **Check**: `true`
   - **Roles**: `public`

#### Para monitorar uso:
- Painel Supabase > Storage > Usage
- Verificar logs em `backend/api/documents.js`

### 🔄 Migração de Arquivos Existentes

Se houver arquivos locais antigos, eles podem ser migrados:
1. Listar arquivos em `backend/uploads/clinicas/`
2. Fazer upload para Supabase Storage
3. Atualizar URLs no banco de dados
4. Remover arquivos locais

### 📝 Logs

O sistema gera logs detalhados:
```
📤 Fazendo upload para Supabase Storage: 1/cartao_cnpj_1234567890_123456789.pdf
✅ Upload realizado com sucesso: { path: "1/cartao_cnpj_1234567890_123456789.pdf" }
🗑️ Deletando arquivo do Supabase Storage: 1/cartao_cnpj_1234567890_123456789.pdf
✅ Arquivo deletado do Supabase Storage com sucesso
```

### 🎯 Próximos Passos

1. ✅ Configurar políticas de acesso no painel Supabase
2. ✅ Testar upload/download em produção
3. ✅ Configurar backup automático (opcional)
4. ✅ Implementar compressão de imagens (opcional)
5. ✅ Adicionar preview de documentos (opcional)
