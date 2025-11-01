import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Package, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AnimatedUsername } from './AnimatedUsername';
import { CurrentDateTime } from './CurrentDateTime';

export function PDVHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="bg-blue-900/90 backdrop-blur-md border-b-2 border-blue-700 shadow-lg shadow-blue-500/20 sticky top-0 z-40">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold neon-title uppercase">
                {'CAMINHO CERTO'.split('').map((char, i) => (
                  <span
                    key={i}
                    className="inline-block letter-bounce"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  >
                    {char === ' ' ? '\u00A0' : char}
                  </span>
                ))}
              </h1>
              <p className="text-sm text-blue-200">Sistema de Gestão</p>
            </div>
          </div>
          
          <div className="flex-1 flex justify-center">
            <CurrentDateTime />
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <AnimatedUsername name={user?.name || 'Usuário'} />
              <p className="text-xs text-blue-300">{user?.cargo}</p>
            </div>
            <Button 
              variant="outline" 
              onClick={handleLogout} 
              size="sm"
              className="border-blue-500 hover:bg-blue-800/50 text-white hover:text-white"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
