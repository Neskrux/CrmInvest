import { useState } from 'react';

export function useCustomerUIState() {
  const [editingPaciente, setEditingPaciente] = useState(null);
  const [viewPaciente, setViewPaciente] = useState(null);
  const [credenciaisGeradas, setCredenciaisGeradas] = useState(null);
  const [gerandoLogin, setGerandoLogin] = useState(false);
  const [gerandoLoginPacienteId, setGerandoLoginPacienteId] = useState(null);
  const [statusTemporario, setStatusTemporario] = useState({});
  const [activeViewTab, setActiveViewTab] = useState('informacoes');
  const [activeObservacoesTab, setActiveObservacoesTab] = useState('observacoes');
  const [uploadingDocs, setUploadingDocs] = useState({});
  const [evidenciasPaciente, setEvidenciasPaciente] = useState([]);
  const [pacienteObservacoes, setPacienteObservacoes] = useState(null);
  const [observacoesAtual, setObservacoesAtual] = useState('');

  return {
    editingPaciente,
    setEditingPaciente,
    viewPaciente,
    setViewPaciente,
    credenciaisGeradas,
    setCredenciaisGeradas,
    gerandoLogin,
    setGerandoLogin,
    gerandoLoginPacienteId,
    setGerandoLoginPacienteId,
    statusTemporario,
    setStatusTemporario,
    activeViewTab,
    setActiveViewTab,
    activeObservacoesTab,
    setActiveObservacoesTab,
    uploadingDocs,
    setUploadingDocs,
    evidenciasPaciente,
    setEvidenciasPaciente,
    pacienteObservacoes,
    setPacienteObservacoes,
    observacoesAtual,
    setObservacoesAtual
  };
}

