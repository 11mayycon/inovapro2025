import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Lock, Mail, CreditCard, TestTube } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import logoImage from '@/assets/inovapro-logo.png';
import { BackgroundSlider } from '@/components/BackgroundSlider';
import { WelcomeAnimation } from '@/components/WelcomeAnimation';
import { TestAccountDialog } from '@/components/TestAccountDialog';
import { generateValidCPF, formatCPF } from '@/utils/cpfGenerator';
import { supabase } from '@/integrations/supabase/client';

export default function Login() {
  const [employeeData, setEmployeeData] = useState({ cpf: '' });
  const [adminData, setAdminData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('employee');
  const [showWelcome, setShowWelcome] = useState(false);
  const [userName, setUserName] = useState('');
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testCpf, setTestCpf] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Auto login quando CPF completo (11 dígitos)
  useEffect(() => {
    const cleanCpf = employeeData.cpf.replace(/\D/g, '');
    console.log('CPF digitado:', cleanCpf, 'Tamanho:', cleanCpf.length);
    if (cleanCpf.length === 11 && activeTab === 'employee' && !loading && !showWelcome) {
      console.log('Iniciando login automático...');
      handleEmployeeLogin();
    }
  }, [employeeData.cpf]);

  const handleEmployeeLogin = async () => {
    console.log('handleEmployeeLogin chamado');
    setLoading(true);
    const { error, user } = await login(employeeData.cpf, employeeData.cpf, false);
    
    console.log('Resultado do login:', { error, user });
    
    if (error) {
      console.error('Erro no login:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao fazer login',
        description: error,
      });
      setLoading(false);
      setEmployeeData({ cpf: '' }); // Limpa o CPF em caso de erro
    } else if (user) {
      console.log('Login bem-sucedido, mostrando boas-vindas');
      setUserName(user.name || 'Usuário');
      setShowWelcome(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
    }
  };

  const handleCreateTestAccount = () => {
    const cpf = generateValidCPF();
    setTestCpf(cpf);
    setShowTestDialog(true);
  };

  const handleTestAccountSubmit = async (name: string, whatsapp: string) => {
    setTestLoading(true);
    
    try {
      // Calcula o tempo de expiração (10 minutos a partir de agora)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);

      // Cria a conta teste no banco
      const { error: insertError } = await supabase
        .from('users')
        .insert([{
          name,
          email: `teste_${testCpf}@temp.com`,
          cpf: testCpf,
          whatsapp_number: whatsapp,
          role: 'employee' as 'employee',
          cargo: 'Usuário Teste',
          blocked: false,
          password_hash: '$2b$10$temp',
          expires_at: expiresAt.toISOString()
        }]);

      if (insertError) {
        throw insertError;
      }

      toast({
        title: 'Conta teste criada!',
        description: `CPF: ${formatCPF(testCpf)}\nExpira em 10 minutos.`,
      });

      // Faz login automático
      setShowTestDialog(false);
      setEmployeeData({ cpf: testCpf });
      
      // Aguarda um momento e faz o login
      setTimeout(() => {
        handleEmployeeLogin();
      }, 500);

    } catch (error: any) {
      console.error('Erro ao criar conta teste:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao criar conta teste',
        description: error.message || 'Tente novamente.',
      });
    } finally {
      setTestLoading(false);
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
          <h1 className="text-4xl font-bold text-white">PDV-INOVAPRO</h1>
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

          <div className="mt-4">
            <Button
              onClick={handleCreateTestAccount}
              variant="outline"
              className="w-full bg-white/10 hover:bg-white/20 text-white border-white/30"
            >
              <TestTube className="mr-2 h-4 w-4" />
              Gerar Conta Teste (10 min)
            </Button>
          </div>
        </div>
      </div>

      <TestAccountDialog
        open={showTestDialog}
        onClose={() => setShowTestDialog(false)}
        onSubmit={handleTestAccountSubmit}
        loading={testLoading}
      />
    </div>
  );
}
