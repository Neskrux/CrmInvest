import React, { useState } from 'react';
import './ComoFazer.css';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle, HelpCircle, Zap } from 'lucide-react';

const ComoFazer = () => {
  const { user, isIncorporadora } = useAuth();
  const [faqAberto, setFaqAberto] = useState(null);

  const toggleFaq = (index) => {
    setFaqAberto(faqAberto === index ? null : index);
  };

  const faqs = isIncorporadora ? [
    {
      pergunta: "Preciso pagar algo pra participar?",
      resposta: "Não! Ser Freelancer é de graça. Você só ganha — nunca paga nada pra entrar."
    },
    {
      pergunta: "Quanto ganho por indicar um cliente?",
      resposta: "Cada cliente que compra um imóvel gera comissão pra você: R$ 3.000 para estúdios e R$ 5.000 para apartamentos e outros tipos de imóveis."
    },
    {
      pergunta: "Tem limite de indicações ou ganhos?",
      resposta: "Não tem limite! Você pode indicar quantos clientes quiser — quanto mais indicar, mais você ganha."
    },
    {
      pergunta: "Como faço para indicar?",
      resposta: "É muito fácil! Na página 'Indicações' você preenche o formulário com as informações do cliente que quer indicar. Basta cadastrar e nossa equipe entra em contato com o cliente."
    },
    {
      pergunta: "Como acompanho meus ganhos e status?",
      resposta: "Tudo acontece dentro da plataforma Solumn. Lá você encontra seus ganhos, o status de cada cliente indicado e o histórico completo das suas comissões. Basta acessar seu painel como freelancer, entrar na área 'Clientes' e acompanhar tudo em tempo real."
    },
    {
      pergunta: "Posso indicar clientes de qualquer cidade?",
      resposta: "Pode sim! Não tem limite — quanto mais clientes você indicar, melhor. Eles podem ser de qualquer cidade do Brasil."
    },
    {
      pergunta: "Com quem falo se tiver dúvidas?",
      resposta: "Clique no botão no canto inferior direito para entrar em contato com a nossa equipe, ou na aba 'Suporte'."
    },
    {
      pergunta: "Existe algum grupo ou canal oficial de freelancers?",
      resposta: "Sim! Participe da comunidade dos consultores para receber novidades, campanhas e tirar dúvidas com outros freelancers."
    },
    {
      pergunta: "Posso atualizar meus dados depois do cadastro?",
      resposta: "Sim. Dentro da plataforma Solumn, vá em 'Meu Perfil' e atualize suas informações sempre que precisar — como telefone, e-mail ou chave PIX."
    },
    {
      pergunta: "O que é a IM Incorporadora e o que ela faz?",
      resposta: "A IM Incorporadora é uma empresa que constrói e vende imóveis residenciais. Ela oferece condições facilitadas de pagamento para que as pessoas possam realizar o sonho da casa própria."
    },
    {
      pergunta: "O que significa ser um Freelancer da IM Incorporadora?",
      resposta: "É fazer parte da rede que indica clientes interessados em comprar imóveis. Você ajuda a conectar quem quer comprar com quem oferece os imóveis — e ganha por cada venda que acontece."
    },
    {
      pergunta: "Como funciona o financiamento dos imóveis?",
      resposta: "A IM Incorporadora oferece condições facilitadas de pagamento, com parcelas que cabem no bolso. O cliente pode financiar o imóvel com condições especiais e realizar o sonho da casa própria."
    },
    {
      pergunta: "É seguro participar?",
      resposta: "Sim! A IM Incorporadora é uma empresa real, com contratos e processos 100% digitais e rastreáveis. Todo pagamento e comissão acontece de forma segura e registrada."
    },
    {
      pergunta: "Meus dados e indicações ficam protegidos?",
      resposta: "Sim. Seus dados são usados só pra validar e pagar suas indicações. Tudo segue as regras da LGPD, a lei que protege informações pessoais no Brasil."
    },
    {
      pergunta: "A IM Incorporadora é uma empresa registrada?",
      resposta: "Sim. A IM Incorporadora é uma empresa registrada com CNPJ e sede oficial no Brasil, e atua dentro das normas do mercado imobiliário."
    }
  ] : [
    {
      pergunta: "Preciso pagar algo pra participar?",
      resposta: "Não! Ser Freelancer é de graça. Você só ganha — nunca paga nada pra entrar."
    },
    {
      pergunta: "Quanto ganho por indicar um paciente?",
      resposta: "Cada paciente que faz um tratamento pela IM gera R$ 50 a cada R$ 5.000 do valor do procedimento pra você. Se ele fizer um tratamento de R$ 5.000, por exemplo, você ganha R$ 50."
    },
    {
      pergunta: "Tem limite de indicações ou ganhos?",
      resposta: "Não tem limite! Você pode indicar quantos pacientes quiser — quanto mais indicar, mais você ganha."
    },
    {
      pergunta: "Como faço para indicar?",
      resposta: "É muito fácil! Na página 'Indicações' você preenche o formulário com as informações do paciente que quer indicar. Basta cadastrar e nossa equipe entra em contato com o paciente."
    },
    {
      pergunta: "Como acompanho meus ganhos e status?",
      resposta: "Tudo acontece dentro da plataforma Solumn. Lá você encontra seus ganhos, o status de cada paciente indicado e o histórico completo das suas comissões. Basta acessar seu painel como freelancer, entrar na área 'Pacientes' e acompanhar tudo em tempo real."
    },
    {
      pergunta: "Posso indicar pacientes de qualquer cidade?",
      resposta: "Pode sim! Não tem limite — quanto mais pacientes você indicar, melhor. Eles podem ser de qualquer cidade do Brasil."
    },
    {
      pergunta: "Com quem falo se tiver dúvidas?",
      resposta: "Clique no botão no canto inferior direito para entrar em contato com a nossa equipe, ou na aba 'Suporte'."
    },
    {
      pergunta: "Existe algum grupo ou canal oficial de freelancers?",
      resposta: "Sim! Participe da comunidade dos consultores para receber novidades, campanhas e tirar dúvidas com outros freelancers."
    },
    {
      pergunta: "Posso atualizar meus dados depois do cadastro?",
      resposta: "Sim. Dentro da plataforma Solumn, vá em 'Meu Perfil' e atualize suas informações sempre que precisar — como telefone, e-mail ou chave PIX."
    },
    {
      pergunta: "O que é a IM e o que ela faz?",
      resposta: "A IM é uma empresa que ajuda clínicas a receberem à vista o que os pacientes pagam parcelado. Ela antecipa o dinheiro pra clínica e depois recebe os boletos aos poucos. Assim, a clínica tem dinheiro agora e o paciente pode pagar tranquilo."
    },
    {
      pergunta: "O que significa ser um Freelancer IM?",
      resposta: "É fazer parte da rede que indica pacientes pra esse sistema. Você ajuda a conectar quem precisa parcelar com quem oferece o tratamento — e ganha por cada indicação que dá certo."
    },
    {
      pergunta: "Como funciona o sistema de parcelamento no boleto?",
      resposta: "O paciente escolhe pagar em boletos, a clínica faz o tratamento e recebe tudo antes. Depois, a IM cuida de receber os boletos mês a mês. É simples, sem cartão e sem taxas altas."
    },
    {
      pergunta: "É seguro participar?",
      resposta: "Sim! A IM é uma empresa real, com contratos e processos 100% digitais e rastreáveis. Todo pagamento e comissão acontece de forma segura e registrada."
    },
    {
      pergunta: "Meus dados e indicações ficam protegidos?",
      resposta: "Sim. Seus dados são usados só pra validar e pagar suas indicações. Tudo segue as regras da LGPD, a lei que protege informações pessoais no Brasil."
    },
    {
      pergunta: "A IM é uma empresa registrada?",
      resposta: "Sim. A IM é uma empresa registrada com CNPJ e sede oficial no Brasil, e atua dentro das normas do mercado financeiro."
    }
  ];

  return (
    <div className="como-fazer-container">
      {/* Header executivo */}
      <div className="como-fazer-header">
        <div className="header-content">
          <h1 className="header-title">
            Como Fazer Indicações?
          </h1>
          <p className="header-subtitle">
            {isIncorporadora 
              ? 'Aprenda passo a passo como ganhar dinheiro indicando clientes'
              : 'Aprenda passo a passo como ganhar dinheiro indicando pacientes'
            }
          </p>
        </div>
      </div>

      {/* Seção de Boas-Vindas */}
      <div className="intro-section">
        <div className="intro-card">
          <h2>Bem-vindo(a), {user?.nome}</h2>
          <p>
            {isIncorporadora 
              ? 'Aqui você vai aprender tudo sobre como fazer indicações de clientes de forma simples e eficiente. Siga os passos abaixo e comece a ganhar!'
              : 'Aqui você vai aprender tudo sobre como fazer indicações de pacientes de forma simples e eficiente. Siga os passos abaixo e comece a ganhar!'
            }
          </p>
        </div>
      </div>

      {/* Passo a Passo para Indicar Pacientes */}
      <div className="process-container">

        <div className="process-step">
          <div className="section-title-container">
            <h2 className="section-title">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {isIncorporadora ? (
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                ) : (
                  <>
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                  </>
                )}
              </svg>
              {isIncorporadora ? 'Como Indicar Clientes?' : 'Como Indicar Pacientes?'}
            </h2>
          </div>
          
          <div className="steps-grid">
            <div className="instruction-card">
              <div className="instruction-number">1</div>
              <div className="instruction-content">
                <h3>{isIncorporadora ? 'Identifique Clientes e os cadastre' : 'Identifique Pacientes e os cadastre'}</h3>
                <p>
                  {isIncorporadora 
                    ? 'Procure por pessoas que possam ter interesse em comprar imóveis residenciais. Vá até a página Indicações e preencha o formulário com as informações do cliente.'
                    : 'Procure por pacientes que possam ter interesse em parcelar o valor dos tratamentos odontológicos ou estéticos. Vá até a página Indicações e preencha o formulário com as informações do paciente.'
                  }
                </p>
                <div className="instruction-tip">
                  <span>
                    {isIncorporadora 
                      ? 'Dica: Pense em familiares, amigos, conhecidos ou até você mesmo que possam estar procurando um imóvel!'
                      : 'Dica: Pense em familiares, amigos, conhecidos ou até você mesmo que possam precisar de tratamentos!'
                    }
                  </span>
                </div>
              </div>
            </div>

            <div className="instruction-card">
              <div className="instruction-number">2</div>
              <div className="instruction-content">
                <h3>Acompanhe o Andamento</h3>
                <p>
                  {isIncorporadora 
                    ? 'Após o cadastro, você pode acompanhar o status do cliente em tempo real na página Clientes. Veja quando ele foi contatado, agendou visita e fechou negócio.'
                    : 'Após o cadastro, você pode acompanhar o status do paciente em tempo real na página Pacientes. Veja quando ele foi contatado, agendou consulta e fechou o tratamento.'
                  }
                </p>
                <div className="instruction-tip">
                  <span>
                    {isIncorporadora 
                      ? 'Dica: Não se esqueça de verificar frequentemente o status do cliente!'
                      : 'Dica: Não se esqueça de verificar frequentemente o status do paciente!'
                    }
                  </span>
                </div>
              </div>
            </div>

            <div className="instruction-card">
              <div className="instruction-number">3</div>
              <div className="instruction-content">
                <h3>Receba sua Comissão</h3>
                <p>
                  {isIncorporadora 
                    ? 'Quando o cliente fechar negócio, você receberá R$ 3.000 para estúdios e R$ 5.000 para apartamentos e outros tipos de imóveis diretamente na sua chave PIX cadastrada. Acompanhe seus fechamentos na página Clientes quando o status for Fechado.'
                    : 'Quando o paciente fechar o tratamento, você receberá R$ 50 a cada R$ 5.000 do valor total do tratamento diretamente na sua chave PIX cadastrada. Acompanhe seus fechamentos na página Pacientes quando o status for Fechado.'
                  }
                </p>
                <div className="instruction-tip success">
                  <span>Pagamento rápido e automático via PIX!</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Seção Pós-Indicação */}
        <div className="process-step pos-indicacao-section">
          <div className="section-title-container">
            <h2 className="section-title">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              Fiz minha indicação e agora?
            </h2>
          </div>

          {/* Subtítulo */}
          <div className="pos-indicacao-intro">
            <h3>Simples. Você indica, a gente faz o resto.</h3>
            <div className="fluxo-visual">
              <span className="fluxo-item">Você indica</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
              <span className="fluxo-item">Nossa equipe entra em contato</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
              <span className="fluxo-item">Você acompanha</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
              <span className="fluxo-item">Você recebe</span>
            </div>
          </div>
          
          {/* Cards do Processo */}
          <div className="pos-venda-grid">
            <div className="pos-venda-card">
              <div className="pos-venda-number">1</div>
              <h3>{isIncorporadora ? 'Você cadastra o cliente' : 'Você cadastra o paciente'}</h3>
              <p>
                {isIncorporadora 
                  ? 'Preencha o formulário na página Indicações com as informações do cliente que você quer indicar.'
                  : 'Preencha o formulário na página Indicações com as informações do paciente que você quer indicar.'
                }
              </p>
              <div className="pos-venda-destaque">
                Pronto. Sua parte termina aqui.
              </div>
            </div>

            <div className="pos-venda-card">
              <div className="pos-venda-number">2</div>
              <h3>Nossa equipe entra em ação</h3>
              <p>
                {isIncorporadora 
                  ? 'A equipe da IM Incorporadora recebe sua indicação e entra em contato direto com o cliente.'
                  : 'A equipe da IM recebe sua indicação e entra em contato direto com o paciente.'
                }
              </p>
              <div className="pos-venda-destaque">
                Você não precisa fazer ligações nem negociar.
              </div>
            </div>

            <div className="pos-venda-card">
              <div className="pos-venda-number">3</div>
              <h3>Acompanhe os Status e receba seu pagamento</h3>
              <p style={{ marginBottom: '1rem' }}>
                Acompanhe o status das suas indicações em tempo real na página {isIncorporadora ? 'Clientes' : 'Pacientes'}.
              </p>
              <div className="pos-venda-destaque">
                Se o Status for "Fechado", você receberá o pagamento automaticamente.
              </div>
            </div>
          </div>
        </div>

        {/* Dicas Importantes */}
        <div className="process-step">
          <div className="section-title-container">
            <h2 className="section-title">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              Dicas para Ter Sucesso
            </h2>
          </div>
          
          <div className="tips-grid">
            <div className="tip-card">
              <div className="tip-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                </svg>
              </div>
              <h3>Pense no seu círculo social</h3>
              <p>
                {isIncorporadora 
                  ? 'Comece indicando familiares, amigos, conhecidos ou até você mesmo! Pessoas próximas são mais propensas a confiar na sua indicação para compra de imóveis.'
                  : 'Comece indicando familiares, amigos, conhecidos ou até você mesmo! Pessoas próximas são mais propensas a confiar na sua indicação.'
                }
              </p>
            </div>

            <div className="tip-card">
              <div className="tip-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <h3>Acompanhe os Status</h3>
              <p>
                Acompanhe os status das suas indicações em tempo real na página {isIncorporadora ? 'Clientes' : 'Pacientes'}.
              </p>
            </div>

            <div className="tip-card">
              <div className="tip-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="20" x2="18" y2="10"/>
                  <line x1="12" y1="20" x2="12" y2="4"/>
                  <line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
              </div>
              <h3>Acompanhe Seus Números</h3>
              <p>
                Use o Dashboard para ver suas estatísticas e entender o que está funcionando. 
                Analise suas conversões e ajuste sua estratégia.
              </p>
            </div>

            <div className="tip-card">
              <div className="tip-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <h3>Foque na Qualidade</h3>
              <p>
                {isIncorporadora 
                  ? 'É melhor ter menos leads qualificados do que muitos desinteressados. Converse com os possíveis clientes e entenda se eles realmente têm interesse em comprar imóveis.'
                  : 'É melhor ter menos leads qualificados do que muitos desinteressados. Converse com os possíveis pacientes e entenda se eles realmente têm interesse.'
                }
              </p>
            </div>

            <div className="tip-card">
              <div className="tip-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
              </div>
              <h3>Use os Materiais</h3>
              <p>
                Na seção "Materiais" você encontra documentos e vídeos de apoio 
                para facilitar sua divulgação. Aproveite!
              </p>
            </div>

            <div className="tip-card">
              <div className="tip-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <h3>Participe da Comunidade</h3>
              <p>
                Entre no grupo de WhatsApp dos consultores para trocar experiências, 
                tirar dúvidas e receber dicas de quem já está ganhando!
                Clique no botão abaixo para entrar.
              </p>
              <div className="action-buttons" style={{ marginTop: '1rem' }}>
                <button className="action-button primary" onClick={() => window.location.href = isIncorporadora ? 'https://chat.whatsapp.com/CvVrPfTD5uo0b2kltK99vE' : 'https://chat.whatsapp.com/H58PhHmVQpj1mRSj7wlZgs'}>
                  Entrar no Grupo
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Seção de FAQ */}
        <div className="process-step">
          <div className="section-title-container">
            <h2 className="section-title">
              <HelpCircle size={32} />
              Perguntas Frequentes
            </h2>
          </div>
          
          <div className="faq-container">
            {faqs.map((faq, index) => (
              <div 
                key={index} 
                className={`faq-item ${faqAberto === index ? 'active' : ''}`}
              >
                <button 
                  className="faq-question"
                  onClick={() => toggleFaq(index)}
                >
                  <span>{faq.pergunta}</span>
                  <svg 
                    className="faq-icon"
                    width="20" 
                    height="20" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
                <div className="faq-answer">
                  <p>{faq.resposta}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Call to Action Final */}
      <div className="final-actions">
        <h3>Pronto para Começar?</h3>
        <p>
          {isIncorporadora 
            ? 'Agora que você já sabe como funciona, está na hora de começar a indicar clientes e ganhar dinheiro! Acesse a página de indicações e cadastre seu primeiro cliente!'
            : 'Agora que você já sabe como funciona, está na hora de começar a indicar pacientes e ganhar dinheiro! Acesse a página de indicações e cadastre seu primeiro paciente!'
          }
        </p>
        <div className="action-buttons">
          <button className="action-button primary" onClick={() => window.location.href = '/indicacoes'}>
            <Zap size={20} />
            {isIncorporadora ? 'Cadastrar Cliente' : 'Cadastrar Paciente'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComoFazer;

