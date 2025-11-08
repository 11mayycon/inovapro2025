import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FileText, DollarSign, Calendar, Printer, Filter, Trash2 } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Sale {
  id: string;
  user_id: string;
  total: number;
  forma_pagamento: string;
  created_at: string;
  users?: { name: string };
}

interface SaleItem {
  nome_produto: string;
  quantidade: number;
  preco_unitario: number;
}

export default function HistoricoVendas() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadSales();
  }, [filterDate]);

  const loadSales = async () => {
    try {
      let query = supabase
        .from('sales')
        .select('*, users(name)')
        .order('created_at', { ascending: false });

      // Se não for admin, mostrar apenas vendas do usuário
      if (!isAdmin) {
        query = query.eq('user_id', user?.id);
      }

      if (isAdmin) {
        // Administradores veem vendas do dia (comportamento anterior)
        const targetDate = filterDate ? new Date(filterDate) : new Date();
        const dayStart = startOfDay(targetDate);
        const dayEnd = endOfDay(targetDate);
        
        query = query
          .gte('created_at', dayStart.toISOString())
          .lte('created_at', dayEnd.toISOString());
      } else {
        // Usuários regulares veem apenas vendas do turno atual
        if (filterDate) {
          // Se há filtro de data, usar a data específica
          const targetDate = new Date(filterDate);
          const dayStart = startOfDay(targetDate);
          const dayEnd = endOfDay(targetDate);
          
          query = query
            .gte('created_at', dayStart.toISOString())
            .lte('created_at', dayEnd.toISOString());
        } else {
          // Buscar turno ativo do usuário
          const { data: activeShift } = await supabase
            .from('active_shifts')
            .select('start_time')
            .eq('user_id', user?.id)
            .single();

          if (activeShift?.start_time) {
            // Filtrar vendas a partir do início do turno
            query = query.gte('created_at', activeShift.start_time);
          } else {
            // Se não há turno ativo, mostrar vendas do dia atual
            const dayStart = startOfDay(new Date());
            const dayEnd = endOfDay(new Date());
            
            query = query
              .gte('created_at', dayStart.toISOString())
              .lte('created_at', dayEnd.toISOString());
          }
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      setSales(data || []);
    } catch (error) {
      console.error('Error loading sales:', error);
    }
  };

  const openSaleDetails = async (sale: Sale) => {
    try {
      const { data, error } = await supabase
        .from('sale_items')
        .select('*')
        .eq('sale_id', sale.id);

      if (error) throw error;
      setSaleItems(data || []);
      setSelectedSale(sale);
      setShowDialog(true);
    } catch (error) {
      console.error('Error loading sale items:', error);
    }
  };

  const formatPaymentMethod = (method: string) => {
    const methods: Record<string, string> = {
      dinheiro: 'Dinheiro',
      cartao_debito: 'Cartão de Débito',
      cartao_credito: 'Cartão de Crédito',
      pix: 'PIX',
      outro: 'Outro',
      visa_credito: 'Visa Crédito',
      visa_debito: 'Visa Débito',
      elo_credito: 'Elo Crédito',
      elo_debito: 'Elo Débito',
      mastercard_credito: 'Mastercard Crédito',
      maestro_debito: 'Maestro Débito',
      amex_hipercard_credsystem: 'Amex/Hipercard/Credsystem',
    };
    return methods[method] || method;
  };

  const getCardBrandIcon = (method: string) => {
    // Retorna emoji/ícone para cada bandeira
    const icons: Record<string, string> = {
      visa_credito: '💳 Visa',
      visa_debito: '💳 Visa',
      elo_credito: '💳 Elo',
      elo_debito: '💳 Elo',
      mastercard_credito: '💳 Mastercard',
      maestro_debito: '💳 Maestro',
      amex_hipercard_credsystem: '💳 Amex/Hiper',
      cartao_credito: '💳 Crédito',
      cartao_debito: '💳 Débito',
      pix: '📱 PIX',
      dinheiro: '💵 Dinheiro',
    };
    return icons[method] || '💰';
  };

  const handlePrintReceipt = async () => {
    if (!selectedSale) return;

    setPrinting(true);
    try {
      const receiptNumber = `NF-${Date.now()}`;
      const saleDate = new Date(selectedSale.created_at);

      const receiptData = {
        type: 'sale',
        saleId: selectedSale.id,
        receiptNumber,
        date: saleDate.toLocaleDateString('pt-BR'),
        time: saleDate.toLocaleTimeString('pt-BR'),
        user: selectedSale.users?.name || user?.name || 'Sistema',
        items: saleItems.map(item => ({
          nome: item.nome_produto,
          quantidade: item.quantidade,
          preco: item.preco_unitario,
          total: item.preco_unitario * item.quantidade,
        })),
        total: selectedSale.total,
        paymentMethod: selectedSale.forma_pagamento,
      };

      // Chamar edge function para gerar cupom
      const { data, error } = await supabase.functions.invoke('print-receipt', {
        body: receiptData,
      });

      if (error) throw error;

      toast({
        title: 'Nota fiscal gerada!',
        description: `Número: ${receiptNumber}`,
      });

      console.log('Receipt text:', data.receiptText);
    } catch (error) {
      console.error('Error printing receipt:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao gerar nota fiscal',
        description: 'Tente novamente mais tarde',
      });
    } finally {
      setPrinting(false);
    }
  };

  const handleCancelSale = async () => {
    if (!selectedSale) return;

    // Confirmar cancelamento
    if (!confirm('Tem certeza que deseja cancelar esta venda? Esta ação não pode ser desfeita.')) {
      return;
    }

    setCanceling(true);
    try {
      // Primeiro apagar os itens da venda
      const { error: itemsError } = await supabase
        .from('sale_items')
        .delete()
        .eq('sale_id', selectedSale.id);

      if (itemsError) throw itemsError;

      // Depois apagar a venda
      const { error: saleError } = await supabase
        .from('sales')
        .delete()
        .eq('id', selectedSale.id);

      if (saleError) throw saleError;

      toast({
        title: 'Venda cancelada!',
        description: 'A venda foi removida com sucesso.',
      });

      // Fechar dialog e recarregar vendas
      setShowDialog(false);
      loadSales();
    } catch (error) {
      console.error('Error canceling sale:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao cancelar venda',
        description: 'Tente novamente mais tarde',
      });
    } finally {
      setCanceling(false);
    }
  };

  // Calcular totais por forma de pagamento
  const paymentSummary = {
    pix: sales.filter(s => s.forma_pagamento === 'pix').reduce((sum, s) => sum + Number(s.total), 0),
    credito: sales.filter(s => ['cartao_credito', 'visa_credito', 'elo_credito', 'mastercard_credito', 'amex_hipercard_credsystem'].includes(s.forma_pagamento)).reduce((sum, s) => sum + Number(s.total), 0),
    debito: sales.filter(s => ['cartao_debito', 'visa_debito', 'elo_debito', 'maestro_debito'].includes(s.forma_pagamento)).reduce((sum, s) => sum + Number(s.total), 0),
    dinheiro: sales.filter(s => s.forma_pagamento === 'dinheiro').reduce((sum, s) => sum + Number(s.total), 0),
  };

  const totalGeral = paymentSummary.pix + paymentSummary.credito + paymentSummary.debito + paymentSummary.dinheiro;

  return (
    <Layout title="Histórico de Vendas" showBack>
      <div className="space-y-4">
        {/* Cards de Resumo */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <div className="space-y-1">
              <p className="text-sm opacity-90">PIX</p>
              <p className="text-2xl font-bold">R$ {paymentSummary.pix.toFixed(2)}</p>
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-green-500 to-green-600 text-white">
            <div className="space-y-1">
              <p className="text-sm opacity-90">Crédito</p>
              <p className="text-2xl font-bold">R$ {paymentSummary.credito.toFixed(2)}</p>
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <div className="space-y-1">
              <p className="text-sm opacity-90">Débito</p>
              <p className="text-2xl font-bold">R$ {paymentSummary.debito.toFixed(2)}</p>
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <div className="space-y-1">
              <p className="text-sm opacity-90">Dinheiro</p>
              <p className="text-2xl font-bold">R$ {paymentSummary.dinheiro.toFixed(2)}</p>
            </div>
          </Card>
        </div>

        {/* Card Total Geral */}
        <Card className="p-4 bg-gradient-to-br from-primary to-primary-hover text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">{isAdmin ? 'Total do Dia' : 'Total do Turno'}</p>
              <p className="text-3xl font-bold">R$ {totalGeral.toFixed(2)}</p>
            </div>
            <DollarSign className="w-12 h-12 opacity-80" />
          </div>
        </Card>

        {/* Filtros */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filtros
            </h3>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? 'Ocultar' : 'Mostrar'}
            </Button>
          </div>
          
          {showFilters && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Filtrar por Data Específica</Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                  />
                  {filterDate && (
                    <Button
                      variant="outline"
                      onClick={() => setFilterDate('')}
                    >
                      Limpar
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {filterDate 
                    ? `Mostrando vendas de ${format(new Date(filterDate), "dd/MM/yyyy", { locale: ptBR })}`
                    : isAdmin 
                      ? `Mostrando vendas de hoje (${format(new Date(), "dd/MM/yyyy", { locale: ptBR })})`
                      : `Mostrando vendas do turno atual`
                  }
                </p>
              </div>
            </div>
          )}
        </Card>

        {sales.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              {isAdmin ? 'Nenhuma venda registrada' : 'Nenhuma venda registrada no turno'}
            </p>
          </Card>
        ) : (
          sales.map((sale) => (
            <Card
              key={sale.id}
              className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => openSaleDetails(sale)}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  {isAdmin && sale.users && (
                    <p className="text-sm font-medium text-primary">
                      {sale.users.name}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(sale.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getCardBrandIcon(sale.forma_pagamento)}</span>
                    <p className="text-sm font-medium">
                      {formatPaymentMethod(sale.forma_pagamento)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 text-2xl font-bold text-primary">
                    <DollarSign className="w-6 h-6" />
                    R$ {sale.total.toFixed(2)}
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Dialog de Detalhes */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes da Venda</DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-4">
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-medium">Data:</span>{' '}
                  {format(new Date(selectedSale.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
                {isAdmin && selectedSale.users && (
                  <p>
                    <span className="font-medium">Vendedor:</span> {selectedSale.users.name}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <span className="font-medium">Pagamento:</span>
                  <span className="text-lg">{getCardBrandIcon(selectedSale.forma_pagamento)}</span>
                  <span>{formatPaymentMethod(selectedSale.forma_pagamento)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Itens</h3>
                {saleItems.map((item, index) => (
                  <Card key={index} className="p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{item.nome_produto}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.quantidade}x R$ {item.preco_unitario.toFixed(2)}
                        </p>
                      </div>
                      <p className="font-bold text-primary">
                        R$ {(item.quantidade * item.preco_unitario).toFixed(2)}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="border-t pt-4 space-y-4">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-primary">R$ {selectedSale.total.toFixed(2)}</span>
                </div>

                <Button
                  onClick={handlePrintReceipt}
                  disabled={printing || canceling}
                  className="w-full bg-gradient-to-r from-primary to-primary-hover"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  {printing ? 'Gerando...' : 'Imprimir Nota Fiscal'}
                </Button>

                <Button
                  onClick={handleCancelSale}
                  disabled={canceling || printing}
                  variant="destructive"
                  className="w-full"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {canceling ? 'Cancelando...' : 'Cancelar Venda'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
