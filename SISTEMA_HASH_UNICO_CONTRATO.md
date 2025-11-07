# Sistema de Hash Único para Contratos

## Como Funciona o Sistema de Hash

### 1. Geração do Hash Inicial (Backend)
Quando a clínica faz upload de um contrato no fechamento:
- O backend gera um hash SHA1 do arquivo PDF original
- Esse hash é armazenado na tabela `fechamentos` no campo `contrato_hash_sha1`
- A data/hora de geração é armazenada em `contrato_hash_criado_em`
- **Este é o hash único e definitivo do documento**

### 2. Uso do Hash nas Assinaturas
Quando qualquer parte assina o documento (clínica, paciente ou admin):
- O sistema usa o **MESMO HASH** que foi gerado inicialmente
- O hash é exibido no rodapé do PDF como "HASH/ID: [hash]"
- Isso garante rastreabilidade completa do documento

### 3. Fluxo Completo

```
1. Clínica cria fechamento com contrato PDF
   ↓
2. Backend gera hash SHA1 único do PDF original
   ↓
3. Hash é armazenado no fechamento
   ↓
4. Clínica assina → Usa o hash existente
   ↓
5. Paciente assina → Usa o mesmo hash
   ↓
6. Admin aprova → Usa o mesmo hash
   ↓
7. Todos os PDFs assinados têm o MESMO HASH/ID
```

### 4. Benefícios
- **Rastreabilidade**: Um único identificador para todo o ciclo de vida do documento
- **Integridade**: Permite validar que o documento é o original
- **Auditoria**: Facilita rastrear todas as ações sobre o documento
- **Conformidade**: Atende requisitos de validação jurídica

### 5. Validação
Para validar um documento:
1. Acesse `/validar-documento-assinado`
2. Insira o hash ou faça upload do PDF
3. O sistema verifica se o hash corresponde ao registrado
4. Exibe todas as informações de rastreabilidade

## Implementação Técnica

### Backend
- **Arquivo**: `backend/controllers/fechamentos.controller.js`
- **Função**: `createFechamento`
- **Momento**: Durante upload do contrato
- **Armazenamento**: Tabela `fechamentos`, campos `contrato_hash_sha1` e `contrato_hash_criado_em`

### Frontend
- Os componentes de assinatura devem receber o hash do backend
- Não devem gerar novos hashes
- Devem exibir o hash existente no PDF

### Banco de Dados
```sql
-- Campos na tabela fechamentos
contrato_hash_sha1 VARCHAR(40) -- Hash SHA1 do contrato original
contrato_hash_criado_em TIMESTAMP WITH TIME ZONE -- Quando foi gerado
```

## Status da Implementação

✅ Backend gera hash no upload inicial
✅ Hash é armazenado no fechamento
✅ Admin usa hash existente ao aprovar
⚠️ Frontend da clínica ainda gera novo hash (precisa correção)
⚠️ Frontend do paciente ainda gera novo hash (precisa correção)

## Próximos Passos

1. Modificar `ModalCadastroPacienteClinica` para receber hash do fechamento
2. Modificar `ModalCadastroCompletoPaciente` para receber hash do fechamento
3. Adicionar endpoint para buscar hash do fechamento pelo paciente_id
4. Garantir que todos usem o mesmo hash

