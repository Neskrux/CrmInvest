import { useState, useMemo } from 'react';
import { useFormState } from '../state/useFormState';

export function useCadastroClinicaState() {
  const dadosCompletosClinicaInitialState = useMemo(() => ({
    nome: '',
    telefone: '',
    cpf: '',
    data_nascimento: '',
    cidade: '',
    estado: '',
    tipo_tratamento: '',
    observacoes: '',
    endereco: '',
    bairro: '',
    numero: '',
    cep: '',
    valor_fechado: '',
    valor_fechado_formatado: '',
    contrato_arquivo: null,
    observacoes_fechamento: '',
    data_fechamento: new Date().toISOString().split('T')[0],
    valor_parcela: '',
    valor_parcela_formatado: '',
    numero_parcelas: '',
    vencimento: '',
    tem_interesse_antecipar: 'nao',
    antecipacao_meses: ''
  }), []);
  
  const dadosCompletosClinicaForm = useFormState(dadosCompletosClinicaInitialState);
  const [salvandoCadastroCompleto, setSalvandoCadastroCompleto] = useState(false);
  const [cidadeCustomizada, setCidadeCustomizada] = useState(false);

  return {
    dadosCompletosClinicaForm,
    salvandoCadastroCompleto,
    setSalvandoCadastroCompleto,
    cidadeCustomizada,
    setCidadeCustomizada
  };
}

