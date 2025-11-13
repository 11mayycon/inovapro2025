import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Package, LogOut, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AnimatedUsername } from './AnimatedUsername';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
}

export function Layout({ children, title, showBack = false }: LayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-blue-900/90 backdrop-blur-md border-b-2 border-blue-700 shadow-lg shadow-blue-500/20 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {showBack && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/dashboard')}
                  className="mr-2 hover:bg-blue-800/50 text-white"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              )}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                {title || 'C.P.V'}
              </h1>
              <p className="text-xs text-blue-200">Controle de Produção Veicular</p>
            </div>
          </div>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-white">{user?.name || 'Usuário'}</p>
                <p className="text-xs text-blue-300">{user?.cargo}</p>
              </div>
              <Button 
                variant="outline" 
                onClick={handleLogout} 
                size="sm"
                className="border-blue-500 hover:bg-blue-800/50 text-white hover:text-white"
              >
                <LogOut className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Sair</span>
              </Button>
            </div>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
