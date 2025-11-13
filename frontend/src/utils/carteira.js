/**
 * Utilitários para funcionalidades de carteira existente
 */

/**
 * Preenche dados de teste na carteira existente
 * @param {Function} setPacientesCarteira - Função setter para atualizar lista de pacientes
 * @param {Function} setCarteiraCalculos - Função setter para atualizar cálculos
 * @param {Function} calcularCarteiraExistente - Função callback para calcular a carteira após preencher
 */
export function preencherDadosTesteCarteira(setPacientesCarteira, setCarteiraCalculos, calcularCarteiraExistente) {
  const dadosTeste = [
    {
      cpf: '123.456.789-01',
      nomeCompleto: 'Bruno Silva',
      valorParcela: '500',
      numeroParcelasAberto: '12',
      primeiraVencimento: '2025-10-20',
      numeroParcelasAntecipar: '8'
    },
    {
      cpf: '987.654.321-00',
      nomeCompleto: 'Diego Santos',
      valorParcela: '750',
      numeroParcelasAberto: '15',
      primeiraVencimento: '2025-11-15',
      numeroParcelasAntecipar: '10'
    },
    {
      cpf: '456.789.123-45',
      nomeCompleto: 'Maria Oliveira',
      valorParcela: '300',
      numeroParcelasAberto: '18',
      primeiraVencimento: '2025-10-25',
      numeroParcelasAntecipar: '6'
    },
    {
      cpf: '111.222.333-44',
      nomeCompleto: 'João Carlos',
      valorParcela: '650',
      numeroParcelasAberto: '20',
      primeiraVencimento: '2025-12-05',
      numeroParcelasAntecipar: '12'
    },
    {
      cpf: '555.666.777-88',
      nomeCompleto: 'Ana Paula',
      valorParcela: '400',
      numeroParcelasAberto: '14',
      primeiraVencimento: '2025-10-30',
      numeroParcelasAntecipar: '7'
    },
    {
      cpf: '999.888.777-66',
      nomeCompleto: 'Pedro Henrique',
      valorParcela: '850',
      numeroParcelasAberto: '16',
      primeiraVencimento: '2025-11-25',
      numeroParcelasAntecipar: '9'
    },
    {
      cpf: '444.333.222-11',
      nomeCompleto: 'Carla Mendes',
      valorParcela: '550',
      numeroParcelasAberto: '22',
      primeiraVencimento: '2025-12-10',
      numeroParcelasAntecipar: '11'
    },
    {
      cpf: '777.888.999-00',
      nomeCompleto: 'Rafael Costa',
      valorParcela: '350',
      numeroParcelasAberto: '13',
      primeiraVencimento: '2025-11-05',
      numeroParcelasAntecipar: '5'
    },
    {
      cpf: '222.333.444-55',
      nomeCompleto: 'Fernanda Lima',
      valorParcela: '700',
      numeroParcelasAberto: '19',
      primeiraVencimento: '2025-12-15',
      numeroParcelasAntecipar: '13'
    },
    {
      cpf: '666.777.888-99',
      nomeCompleto: 'Marcos Antonio',
      valorParcela: '450',
      numeroParcelasAberto: '17',
      primeiraVencimento: '2025-11-10',
      numeroParcelasAntecipar: '8'
    },
    {
      cpf: '333.444.555-66',
      nomeCompleto: 'Juliana Santos',
      valorParcela: '600',
      numeroParcelasAberto: '21',
      primeiraVencimento: '2025-12-20',
      numeroParcelasAntecipar: '10'
    },
    {
      cpf: '888.999.000-11',
      nomeCompleto: 'Lucas Ferreira',
      valorParcela: '380',
      numeroParcelasAberto: '15',
      primeiraVencimento: '2025-10-18',
      numeroParcelasAntecipar: '6'
    },
    {
      cpf: '555.444.333-22',
      nomeCompleto: 'Patricia Alves',
      valorParcela: '520',
      numeroParcelasAberto: '18',
      primeiraVencimento: '2025-11-20',
      numeroParcelasAntecipar: '9'
    },
    {
      cpf: '111.000.999-88',
      nomeCompleto: 'Roberto Silva',
      valorParcela: '680',
      numeroParcelasAberto: '24',
      primeiraVencimento: '2025-12-25',
      numeroParcelasAntecipar: '14'
    },
    {
      cpf: '777.666.555-44',
      nomeCompleto: 'Camila Rodrigues',
      valorParcela: '420',
      numeroParcelasAberto: '16',
      primeiraVencimento: '2025-11-30',
      numeroParcelasAntecipar: '7'
    },
    {
      cpf: '333.222.111-00',
      nomeCompleto: 'Gabriel Martins',
      valorParcela: '580',
      numeroParcelasAberto: '20',
      primeiraVencimento: '2025-12-30',
      numeroParcelasAntecipar: '12'
    },
    {
      cpf: '999.888.777-66',
      nomeCompleto: 'Isabela Costa',
      valorParcela: '480',
      numeroParcelasAberto: '14',
      primeiraVencimento: '2025-10-22',
      numeroParcelasAntecipar: '6'
    },
    {
      cpf: '444.555.666-77',
      nomeCompleto: 'Thiago Oliveira',
      valorParcela: '720',
      numeroParcelasAberto: '23',
      primeiraVencimento: '2026-01-15',
      numeroParcelasAntecipar: '15'
    },
    {
      cpf: '222.111.000-99',
      nomeCompleto: 'Beatriz Souza',
      valorParcela: '390',
      numeroParcelasAberto: '17',
      primeiraVencimento: '2025-11-12',
      numeroParcelasAntecipar: '8'
    },
    {
      cpf: '666.555.444-33',
      nomeCompleto: 'Felipe Pereira',
      valorParcela: '630',
      numeroParcelasAberto: '19',
      primeiraVencimento: '2026-01-20',
      numeroParcelasAntecipar: '11'
    }
  ];

  setPacientesCarteira([]);
  setCarteiraCalculos(null);

  dadosTeste.forEach((dados, index) => {
    setTimeout(() => {
      const novoPaciente = {
        id: Date.now() + index,
        cpf: dados.cpf,
        nomeCompleto: dados.nomeCompleto,
        valorParcela: parseInt(dados.valorParcela),
        numeroParcelasAberto: parseInt(dados.numeroParcelasAberto),
        primeiraVencimento: dados.primeiraVencimento,
        numeroParcelasAntecipar: parseInt(dados.numeroParcelasAntecipar)
      };

      setPacientesCarteira(prev => [...prev, novoPaciente]);
    }, index * 100);
  });

  if (typeof calcularCarteiraExistente === 'function') {
    setTimeout(() => {
      calcularCarteiraExistente();
    }, dadosTeste.length * 100 + 500);
  }
}

