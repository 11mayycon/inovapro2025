import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Package, 
  Truck, 
  ShoppingCart, 
  History, 
  Trash2, 
  Users, 
  FileText,
  DollarSign,
  LogOut,
  BarChart3,
  Upload,
  Search,
  AlertTriangle,
  Clock,
  Settings,
  FileBarChart,
  ClipboardCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StartShiftDialog } from '@/components/StartShiftDialog';
import { AnimatedUsername } from '@/components/AnimatedUsername';
import { CurrentDateTime } from '@/components/CurrentDateTime';
import { BottomNavBar } from '@/components/BottomNavBar';
import { PDVHeader } from '@/components/PDVHeader';
import backgroundImg from '@/assets/posto-rodoil-bg.jpg';
import PDV from './PDV';

export default function Dashboard() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [shiftStarted, setShiftStarted] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleShiftStarted = () => {
    setShiftStarted(true);
  };

  const cards = [
    {
      title: 'PDV - Ponto de Venda',
      description: 'Realizar vendas rápidas',
      icon: ShoppingCart,
      path: '/pdv',
      color: 'from-primary to-primary-hover',
      show: true,
    },
    {
      title: 'Finalizar Turno',
      description: 'Fechar caixa e gerar relatório',
      icon: Clock,
      path: '/finalizar-turno',
      color: 'from-yellow-500 to-yellow-600',
      show: !isAdmin,
    },
    {
      title: '🕓 Meus Pontos',
      description: 'Horas trabalhadas e comprovantes',
      icon: Clock,
      path: '/meus-pontos',
      color: 'from-purple-500 to-pink-500',
      show: !isAdmin,
    },
    {
      title: '📅 Controle de Ponto',
      description: 'Horas de todos os funcionários',
      icon: Clock,
      path: '/controle-ponto',
      color: 'from-blue-500 to-purple-600',
      show: isAdmin,
    },
    {
      title: 'Produtos',
      description: 'Gerenciar catálogo',
      icon: Package,
      path: '/produtos',
      color: 'from-accent to-accent-hover',
      show: true,
    },
    {
      title: 'Gerar Relatório',
      description: 'Relatório de estoque',
      icon: FileBarChart,
      path: '/relatorio-estoque',
      color: 'from-orange-500 to-orange-600',
      show: isAdmin,
    },
    {
      title: 'Recebimento',
      description: 'Registrar entrada de produtos',
      icon: Truck,
      path: '/recebimento',
      color: 'from-success to-green-600',
      show: true,
    },
    {
      title: 'Consultar Produtos',
      description: 'Ver estoque disponível',
      icon: Search,
      path: '/consulta-produtos',
      color: 'from-cyan-500 to-cyan-600',
      show: true,
    },
    {
      title: 'Inventário',
      description: 'Contagem e conferência física',
      icon: ClipboardCheck,
      path: '/inventario',
      color: 'from-violet-500 to-violet-600',
      show: true,
    },
    {
      title: 'Histórico de Vendas',
      description: 'Ver todas as vendas',
      icon: FileText,
      path: '/vendas',
      color: 'from-blue-500 to-blue-600',
      show: true,
    },
    {
      title: 'Movimentações',
      description: 'Histórico de estoque',
      icon: BarChart3,
      path: '/movimentacoes',
      color: 'from-purple-500 to-purple-600',
      show: true,
    },
    {
      title: 'Desperdício',
      description: 'Registrar perdas',
      icon: Trash2,
      path: '/desperdicio',
      color: 'from-destructive to-red-600',
      show: true,
    },
    {
      title: 'Produtos em Risco',
      description: 'Estoque crítico e sem vendas',
      icon: AlertTriangle,
      path: '/produtos-risco',
      color: 'from-red-500 to-red-600',
      show: isAdmin,
    },
    {
      title: 'Venda Total',
      description: 'Resumo por usuário',
      icon: DollarSign,
      path: '/venda-total',
      color: 'from-emerald-500 to-emerald-600',
      show: isAdmin,
    },
    {
      title: 'Vendas',
      description: 'Vendas por usuário e método',
      icon: Users,
      path: '/vendas-admin',
      color: 'from-teal-500 to-teal-600',
      show: isAdmin,
    },
    {
      title: 'Histórico',
      description: 'Meus turnos finalizados',
      icon: FileText,
      path: '/historico-turnos',
      color: 'from-blue-500 to-blue-600',
      show: !isAdmin,
    },
    {
      title: 'Usuários',
      description: 'Gerenciar equipe',
      icon: Users,
      path: '/usuarios',
      color: 'from-indigo-500 to-indigo-600',
      show: isAdmin,
    },
    {
      title: 'Importar CSV',
      description: 'Importar produtos do CSV',
      icon: Upload,
      path: '/importar',
      color: 'from-pink-500 to-pink-600',
      show: isAdmin,
    },
    {
      title: 'Importar SQL',
      description: 'Importar produtos filtrados do SQL',
      icon: FileText,
      path: '/importar-sql',
      color: 'from-rose-500 to-rose-600',
      show: isAdmin,
    },
    {
      title: 'Configurações',
      description: 'Alterar senha e email',
      icon: Settings,
      path: '/perfil',
      color: 'from-gray-500 to-gray-600',
      show: isAdmin,
    },
  ];

  // Funcionários precisam iniciar turno, admins não
  if (!isAdmin && !shiftStarted) {
    return <StartShiftDialog onShiftStarted={handleShiftStarted} />;
  }

  // Preparar cards de navegação para a barra inferior (desktop)
  const navCards = cards
    .filter(card => card.show && card.path !== '/pdv')
    .map(card => ({
      title: card.title,
      icon: card.icon,
      path: card.path,
      color: card.color.replace('from-primary', 'from-green-500').replace('to-primary-hover', 'to-green-600'),
    }));

  // Layout Desktop com PDV principal
  const DesktopLayout = () => (
    <div className="hidden lg:flex flex-col min-h-screen">
      <PDVHeader />
      <div className="flex-1 pb-24 overflow-y-auto">
        <PDV />
      </div>
      <BottomNavBar cards={navCards} />
    </div>
  );

  // Layout Mobile - mantém o design atual
  const MobileLayout = () => (
    <div className="lg:hidden min-h-screen bg-cover bg-center bg-fixed relative" style={{ backgroundImage: `url(${backgroundImg})` }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
      
      <div className="relative z-10">
        <header className="bg-blue-900/90 backdrop-blur-md border-b-2 border-blue-700 shadow-lg shadow-blue-500/20">
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
              
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <AnimatedUsername name={user?.name || 'Usuário'} />
                  <p className="text-sm text-blue-300">{user?.cargo}</p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleLogout}
                  className="border-blue-500 hover:bg-blue-800/50 text-white hover:text-white"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </Button>
              </div>
            </div>
            
            <div className="mt-3 flex justify-center">
              <CurrentDateTime />
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2 text-white drop-shadow-lg">
              Bem-vindo, {(user?.name && user.name.trim()) ? user.name.split(' ')[0] : 'Usuário'}!
            </h2>
            <p className="text-white/90 drop-shadow-md">
              Selecione uma opção abaixo para começar
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {cards.filter(card => card.show).map((card) => {
              const Icon = card.icon;
              return (
                <Card
                  key={card.path}
                  className="group cursor-pointer overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-blue-900/95 backdrop-blur-md border-2 border-blue-700"
                  onClick={() => navigate(card.path)}
                >
                  <div className={`h-2 bg-gradient-to-r ${card.color.replace('from-primary', 'from-green-500').replace('to-primary-hover', 'to-green-600').replace('from-blue-500', 'from-green-500').replace('to-blue-600', 'to-green-600')}`} />
                  <div className="p-6">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color.replace('from-primary', 'from-green-500').replace('to-primary-hover', 'to-green-600').replace('from-blue-500', 'from-green-500').replace('to-blue-600', 'to-green-600')} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-[22px] font-bold mb-2 text-white">{card.title}</h3>
                    <p className="text-gray-200">{card.description}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );

  return (
    <>
      <DesktopLayout />
      <MobileLayout />
    </>
  );
}
