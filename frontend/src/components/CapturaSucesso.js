import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import logoBrasao from '../images/logobrasao.png';

const CapturaSucesso = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { nome, message } = location.state || {};

  const handleWhatsApp = () => {
    const phoneNumber = '5541997233138'; // Número do WhatsApp da clínica
    const text = `Olá! Acabei de me cadastrar no site para agendar uma consulta. Meu nome é ${nome || 'Não informado'}.`;
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleVoltar = () => {
    navigate('/captura-lead');
  };

  return (
    <div className="sucesso-container">
      <div className="sucesso-content">
        <div className="sucesso-header">
          <div className="success-icon">✅</div>
          <img src={logoBrasao} alt="Logo" className="sucesso-logo" />
          <h1 className="sucesso-title">Cadastro Realizado com Sucesso!</h1>
          <p className="sucesso-subtitle">
            {message || 'Entraremos em contato em breve!'}
          </p>
        </div>

        <div className="sucesso-card">
          <div className="card-icon">🎉</div>
          <h2 className="card-title">
            Obrigado{nome ? `, ${nome.split(' ')[0]}` : ''}!
          </h2>
          <p className="card-text">
            Sua solicitação foi enviada com sucesso. Nossa equipe entrará em contato 
            em até <strong>2 horas</strong> para agendar sua consulta gratuita.
          </p>
          
          <div className="next-steps">
            <h3 className="steps-title">Próximos Passos:</h3>
            <div className="steps-list">
              <div className="step-item">
                <div className="step-number">1</div>
                <div className="step-content">
                  <strong>Aguarde nosso contato</strong>
                  <p>Entraremos em contato via WhatsApp</p>
                </div>
              </div>
              <div className="step-item">
                <div className="step-number">2</div>
                <div className="step-content">
                  <strong>Agende sua consulta</strong>
                  <p>Escolha o melhor horário para você</p>
                </div>
              </div>
              <div className="step-item">
                <div className="step-number">3</div>
                <div className="step-content">
                  <strong>Realize sua consulta</strong>
                  <p>Avaliação gratuita com nossos especialistas</p>
                </div>
              </div>
            </div>
          </div>

          <div className="action-buttons">
            <button 
              onClick={handleWhatsApp}
              className="whatsapp-btn"
            >
              <span className="btn-icon">📱</span>
              Falar no WhatsApp Agora
            </button>
            <button 
              onClick={handleVoltar}
              className="secondary-btn"
            >
              Fazer Novo Cadastro
            </button>
          </div>
        </div>

        <div className="additional-info">
          <div className="info-cards">
            <div className="info-card">
              <div className="info-icon">🕐</div>
              <h4>Resposta Rápida</h4>
              <p>Respondemos em até 2 horas</p>
            </div>
            <div className="info-card">
              <div className="info-icon">🆓</div>
              <h4>Consulta Gratuita</h4>
              <p>Primeira consulta sem custo</p>
            </div>
            <div className="info-card">
              <div className="info-icon">⭐</div>
              <h4>Atendimento Premium</h4>
              <p>Profissionais qualificados</p>
            </div>
          </div>
        </div>

        <div className="social-proof">
          <h3 className="social-title">Junte-se a milhares de pacientes satisfeitos</h3>
          <div className="social-stats">
            <div className="stat-item">
              <div className="stat-number">1000+</div>
              <div className="stat-label">Sorrisos Transformados</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">5⭐</div>
              <div className="stat-label">Avaliação Média</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">98%</div>
              <div className="stat-label">Satisfação</div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .sucesso-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sucesso-content {
          max-width: 700px;
          width: 100%;
        }

        .sucesso-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .success-icon {
          font-size: 4rem;
          margin-bottom: 20px;
          animation: bounce 2s infinite;
        }

        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-10px);
          }
          60% {
            transform: translateY(-5px);
          }
        }

        .sucesso-logo {
          width: 60px;
          height: 60px;
          margin-bottom: 20px;
          filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
        }

        .sucesso-title {
          font-size: 2.5rem;
          font-weight: 800;
          color: white;
          margin-bottom: 15px;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .sucesso-subtitle {
          font-size: 1.2rem;
          color: rgba(255, 255, 255, 0.9);
          margin-bottom: 20px;
        }

        .sucesso-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-radius: 20px;
          padding: 40px;
          margin-bottom: 30px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.3);
          text-align: center;
        }

        .card-icon {
          font-size: 3rem;
          margin-bottom: 20px;
        }

        .card-title {
          font-size: 2rem;
          font-weight: 700;
          color: #2d3748;
          margin-bottom: 15px;
        }

        .card-text {
          font-size: 1.1rem;
          color: #4a5568;
          line-height: 1.6;
          margin-bottom: 30px;
        }

        .next-steps {
          text-align: left;
          margin-bottom: 30px;
        }

        .steps-title {
          font-size: 1.3rem;
          font-weight: 700;
          color: #2d3748;
          margin-bottom: 20px;
          text-align: center;
        }

        .steps-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .step-item {
          display: flex;
          align-items: flex-start;
          gap: 15px;
        }

        .step-number {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.9rem;
          flex-shrink: 0;
        }

        .step-content strong {
          color: #2d3748;
          font-weight: 600;
          display: block;
          margin-bottom: 5px;
        }

        .step-content p {
          color: #4a5568;
          margin: 0;
          font-size: 0.95rem;
        }

        .action-buttons {
          display: flex;
          gap: 15px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .whatsapp-btn {
          background: linear-gradient(135deg, #25d366 0%, #128c7e 100%);
          color: white;
          border: none;
          padding: 15px 25px;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 4px 15px rgba(37, 211, 102, 0.4);
        }

        .whatsapp-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(37, 211, 102, 0.5);
        }

        .secondary-btn {
          background: transparent;
          color: #667eea;
          border: 2px solid #667eea;
          padding: 15px 25px;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .secondary-btn:hover {
          background: #667eea;
          color: white;
          transform: translateY(-2px);
        }

        .btn-icon {
          font-size: 1.1rem;
        }

        .additional-info {
          margin-bottom: 30px;
        }

        .info-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
        }

        .info-card {
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(10px);
          border-radius: 15px;
          padding: 25px;
          text-align: center;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .info-icon {
          font-size: 2rem;
          margin-bottom: 10px;
        }

        .info-card h4 {
          color: white;
          font-size: 1.1rem;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .info-card p {
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.9rem;
          margin: 0;
        }

        .social-proof {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 30px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          text-align: center;
        }

        .social-title {
          color: white;
          font-size: 1.4rem;
          font-weight: 700;
          margin-bottom: 25px;
        }

        .social-stats {
          display: flex;
          justify-content: space-around;
          flex-wrap: wrap;
          gap: 20px;
        }

        .stat-item {
          text-align: center;
        }

        .stat-number {
          font-size: 2.5rem;
          font-weight: 800;
          color: #ffd700;
          margin-bottom: 5px;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .stat-label {
          color: rgba(255, 255, 255, 0.9);
          font-size: 0.9rem;
          font-weight: 600;
        }

        @media (max-width: 768px) {
          .sucesso-title {
            font-size: 2rem;
          }

          .sucesso-card {
            padding: 30px 20px;
          }

          .card-title {
            font-size: 1.7rem;
          }

          .action-buttons {
            flex-direction: column;
          }

          .whatsapp-btn,
          .secondary-btn {
            width: 100%;
          }

          .social-stats {
            justify-content: center;
            gap: 30px;
          }
        }

        @media (max-width: 480px) {
          .sucesso-title {
            font-size: 1.8rem;
          }

          .stat-number {
            font-size: 2rem;
          }
        }
      `}</style>
    </div>
  );
};

export default CapturaSucesso; 