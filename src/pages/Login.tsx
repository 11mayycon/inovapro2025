import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Lock, Mail, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import logoImage from '@/assets/rodoil-logo.png';
import { BackgroundSlider } from '@/components/BackgroundSlider';
import { WelcomeAnimation } from '@/components/WelcomeAnimation';

export default function Login() {
  const [employeeData, setEmployeeData] = useState({ cpf: '' });
  const [adminData, setAdminData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('employee');
  const [showWelcome, setShowWelcome] = useState(false);
  const [userName, setUserName] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Auto login quando CPF completo (11 dígitos)
  useEffect(() => {
    const cleanCpf = employeeData.cpf.replace(/\D/g, '');
    if (cleanCpf.length === 11 && activeTab === 'employee' && !loading) {
      handleEmployeeLogin();
    }
  }, [employeeData.cpf]);

  const handleEmployeeLogin = async () => {
    setLoading(true);
    const { error, user } = await login(employeeData.cpf, employeeData.cpf, false);
    
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao fazer login',
        description: error,
      });
      setLoading(false);
    } else {
      setUserName(user?.name || 'Usuário');
      setShowWelcome(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
    }
  };


  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error, user } = await login(adminData.email, adminData.password, true);
    
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao fazer login',
        description: error,
      });
      setLoading(false);
    } else {
      setUserName(user?.name || 'Administrador');
      setShowWelcome(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
    }
  };


  if (showWelcome) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative">
        <BackgroundSlider />
        <div className="text-center relative z-10 animate-fade-in">
          <div className="flex justify-center mb-6">
            <img src={logoImage} alt="RodOil Logo" className="w-32 h-32" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">Bem-vindo(a)</h1>
          <h2 className="text-3xl font-bold text-white mb-6">{userName}</h2>
          <p className="text-2xl text-white/90">Tenha um ótimo dia!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <BackgroundSlider />
      
      <div className="w-full max-w-md relative z-10">
        <div className="text-center space-y-6 mb-8">
          <div className="flex justify-center">
            <img src={logoImage} alt="RodOil Logo" className="w-24 h-24" />
          </div>
          <h1 className="text-4xl font-bold text-white">CAMINHO CERTO</h1>
          <WelcomeAnimation />
        </div>

        <div className="backdrop-blur-sm bg-card/20 p-6 rounded-lg">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="employee">Funcionário</TabsTrigger>
              <TabsTrigger value="admin">Administrador</TabsTrigger>
            </TabsList>

            <TabsContent value="employee" className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/70" />
                  <Input
                    id="cpf"
                    type="text"
                    placeholder="Digite seu CPF"
                    value={employeeData.cpf}
                    onChange={(e) => setEmployeeData({ cpf: e.target.value })}
                    className="pl-10 bg-white/10 border-white/30 text-white placeholder:text-white/50 focus:bg-white/20"
                    disabled={loading}
                    autoFocus
                  />
                </div>
                {loading && (
                  <p className="text-center text-white/70 text-sm">Entrando...</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="admin" className="space-y-4">
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="space-y-2">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/70" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Email"
                      value={adminData.email}
                      onChange={(e) => setAdminData({ ...adminData, email: e.target.value })}
                      className="pl-10 bg-white/10 border-white/30 text-white placeholder:text-white/50 focus:bg-white/20"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/70" />
                    <Input
                      id="adm-password"
                      type="password"
                      placeholder="Senha"
                      value={adminData.password}
                      onChange={(e) => setAdminData({ ...adminData, password: e.target.value })}
                      className="pl-10 bg-white/10 border-white/30 text-white placeholder:text-white/50 focus:bg-white/20"
                      required
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-white/20 hover:bg-white/30 text-white font-bold py-3 rounded-md transition-all backdrop-blur-sm border border-white/30"
                  disabled={loading}
                >
                  {loading ? 'Entrando...' : 'Entrar'}
                </button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
