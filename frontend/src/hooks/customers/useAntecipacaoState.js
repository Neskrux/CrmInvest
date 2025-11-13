import { useState } from 'react';

export function useAntecipacaoState() {
  const [selectedPacientesAntecipacao, setSelectedPacientesAntecipacao] = useState([]);
  const [antecipacaoModalPacientes, setAntecipacaoModalPacientes] = useState([]);
  const [antecipacaoValoresSolicitados, setAntecipacaoValoresSolicitados] = useState({});
  const [observacaoAntecipacao, setObservacaoAntecipacao] = useState('');
  const [observacaoAntecipacaoAdmin, setObservacaoAntecipacaoAdmin] = useState('');
  const [solicitacaoAntecipacaoSelecionada, setSolicitacaoAntecipacaoSelecionada] = useState(null);
  const [showDetalhesAntecipacaoModal, setShowDetalhesAntecipacaoModal] = useState(false);
  const [salvandoSolicitacaoAntecipacao, setSalvandoSolicitacaoAntecipacao] = useState(false);

  return {
    selectedPacientesAntecipacao,
    setSelectedPacientesAntecipacao,
    antecipacaoModalPacientes,
    setAntecipacaoModalPacientes,
    antecipacaoValoresSolicitados,
    setAntecipacaoValoresSolicitados,
    observacaoAntecipacao,
    setObservacaoAntecipacao,
    observacaoAntecipacaoAdmin,
    setObservacaoAntecipacaoAdmin,
    solicitacaoAntecipacaoSelecionada,
    setSolicitacaoAntecipacaoSelecionada,
    showDetalhesAntecipacaoModal,
    setShowDetalhesAntecipacaoModal,
    salvandoSolicitacaoAntecipacao,
    setSalvandoSolicitacaoAntecipacao
  };
}

