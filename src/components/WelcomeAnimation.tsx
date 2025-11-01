import { useState, useEffect } from 'react';

export function WelcomeAnimation() {
  const [displayText, setDisplayText] = useState('');
  const [showFirstMessage, setShowFirstMessage] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  const firstMessage = 'Seja bem-vindo(a)';
  const secondMessage = 'Adicione seu CPF para logar';

  useEffect(() => {
    if (showFirstMessage) {
      // Digitando primeira mensagem
      if (currentIndex < firstMessage.length) {
        const timeout = setTimeout(() => {
          setDisplayText(firstMessage.slice(0, currentIndex + 1));
          setCurrentIndex(currentIndex + 1);
        }, 100);
        return () => clearTimeout(timeout);
      } else {
        // Espera e depois apaga
        const timeout = setTimeout(() => {
          setShowFirstMessage(false);
          setCurrentIndex(0);
          setDisplayText('');
        }, 2000);
        return () => clearTimeout(timeout);
      }
    } else {
      // Digitando segunda mensagem
      if (currentIndex < secondMessage.length) {
        const timeout = setTimeout(() => {
          setDisplayText(secondMessage.slice(0, currentIndex + 1));
          setCurrentIndex(currentIndex + 1);
        }, 100);
        return () => clearTimeout(timeout);
      }
    }
  }, [currentIndex, showFirstMessage]);

  return (
    <div className="text-center mb-8">
      <h2 className="text-2xl font-bold text-white min-h-[2rem]">
        {displayText}
        <span className="animate-pulse">|</span>
      </h2>
    </div>
  );
}
