import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Search, Plus, Minus, Trash2, ShoppingCart, DollarSign, Printer, Clock, Camera, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { startOfDay, endOfDay } from 'date-fns';
import { BackgroundSlider } from '@/components/BackgroundSlider';

interface Product {
  id: string;
  codigo_barras: string;
  nome: string;
  preco: number;
  quantidade_estoque: number;
}

interface CartItem extends Product {
  quantidade: number;
}

export default function PDV() {
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [paymentSubMethod, setPaymentSubMethod] = useState<string>('');
  const [generateReceipt, setGenerateReceipt] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [shiftSummary, setShiftSummary] = useState({ total: 0, count: 0, average: 0 });
  const [showSalesDialog, setShowSalesDialog] = useState(false);
  const [salesItems, setSalesItems] = useState<any[]>([]);
  const [loadingSalesItems, setLoadingSalesItems] = useState(false);
  const [showBrandSummaryDialog, setShowBrandSummaryDialog] = useState(false);
  const [brandSummary, setBrandSummary] = useState<Record<string, { count: number; amount: number }>>({});
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Carregar resumo de vendas do turno
  useEffect(() => {
    loadShiftSummary();
    const interval = setInterval(loadShiftSummary, 30000); // Atualiza a cada 30 segundos
    return () => clearInterval(interval);
  }, [user]);

  const loadShiftSummary = async () => {
    if (!user) return;

    try {
      // Para admin, mostrar vendas do dia (comportamento anterior)
      if (isAdmin) {
        const dayStart = startOfDay(new Date());
        const dayEnd = endOfDay(new Date());

        const { data, error } = await supabase
          .from('sales')
          .select('*')
          .gte('created_at', dayStart.toISOString())
          .lte('created_at', dayEnd.toISOString());

        if (error) throw error;

        if (data && data.length > 0) {
          const total = data.reduce((sum, sale) => sum + Number(sale.total), 0);
          const count = data.length;
          const average = total / count;

          // Agrupar por bandeira
          const brandSummaryData: Record<string, { count: number; amount: number }> = {};
          (data as any[]).forEach((sale: any) => {
            if (sale.bandeira) {
              const key = `${sale.forma_pagamento}_${sale.bandeira}`;
              if (!brandSummaryData[key]) {
                brandSummaryData[key] = { count: 0, amount: 0 };
              }
              brandSummaryData[key].count++;
              brandSummaryData[key].amount += Number(sale.total);
            }
          });

          setBrandSummary(brandSummaryData);
          setShiftSummary({ total, count, average });
        } else {
          setShiftSummary({ total: 0, count: 0, average: 0 });
          setBrandSummary({});
        }
        return;
      }

      // Para funcionários, buscar vendas apenas do turno ativo atual
      const { data: activeShift, error: shiftError } = await supabase
        .from('active_shifts')
        .select('start_time')
        .eq('user_id', user.id)
        .order('start_time', { ascending: false })
        .limit(1)
        .single();

      if (shiftError || !activeShift) {
        // Se não há turno ativo, mostrar zeros
        setShiftSummary({ total: 0, count: 0, average: 0 });
        setBrandSummary({});
        return;
      }

      // Buscar vendas desde o início do turno ativo
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', activeShift.start_time);

      if (error) throw error;

      if (data && data.length > 0) {
        const total = data.reduce((sum, sale) => sum + Number(sale.total), 0);
        const count = data.length;
        const average = total / count;

        // Agrupar por bandeira
        const brandSummaryData: Record<string, { count: number; amount: number }> = {};
        (data as any[]).forEach((sale: any) => {
          if (sale.bandeira) {
            const key = `${sale.forma_pagamento}_${sale.bandeira}`;
            if (!brandSummaryData[key]) {
              brandSummaryData[key] = { count: 0, amount: 0 };
            }
            brandSummaryData[key].count++;
            brandSummaryData[key].amount += Number(sale.total);
          }
        });

        setBrandSummary(brandSummaryData);
        setShiftSummary({ total, count, average });
      } else {
        setShiftSummary({ total: 0, count: 0, average: 0 });
        setBrandSummary({});
      }
    } catch (error) {
      console.error('Error loading shift summary:', error);
    }
  };

  const loadSalesItems = async () => {
    if (!user) return;

    setLoadingSalesItems(true);
    try {
      // Para admin, mostrar vendas do dia (comportamento anterior)
      if (isAdmin) {
        const dayStart = startOfDay(new Date());
        const dayEnd = endOfDay(new Date());

        const { data: sales, error: salesError } = await supabase
          .from('sales')
          .select('id, created_at')
          .gte('created_at', dayStart.toISOString())
          .lte('created_at', dayEnd.toISOString())
          .order('created_at', { ascending: false });

        if (salesError) throw salesError;

        if (sales && sales.length > 0) {
          // Buscar itens de todas as vendas com informações da venda
          const { data: items, error: itemsError } = await supabase
            .from('sale_items')
            .select('*, sales!inner(created_at)')
            .in('sale_id', sales.map(s => s.id));

          if (itemsError) throw itemsError;

          // Agrupar itens por produto, mantendo a venda mais recente de cada produto
          const groupedItems = (items || []).reduce((acc: any[], item) => {
            const existingItem = acc.find(i => i.nome_produto === item.nome_produto);
            if (existingItem) {
              existingItem.quantidade += item.quantidade;
              existingItem.total += item.quantidade * item.preco_unitario;
              // Manter a data da venda mais recente
              if (new Date(item.sales.created_at) > new Date(existingItem.last_sale_date)) {
                existingItem.last_sale_date = item.sales.created_at;
              }
            } else {
              acc.push({
                nome_produto: item.nome_produto,
                quantidade: item.quantidade,
                preco_unitario: item.preco_unitario,
                total: item.quantidade * item.preco_unitario,
                last_sale_date: item.sales.created_at,
              });
            }
            return acc;
          }, []);

          // Ordenar por data da venda mais recente (mais recentes primeiro)
          groupedItems.sort((a, b) => new Date(b.last_sale_date).getTime() - new Date(a.last_sale_date).getTime());

          setSalesItems(groupedItems);
        } else {
          setSalesItems([]);
        }
        return;
      }

      // Para funcionários, buscar vendas apenas do turno ativo atual
      const { data: activeShift, error: shiftError } = await supabase
        .from('active_shifts')
        .select('start_time')
        .eq('user_id', user.id)
        .order('start_time', { ascending: false })
        .limit(1)
        .single();

      if (shiftError || !activeShift) {
        // Se não há turno ativo, não mostrar itens
        setSalesItems([]);
        return;
      }

      // Buscar vendas desde o início do turno ativo
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('id, created_at')
        .eq('user_id', user.id)
        .gte('created_at', activeShift.start_time)
        .order('created_at', { ascending: false });

      if (salesError) throw salesError;

      if (sales && sales.length > 0) {
        // Buscar itens de todas as vendas do turno com informações da venda
        const { data: items, error: itemsError } = await supabase
          .from('sale_items')
          .select('*, sales!inner(created_at)')
          .in('sale_id', sales.map(s => s.id));

        if (itemsError) throw itemsError;

        // Agrupar itens por produto, mantendo a venda mais recente de cada produto
        const groupedItems = (items || []).reduce((acc: any[], item) => {
          const existingItem = acc.find(i => i.nome_produto === item.nome_produto);
          if (existingItem) {
            existingItem.quantidade += item.quantidade;
            existingItem.total += item.quantidade * item.preco_unitario;
            // Manter a data da venda mais recente
            if (new Date(item.sales.created_at) > new Date(existingItem.last_sale_date)) {
              existingItem.last_sale_date = item.sales.created_at;
            }
          } else {
            acc.push({
              nome_produto: item.nome_produto,
              quantidade: item.quantidade,
              preco_unitario: item.preco_unitario,
              total: item.quantidade * item.preco_unitario,
              last_sale_date: item.sales.created_at,
            });
          }
          return acc;
        }, []);

        // Ordenar por data da venda mais recente (mais recentes primeiro)
        groupedItems.sort((a, b) => new Date(b.last_sale_date).getTime() - new Date(a.last_sale_date).getTime());

        setSalesItems(groupedItems);
      } else {
        setSalesItems([]);
      }
    } catch (error) {
      console.error('Error loading sales items:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao carregar itens vendidos',
      });
    } finally {
      setLoadingSalesItems(false);
    }
  };

  const handleTotalVendasClick = () => {
    loadSalesItems();
    setShowSalesDialog(true);
  };

  useEffect(() => {
    if (search.length >= 2) {
      searchProducts();
    } else {
      setProducts([]);
    }
  }, [search]);

  const searchProducts = async () => {
    try {
      // Verificar se é um código numérico puro
      const isNumeric = /^\d+$/.test(search);
      
      let query = supabase
        .from('products')
        .select('*');
      
      if (isNumeric) {
        // Se for numérico, buscar por código no início do nome [codigo]
        query = query.ilike('nome', `[${search}]%`);
      } else {
        // Caso contrário, buscar normalmente
        query = query.or(`nome.ilike.%${search}%,codigo_barras.ilike.%${search}%`);
      }
      
      const { data, error } = await query.limit(10);

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error searching products:', error);
    }
  };

  const handleBarcodeScan = async (code: string) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('codigo_barras', code)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          toast({
            title: "Produto não encontrado",
            description: `Nenhum produto encontrado com o código: ${code}`,
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }
      
      if (data) {
        addToCart(data);
        toast({
          title: "Produto adicionado",
          description: `${data.nome} foi adicionado ao carrinho`,
        });
      }
    } catch (error) {
      console.error('Error scanning barcode:', error);
      toast({
        title: "Erro no scanner",
        description: "Erro ao buscar produto pelo código de barras",
        variant: "destructive",
      });
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && search.trim()) {
      handleBarcodeScan(search.trim());
    }
  };

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      updateQuantity(product.id, existing.quantidade + 1);
    } else {
      setCart([...cart, { ...product, quantidade: 1 }]);
    }
    setSearch('');
    setProducts([]);
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setCart(cart.map(item =>
      item.id === productId ? { ...item, quantidade: newQuantity } : item
    ));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.preco * item.quantidade), 0);
  };

  const finalizeSale = async () => {
    // Prevenir execução concorrente
    if (loading) {
      return;
    }

    // Mapear forma de pagamento para os valores aceitos pelo enum do banco
    let finalPaymentMethod = paymentMethod;
    let bandeira = null;

    if (paymentMethod === 'debito') {
      finalPaymentMethod = 'cartao_debito';
      // Se há submétodo selecionado, usar como bandeira
      if (paymentSubMethod) {
        bandeira = paymentSubMethod;
      }
    } else if (paymentMethod === 'credito') {
      finalPaymentMethod = 'cartao_credito';
      // Se há submétodo selecionado, usar como bandeira
      if (paymentSubMethod) {
        bandeira = paymentSubMethod;
      }
    }

    if (!finalPaymentMethod) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Selecione a forma de pagamento',
      });
      return;
    }

    // Validar se bandeira foi selecionada para débito/crédito
    if ((paymentMethod === 'debito' || paymentMethod === 'credito') && !paymentSubMethod) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: `Selecione o tipo de ${paymentMethod === 'debito' ? 'débito' : 'crédito'}`,
      });
      return;
    }

    // Validar valor recebido para pagamento em dinheiro
    if (paymentMethod === 'dinheiro') {
      const received = parseFloat(amountReceived);
      const total = calculateTotal();
      
      if (!amountReceived || isNaN(received)) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Informe o valor recebido',
        });
        return;
      }
      
      if (received < total) {
        toast({
          variant: 'destructive',
          title: 'Valor insuficiente',
          description: `Valor recebido (R$ ${received.toFixed(2)}) é menor que o total (R$ ${total.toFixed(2)})`,
        });
        return;
      }
    }

    if (cart.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Adicione produtos ao carrinho antes de finalizar a venda',
      });
      return;
    }

    setLoading(true);
    try {
      const total = calculateTotal();
      const now = new Date();

      // Criar venda com bandeira
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert([{
          user_id: user?.id,
          total,
          forma_pagamento: finalPaymentMethod,
          bandeira: bandeira, // Salvar a bandeira selecionada
        }] as any)
        .select()
        .single();

      if (saleError) {
        console.error('Sale error:', saleError);
        throw new Error(`Erro ao criar venda: ${saleError.message}`);
      }

      // Inserir itens da venda
      const saleItems = cart.map(item => ({
        sale_id: sale.id,
        product_id: item.id,
        codigo_produto: item.codigo_barras,
        nome_produto: item.nome,
        quantidade: item.quantidade,
        preco_unitario: item.preco,
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems as any);

      if (itemsError) {
        console.error('Items error:', itemsError);
        throw new Error(`Erro ao inserir itens da venda: ${itemsError.message}`);
      }

      // Atualizar estoque e criar movimentações
      for (const item of cart) {
        // Buscar quantidade atual do estoque
        const { data: currentProduct, error: fetchError } = await supabase
          .from('products')
          .select('quantidade_estoque')
          .eq('id', item.id)
          .single();

        if (fetchError) {
          console.error('Fetch product error:', fetchError);
          throw new Error(`Erro ao buscar produto ${item.nome}: ${fetchError.message}`);
        }

        // Calcular novo estoque (pode ficar negativo)
        const novoEstoque = currentProduct.quantidade_estoque - item.quantidade;

        // Atualizar estoque (permitindo estoque negativo)
        const { error: updateError } = await supabase
          .from('products')
          .update({ quantidade_estoque: novoEstoque })
          .eq('id', item.id);

        if (updateError) {
          console.error('Update stock error:', updateError);
          throw new Error(`Erro ao atualizar estoque do produto ${item.nome}: ${updateError.message}`);
        }

        // Criar movimentação
        const { error: movementError } = await supabase
          .from('stock_movements')
          .insert([{
            product_id: item.id,
            user_id: user?.id,
            tipo: 'saida',
            quantidade: -item.quantidade,
            ref_id: sale.id,
          }] as any);

        if (movementError) {
          console.error('Movement error:', movementError);
          // Não falhar a venda por erro na movimentação, apenas logar
          console.warn(`Erro ao criar movimentação para ${item.nome}:`, movementError);
        }
      }

      // Gerar nota/recibo se solicitado
      let receiptError = null;
      if (generateReceipt) {
        try {
          await printReceipt(sale.id, total, now, finalPaymentMethod);
        } catch (error) {
          receiptError = error;
          console.error('Receipt error:', receiptError);
          // Não falhar a venda por erro na impressão
          toast({
            title: 'Venda finalizada!',
            description: `Total: R$ ${total.toFixed(2)} - Erro ao gerar cupom, mas venda foi registrada.`,
            variant: 'default',
          });
        }
      }

      if (!generateReceipt || !receiptError) {
        toast({
          title: 'Venda finalizada!',
          description: generateReceipt ? 
            `Total: R$ ${total.toFixed(2)} - Cupom gerado!` : 
            `Total: R$ ${total.toFixed(2)}`,
        });
      }

      // Disparar evento para atualizar inventário
      window.dispatchEvent(new Event('inventario:refetch'));

      // Enviar venda para sincronização com Linx
      try {
        const saleDataForLinx = {
          id: sale.id,
          timestamp: now.toISOString(),
          total,
          forma_pagamento: finalPaymentMethod,
          user_id: user?.id,
          user_name: user?.name,
          items: cart.map(item => ({
            codigo_barras: item.codigo_barras,
            nome_produto: item.nome,
            quantidade: item.quantidade,
            preco_unitario: item.preco,
            total: item.preco * item.quantidade
          }))
        };

        const syncResponse = await fetch('/sync/queue-sale', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(saleDataForLinx),
        });

        if (syncResponse.ok) {
          const syncResult = await syncResponse.json();
          console.log('Venda enviada para sincronização:', syncResult.message);
        } else {
          console.warn('Falha ao sincronizar venda com Linx:', await syncResponse.text());
        }
      } catch (syncError) {
        console.error('Erro ao sincronizar venda com Linx:', syncError);
        // Não falhar a venda por erro de sincronização
      }

      // Limpar carrinho
      setCart([]);
      setShowCheckout(false);
      setPaymentMethod('');
      setPaymentSubMethod('');
      setAmountReceived('');

      // Recarregar resumo de vendas
      loadShiftSummary();
      setGenerateReceipt(true);
    } catch (error: any) {
      console.error('Error finalizing sale:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao finalizar venda',
        description: error.message || 'Erro desconhecido ao finalizar venda',
      });
    } finally {
      setLoading(false);
    }
  };

  const printReceipt = async (saleId: string, total: number, date: Date, finalPaymentMethod: string) => {
    try {
      const receiptNumber = `NF-${Date.now()}`;
      
      const receiptData = {
        type: 'sale',
        saleId,
        receiptNumber,
        date: date.toLocaleDateString('pt-BR'),
        time: date.toLocaleTimeString('pt-BR'),
        user: user?.name || 'Sistema',
        items: cart.map(item => ({
          nome: item.nome,
          quantidade: item.quantidade,
          preco: item.preco,
          total: item.preco * item.quantidade,
        })),
        total,
        paymentMethod: finalPaymentMethod,
      };

      // Chamar edge function para gerar cupom
      const { data, error } = await supabase.functions.invoke('print-receipt', {
        body: receiptData,
      });

      if (error) throw error;

      console.log('Receipt text:', data.receiptText);
    } catch (error) {
      console.error('Error printing receipt:', error);
      // Não falhar a venda se a impressão falhar
    }
  };

  // Função para resetar sub-método quando muda o método principal
  const handlePaymentMethodChange = (value: string) => {
    setPaymentMethod(value);
    setPaymentSubMethod('');
    setAmountReceived(''); // Resetar valor recebido
  };

  // Calcular troco
  const calculateChange = () => {
    if (paymentMethod !== 'dinheiro' || !amountReceived) return 0;
    const received = parseFloat(amountReceived);
    if (isNaN(received)) return 0;
    const change = received - calculateTotal();
    return change > 0 ? change : 0;
  };

  // Função para obter as sub-opções baseadas no método principal
  const getSubPaymentOptions = () => {
    console.log('getSubPaymentOptions called with paymentMethod:', paymentMethod);
    if (paymentMethod === 'debito') {
      const options = [
        { value: 'visa_debito', label: 'Visa Débito' },
        { value: 'elo_debito', label: 'Elo Débito' },
        { value: 'maestro_debito', label: 'Maestro Débito' },
      ];
      console.log('Returning debito options:', options);
      return options;
    } else if (paymentMethod === 'credito') {
      const options = [
        { value: 'visa_credito', label: 'Visa Crédito' },
        { value: 'elo_credito', label: 'Elo Crédito' },
        { value: 'mastercard_credito', label: 'Mastercard Crédito' },
        { value: 'amex_hipercard_credsystem', label: 'Amex / Hipercard / Credsystem' },
      ];
      console.log('Returning credito options:', options);
      return options;
    }
    console.log('Returning empty array');
    return [];
  };

  return (
    <div className="relative min-h-screen">
      <BackgroundSlider />

      <div className="relative z-0 container mx-auto px-4 py-6">
        {/* Card de Resumo de Vendas do Turno */}
        <Card className="mb-6 bg-blue-900/70 backdrop-blur-md border-2 border-blue-700">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-3 shadow-lg">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white">📈 Resumo do Turno Atual</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Quando carrinho está vazio: mostra os 3 cards */}
            {cart.length === 0 && (
              <>
                {/* Valor Total Vendido - Clicável */}
                <div
                  className="bg-blue-900/60 backdrop-blur-md border-2 border-blue-700 rounded-lg p-4 cursor-pointer hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
                  onClick={handleTotalVendasClick}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-white">Total Vendido</span>
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-3xl font-bold text-white">
                    R$ {shiftSummary.total.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-200 mt-2 flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    Clique para ver itens vendidos
                  </p>
                </div>

                {/* Número de Vendas */}
                <div className="bg-blue-900/60 backdrop-blur-md border-2 border-blue-700 rounded-lg p-4 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-white">Vendas Realizadas</span>
                    <ShoppingCart className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-3xl font-bold text-white">
                    {shiftSummary.count}
                  </p>
                </div>

                {/* Total da Venda Atual */}
                <div className="bg-blue-900/60 backdrop-blur-md border-2 border-blue-700 rounded-lg p-4 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-white">Total da Venda</span>
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-3xl font-bold text-white">
                    R$ {calculateTotal().toFixed(2)}
                  </p>
                </div>
              </>
            )}

            {/* Quando carrinho tem produtos: apenas Total da Venda expandido */}
            {cart.length > 0 && (
              <div className="md:col-span-3 bg-blue-900/60 backdrop-blur-md border-2 border-blue-700 rounded-lg p-6 hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-white">Total da Venda</span>
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <p className="text-5xl font-bold text-white mt-2">
                  R$ {calculateTotal().toFixed(2)}
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {isAdmin && (
        <div className="mb-4">
          <Button
            onClick={() => navigate('/finalizar-turno')}
            variant="outline"
            className="gap-2"
          >
            <Clock className="w-4 h-4" />
            Finalizar Turno
          </Button>
        </div>
      )}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Busca de Produtos */}
        <Card className="p-6 bg-background/80 backdrop-blur-md">
          <h2 className="text-xl font-semibold mb-4">Buscar Produto</h2>
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Escaneie ou digite o código de barras (Enter para adicionar)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="pl-10"
              />
            </div>
            <Button
              onClick={() => setShowScanner(true)}
              variant="outline"
              size="icon"
              className="shrink-0"
            >
              <Camera className="w-4 h-4" />
            </Button>
          </div>
          
          {products.length > 0 && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {products.map((product) => (
                <Card
                  key={product.id}
                  className="p-3 cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => addToCart(product)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{product.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        {product.codigo_barras} | Estoque: {product.quantidade_estoque}
                      </p>
                    </div>
                    <p className="font-bold text-primary">
                      R$ {product.preco.toFixed(2)}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>

        {/* Carrinho */}
        <Card className="p-6 bg-background/80 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Carrinho
            </h2>
            {cart.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCart([])}
              >
                Limpar
              </Button>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Carrinho vazio</p>
            </div>
          ) : (
            <>
              {/* Botão Finalizar Venda acima do carrinho */}
              <Button
                className="w-full bg-gradient-to-r from-success to-green-600 mb-4"
                onClick={() => setShowCheckout(true)}
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Finalizar Venda
              </Button>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {cart.map((item) => (
                  <Card key={item.id} className="p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-medium">{item.nome}</p>
                        <p className="text-sm text-muted-foreground">
                          R$ {item.preco.toFixed(2)} un
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => updateQuantity(item.id, item.quantidade - 1)}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="w-12 text-center font-medium">{item.quantidade}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => updateQuantity(item.id, item.quantidade + 1)}
                          disabled={item.quantidade >= item.quantidade_estoque}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="font-bold text-primary">
                        R$ {(item.preco * item.quantidade).toFixed(2)}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Dialog de Checkout */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar Venda</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-2">Total da Venda</p>
              <p className="text-3xl font-bold text-primary">
                R$ {calculateTotal().toFixed(2)}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Forma de Pagamento</label>
              <Select value={paymentMethod} onValueChange={handlePaymentMethodChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credito">Crédito</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="debito">Débito</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Sub-opções de pagamento */}
            {(paymentMethod === 'debito' || paymentMethod === 'credito') && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {paymentMethod === 'debito' ? 'Tipo de Débito' : 'Tipo de Crédito'}
                </label>
                <Select value={paymentSubMethod} onValueChange={setPaymentSubMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {getSubPaymentOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Valor recebido para dinheiro */}
            {paymentMethod === 'dinheiro' && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Valor Recebido</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Digite o valor recebido..."
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    className="text-lg"
                  />
                </div>
                {amountReceived && parseFloat(amountReceived) >= calculateTotal() && (
                  <div className="p-4 border rounded-lg bg-success/10 border-success">
                    <p className="text-sm text-muted-foreground mb-1">Troco</p>
                    <p className="text-2xl font-bold text-success">
                      R$ {calculateChange().toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-muted-foreground" />
                <Label htmlFor="generate-receipt" className="cursor-pointer">
                  Gerar nota/recibo não fiscal?
                </Label>
              </div>
              <Switch
                id="generate-receipt"
                checked={generateReceipt}
                onCheckedChange={setGenerateReceipt}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCheckout(false)}>
              Cancelar
            </Button>
            <Button
              onClick={finalizeSale}
              disabled={
                loading || 
                !paymentMethod || 
                ((paymentMethod === 'debito' || paymentMethod === 'credito') && !paymentSubMethod) ||
                (paymentMethod === 'dinheiro' && (!amountReceived || parseFloat(amountReceived) < calculateTotal()))
              }
              className="bg-gradient-to-r from-success to-green-600"
            >
              {loading ? 'Finalizando...' : 'Confirmar Venda'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BarcodeScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleBarcodeScan}
      />

      {/* Dialog de Itens Vendidos */}
      <Dialog open={showSalesDialog} onOpenChange={setShowSalesDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Itens Vendidos no Turno</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {loadingSalesItems ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Carregando itens vendidos...</p>
              </div>
            ) : salesItems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Nenhum item vendido no turno</p>
              </div>
            ) : (
              <>
                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Total de Produtos Diferentes</p>
                      <p className="text-2xl font-bold">{salesItems.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total de Itens Vendidos</p>
                      <p className="text-2xl font-bold">
                        {salesItems.reduce((sum, item) => sum + item.quantidade, 0)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {salesItems.map((item, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium">{item.nome_produto}</p>
                          <p className="text-sm text-muted-foreground">
                            Quantidade: <span className="font-bold text-primary">{item.quantidade}</span> unidades
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Preço unitário: R$ {item.preco_unitario.toFixed(2)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Total</p>
                          <p className="text-xl font-bold text-primary">
                            R$ {item.total.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-lg">Total Geral:</span>
                    <span className="text-2xl font-bold text-primary">
                      R$ {salesItems.reduce((sum, item) => sum + item.total, 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSalesDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Vendas por Bandeira */}
      <Dialog open={showBrandSummaryDialog} onOpenChange={setShowBrandSummaryDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vendas por Bandeira</DialogTitle>
          </DialogHeader>
          {Object.keys(brandSummary).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma venda com bandeira registrada ainda.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Separar por débito e crédito */}
              {(() => {
                const debito = Object.entries(brandSummary).filter(([key]) => key.startsWith('debito_'));
                const credito = Object.entries(brandSummary).filter(([key]) => key.startsWith('credito_'));
                const outros = Object.entries(brandSummary).filter(([key]) => !key.startsWith('debito_') && !key.startsWith('credito_'));

                return (
                  <>
                    {/* Débito */}
                    {debito.length > 0 && (
                      <div>
                        <h3 className="font-bold text-lg mb-2">Débito</h3>
                        <div className="space-y-2">
                          {debito.map(([key, data]) => {
                            const bandeira = key.replace('debito_', '').replace(/_/g, ' ');
                            return (
                              <Card key={key} className="p-4">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <p className="font-medium capitalize">{bandeira}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {data.count} transações
                                    </p>
                                  </div>
                                  <p className="font-bold text-primary text-xl">
                                    R$ {data.amount.toFixed(2)}
                                  </p>
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Crédito */}
                    {credito.length > 0 && (
                      <div>
                        <h3 className="font-bold text-lg mb-2">Crédito</h3>
                        <div className="space-y-2">
                          {credito.map(([key, data]) => {
                            const bandeira = key.replace('credito_', '').replace(/_/g, ' ');
                            return (
                              <Card key={key} className="p-4">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <p className="font-medium capitalize">{bandeira}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {data.count} transações
                                    </p>
                                  </div>
                                  <p className="font-bold text-primary text-xl">
                                    R$ {data.amount.toFixed(2)}
                                  </p>
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Outros */}
                    {outros.length > 0 && (
                      <div>
                        <h3 className="font-bold text-lg mb-2">Outras Formas</h3>
                        <div className="space-y-2">
                          {outros.map(([key, data]) => {
                            const label = key.replace(/_/g, ' ');
                            return (
                              <Card key={key} className="p-4">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <p className="font-medium capitalize">{label}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {data.count} transações
                                    </p>
                                  </div>
                                  <p className="font-bold text-primary text-xl">
                                    R$ {data.amount.toFixed(2)}
                                  </p>
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBrandSummaryDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BarcodeScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleBarcodeScan}
      />
      </div>
    </div>
  );
}
