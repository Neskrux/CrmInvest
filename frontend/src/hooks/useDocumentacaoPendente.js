import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const useDocumentacaoPendente = () => {
  const { makeRequest, user, isClinica } = useAuth();
  const [temDocumentacaoPendente, setTemDocumentacaoPendente] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isClinica || !user?.clinica_id) {
      setLoading(false);
      return;
    }

    const verificarDocumentacaoPendente = async () => {
      try {
        const response = await makeRequest(`/clinicas/${user.clinica_id}`);
        const data = await response.json();
        
        if (response.ok && data) {
          // Lista de todos os documentos necessários
          const documentos = [
            'doc_cartao_cnpj',
            'doc_contrato_social',
            'doc_alvara_sanitario',
            'doc_comprovante_endereco',
            'doc_balanco',
            'doc_dados_bancarios',
            'doc_socios',
            'doc_comprovante_endereco_socios',
            'doc_certidao_resp_tecnico',
            'doc_resp_tecnico',
            'doc_carteirinha_cro'
          ];

          // Verificar se há documentos pendentes ou reprovados
          const temPendente = documentos.some(docKey => {
            const docEnviado = data[docKey];
            const docAprovado = data[`${docKey}_aprovado`];
            
            // Documento pendente: não foi enviado
            if (!docEnviado) return true;
            
            // Documento reprovado: foi enviado mas foi reprovado
            if (docAprovado === false) return true;
            
            return false;
          });

          setTemDocumentacaoPendente(temPendente);
        }
      } catch (error) {
        console.error('Erro ao verificar documentação pendente:', error);
      } finally {
        setLoading(false);
      }
    };

    verificarDocumentacaoPendente();
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(verificarDocumentacaoPendente, 30000);
    
    return () => clearInterval(interval);
  }, [isClinica, user?.clinica_id, makeRequest]);

  return { temDocumentacaoPendente, loading };
};

export default useDocumentacaoPendente;


