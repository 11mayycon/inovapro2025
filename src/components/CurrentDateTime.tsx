import { useState, useEffect } from 'react';
import { Calendar, Clock } from 'lucide-react';

export function CurrentDateTime() {
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="flex flex-col items-end text-right">
      <div className="flex items-center gap-1 text-blue-200 text-sm">
        <Calendar className="w-3 h-3" />
        <span className="capitalize">{formatDate(currentDateTime)}</span>
      </div>
      <div className="flex items-center gap-1 text-white font-mono text-lg font-bold">
        <Clock className="w-4 h-4" />
        <span>{formatTime(currentDateTime)}</span>
      </div>
    </div>
  );
}