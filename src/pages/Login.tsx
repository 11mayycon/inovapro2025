import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Lock, Mail, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import logoImage from '@/assets/rodoil-logo.png';
import { BackgroundSlider } from '@/components/BackgroundSlider';

export default function Login() {
  const [employeeData, setEmployeeData] = useState({ cpf: '' });
  const [adminData, setAdminData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleEmployeeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Login de funcionário sem senha - usa CPF como senha também
    const { error } = await login(employeeData.cpf, employeeData.cpf, false);
    
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao fazer login',
        description: error,
      });
      setLoading(false);
    } else {
      toast({
        title: 'Login realizado com sucesso!',
        description: 'Bem-vindo ao caminho certo',
      });
      navigate('/dashboard');
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await login(adminData.email, adminData.password, true);
    
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao fazer login',
        description: error,
      });
      setLoading(false);
    } else {
      toast({
        title: 'Login realizado com sucesso!',
        description: 'Bem-vindo ao caminho certo',
      });
      navigate('/dashboard');
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <BackgroundSlider />
      <Card className="w-full max-w-md p-8 space-y-6 relative z-10 shadow-2xl backdrop-blur-sm bg-card/95">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <img src={logoImage} alt="RodOil Logo" className="w-20 h-20" />
          </div>
          <h1 className="text-3xl font-bold">CAMINHO CERTO</h1>
          <p className="text-muted-foreground">Sistema de Gerenciamento de Estoque</p>
        </div>

        <Tabs defaultValue="employee" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="employee">Funcionário</TabsTrigger>
            <TabsTrigger value="admin">Administrador</TabsTrigger>
          </TabsList>

          <TabsContent value="employee" className="space-y-4">
            <form onSubmit={handleEmployeeLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="cpf"
                    type="text"
                    placeholder="000.000.000-00"
                    value={employeeData.cpf}
                    onChange={(e) => setEmployeeData({ cpf: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-primary to-primary-hover"
                disabled={loading}
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="admin" className="space-y-4">
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={adminData.email}
                    onChange={(e) => setAdminData({ ...adminData, email: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adm-password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="adm-password"
                    type="password"
                    placeholder="••••••"
                    value={adminData.password}
                    onChange={(e) => setAdminData({ ...adminData, password: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-primary to-primary-hover"
                disabled={loading}
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>

            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
