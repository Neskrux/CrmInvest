# 🖨️ ESPECIFICAÇÕES PARA IMPRESSÃO DO BOLETO CAIXA

**Documento de Referência:** Especificações Técnicas Caixa v67.119 v015 micro

---

## 📄 PAPEL

### Gramatura
- **Mínima:** 50 g/m²
- **Recomendável:** 75 g/m² (para homologação)

### Tipo de Papel
- **Preferencial:** Papel branco comum
- **Permitido:** Papel reciclável (desde que em tonalidade clara e sem prejudicar a leitura do código de barras)

### Formato
- **A4:** 210mm × 297mm
- **Carta:** 216mm × 279mm

---

## 📏 DIMENSÕES DO BOLETO

### Ficha de Compensação
| Dimensão | Valor |
|----------|-------|
| **Altura** | 95mm a 108mm |
| **Comprimento** | 170mm (A4) a 216mm (Carta) |

### Recibo do Pagador
- **Altura:** A critério do Beneficiário (condicionado à aprovação pela CAIXA)
- **Comprimento:** A critério do Beneficiário

### Código de Barras
| Dimensão | Valor |
|----------|-------|
| **Largura** | 103mm (390px em 96dpi) |
| **Altura** | 13mm (49px em 96dpi) |
| **Posição:** | 12mm da margem inferior |
| **Lateral:** | 5mm da margem esquerda |

---

## 🎨 CORES E IMPRESSÃO

### Cores Preferenciais
1. **Fundo branco** + **impressão azul**
2. **Fundo branco** + **impressão preta**

### Cores Permitidas
- Fundo diferente de branco (ex: papel reciclável), desde que:
  - Tonalidade clara
  - Não prejudique a leitura dos campos
  - Especialmente o **Código de Barras** deve ser legível

### Importante
- O código de barras deve ter **contraste suficiente** para leitura por scanner
- Evitar cores muito claras ou degradês que dificultem a leitura

---

## 📋 ESTRUTURA DO BOLETO

### Vias Obrigatórias
1. **Recibo do Pagador** (parte superior)
2. **Ficha de Compensação** (parte inferior)

### Linha de Corte
- **Recomendado:** Microsserrilhas entre as vias
- **Função:** Facilitar o destacamento sem danificar informações
- **Visual:** Linha pontilhada ou perfurada

### Terceira Via (Opcional)
- Pode ser incluída como controle interno
- Não deve prejudicar as dimensões da Ficha de Compensação

---

## 🔤 TIPOGRAFIA E TAMANHOS

### Fontes Recomendadas
- **Principal:** Arial, sans-serif
- **Linha Digitável:** Courier New, monospace

### Tamanhos Críticos
| Elemento | Tamanho |
|----------|---------|
| **Fonte base** | 7px |
| **Labels** | 5.5px |
| **Valores** | 8px (bold) |
| **Valores destacados** | 10-12px |
| **Linha digitável** | 10px (3,5-4mm) |
| **Código do banco** | 18px (5mm) |
| **Autenticação mecânica** | 5.5px (máx 2mm) |

---

## 📐 POSICIONAMENTO E ESPAÇAMENTOS

### Código de Barras
- **Margem inferior:** 12mm
- **Margem esquerda:** 5mm (zona de silêncio)
- **Centralizado:** Horizontalmente na Ficha de Compensação

### Linha Digitável
- **Posição:** Header direito (Ficha de Compensação)
- **Espaçamento:** 1px entre caracteres
- **Formato:** `XXXXX.XXXXX XXXXX.XXXXXXX XXXXX.XXXXXXX X XXXXXXXXXXXXXX`

### Bordas
- **Espessura:** 2px (pretas)
- **Todas as células:** Bordas de 1px

---

## ✅ CHECKLIST DE IMPRESSÃO

### Antes de Imprimir
- [ ] Verificar se o papel tem gramatura adequada (mínimo 50g/m²)
- [ ] Confirmar que a impressora está calibrada
- [ ] Testar impressão de código de barras (deve ser legível por scanner)
- [ ] Verificar contraste de cores (especialmente código de barras)

### Durante a Impressão
- [ ] Usar papel branco ou claro
- [ ] Impressão em azul ou preto
- [ ] Resolução mínima: 300 DPI
- [ ] Sem margens extras (ou mínimas)

### Após Imprimir
- [ ] Verificar se todas as informações estão legíveis
- [ ] Testar leitura do código de barras com scanner
- [ ] Confirmar que a linha digitável está clara
- [ ] Verificar se as dimensões estão corretas (medir com régua)

---

## 🎯 CONFIGURAÇÕES DA IMPRESSORA

### Configurações Recomendadas
- **Qualidade:** Alta/Máxima
- **Resolução:** 300 DPI ou superior
- **Tipo de papel:** Papel comum ou papel de escritório
- **Orientação:** Retrato (Portrait)
- **Escala:** 100% (sem redução ou ampliação)
- **Margens:** Mínimas ou zero

### Configurações de Cor
- **Modo:** Colorido ou Preto e Branco (conforme escolha)
- **Contraste:** Alto
- **Brilho:** Normal

---

## 📊 ESPECIFICAÇÕES TÉCNICAS DETALHADAS

### Código de Barras (ITF - Interleaved 2 of 5)
- **Tipo:** Interleaved 2 of 5
- **Largura:** 103mm (exato)
- **Altura:** 13mm (exato)
- **Contraste:** Mínimo 60% (recomendado 80%+)
- **Zona de silêncio:** 5mm de cada lado

### Linha Digitável
- **Altura dos caracteres:** 3,5mm a 4mm
- **Espessura dos traços:** 0,3mm
- **Fonte:** Monospace (Courier New)
- **Espaçamento:** 1px entre caracteres

### Código do Banco
- **Tamanho:** 5mm de altura
- **Espessura dos traços:** 1,2mm
- **Formato:** `104-0` em negrito

---

## ⚠️ PROBLEMAS COMUNS E SOLUÇÕES

### Código de Barras não lê
- **Causa:** Contraste insuficiente ou dimensões incorretas
- **Solução:** Aumentar contraste, verificar dimensões (103mm × 13mm)

### Texto muito pequeno
- **Causa:** Escala reduzida ou resolução baixa
- **Solução:** Imprimir em 100% de escala, aumentar resolução

### Cores desbotadas
- **Causa:** Tinta acabando ou configuração de economia
- **Solução:** Trocar cartucho/toner, desativar modo economia

### Dimensões incorretas
- **Causa:** Escala diferente de 100%
- **Solução:** Verificar configurações de impressão, usar escala 100%

---

## 📝 PARA HOMOLOGAÇÃO NA CAIXA

### Amostras Necessárias
- **Quantidade:** 10 a 20 boletos
- **Conteúdo:** Boletos com todos os DVs possíveis
  - DV Geral do Código de Barras: 1 a 9
  - DV do Campo Livre: 0 a 9

### Papel para Homologação
- **Gramatura:** 75 g/m² (recomendável)
- **Tipo:** Papel branco comum
- **Formato:** A4 ou Carta

### Envio
- Enviar amostras impressas para a Agência CAIXA
- Incluir documentação técnica
- Aguardar aprovação antes de distribuir aos pagadores

---

## 💡 DICAS IMPORTANTES

1. **Sempre teste** em impressora real antes de homologação
2. **Use papel de qualidade** (75g/m²) para testes importantes
3. **Verifique o código de barras** com scanner antes de enviar
4. **Mantenha backup** das configurações de impressão
5. **Documente** qualquer problema encontrado

---

## 📞 SUPORTE

Em caso de dúvidas sobre impressão:
- **SAC CAIXA:** 0800 726 0101
- **Ouvidoria:** 0800 725 7474
- **Site:** www.caixa.gov.br

---

**Última atualização:** Novembro 2024  
**Versão:** 1.0.0
