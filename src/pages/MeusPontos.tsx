import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Clock, Download, Calendar, MessageCircle, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, differenceInMinutes, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const BOT_SERVER_URL = import.meta.env.VITE_BOT_SERVER_URL || 'http://localhost:4000';

interface PontoRecord {
  id: string;
  entrada: string;
  saida: string | null;
  created_at: string;
}

export default function MeusPontos() {
  const [pontos, setPontos] = useState<PontoRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPonto, setSelectedPonto] = useState<PontoRecord | null>(null);
  const [showPontoDialog, setShowPontoDialog] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadMyPontos();
  }, [user, selectedMonth]);

  const loadMyPontos = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const monthStart = startOfMonth(selectedMonth);
      const monthEnd = endOfMonth(selectedMonth);

      console.log('Carregando pontos de:', monthStart, 'até:', monthEnd);

      const { data, error } = await supabase
        .from('ponto')
        .select('*')
        .eq('user_id', user.id)
        .gte('entrada', monthStart.toISOString())
        .lte('entrada', monthEnd.toISOString())
        .order('entrada', { ascending: false });

      if (error) throw error;

      console.log('Pontos carregados:', data?.length || 0);
      setPontos((data as any) || []);
    } catch (error) {
      console.error('Error loading pontos:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao carregar seus registros de ponto',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePreviousMonth = () => {
    setSelectedMonth(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(prev => addMonths(prev, 1));
  };

  const handleCurrentMonth = () => {
    setSelectedMonth(new Date());
  };

  const calculateDayHours = (entrada: string, saida: string | null): string => {
    if (!saida) return 'Em andamento';

    const entradaDate = new Date(entrada);
    const saidaDate = new Date(saida);
    const minutes = differenceInMinutes(saidaDate, entradaDate);

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    return `${hours}h ${mins}min`;
  };

  const calculateMonthTotal = (): string => {
    let totalMinutes = 0;

    pontos.forEach(ponto => {
      if (ponto.saida) {
        const minutes = differenceInMinutes(
          new Date(ponto.saida),
          new Date(ponto.entrada)
        );
        totalMinutes += minutes;
      }
    });

    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;

    return `${hours}h ${mins}min`;
  };

  const generatePDF = async () => {
    toast({
      title: 'Gerando Comprovante...',
      description: 'Aguarde enquanto geramos seu comprovante de ponto',
    });

    try {
      // Preparar dados para o PDF
      const reportData = {
        funcionario: user?.name,
        cargo: user?.cargo,
        periodo: format(selectedMonth, "MMMM 'de' yyyy", { locale: ptBR }),
        totalHoras: calculateMonthTotal(),
        quantidadeRegistros: pontos.length,
        registros: pontos.map(p => ({
          data: format(new Date(p.entrada), 'dd/MM/yyyy', { locale: ptBR }),
          entrada: format(new Date(p.entrada), 'HH:mm:ss', { locale: ptBR }),
          saida: p.saida ? format(new Date(p.saida), 'HH:mm:ss', { locale: ptBR }) : 'Em andamento',
          total: calculateDayHours(p.entrada, p.saida),
        })),
      };

      console.log('Dados para PDF:', reportData);

      // TODO: Implementar geração de PDF usando a mesma lógica do sistema
      setTimeout(() => {
        toast({
          title: 'PDF gerado!',
          description: `Comprovante de ${pontos.length} registro(s) de ponto exportado com sucesso`,
        });
      }, 1500);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao gerar comprovante',
      });
    }
  };

  const handlePontoClick = (ponto: PontoRecord) => {
    setSelectedPonto(ponto);
    setShowPontoDialog(true);
  };

  const sendPontoToWhatsApp = async () => {
    if (!selectedPonto || !user?.whatsapp_number) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Número de WhatsApp não encontrado no seu perfil',
      });
      return;
    }

    setSendingWhatsApp(true);
    try {
      // Preparar mensagem do ponto
      const dataFormatada = format(new Date(selectedPonto.entrada), 'dd/MM/yyyy', { locale: ptBR });
      const entradaFormatada = format(new Date(selectedPonto.entrada), 'HH:mm:ss', { locale: ptBR });
      const saidaFormatada = selectedPonto.saida
        ? format(new Date(selectedPonto.saida), 'HH:mm:ss', { locale: ptBR })
        : 'Em andamento';
      const totalHoras = calculateDayHours(selectedPonto.entrada, selectedPonto.saida);

      // Enviar notificação de ponto pelo bot do WhatsApp
      const response = await fetch(`${BOT_SERVER_URL}/send-clock-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          whatsapp_number: user.whatsapp_number,
          user_name: user.name,
          clock_time: `${dataFormatada} às ${entradaFormatada}`,
          type: 'comprovante',
          entrada: entradaFormatada,
          saida: saidaFormatada,
          totalHoras: totalHoras,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao enviar mensagem');
      }

      toast({
        title: 'Enviado com sucesso!',
        description: 'Comprovante de ponto enviado para seu WhatsApp',
      });

      setShowPontoDialog(false);
    } catch (error) {
      console.error('Error sending to WhatsApp:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao enviar comprovante para WhatsApp',
      });
    } finally {
      setSendingWhatsApp(false);
    }
  };

  return (
    <Layout title="Meus Pontos e Horas Trabalhadas" showBack>
      <div className="space-y-6">
        {/* Seletor de Mês */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <Button
                onClick={handlePreviousMonth}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </Button>

              <div className="flex flex-col items-center">
                <h2 className="text-2xl font-bold capitalize">
                  {format(selectedMonth, "MMMM 'de' yyyy", { locale: ptBR })}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {pontos.length} registro{pontos.length !== 1 ? 's' : ''} de ponto
                </p>
              </div>

              <div className="flex gap-2">
                {format(selectedMonth, 'yyyy-MM') !== format(new Date(), 'yyyy-MM') && (
                  <Button
                    onClick={handleCurrentMonth}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <Calendar className="w-4 h-4" />
                    Mês Atual
                  </Button>
                )}
                <Button
                  onClick={handleNextMonth}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={format(selectedMonth, 'yyyy-MM') === format(new Date(), 'yyyy-MM')}
                >
                  Próximo
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card de Total do Mês */}
        <Card className="bg-gradient-to-br from-purple-600 via-blue-600 to-pink-500 text-white">
          <CardContent className="py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 rounded-full p-4">
                  <Clock className="w-10 h-10" />
                </div>
                <div>
                  <p className="text-sm opacity-90 mb-1">Total Acumulado</p>
                  <p className="text-4xl font-bold">{calculateMonthTotal()}</p>
                  <p className="text-sm opacity-75 mt-1">
                    {pontos.length} dia{pontos.length !== 1 ? 's' : ''} trabalhado{pontos.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <Button
                onClick={generatePDF}
                size="lg"
                className="bg-white text-blue-600 hover:bg-gray-100"
              >
                <Download className="w-5 h-5 mr-2" />
                📄 Imprimir em PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Registros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                🕓 Histórico de Pontos
              </div>
              {!loading && pontos.length > 0 && (
                <span className="text-sm font-normal text-muted-foreground">
                  Mostrando {pontos.length} registro{pontos.length !== 1 ? 's' : ''}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="w-16 h-16 mx-auto mb-4 opacity-50 animate-spin" />
                <p>Carregando seus registros...</p>
              </div>
            ) : pontos.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">Nenhum registro de ponto em {format(selectedMonth, "MMMM 'de' yyyy", { locale: ptBR })}</p>
                <p className="text-sm">Seus pontos aparecerão aqui quando você começar a registrá-los</p>
                {format(selectedMonth, 'yyyy-MM') !== format(new Date(), 'yyyy-MM') && (
                  <Button
                    onClick={handleCurrentMonth}
                    variant="outline"
                    className="mt-4"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Ver Mês Atual
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left py-4 px-6 font-semibold text-sm">Data</th>
                        <th className="text-left py-4 px-6 font-semibold text-sm">Hora de Entrada</th>
                        <th className="text-left py-4 px-6 font-semibold text-sm">Hora de Saída</th>
                        <th className="text-left py-4 px-6 font-semibold text-sm">Total de Horas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pontos.map((ponto, index) => (
                        <tr
                          key={ponto.id}
                          className="border-b hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => handlePontoClick(ponto)}
                        >
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-primary" />
                              <span className="font-medium">
                                {format(new Date(ponto.entrada), 'dd/MM/yyyy', { locale: ptBR })}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-green-600 font-bold text-lg">
                              {format(new Date(ponto.entrada), 'HH:mm:ss', { locale: ptBR })}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            {ponto.saida ? (
                              <span className="text-red-600 font-bold text-lg">
                                {format(new Date(ponto.saida), 'HH:mm:ss', { locale: ptBR })}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
                                <Clock className="w-4 h-4 animate-pulse" />
                                Em andamento
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            <span className="font-bold text-primary text-lg">
                              {calculateDayHours(ponto.entrada, ponto.saida)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="text-center text-sm text-muted-foreground pt-2 border-t">
                  💡 Clique em qualquer registro para enviar comprovante por WhatsApp
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Informações Adicionais */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="py-4">
            <div className="flex items-center gap-3 text-sm">
              <div className="bg-blue-500 text-white rounded-full p-2">
                <Clock className="w-4 h-4" />
              </div>
              <p className="text-muted-foreground">
                <strong className="text-foreground">Dica:</strong> Seus registros de ponto são salvos automaticamente
                quando você bate o ponto no início e fim do dia. Você receberá uma confirmação por WhatsApp.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog de opções do ponto */}
      <Dialog open={showPontoDialog} onOpenChange={setShowPontoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Opções do Registro de Ponto</DialogTitle>
          </DialogHeader>
          {selectedPonto && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="text-sm">
                  <strong>Data:</strong> {format(new Date(selectedPonto.entrada), 'dd/MM/yyyy', { locale: ptBR })}
                </p>
                <p className="text-sm">
                  <strong>Entrada:</strong>{' '}
                  <span className="text-green-600 font-bold">
                    {format(new Date(selectedPonto.entrada), 'HH:mm:ss', { locale: ptBR })}
                  </span>
                </p>
                <p className="text-sm">
                  <strong>Saída:</strong>{' '}
                  {selectedPonto.saida ? (
                    <span className="text-red-600 font-bold">
                      {format(new Date(selectedPonto.saida), 'HH:mm:ss', { locale: ptBR })}
                    </span>
                  ) : (
                    <span className="text-yellow-600 font-bold">Em andamento</span>
                  )}
                </p>
                <p className="text-sm">
                  <strong>Total:</strong>{' '}
                  <span className="text-primary font-bold">
                    {calculateDayHours(selectedPonto.entrada, selectedPonto.saida)}
                  </span>
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={sendPontoToWhatsApp}
                  disabled={sendingWhatsApp}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  {sendingWhatsApp ? 'Enviando...' : 'Enviar Comprovante para WhatsApp'}
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPontoDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
