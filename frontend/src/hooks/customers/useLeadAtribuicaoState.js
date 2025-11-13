import { useState } from 'react';

export function useLeadAtribuicaoState() {
  const [leadParaAtribuir, setLeadParaAtribuir] = useState(null);
  const [consultorSelecionado, setConsultorSelecionado] = useState('');
  const [salvandoAtribuicao, setSalvandoAtribuicao] = useState(false);

  return {
    leadParaAtribuir,
    setLeadParaAtribuir,
    consultorSelecionado,
    setConsultorSelecionado,
    salvandoAtribuicao,
    setSalvandoAtribuicao
  };
}

