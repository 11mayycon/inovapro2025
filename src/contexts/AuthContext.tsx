import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface User {
  id: string;
  name: string;
  email?: string;
  whatsapp_number?: string;
  role: 'admin' | 'employee';
  cargo?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (emailOrCpf: string, password: string, isAdmin?: boolean) => Promise<{ error?: string; user?: User }>;
  logout: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const savedUser = localStorage.getItem('rodoil_user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (emailOrCpf: string, password: string, isAdmin: boolean = false) => {
    try {
      let query = supabase
        .from('users')
        .select('*')
        .eq('blocked', false)
        .limit(1);

      // Admin login usa email, funcionário usa CPF
      if (isAdmin) {
        query = query.eq('email', emailOrCpf);
      } else {
        query = query.eq('cpf', emailOrCpf);
      }

      const { data: users, error } = await query;

      if (error) throw error;
      
      if (!users || users.length === 0) {
        return { error: 'Credenciais inválidas' };
      }

      const userData = users[0] as any;

      // Verificar se a conta expirou
      if (userData.expires_at) {
        const expiresAt = new Date(userData.expires_at);
        const now = new Date();
        
        if (now > expiresAt) {
          // Deletar conta expirada
          await supabase.from('users').delete().eq('id', userData.id);
          return { error: 'Esta conta teste expirou e foi removida.' };
        }
      }

      // Para admin, validar senha com bcrypt
      // Para funcionário, login apenas com CPF (sem senha)
      if (isAdmin) {
        const bcrypt = await import('bcryptjs');
        const isValidPassword = await bcrypt.compare(password, userData.password_hash);

        if (!isValidPassword) {
          return { error: 'Credenciais inválidas' };
        }

        // Verificar se o usuário é realmente admin
        if (userData.role !== 'admin') {
          return { error: 'Acesso não autorizado' };
        }
      }

      const userInfo: User = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        whatsapp_number: userData.whatsapp_number || '',
        role: userData.role,
        cargo: userData.cargo,
      };
      
      setUser(userInfo);
      localStorage.setItem('rodoil_user', JSON.stringify(userInfo));
      return { user: userInfo };
    } catch (error) {
      console.error('Login error:', error);
      return { error: 'Erro ao fazer login' };
    }
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem('rodoil_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAdmin: user?.role === 'admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
