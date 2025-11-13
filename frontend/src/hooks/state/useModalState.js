/**
 * Hook para gerenciar múltiplos estados de modals
 */
import { useState, useCallback } from 'react';

export function useModalState() {
  const [modals, setModals] = useState({
    showModal: false,
    showViewModal: false,
    showObservacoesModal: false,
    showCriarLoginModal: false,
    showLoginGeradoModal: false,
    showAgendamentoModal: false,
    showAtribuirConsultorModal: false,
    showEvidenciaModal: false,
    showCadastroCompletoModal: false,
    showNovoClienteModal: false,
    showCarteiraModal: false,
    showSolicitacaoModal: false,
    showAntecipacaoModal: false,
    showDetalhesAntecipacaoModal: false,
    showPermissaoModal: false,
    showContratosModal: false
  });

  const openModal = useCallback((modalName) => {
    setModals(prev => ({ ...prev, [modalName]: true }));
  }, []);

  const closeModal = useCallback((modalName) => {
    setModals(prev => ({ ...prev, [modalName]: false }));
  }, []);

  const closeAllModals = useCallback(() => {
    setModals({
      showModal: false,
      showViewModal: false,
      showObservacoesModal: false,
      showCriarLoginModal: false,
      showLoginGeradoModal: false,
      showAgendamentoModal: false,
      showAtribuirConsultorModal: false,
      showEvidenciaModal: false,
      showCadastroCompletoModal: false,
      showNovoClienteModal: false,
      showCarteiraModal: false,
      showSolicitacaoModal: false,
      showAntecipacaoModal: false,
      showDetalhesAntecipacaoModal: false,
      showPermissaoModal: false,
      showContratosModal: false
    });
  }, []);

  return {
    modals,
    openModal,
    closeModal,
    closeAllModals
  };
}

