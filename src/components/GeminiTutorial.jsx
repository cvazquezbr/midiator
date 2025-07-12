import React from 'react';
import './GeminiTutorial.css';

const GeminiTutorial = () => {
  return (
    <div className="tutorial-container">
      <h3>Como obter sua Chave da API Gemini (Google AI Studio)</h3>
      <ol>
        <li>
          <strong>Acesse o Google AI Studio:</strong>
          <p>
            Visite o site{' '}
            <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer">
              Google AI Studio
            </a>{' '}
            e faça login com sua conta do Google.
          </p>
        </li>
        <li>
          <strong>Crie uma nova chave de API:</strong>
          <p>
            No menu à esquerda, clique em <strong>"Get API key"</strong>.
          </p>
        </li>
        <li>
          <strong>Copie sua chave:</strong>
          <p>
            Na janela que aparecer, clique em <strong>"Create API key"</strong>. Sua chave será gerada.
            Clique no botão para copiar a chave para a área de transferência.
          </p>
        </li>
        <li>
          <strong>Cole a chave na aplicação:</strong>
          <p>
            Volte para esta página e cole a chave copiada no campo "Chave da API Gemini".
          </p>
        </li>
      </ol>
    </div>
  );
};

export default GeminiTutorial;
