# Fluxo de Cadastro de Pacientes pela Clínica

## Visão Geral

Este documento descreve o fluxo completo de cadastro de um novo paciente quando uma clínica utiliza o sistema através da aba "Meus Pacientes" em `Pacientes.js`.

---

## 1. Identificação do Tipo de Usuário

### Backend (`auth.controller.js`)
- O sistema identifica que o usuário é do tipo `clinica` através do campo `tipo` no token JWT
- Durante o login, o sistema busca na tabela `clinicas` usando o `id` do usuário
- O token JWT inclui:
  - `tipo: 'clinica'`
  - `clinica_id: usuario.id`
  - `empresa_id: usuario.empresa_id`

### Frontend (`AuthContext.js`)
- O contexto fornece `isClinica: user?.tipo === 'clinica'`
- A aba inicial para clínicas é `'meus-pacientes'` (linha 48)

---

## 2. Interface do Usuário

### Aba "Meus Pacientes"
- Localização: `frontend/src/components/Pacientes.js` (linhas 3561-3577)
- A aba é exibida apenas quando `isClinica === true`
- Contador mostra número de pacientes fechados da clínica

### Botão "Cadastrar Paciente"
- Localização: Linha 3809
- Condição: Visível apenas quando `activeTab === 'meus-pacientes'` e `isClinica === true`
- Ação: `setShowModal(true)` → abre modal de cadastro

---

## 3. Modal de Cadastro

### Modal Específico para Clínicas
- Localização: Linhas 8012-8310
- Condição: `showModal && isClinica`
- Formulário dividido em seções:
  1. **Dados Básicos** (linhas 8024-8178)
  2. **Upload de Documentos** (linhas 8180-8310)

### Campos do Formulário

#### Dados Básicos (obrigatórios marcados com *)
1. **Nome do Paciente** (`nome`) - *Obrigatório*
   - Campo de texto livre
   - Formatação automática no `onBlur` (primeira letra maiúscula de cada palavra)

2. **Telefone/WhatsApp** (`telefone`) - *Obrigatório*
   - Máscara automática: `(00) 00000-0000`
   - Normalização: remove caracteres não numéricos antes de enviar

3. **CPF** (`cpf`) - *Obrigatório*
   - Máscara automática: `000.000.000-00`
   - Máximo 14 caracteres
   - Normalização: remove caracteres não numéricos antes de enviar

4. **Cidade** (`cidade`) - Opcional
   - Campo de texto livre
   - Formatação automática (primeira letra maiúscula)

5. **Estado** (`estado`) - Opcional
   - Campo de texto (máximo 2 caracteres)
   - Transformação automática para maiúsculas

6. **Tipo de Tratamento** (`tipo_tratamento`) - Opcional
   - Select com opções:
     - "Estético"
     - "Odontológico"

7. **Observações** (`observacoes`) - Opcional
   - Textarea livre

#### Upload de Documentos (opcional)
- Disponível apenas quando **editando** um paciente existente
- Tipos de documentos suportados:
  - Selfie com documento
  - Documento de identidade
  - Comprovante de residência
  - Contrato de serviço
  - Confirmação do sacado

---

## 4. Estado do Formulário

### Estado Inicial (`formData`)
```javascript
{
  nome: '',
  telefone: '',
  cpf: '',
  cidade: '',
  estado: '',
  tipo_tratamento: '',
  empreendimento_id: '',
  empreendimento_externo: '',
  status: 'sem_primeiro_contato', // Definido automaticamente
  observacoes: '',
  consultor_id: '',
  endereco: '',
  bairro: '',
  numero: '',
  cep: ''
}
```

### Função `handleInputChange` (linhas 2481-2526)
- Gerencia mudanças em todos os campos
- Aplica formatação automática:
  - **Telefone**: Remove não numéricos e aplica máscara `(00) 00000-0000`
  - **CPF**: Aplica máscara `000.000.000-00`
  - **Cidade**: Formata com primeira letra maiúscula
  - **Estado**: Limpa cidade quando estado muda

### Função `handleNomeBlur` (linhas 2529-2538)
- Formata nome quando usuário sai do campo
- Primeira letra maiúscula de cada palavra

---

## 5. Submissão do Formulário

### Função `handleSubmit` (linhas 1191-1239)

#### Fluxo de Criação (novo paciente)
```javascript
const dataToSend = {
  ...formData,
  status: 'sem_primeiro_contato' // Sempre definido para cadastros manuais
};

response = await makeRequest('/pacientes', {
  method: 'POST',
  body: JSON.stringify(dataToSend)
});
```

#### Dados Enviados ao Backend
- Todos os campos do `formData`
- Status fixo: `'sem_primeiro_contato'`
- **Observação importante**: O backend identifica automaticamente que é uma clínica criando o paciente

---

## 6. Processamento no Backend

### Endpoint: `POST /api/pacientes`
- Arquivo: `backend/controllers/pacientes.controller.js`
- Função: `createPaciente` (linhas 348-454)

### Validações e Processamento

#### 1. Normalização de Dados
- **Telefone**: Remove formatação → apenas números
- **CPF**: Remove formatação → apenas números
- **CEP**: Remove formatação → apenas números

#### 2. Verificação de Duplicatas
- **Telefone**: Verifica se já existe na mesma `empresa_id`
  - Se existir: Retorna erro 400 com mensagem detalhada
- **CPF**: Verifica se já existe na mesma `empresa_id`
  - Se existir: Retorna erro 400 com mensagem detalhada

#### 3. Identificação da Clínica
```javascript
const isClinica = req.user.tipo === 'clinica';
let finalClinicaId = clinica_id;
let finalCadastradoPorClinica = cadastrado_por_clinica || false;

if (isClinica) {
  finalClinicaId = req.user.clinica_id || req.user.id;
  finalCadastradoPorClinica = true;
}
```

#### 4. Determinação do Status
```javascript
const consultorId = consultor_id && consultor_id !== '' ? 
  (typeof consultor_id === 'number' ? consultor_id : parseInt(consultor_id)) : null;

// Lógica: se tem consultor = paciente, se não tem = lead
const statusFinal = status || (consultorId ? 'paciente' : 'lead');
```

**Importante**: O frontend sempre envia `status: 'sem_primeiro_contato'`, então esse valor é usado.

#### 5. Inserção no Banco de Dados
```javascript
const { data, error } = await supabaseAdmin
  .from('pacientes')
  .insert([{ 
    nome, 
    telefone: telefoneNumeros, // Normalizado
    email,
    cpf: cpfNumeros, // Normalizado
    tipo_tratamento, 
    status: statusFinal, // 'sem_primeiro_contato'
    observacoes,
    consultor_id: consultorId, // Geralmente null para clínicas
    cidade,
    estado,
    clinica_id: finalClinicaId, // ID da clínica logada
    cadastrado_por_clinica: finalCadastradoPorClinica, // true
    grau_parentesco,
    tratamento_especifico,
    endereco,
    bairro,
    numero,
    cep: cep ? cep.replace(/\D/g, '') : null, // Normalizado
    empresa_id: req.user.empresa_id // Empresa da clínica
  }])
  .select();
```

---

## 7. Campos de Endereço

### Campos Disponíveis no Formulário
- **Rua** (`endereco`) - Opcional
- **Bairro** (`bairro`) - Opcional
- **Número** (`numero`) - Opcional
- **CEP** (`cep`) - Opcional (máscara: `00000-000`)

### Observação
- Esses campos foram adicionados recentemente para incluir informações de endereço no boleto da Caixa
- Estão presentes no formulário, mas não são obrigatórios para cadastro básico

---

## 8. Resposta e Feedback

### Sucesso
- Status HTTP: `200 OK`
- Resposta: `{ id: data[0].id, message: 'Paciente cadastrado com sucesso!' }`
- Frontend:
  - Exibe toast de sucesso
  - Fecha modal (`setShowModal(false)`)
  - Reseta formulário (`resetForm()`)
  - Atualiza lista de pacientes (`fetchPacientes()`)

### Erro
- Status HTTP: `400` (duplicatas) ou `500` (erro interno)
- Resposta: `{ error: 'Mensagem de erro', ... }`
- Frontend:
  - Exibe toast de erro com mensagem
  - Mantém modal aberto para correção

---

## 9. Filtros e Permissões

### Filtros para Clínicas
- As clínicas veem apenas seus próprios pacientes
- Filtro automático por `clinica_id` no backend
- Filtro aplicado em `pacientesFiltrados` (linha 3243)

### Permissões de Edição
- Clínicas podem editar apenas pacientes que elas cadastraram
- Identificação através de `cadastrado_por_clinica === true` e `clinica_id`

---

## 10. Fluxo Completo Resumido

```
1. Clínica faz login
   ↓
2. Sistema identifica tipo 'clinica' no token
   ↓
3. Interface mostra aba "Meus Pacientes" por padrão
   ↓
4. Clínica clica em "Cadastrar Paciente"
   ↓
5. Modal de cadastro abre (formulário específico para clínicas)
   ↓
6. Clínica preenche dados básicos (nome, telefone, CPF obrigatórios)
   ↓
7. Formatação automática aplicada durante digitação
   ↓
8. Clínica submete formulário
   ↓
9. Frontend envia POST /api/pacientes com dados formatados
   ↓
10. Backend valida e normaliza dados
    ↓
11. Backend verifica duplicatas (telefone e CPF)
    ↓
12. Backend identifica que é clínica e define:
    - clinica_id: ID da clínica logada
    - cadastrado_por_clinica: true
    - empresa_id: empresa_id da clínica
    ↓
13. Backend insere paciente no banco de dados
    ↓
14. Backend retorna sucesso com ID do paciente
    ↓
15. Frontend exibe mensagem de sucesso e atualiza lista
```

---

## 11. Campos Específicos para Clínicas

### Campos que NÃO aparecem no formulário de clínicas:
- **Consultor Responsável**: Clínicas não atribuem consultores diretamente
- **Empreendimento**: Não aplicável para clínicas
- **Status**: Definido automaticamente como `'sem_primeiro_contato'`

### Campos que aparecem apenas para clínicas:
- Upload de documentos (quando editando paciente existente)

---

## 12. Próximos Passos Após Cadastro

Após cadastrar um paciente, a clínica pode:
1. **Editar paciente**: Clicar em paciente → editar
2. **Criar fechamento**: Associar paciente a um fechamento financeiro
3. **Gerar boletos**: Criar boletos da Caixa para o paciente
4. **Upload de documentos**: Adicionar documentos do paciente

---

## 13. Diferenças entre Clínicas e Outros Usuários

| Aspecto | Clínica | Admin/Consultor Interno |
|---------|---------|-------------------------|
| Modal de cadastro | Específico (linhas 8012+) | Padrão completo |
| Upload de docs | Disponível ao editar | Disponível ao cadastrar |
| Consultor | Não atribui | Pode atribuir |
| Status inicial | `sem_primeiro_contato` | `sem_primeiro_contato` ou `lead` |
| Filtro automático | Por `clinica_id` | Por `empresa_id` |
| Campos de endereço | Disponível | Disponível |

---

## 14. Referências de Código

### Frontend
- Componente principal: `frontend/src/components/Pacientes.js`
- Modal de cadastro (clínicas): Linhas 8012-8310
- Função de submit: Linhas 1191-1239
- Função de input: Linhas 2481-2526
- Estado inicial: Linhas 70-86

### Backend
- Controller: `backend/controllers/pacientes.controller.js`
- Função `createPaciente`: Linhas 348-454
- Rota: `backend/routes/pacientes.routes.js` (linha 15)

### Autenticação
- Context: `frontend/src/contexts/AuthContext.js`
- Identificação: `backend/controllers/auth.controller.js` (linhas 431-442)

---

## 15. Observações Importantes

1. **Status automático**: Todos os pacientes cadastrados por clínicas começam com status `'sem_primeiro_contato'`

2. **Sem consultor**: Clínicas não atribuem consultores ao cadastrar pacientes

3. **Normalização**: Telefone, CPF e CEP são sempre normalizados (apenas números) antes de salvar

4. **Duplicatas**: Sistema verifica duplicatas por telefone e CPF dentro da mesma empresa

5. **Campos de endereço**: Disponíveis mas não obrigatórios; usados para gerar boletos da Caixa

6. **Upload de documentos**: Disponível apenas quando editando paciente existente (não no cadastro inicial)

---

**Documento criado em**: 2025-01-27
**Última atualização**: 2025-01-27
