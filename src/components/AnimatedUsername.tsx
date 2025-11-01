import { useState, useEffect } from 'react';
import { User } from 'lucide-react';

interface AnimatedUsernameProps {
  name: string;
}

export function AnimatedUsername({ name }: AnimatedUsernameProps) {
  const welcomeText = "BEM VINDO(A)";
  const upperName = name.toUpperCase();
  const [displayText, setDisplayText] = useState("");
  const [phase, setPhase] = useState<'welcome' | 'eraseWelcome' | 'name' | 'eraseName'>('welcome');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const typeInterval = setInterval(() => {
      if (phase === 'welcome') {
        // Digitando "BEM VINDO(A)"
        if (currentIndex < welcomeText.length) {
          setDisplayText(welcomeText.slice(0, currentIndex + 1));
          setCurrentIndex(prev => prev + 1);
        } else {
          // Pausa antes de apagar
          setTimeout(() => {
            setPhase('eraseWelcome');
            setCurrentIndex(welcomeText.length);
          }, 1000);
        }
      } else if (phase === 'eraseWelcome') {
        // Apagando "BEM VINDO(A)"
        if (currentIndex > 0) {
          setDisplayText(welcomeText.slice(0, currentIndex - 1));
          setCurrentIndex(prev => prev - 1);
        } else {
          // Pausa antes de digitar o nome
          setTimeout(() => {
            setPhase('name');
            setCurrentIndex(0);
          }, 500);
        }
      } else if (phase === 'name') {
        // Digitando o nome do usuário
        if (currentIndex < upperName.length) {
          setDisplayText(upperName.slice(0, currentIndex + 1));
          setCurrentIndex(prev => prev + 1);
        } else {
          // Pausa antes de apagar o nome
          setTimeout(() => {
            setPhase('eraseName');
            setCurrentIndex(upperName.length);
          }, 2000);
        }
      } else if (phase === 'eraseName') {
        // Apagando o nome
        if (currentIndex > 0) {
          setDisplayText(upperName.slice(0, currentIndex - 1));
          setCurrentIndex(prev => prev - 1);
        } else {
          // Pausa antes de recomeçar
          setTimeout(() => {
            setPhase('welcome');
            setCurrentIndex(0);
          }, 500);
        }
      }
    }, 100);

    return () => clearInterval(typeInterval);
  }, [phase, currentIndex, welcomeText, upperName]);

  return (
    <div className="flex items-center gap-2">
      <User className="w-4 h-4 text-primary animate-pulse" />
      <span className="font-medium text-sm neon-text">
        {displayText}
        <span className="inline-block w-0.5 h-4 bg-accent ml-1 animate-pulse" />
      </span>
    </div>
  );
}
