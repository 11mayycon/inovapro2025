import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const BOT_SERVER_URL = import.meta.env.VITE_BOT_SERVER_URL || 'http://localhost:4000';

interface StartShiftDialogProps {
  onShiftStarted: () => void;
}

export function StartShiftDialog({ onShiftStarted }: StartShiftDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    checkActiveShift();
  }, [user, isAdmin]);

  useEffect(() => {
    // Atualizar data/hora a cada segundo
    const interval = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const checkActiveShift = async () => {
    if (!user) return;

    if (isAdmin) {
      onShiftStarted();
      return;
    }

    try {
      // Verificar ponto aberto (entrada sem saída)
      const { data: pontoData, error: pontoError } = await supabase
        .from('ponto')
        .select('*')
        .eq('user_id', user.id)
        .is('saida', null)
        .order('entrada', { ascending: false })
        .limit(1);

      if (pontoError) throw pontoError;

      // Se não houver ponto aberto, mostrar dialog
      if (!pontoData || pontoData.length === 0) {
        // Limpar turno ativo se existir (manter sincronizado)
        await supabase
          .from('active_shifts')
          .delete()
          .eq('user_id', user.id);

        setOpen(true);
        return;
      }

      // Ponto está aberto - verificar/criar turno ativo
      // Não importa se é de hoje ou de dia anterior, mantém o turno aberto
      const { data: shiftData } = await supabase
        .from('active_shifts')
        .select('*')
        .eq('user_id', user.id)
        .order('start_time', { ascending: false })
        .limit(1);

      // Se não houver turno ativo, criar um baseado no ponto
      if (!shiftData || shiftData.length === 0) {
        await supabase
          .from('active_shifts')
          .insert([{
            user_id: user.id,
            start_time: pontoData[0].entrada,
          }]);
      }

      onShiftStarted();
    } catch (error) {
      console.error('Error checking active shift:', error);
      setOpen(true);
    }
  };

  const handleClockIn = async () => {
    setLoading(true);
    try {
      const now = new Date();

      // Inserir registro de ponto
      const { error } = await supabase
        .from('ponto')
        .insert([{
          user_id: user?.id,
          entrada: now.toISOString(),
        }]);

      if (error) throw error;

      // Criar turno ativo
      await supabase
        .from('active_shifts')
        .insert([{
          user_id: user?.id,
          start_time: now.toISOString(),
        }]);

      // Fechar dialog e continuar imediatamente
      setOpen(false);
      onShiftStarted();
      setLoading(false);

      // Enviar notificação via WhatsApp de forma assíncrona (não bloqueante)
      if (user?.whatsapp_number) {
        console.log('📱 [StartShiftDialog] Preparando envio de notificação...');
        console.log('📱 [StartShiftDialog] WhatsApp:', user.whatsapp_number);
        console.log('📱 [StartShiftDialog] Nome:', user.name);
        console.log('📱 [StartShiftDialog] URL do Bot:', BOT_SERVER_URL);

        const payload = {
          whatsapp_number: user.whatsapp_number,
          user_name: user.name,
          clock_time: format(now, "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR }),
          type: 'entrada',
        };

        console.log('📱 [StartShiftDialog] Payload:', JSON.stringify(payload, null, 2));

        // Executar em segundo plano sem await
        fetch(`${BOT_SERVER_URL}/send-clock-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }).then(async response => {
          const data = await response.json();
          console.log('📱 [StartShiftDialog] Resposta do servidor:', response.status, data);

          if (response.ok) {
            console.log('✅ Notificação de entrada enviada via WhatsApp');
          } else {
            console.warn('⚠️ Falha ao enviar notificação de entrada via WhatsApp:', data);
          }
        }).catch(error => {
          console.error('❌ Erro ao enviar notificação de entrada:', error);
        });
      } else {
        console.warn('⚠️ [StartShiftDialog] Usuário não tem whatsapp_number cadastrado');
      }
    } catch (error) {
      console.error('Error clocking in:', error);
      setLoading(false);
    }
  };

  const firstName = (user?.name && user.name.trim()) ? user.name.split(' ')[0] : 'Usuário';

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md bg-gray-800/90 text-white border-none shadow-2xl" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Clock className="w-8 h-8 text-primary animate-spin-slow" />
              <span>🕓 Registro de Ponto</span>
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Diálogo para registrar ponto de entrada
          </DialogDescription>
        </DialogHeader>
        <div className="text-center py-6 space-y-4">
          <p className="text-lg text-gray-300 mb-4">
            Olá, {firstName}!
          </p>
          <p className="text-sm text-gray-400">
            Está pronto para bater seu ponto de entrada?
          </p>

          {/* Exibir data e hora atual */}
          <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
            <p className="text-xs text-gray-400 mb-1">Data e Hora Atual</p>
            <p className="text-xl font-bold text-white">
              {format(currentDateTime, "dd/MM/yyyy", { locale: ptBR })}
            </p>
            <p className="text-2xl font-bold text-primary">
              {format(currentDateTime, "HH:mm:ss", { locale: ptBR })}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleClockIn}
            disabled={loading}
            size="lg"
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {loading ? 'Registrando...' : '🔵 Bater Ponto de Entrada'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}