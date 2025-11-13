import { useState } from 'react';

export function useContratosState() {
  const [uploadingContrato, setUploadingContrato] = useState(false);
  const [motivoReprovacao, setMotivoReprovacao] = useState('');
  const [contratoParaReprovar, setContratoParaReprovar] = useState(null);
  const [solicitacaoSelecionada, setSolicitacaoSelecionada] = useState(null);

  return {
    uploadingContrato,
    setUploadingContrato,
    motivoReprovacao,
    setMotivoReprovacao,
    contratoParaReprovar,
    setContratoParaReprovar,
    solicitacaoSelecionada,
    setSolicitacaoSelecionada
  };
}

