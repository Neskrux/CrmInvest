# API BigDataCorp - Facematch (Comparação Biométrica de Faces)

## Visão Geral

A API de **Facematch** do BigDataCorp realiza comparação biométrica entre duas imagens que contenham faces. Geralmente usada para comparar:
- **Imagem base**: Foto do documento de identidade (RG, CNH, etc.)
- **Imagem de comparação**: Selfie do usuário

**Resultado**: Retorna um percentual de similaridade entre as faces.

---

## Endpoint

```
POST https://app.bigdatacorp.com.br/bigid/biometrias/facematch
```

---

## Autenticação

A API requer autenticação via credenciais (header). Verifique a documentação de autenticação do BigDataCorp para obter suas credenciais.

---

## Parâmetros Obrigatórios

É necessário fornecer **duas imagens** para comparação. Você pode usar uma das seguintes combinações:

### Opção 1: Base64 (ambas as imagens)
```json
{
  "Parameters": [
    "BASE_FACE_IMG=<string_base64_imagem1>",
    "MATCH_IMG=<string_base64_imagem2>"
  ]
}
```

### Opção 2: URLs (ambas as imagens)
```json
{
  "Parameters": [
    "BASE_FACE_IMG_URL=<url_imagem1>",
    "MATCH_IMG_URL=<url_imagem2>"
  ]
}
```

### Opção 3: Base64 + URL (mista)
```json
{
  "Parameters": [
    "BASE_FACE_IMG=<string_base64_imagem1>",
    "MATCH_IMG_URL=<url_imagem2>"
  ]
}
```

Ou vice-versa:
```json
{
  "Parameters": [
    "BASE_FACE_IMG_URL=<url_imagem1>",
    "MATCH_IMG=<string_base64_imagem2>"
  ]
}
```

### Campos Obrigatórios

| Campo                | Descrição                                          | Tipo     |
|----------------------|----------------------------------------------------|----------|
| `BASE_FACE_IMG`      | String base64 que representa uma imagem (base)    | string   |
| `MATCH_IMG`          | String base64 que representa uma imagem (comparar)| string   |
| `BASE_FACE_IMG_URL`  | URL que representa uma imagem (base)               | string   |
| `MATCH_IMG_URL`      | URL que representa uma imagem (comparar)          | string   |

**Nota**: Você DEVE fornecer pelo menos:
- `BASE_FACE_IMG` OU `BASE_FACE_IMG_URL`
- `MATCH_IMG` OU `MATCH_IMG_URL`

---

## Parâmetros Opcionais

| Campo                | Descrição                                          | Valores Possíveis |
|----------------------|----------------------------------------------------|-------------------|
| `PrivateBaseFaceUrl` | Flag que indica que a BaseFaceUrl é uma URL privada | `True`            |
| `PrivateMatchImgUrl` | Flag que indica que a MatchImgUrl é uma URL privada | `True`            |

### Exemplo com Parâmetros Opcionais

```json
{
  "Parameters": [
    "BASE_FACE_IMG_URL=<url_privada>",
    "MATCH_IMG_URL=<url_publica>",
    "PrivateBaseFaceUrl=True"
  ]
}
```

---

## Exemplos de Requisição

### Exemplo 1: Ambas imagens em Base64

```json
{
  "Parameters": [
    "BASE_FACE_IMG=iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "MATCH_IMG=iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
  ]
}
```

### Exemplo 2: Ambas imagens via URL

```json
{
  "Parameters": [
    "BASE_FACE_IMG_URL=https://exemplo.com/foto-documento.jpg",
    "MATCH_IMG_URL=https://exemplo.com/selfie.jpg"
  ]
}
```

### Exemplo 3: URL Privada + Base64

```json
{
  "Parameters": [
    "BASE_FACE_IMG_URL=https://storage.privado.com/foto-documento.jpg",
    "MATCH_IMG=iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "PrivateBaseFaceUrl=True"
  ]
}
```

---

## Códigos de Status e Respostas

| Code | Message                                           | Significado                                                      |
|------|---------------------------------------------------|------------------------------------------------------------------|
| `80` | Face picture match                                | **Match**: Faces correspondem (similaridade suficiente)         |
| `-800`| The face pictures does not match                  | **No Match**: Faces não correspondem (similaridade insuficiente)|
| `-801`| An error occurred during the Face Match execution | Erro durante a execução da comparação                           |
| `-806`| The provided image URL is not OK                  | URL da imagem fornecida não está acessível                      |
| `-814`| One request key is wrong                          | Uma das chaves de requisição está incorreta                     |
| `-816`| The images sent are identical!                    | As imagens enviadas são idênticas                               |
| `-824`| Access Denied, Check your credentials             | Acesso negado, verifique suas credenciais                        |
| `-826`| The provided image is above 15mb                  | A imagem fornecida excede 15MB                                  |

### Interpretação dos Resultados

- **Code 80**: ✅ **Match confirmado** - As faces são da mesma pessoa
- **Code -800**: ❌ **No Match** - As faces não são da mesma pessoa
- **Outros códigos negativos**: ⚠️ **Erro** - Verifique a mensagem específica

---

## Limitações e Requisitos

### Tamanho Máximo de Imagem
- **Máximo**: 15MB por imagem
- Erro `-826` será retornado se exceder

### Formato de Imagens
- A API aceita formatos de imagem comuns (JPG, PNG, etc.)
- Base64 deve ser a representação completa da imagem codificada

### URLs Privadas
- Se usar URLs privadas, adicione os flags `PrivateBaseFaceUrl=True` ou `PrivateMatchImgUrl=True`
- A API precisará ter acesso autenticado a essas URLs

---

## Tabela de Preços

| Consultas Realizadas no Mês | Valor por Consulta |
|----------------------------|-------------------|
| 1 - 10.000                 | R$ 0,160          |
| 10.001 - 50.000            | R$ 0,153          |
| 50.001 - 100.000           | R$ 0,144          |
| 100.001 - 500.000          | R$ 0,138          |
| 500.001 - 1.000.000        | R$ 0,131          |
| 1.000.001 - 5.000.000      | R$ 133.000,00 (preço fixo) |
| 5.000.001 e acima          | [Entre em contato](mailto:contato@bigdatacorp.com.br) |

---

## Casos de Uso no Sistema

### 1. Validação de Identidade no Cadastro
- Comparar foto do documento com selfie do paciente
- Verificar se o paciente é realmente quem diz ser

### 2. Verificação de Documentos
- Validar documentos de identidade enviados por pacientes
- Confirmar que a selfie corresponde ao documento

### 3. Segurança e Prevenção de Fraude
- Detectar tentativas de uso de documentos falsos
- Verificar identidade em transações sensíveis

### 4. Onboarding de Pacientes
- Durante o cadastro completo da clínica
- Validar identidade antes de criar fechamentos financeiros

---

## Integração Sugerida

### Fluxo Recomendado

```
1. Clínica faz upload de documento (RG/CNH) do paciente
   ↓
2. Sistema solicita selfie do paciente
   ↓
3. Sistema converte ambas imagens para base64 (ou armazena URLs)
   ↓
4. Sistema chama API BigDataCorp Facematch
   ↓
5. Sistema avalia resposta:
   - Code 80 → Match confirmado → Prosseguir cadastro
   - Code -800 → No Match → Solicitar nova selfie ou documento
   - Outros códigos → Tratar erro conforme necessário
   ↓
6. Sistema salva resultado da validação no banco de dados
```

### Estrutura de Dados Sugerida

```javascript
{
  paciente_id: 123,
  documento_tipo: 'RG',
  documento_imagem_url: 'https://...',
  selfie_imagem_url: 'https://...',
  facematch_resultado: {
    code: 80,
    message: 'Face picture match',
    timestamp: '2025-01-27T10:30:00Z',
    confidence: 0.95 // Se disponível
  },
  validado: true,
  validado_em: '2025-01-27T10:30:00Z'
}
```

---

## Exemplo de Implementação (Node.js)

```javascript
const axios = require('axios');

async function compararFaces(base64Documento, base64Selfie, credentials) {
  try {
    const response = await axios.post(
      'https://app.bigdatacorp.com.br/bigid/biometrias/facematch',
      {
        Parameters: [
          `BASE_FACE_IMG=${base64Documento}`,
          `MATCH_IMG=${base64Selfie}`
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${credentials.token}` // Ajustar conforme autenticação BigDataCorp
        }
      }
    );

    const { code, message } = response.data;

    if (code === 80) {
      return {
        success: true,
        match: true,
        message: 'Faces correspondem - Match confirmado'
      };
    } else if (code === -800) {
      return {
        success: true,
        match: false,
        message: 'Faces não correspondem - No Match'
      };
    } else {
      return {
        success: false,
        error: message,
        code: code
      };
    }
  } catch (error) {
    console.error('Erro ao comparar faces:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Uso
const resultado = await compararFaces(
  base64Documento,
  base64Selfie,
  credentials
);

if (resultado.match) {
  console.log('✅ Identidade validada');
} else {
  console.log('❌ Identidade não validada');
}
```

---

## Tratamento de Erros Recomendado

### Erros Críticos (requer ação)
- **-824 (Access Denied)**: Verificar credenciais da API
- **-826 (Imagem > 15MB)**: Redimensionar ou comprimir imagens
- **-806 (URL não acessível)**: Verificar URLs ou usar Base64

### Erros de Validação (parte do fluxo)
- **-800 (No Match)**: Fluxo normal - solicitar nova selfie ou documento
- **-816 (Imagens idênticas)**: Pode ser tentativa de fraude - investigar

### Erros Técnicos
- **-801 (Erro na execução)**: Tentar novamente após alguns segundos
- **-814 (Request key errada)**: Verificar parâmetros enviados

---

## Recomendações de Implementação

### 1. Cache de Resultados
- Evitar chamadas duplicadas para o mesmo par de imagens
- Salvar resultados no banco de dados

### 2. Retry Logic
- Implementar retry para erros temporários (-801, -806)
- Limitar número de tentativas

### 3. Logging
- Registrar todas as chamadas para auditoria
- Armazenar códigos de resposta e timestamps

### 4. Rate Limiting
- Considerar limites de taxa da API
- Implementar fila para múltiplas requisições

### 5. Validação Prévia
- Verificar tamanho das imagens antes de enviar
- Validar formato de Base64 se usado

---

## Próximos Passos

1. **Obter credenciais** da BigDataCorp para acesso à API
2. **Testar integração** com imagens de exemplo
3. **Implementar serviço** no backend para chamadas à API
4. **Integrar no fluxo** de cadastro de pacientes
5. **Adicionar validação** no frontend antes de enviar imagens
6. **Criar interface** para exibir resultados da validação biométrica

---

## Referências

- [Documentação Oficial BigDataCorp Facematch](https://docs.bigdatacorp.com.br/app/reference/facematch_facematch-1)
- [Documentação Técnica BigDataCorp](https://docs.bigdatacorp.com.br/app/reference)

---

**Documento criado em**: 2025-01-27
**Última atualização**: 2025-01-27
