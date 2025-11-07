const { PDFDocument, rgb } = require('pdf-lib');
const crypto = require('crypto');

/**
 * Aplica assinatura digital do admin automaticamente em um PDF
 * @param {Uint8Array} pdfBytes - Bytes do PDF original
 * @param {string} assinaturaBase64 - Assinatura em base64 (PNG)
 * @param {Object} dadosAdmin - Dados do admin { nome, documento }
 * @param {Object} dadosPaciente - Dados do paciente { nome, cpf }
 * @param {Object} dadosClinica - Dados da clínica { nome, cnpj }
 * @returns {Promise<{pdfAssinado: Uint8Array, hashSHA1: string}>}
 */
const aplicarAssinaturaAdminAutomatica = async (
  pdfBytes,
  assinaturaBase64,
  dadosAdmin,
  dadosPaciente,
  dadosClinica
) => {
  try {
    // Carregar PDF
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    const ultimaPagina = pages[pages.length - 1];
    
    const larguraPagina = ultimaPagina.getWidth();
    const alturaPagina = ultimaPagina.getHeight();
    
    // Converter assinatura base64 para imagem
    // Remover prefixo data:image/png;base64, se existir
    const base64Data = assinaturaBase64.replace(/^data:image\/\w+;base64,/, '');
    const signatureImage = await pdfDoc.embedPng(base64Data);
    const signatureDims = signatureImage.scale(0.3); // Redimensionar assinatura
    
    // Configurações do rodapé estruturado
    const alturaRodape = 140;
    const margemInferior = 20;
    const yBaseRodape = margemInferior;
    const margemLateral = 50;
    const espacoEntreColunas = 20;
    const larguraTotal = larguraPagina - (2 * margemLateral);
    const larguraArea = (larguraTotal - (2 * espacoEntreColunas)) / 3;
    
    // Desenhar linha superior do rodapé
    ultimaPagina.drawLine({
      start: { x: margemLateral, y: yBaseRodape + alturaRodape },
      end: { x: larguraPagina - margemLateral, y: yBaseRodape + alturaRodape },
      thickness: 1.5,
      color: rgb(0.2, 0.2, 0.2),
    });
    
    // Calcular posições das 3 áreas
    const xArea1 = margemLateral;
    const xArea2 = margemLateral + larguraArea + espacoEntreColunas;
    const xArea3 = margemLateral + (2 * (larguraArea + espacoEntreColunas));
    
    const yTitulo = yBaseRodape + alturaRodape - 20;
    const yAssinatura = yBaseRodape + alturaRodape - 50;
    const yDados = yBaseRodape + alturaRodape - 80;
    
    // ÁREA 1: ASSINATURA CLÍNICA
    ultimaPagina.drawText('ASSINATURA CLÍNICA', {
      x: xArea1,
      y: yTitulo,
      size: 9,
      color: rgb(0.2, 0.2, 0.2),
      font: await pdfDoc.embedFont('Helvetica-Bold'),
    });
    
    if (dadosClinica?.nome) {
      ultimaPagina.drawText(dadosClinica.nome, {
        x: xArea1,
        y: yDados,
        size: 8,
        color: rgb(0.3, 0.3, 0.3),
      });
    }
    
    if (dadosClinica?.cnpj) {
      ultimaPagina.drawText(`CNPJ: ${dadosClinica.cnpj}`, {
        x: xArea1,
        y: yDados - 12,
        size: 7,
        color: rgb(0.4, 0.4, 0.4),
      });
    }
    
    // ÁREA 2: ASSINATURA PACIENTE
    ultimaPagina.drawText('ASSINATURA PACIENTE', {
      x: xArea2,
      y: yTitulo,
      size: 9,
      color: rgb(0.2, 0.2, 0.2),
      font: await pdfDoc.embedFont('Helvetica-Bold'),
    });
    
    if (dadosPaciente?.nome) {
      ultimaPagina.drawText(dadosPaciente.nome, {
        x: xArea2,
        y: yDados,
        size: 8,
        color: rgb(0.3, 0.3, 0.3),
      });
    }
    
    if (dadosPaciente?.cpf) {
      ultimaPagina.drawText(`CPF: ${dadosPaciente.cpf}`, {
        x: xArea2,
        y: yDados - 12,
        size: 7,
        color: rgb(0.4, 0.4, 0.4),
      });
    }
    
    // ÁREA 3: ASSINATURA GRUPO IM (onde vai a assinatura do admin)
    ultimaPagina.drawText('ASSINATURA GRUPO IM', {
      x: xArea3,
      y: yTitulo,
      size: 9,
      color: rgb(0.2, 0.2, 0.2),
      font: await pdfDoc.embedFont('Helvetica-Bold'),
    });
    
    // Aplicar assinatura do admin na área 3
    const xAssinaturaAdmin = xArea3 + (larguraArea - signatureDims.width) / 2;
    const yAssinaturaAdmin = yAssinatura - signatureDims.height;
    
    ultimaPagina.drawImage(signatureImage, {
      x: xAssinaturaAdmin,
      y: yAssinaturaAdmin,
      width: signatureDims.width,
      height: signatureDims.height,
    });
    
    // Dados do admin abaixo da assinatura
    if (dadosAdmin?.nome) {
      ultimaPagina.drawText(dadosAdmin.nome, {
        x: xArea3,
        y: yDados,
        size: 8,
        color: rgb(0.3, 0.3, 0.3),
      });
    }
    
    if (dadosAdmin?.documento) {
      ultimaPagina.drawText(`CPF/CNPJ: ${dadosAdmin.documento}`, {
        x: xArea3,
        y: yDados - 12,
        size: 7,
        color: rgb(0.4, 0.4, 0.4),
      });
    }
    
    // Salvar PDF antes de gerar hash
    const pdfBytesAssinado = await pdfDoc.save();
    
    // Gerar hash SHA1 do PDF assinado
    const hashSHA1 = crypto.createHash('sha1').update(pdfBytesAssinado).digest('hex').toUpperCase();
    
    // Adicionar hash e data no rodapé
    const pdfDocFinal = await PDFDocument.load(pdfBytesAssinado);
    const pagesFinal = pdfDocFinal.getPages();
    const ultimaPaginaFinal = pagesFinal[pagesFinal.length - 1];
    
    const dataHora = new Date().toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Adicionar hash e data abaixo do rodapé estruturado
    ultimaPaginaFinal.drawText(`HASH/ID: ${hashSHA1}`, {
      x: margemLateral,
      y: yBaseRodape - 15,
      size: 8,
      color: rgb(0.2, 0.2, 0.2),
      font: await pdfDocFinal.embedFont('Helvetica-Bold'),
    });
    
    ultimaPaginaFinal.drawText(`Data/Hora: ${dataHora}`, {
      x: margemLateral,
      y: yBaseRodape - 30,
      size: 7,
      color: rgb(0.4, 0.4, 0.4),
    });
    
    const pdfBytesFinal = await pdfDocFinal.save();
    
    return {
      pdfAssinado: pdfBytesFinal,
      hashSHA1: hashSHA1
    };
  } catch (error) {
    console.error('Erro ao aplicar assinatura admin automática:', error);
    throw error;
  }
};

module.exports = {
  aplicarAssinaturaAdminAutomatica
};
