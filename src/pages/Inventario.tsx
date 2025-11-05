import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Camera, Search, FileText, Package, Edit } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Product {
  id: string;
  codigo_barras: string | null;
  nome: string;
  descricao: string | null;
  quantidade_estoque: number;
  categoria?: string | null;
  subcategoria?: string | null;
}

interface Contagem {
  id: string;
  product_id: string;
  codigo_barras: string | null;
  nome: string;
  descricao: string | null;
  quantidade_estoque: number;
  quantidade_contada: number;
  categoria: string | null;
  usuario: string;
  created_at: string;
  contagem_fechada: boolean | null;
}

// Categorias organizadas hierarquicamente
const CATEGORIAS = {
  '🍺 Cervejas': ['Latas', 'Garrafas'],
  '🥤 Refrigerantes': ['Latas', 'Garrafas'],
  '💧 Água': ['Garrafas', 'Copos'],
  '🍵 Chás': ['Latas', 'Garrafas'],
  '🧂 Salgados': [],
  '🥨 Salgadinhos': [],
  '🍪 Bolachas': [],
  '🍰 Bolos': [],
  '🍫 Chocolates': [],
  '🍬 Doces': [],
  '🚬 Cigarros': [],
  '🍾 Destilados': ['Pequenas', 'Garrafas'],
  '🎁 Diversos': [],
};

// Função para detectar categoria automaticamente
const detectCategoria = (nomeProduto: string): string => {
  const nome = nomeProduto.toUpperCase();
  
  if (nome.includes('CERVEJA') || nome.includes('HEINEKEN') || nome.includes('SKOL') || 
      nome.includes('BRAHMA') || nome.includes('ANTARCTICA')) {
    return '🍺 Cervejas';
  }
  if (nome.includes('COCA') || nome.includes('GUARANÁ') || nome.includes('PEPSI') || 
      nome.includes('REFRIG') || nome.includes('FANTA')) {
    return '🥤 Refrigerantes';
  }
  if (nome.includes('ÁGUA') || nome.includes('AGUA') || nome.includes('CRYSTAL')) {
    return '💧 Água';
  }
  if (nome.includes('CHÁ') || nome.includes('CHA') || nome.includes('MATE') || nome.includes('LEÃO')) {
    return '🍵 Chás';
  }
  if (nome.includes('BATON') || nome.includes('KINDER') || nome.includes('BIS') || 
      nome.includes('CHOC') || nome.includes('LAKA')) {
    return '🍫 Chocolates';
  }
  if (nome.includes('DOCE') || nome.includes('CHICLETE') || nome.includes('BALA') || 
      nome.includes('TRIDENT')) {
    return '🍬 Doces';
  }
  if (nome.includes('WHISKY') || nome.includes('VODKA') || nome.includes('CACHAÇA') || 
      nome.includes('CACHA') || nome.includes('SMIRNOFF') || nome.includes('RED LABEL')) {
    return '🍾 Destilados';
  }
  if (nome.includes('CIGARRO') || nome.includes('MARLBORO') || nome.includes('FREE')) {
    return '🚬 Cigarros';
  }
  if (nome.includes('SALGADO') || nome.includes('COXINHA') || nome.includes('EMPADA')) {
    return '🧂 Salgados';
  }
  if (nome.includes('SALGADINHO') || nome.includes('DORITOS') || nome.includes('RUFFLES') || 
      nome.includes('CHEETOS')) {
    return '🥨 Salgadinhos';
  }
  if (nome.includes('BOLACHA') || nome.includes('BISCOITO') || nome.includes('COOKIES') || 
      nome.includes('WAFER') || nome.includes('CRACKER')) {
    return '🍪 Bolachas';
  }
  if (nome.includes('BOLO')) {
    return '🍰 Bolos';
  }
  
  return '🎁 Diversos';
};

export default function Inventario() {
  const { user, isAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantidadeContada, setQuantidadeContada] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [contagens, setContagens] = useState<Contagem[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [users, setUsers] = useState<Array<{ name: string }>>([]);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  // Estados do modal de edição
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingContagem, setEditingContagem] = useState<Contagem | null>(null);
  const [editQuantidade, setEditQuantidade] = useState('');
  const [editCategoria, setEditCategoria] = useState('');

  // Estados para cadastro de código de barras
  const [showBarcodeRegisterDialog, setShowBarcodeRegisterDialog] = useState(false);
  const [isRegisteringBarcode, setIsRegisteringBarcode] = useState(false);
  const [productToRegisterBarcode, setProductToRegisterBarcode] = useState<Product | null>(null);

  // Estado para última contagem do produto selecionado
  const [ultimaContagem, setUltimaContagem] = useState<Contagem | null>(null);

  // Estados para busca de produto no relatório
  const [filterSearchTerm, setFilterSearchTerm] = useState('');
  const [filterProducts, setFilterProducts] = useState<Product[]>([]);
  const [filterSelectedProduct, setFilterSelectedProduct] = useState<Product | null>(null);
  const [isScanningForFilter, setIsScanningForFilter] = useState(false);

  // Buscar usuários para filtro
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('contagens_inventario')
          .select('usuario')
          .order('usuario');
        
        if (error) throw error;
        
        const uniqueUsers = Array.from(new Set(data?.map(c => c.usuario) || []));
        setUsers(uniqueUsers.map(name => ({ name })));
      } catch (error) {
        console.error('Erro ao carregar usuários:', error);
      }
    };
    
    loadUsers();
  }, []);

  // Buscar produtos em tempo real
  useEffect(() => {
    if (searchTerm.length < 1) {
      setProducts([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        // Detecta se é um código de produto entre colchetes [123]
        const isProductCode = /^\d{1,4}$/.test(searchTerm);

        let query = supabase
          .from('products')
          .select('id, codigo_barras, nome, descricao, quantidade_estoque, categoria, subcategoria');

        if (isProductCode) {
          // Busca por código de produto [123]
          query = query.ilike('nome', `[${searchTerm}]%`);
        } else {
          // Busca por código de barras ou nome
          query = query.or(`codigo_barras.ilike.%${searchTerm}%,nome.ilike.%${searchTerm}%`);
        }

        const result = await query.limit(10) as any;

        if (result.error) throw result.error;
        setProducts(result.data || []);
      } catch (error) {
        console.error('Erro ao buscar produtos:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível buscar os produtos',
          variant: 'destructive',
        });
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // Buscar produtos para filtro no relatório
  useEffect(() => {
    if (filterSearchTerm.length < 1) {
      setFilterProducts([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        // Detecta se é um código de produto entre colchetes [123]
        const isProductCode = /^\d{1,4}$/.test(filterSearchTerm);

        let query = supabase
          .from('products')
          .select('id, codigo_barras, nome, descricao, quantidade_estoque, categoria, subcategoria');

        if (isProductCode) {
          // Busca por código de produto [123]
          query = query.ilike('nome', `[${filterSearchTerm}]%`);
        } else {
          // Busca por código de barras ou nome
          query = query.or(`codigo_barras.ilike.%${filterSearchTerm}%,nome.ilike.%${filterSearchTerm}%`);
        }

        const result = await query.limit(10) as any;

        if (result.error) throw result.error;
        setFilterProducts(result.data || []);
      } catch (error) {
        console.error('Erro ao buscar produtos:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível buscar os produtos',
          variant: 'destructive',
        });
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [filterSearchTerm]);

  // Carregar contagens
  const loadContagens = async () => {
    try {
      let query = supabase
        .from('contagens_inventario')
        .select('*')
        .order('created_at', { ascending: false });

      if (startDate) {
        query = query.gte('created_at', new Date(startDate).toISOString());
      }
      if (endDate) {
        query = query.lte('created_at', new Date(endDate + ' 23:59:59').toISOString());
      }
      if (filterUser) {
        query = query.eq('usuario', filterUser);
      }
      if (filterSelectedProduct) {
        query = query.eq('product_id', filterSelectedProduct.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setContagens(data || []);
    } catch (error) {
      console.error('Erro ao carregar contagens:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as contagens',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    loadContagens();
  }, [startDate, endDate, filterUser, filterSelectedProduct]);

  // Realtime listener
  useEffect(() => {
    const channel = supabase
      .channel('contagens_inventario_changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'contagens_inventario' },
        (payload) => {
          setHighlightId((payload as any).new?.id || null);
          loadContagens();
          toast({ 
            title: 'Estoque sincronizado', 
            description: `Inventário atualizado: ${(payload as any).new?.nome || ''}` 
          });
          setTimeout(() => setHighlightId(null), 2000);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'contagens_inventario' },
        () => loadContagens()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleScan = async (code: string) => {
    // Se estamos registrando código de barras para um produto
    if (isRegisteringBarcode && productToRegisterBarcode) {
      try {
        const { error } = await supabase
          .from('products')
          .update({ codigo_barras: code })
          .eq('id', productToRegisterBarcode.id);

        if (error) throw error;

        toast({
          title: 'Código cadastrado!',
          description: `Código ${code} cadastrado para ${productToRegisterBarcode.nome}`,
        });

        // Atualizar o produto selecionado com o novo código
        const updatedProduct = { ...productToRegisterBarcode, codigo_barras: code };
        setSelectedProduct(updatedProduct);
        setIsRegisteringBarcode(false);
        setProductToRegisterBarcode(null);
      } catch (error) {
        console.error('Erro ao cadastrar código:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível cadastrar o código de barras',
          variant: 'destructive',
        });
      }
      return;
    }

    // Se estamos escaneando para filtrar no relatório
    if (isScanningForFilter) {
      setFilterSearchTerm(code);
      try {
        const result = await supabase
          .from('products')
          .select('id, codigo_barras, nome, descricao, quantidade_estoque, categoria, subcategoria')
          .eq('codigo_barras', code)
          .maybeSingle() as any;

        if (result.error) throw result.error;
        if (result.data) {
          setFilterSelectedProduct(result.data);
          setFilterProducts([]);
        } else {
          toast({
            title: 'Produto não encontrado',
            description: 'Nenhum produto com este código de barras',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Erro ao buscar produto:', error);
      }
      setIsScanningForFilter(false);
      return;
    }

    // Fluxo normal de busca por código de barras
    setSearchTerm(code);
    try {
      const result = await supabase
        .from('products')
        .select('id, codigo_barras, nome, descricao, quantidade_estoque, categoria, subcategoria')
        .eq('codigo_barras', code)
        .maybeSingle() as any;

      if (result.error) throw result.error;
      if (result.data) {
        setSelectedProduct(result.data);
        setProducts([result.data]);
        // Buscar última contagem do produto
        await loadUltimaContagem(result.data.id);
      } else {
        toast({
          title: 'Produto não encontrado',
          description: 'Nenhum produto com este código de barras',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Erro ao buscar produto:', error);
    }
  };

  // Buscar última contagem de um produto
  const loadUltimaContagem = async (productId: string) => {
    try {
      const { data, error } = await supabase
        .from('contagens_inventario')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setUltimaContagem(data);
    } catch (error) {
      console.error('Erro ao buscar última contagem:', error);
      setUltimaContagem(null);
    }
  };

  const handleSelectProduct = async (product: Product) => {
    // Verificar se o produto não tem código de barras
    if (!product.codigo_barras) {
      setProductToRegisterBarcode(product);
      setShowBarcodeRegisterDialog(true);
      setProducts([]);
      return;
    }

    // Fluxo normal
    setSelectedProduct(product);
    setSearchTerm(product.nome);
    setProducts([]);
    setQuantidadeContada('');

    // Buscar última contagem do produto
    await loadUltimaContagem(product.id);
  };

  const handleRegisterBarcodeResponse = (wantToRegister: boolean) => {
    setShowBarcodeRegisterDialog(false);
    
    if (wantToRegister && productToRegisterBarcode) {
      // Abrir scanner em modo de cadastro
      setIsRegisteringBarcode(true);
      setIsScannerOpen(true);
    } else {
      // Seguir normalmente sem código de barras
      if (productToRegisterBarcode) {
        setSelectedProduct(productToRegisterBarcode);
        setSearchTerm(productToRegisterBarcode.nome);
        setQuantidadeContada('');
        setProductToRegisterBarcode(null);
      }
    }
  };

  const handleSaveContagem = async () => {
    if (!selectedProduct || !quantidadeContada) {
      toast({
        title: 'Erro',
        description: 'Selecione um produto e informe a quantidade contada',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const novaQuantidade = parseInt(quantidadeContada);
      // Usa categoria e subcategoria salvas no produto ou detecta automaticamente
      const categoria = selectedProduct.categoria || detectCategoria(selectedProduct.nome);
      const subcategoria = selectedProduct.subcategoria || '';
      const categoriaFinal = subcategoria ? `${categoria} - ${subcategoria}` : categoria;

      const { error } = await supabase.rpc('upsert_contagem_inventario', {
        p_product_id: selectedProduct.id,
        p_quantidade_contada: novaQuantidade,
        p_codigo_barras: selectedProduct.codigo_barras,
        p_nome: selectedProduct.nome,
        p_descricao: selectedProduct.descricao,
        p_categoria: categoriaFinal,
        p_usuario: user?.name || 'Desconhecido',
        p_quantidade_estoque: selectedProduct.quantidade_estoque,
      });

      if (error) throw error;

      toast({
        title: 'Contagem registrada',
        description: `${novaQuantidade} unidades de ${selectedProduct.nome}`,
      });

      setSelectedProduct(null);
      setSearchTerm('');
      setQuantidadeContada('');
      setUltimaContagem(null);
      loadContagens();
    } catch (error: any) {
      console.error('Erro ao salvar contagem:', error);
      toast({
        title: 'Erro',
        description: error?.message || 'Não foi possível salvar a contagem',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (contagem: Contagem) => {
    setEditingContagem(contagem);
    setEditQuantidade(contagem.quantidade_contada.toString());
    setEditCategoria(contagem.categoria || detectCategoria(contagem.nome));
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingContagem) return;

    try {
      const novaQuantidade = parseInt(editQuantidade);
      const diferenca = novaQuantidade - editingContagem.quantidade_estoque;
      
      const { error } = await supabase
        .from('contagens_inventario')
        .update({
          quantidade_contada: novaQuantidade,
          categoria: editCategoria,
          diferenca: diferenca,
        })
        .eq('id', editingContagem.id);

      if (error) throw error;

      toast({
        title: 'Contagem atualizada',
        description: 'As alterações foram salvas com sucesso',
      });

      setEditModalOpen(false);
      loadContagens();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar',
        description: error?.message || 'Não foi possível atualizar a contagem',
        variant: 'destructive',
      });
    }
  };

  const handleCloseContagem = async (contagemId: string) => {
    try {
      const { error } = await supabase
        .from('contagens_inventario')
        .update({ contagem_fechada: true })
        .eq('id', contagemId);
      if (error) throw error;
      toast({ 
        title: 'Contagem fechada', 
        description: 'Vendas futuras não afetarão esta contagem.' 
      });
      loadContagens();
    } catch (err: any) {
      toast({ 
        variant: 'destructive', 
        title: 'Erro ao fechar contagem', 
        description: err.message 
      });
    }
  };

  const generatePDF = async () => {
    try {
      let query = supabase
        .from('contagens_inventario')
        .select('*')
        .order('categoria, nome');

      if (startDate) query = query.gte('created_at', new Date(startDate).toISOString());
      if (endDate) query = query.lte('created_at', new Date(endDate + ' 23:59:59').toISOString());
      if (filterUser) query = query.eq('usuario', filterUser);
      if (filterSelectedProduct) query = query.eq('product_id', filterSelectedProduct.id);

      const { data: freshContagens, error } = await query;
      
      if (error) {
        toast({ variant: 'destructive', title: 'Erro ao gerar PDF', description: error.message });
        return;
      }

      if (!freshContagens || freshContagens.length === 0) {
        toast({ 
          variant: 'destructive', 
          title: 'Nenhum dado', 
          description: 'Não há contagens registradas para gerar o PDF' 
        });
        return;
      }

    // Agrupar por categoria
    const grouped = new Map<string, Array<{
      codigo: string;
      nome: string;
      contada: number;
      estoque: number;
      diferenca: number;
      usuario: string;
    }>>();

    (freshContagens || []).forEach((c) => {
      const categoria = c.categoria || '🎁 Diversos';
      if (!grouped.has(categoria)) {
        grouped.set(categoria, []);
      }
      
      const items = grouped.get(categoria)!;
      const diferenca = c.quantidade_contada - c.quantidade_estoque;
      
      items.push({
        codigo: c.codigo_barras || 'N/A',
        nome: c.nome,
        contada: c.quantidade_contada,
        estoque: c.quantidade_estoque,
        diferenca: diferenca,
        usuario: c.usuario,
      });
    });

    const doc = new jsPDF();
    
    // Cabeçalho roxo institucional
    doc.setFillColor(139, 92, 246); // Roxo #8B5CF6
    doc.rect(0, 0, 210, 40, 'F');
    
    // Informações da empresa no canto superior direito
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('InovaPro Technology', 195, 10, { align: 'right' });
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 195, 15, { align: 'right' });
    
    if (filterUser) {
      doc.text(`Usuario: ${filterUser}`, 195, 20, { align: 'right' });
    }
    
    // Título principal - centralizado
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Inventário PDV-INOVAPRO', 105, 28, { align: 'center' });
    
    // Subtítulo
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Relatório de Inventário - PDV-INOVAPRO Technology', 105, 35, { align: 'center' });

    let yPos = 50;

    // Estatísticas gerais
    let totalProdutos = 0;
    let diferencasPositivas = 0;
    let diferencasNegativas = 0;

    grouped.forEach((items) => {
      items.forEach((item) => {
        totalProdutos++;
        if (item.diferenca > 0) diferencasPositivas++;
        if (item.diferenca < 0) diferencasNegativas++;
      });
    });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo Geral do Inventario', 14, yPos);
    yPos += 7;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Total de produtos contados: ${totalProdutos}`, 14, yPos);
    yPos += 5;
    doc.setTextColor(22, 163, 74); // Verde #16A34A
    doc.text(`Diferencas positivas: ${diferencasPositivas}`, 14, yPos);
    yPos += 5;
    doc.setTextColor(220, 38, 38); // Vermelho #DC2626
    doc.text(`Diferencas negativas: ${diferencasNegativas}`, 14, yPos);
    yPos += 10;

    doc.setTextColor(0, 0, 0);

    // Iterar por cada categoria
    const sortedCategories = Array.from(grouped.keys()).sort();
    
    for (const categoria of sortedCategories) {
      const items = grouped.get(categoria)!;
      
      // Verificar se precisa de nova página
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      // Título da categoria com fundo colorido
      doc.setFillColor(237, 233, 254); // Roxo claro #EDE9FE
      doc.rect(10, yPos - 5, 190, 10, 'F');
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(109, 40, 217); // Roxo escuro
      // Remover emojis das categorias para evitar problemas de encoding
      const categoriaLimpa = categoria.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();
      doc.text(categoriaLimpa, 105, yPos + 2, { align: 'center' });
      
      yPos += 12;
      doc.setTextColor(0, 0, 0);

      // Tabela de produtos
      const tableData = items.map((item) => [
        item.codigo,
        item.nome,
        String(item.contada),
        String(item.estoque),
        item.diferenca > 0 ? `+${item.diferenca}` : String(item.diferenca),
        item.usuario,
      ]);

      autoTable(doc, {
        head: [['Codigo', 'Descricao', 'Contada', 'Estoque', 'Diferenca', 'Usuario']],
        body: tableData,
        startY: yPos,
        styles: { 
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: { 
          fillColor: [139, 92, 246], // Roxo #8B5CF6
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251], // Cinza claro
        },
        columnStyles: {
          4: { // Coluna diferença
            halign: 'right',
            fontStyle: 'bold',
          },
        },
        didParseCell: function(data: any) {
          // Colorir diferenças
          if (data.column.index === 4 && data.section === 'body') {
            const value = data.cell.raw;
            if (value.toString().startsWith('+')) {
              data.cell.styles.textColor = [22, 163, 74]; // Verde #16A34A
            } else if (value.toString().startsWith('-')) {
              data.cell.styles.textColor = [220, 38, 38]; // Vermelho #DC2626
            } else {
              data.cell.styles.textColor = [156, 163, 175]; // Cinza
            }
          }
        },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // Rodapé em todas as páginas
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(128, 128, 128);
      doc.text(
        'Relatorio gerado automaticamente pelo sistema InovaPro Technology',
        105,
        285,
        { align: 'center' }
      );
      doc.setFontSize(8);
      doc.text(
        `Pagina ${i} de ${pageCount}`,
        105,
        290,
        { align: 'center' }
      );
    }

      // Nome do arquivo seguindo o padrão solicitado
      const dataFormatada = new Date().toLocaleDateString('pt-BR').split('/').reverse().join('-');
      const filename = `inventario_pdv_inovapro_${dataFormatada}.pdf`;
      doc.save(filename);

      toast({ 
        title: 'PDF Gerado com Sucesso', 
        description: 'Inventário PDV-INOVAPRO salvo' 
      });
    } catch (error: any) {
      console.error('Erro ao gerar PDF:', error);
      toast({ 
        variant: 'destructive', 
        title: 'Erro ao gerar PDF', 
        description: error.message || 'Erro desconhecido ao gerar o PDF' 
      });
    }
  };

  return (
    <Layout title="Inventário" showBack>
      <div className="space-y-6">
        <Tabs defaultValue="contagem" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="contagem">
              <Package className="w-4 h-4 mr-2" />
              Contagem
            </TabsTrigger>
            <TabsTrigger value="relatorios">
              <FileText className="w-4 h-4 mr-2" />
              Relatórios
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contagem">
            <Card>
              <CardHeader>
                <CardTitle>Registrar Contagem de Inventário</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Busca de produto */}
                <div className="space-y-2">
                  <Label>Buscar Produto</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Digite o código ou nome do produto"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                      {products.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-card border rounded-md shadow-lg max-h-60 overflow-auto">
                          {products.map((product) => (
                            <div
                              key={product.id}
                              className="p-3 hover:bg-accent cursor-pointer border-b last:border-b-0"
                              onClick={() => handleSelectProduct(product)}
                            >
                              <p className="font-medium">{product.nome}</p>
                              <p className="text-sm text-muted-foreground">
                                {product.codigo_barras} - Estoque: {product.quantidade_estoque}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setIsScannerOpen(true)}
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Produto selecionado */}
                {selectedProduct && (
                  <Card className="border-primary">
                    <CardContent className="pt-6 space-y-4">
                      <div className="space-y-2">
                        <div>
                          <Label className="text-muted-foreground">Produto</Label>
                          <p className="font-semibold">{selectedProduct.nome}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-muted-foreground">Código de Barras</Label>
                            <p>{selectedProduct.codigo_barras || 'N/A'}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Estoque Atual</Label>
                            <p className="font-bold text-lg">{selectedProduct.quantidade_estoque}</p>
                          </div>
                        </div>

                        {/* Exibir última contagem se existir */}
                        {ultimaContagem && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
                            <Label className="text-blue-700 dark:text-blue-300 text-xs">Última Contagem</Label>
                            <div className="flex items-center justify-between mt-1">
                              <div>
                                <p className="font-bold text-blue-900 dark:text-blue-100 text-lg">
                                  {ultimaContagem.quantidade_contada} unidades
                                </p>
                                <p className="text-xs text-blue-600 dark:text-blue-400">
                                  {new Date(ultimaContagem.created_at).toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })} - {ultimaContagem.usuario}
                                </p>
                              </div>
                              <div className="text-right">
                                <Label className="text-blue-700 dark:text-blue-300 text-xs">Diferença</Label>
                                <p className={`font-bold text-lg ${
                                  (ultimaContagem.quantidade_contada - ultimaContagem.quantidade_estoque) > 0
                                    ? 'text-green-600 dark:text-green-400'
                                    : (ultimaContagem.quantidade_contada - ultimaContagem.quantidade_estoque) < 0
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-gray-600 dark:text-gray-400'
                                }`}>
                                  {(ultimaContagem.quantidade_contada - ultimaContagem.quantidade_estoque) > 0 ? '+' : ''}
                                  {ultimaContagem.quantidade_contada - ultimaContagem.quantidade_estoque}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Quantidade contada */}
                      <div className="space-y-2">
                        <Label>Quantidade Contada</Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="Digite a quantidade contada"
                          value={quantidadeContada}
                          onChange={(e) => setQuantidadeContada(e.target.value)}
                        />
                      </div>

                      {/* Exibir categoria e subcategoria do produto */}
                      {selectedProduct.categoria && (
                        <div className="p-3 bg-muted rounded-md">
                          <Label className="text-muted-foreground text-xs">Categoria</Label>
                          <p className="font-medium">
                            {selectedProduct.categoria}
                            {selectedProduct.subcategoria && ` - ${selectedProduct.subcategoria}`}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <Button
                  onClick={handleSaveContagem}
                  disabled={!selectedProduct || !quantidadeContada || loading}
                  className="w-full"
                >
                  {loading ? 'Salvando...' : 'Salvar Contagem'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="relatorios">
            <Card>
              <CardHeader>
                <CardTitle>Relatórios de Inventário</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Filtros */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Data Inicial</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data Final</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Filtrar por Usuário</Label>
                    <select
                      className="w-full h-10 px-3 py-2 text-sm rounded-md border border-input bg-background"
                      value={filterUser}
                      onChange={(e) => setFilterUser(e.target.value)}
                    >
                      <option value="">Todos os usuários</option>
                      {users.map((user, index) => (
                        <option key={index} value={user.name}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Busca de produto para filtrar */}
                <div className="space-y-2">
                  <Label>Filtrar por Produto</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Digite o código ou nome do produto"
                        value={filterSearchTerm}
                        onChange={(e) => setFilterSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                      {filterProducts.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-card border rounded-md shadow-lg max-h-60 overflow-auto">
                          {filterProducts.map((product) => (
                            <div
                              key={product.id}
                              className="p-3 hover:bg-accent cursor-pointer border-b last:border-b-0"
                              onClick={() => {
                                setFilterSelectedProduct(product);
                                setFilterSearchTerm(product.nome);
                                setFilterProducts([]);
                              }}
                            >
                              <p className="font-medium">{product.nome}</p>
                              <p className="text-sm text-muted-foreground">
                                {product.codigo_barras} - Estoque: {product.quantidade_estoque}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setIsScanningForFilter(true);
                        setIsScannerOpen(true);
                      }}
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                    {filterSelectedProduct && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setFilterSelectedProduct(null);
                          setFilterSearchTerm('');
                        }}
                      >
                        Limpar
                      </Button>
                    )}
                  </div>
                  {filterSelectedProduct && (
                    <div className="p-3 bg-primary/10 border border-primary/20 rounded-md">
                      <p className="text-sm font-medium">
                        Filtrando por: <strong>{filterSelectedProduct.nome}</strong>
                      </p>
                    </div>
                  )}
                </div>

                <Button onClick={generatePDF}>
                  <FileText className="w-4 h-4 mr-2" />
                  Gerar PDF Categorizado
                </Button>

                {/* Lista de contagens */}
                <div className="space-y-2">
                  <h3 className="font-semibold">Contagens Registradas ({contagens.length})</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium">Data</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Produto</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Categoria</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Código</th>
                            <th className="px-4 py-3 text-right text-sm font-medium">Contada</th>
                            <th className="px-4 py-3 text-right text-sm font-medium">Estoque</th>
                            <th className="px-4 py-3 text-right text-sm font-medium">Diferença</th>
                            <th className="px-4 py-3 text-left text-sm font-medium">Usuário</th>
                            <th className="px-4 py-3 text-center text-sm font-medium">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {contagens.map((contagem) => {
                            const diferenca = contagem.quantidade_contada - contagem.quantidade_estoque;
                            const isClosed = contagem.contagem_fechada === true;
                            const isHighlighted = highlightId === contagem.id;
                            return (
                              <tr 
                                key={contagem.id} 
                                className={`hover:bg-muted/50 transition-colors cursor-pointer ${
                                  isHighlighted ? 'bg-green-100 animate-pulse' : ''
                                }`}
                                onClick={() => handleEditClick(contagem)}
                              >
                                <td className="px-4 py-3 text-sm">
                                  {new Date(contagem.created_at).toLocaleDateString('pt-BR')}
                                </td>
                                <td className="px-4 py-3 text-sm">{contagem.nome}</td>
                                <td className="px-4 py-3 text-sm">
                                  {contagem.categoria || '🎁 Diversos'}
                                </td>
                                <td className="px-4 py-3 text-sm">{contagem.codigo_barras || 'N/A'}</td>
                                <td className="px-4 py-3 text-sm text-right">{contagem.quantidade_contada}</td>
                                <td className="px-4 py-3 text-sm text-right">{contagem.quantidade_estoque}</td>
                                <td className={`px-4 py-3 text-sm text-right font-semibold ${
                                  diferenca > 0 ? 'text-green-600' : diferenca < 0 ? 'text-red-600' : ''
                                }`}>
                                  {diferenca > 0 ? '+' : ''}{diferenca}
                                </td>
                                <td className="px-4 py-3 text-sm">{contagem.usuario}</td>
                                <td className="px-4 py-3 text-center">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditClick(contagem);
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                          {contagens.length === 0 && (
                            <tr>
                              <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                                Nenhuma contagem registrada
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal de edição */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Contagem</DialogTitle>
          </DialogHeader>
          {editingContagem && (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Produto</Label>
                <p className="font-semibold">{editingContagem.nome}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Código</Label>
                  <p>{editingContagem.codigo_barras || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Estoque</Label>
                  <p className="font-bold">{editingContagem.quantidade_estoque}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Quantidade Contada</Label>
                <Input
                  type="number"
                  min="0"
                  value={editQuantidade}
                  onChange={(e) => setEditQuantidade(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={editCategoria} onValueChange={setEditCategoria}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(CATEGORIAS).map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveEdit} className="flex-1">
                  Salvar Alterações
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setEditModalOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Scanner de código de barras */}
      <BarcodeScanner
        isOpen={isScannerOpen}
        onClose={() => {
          setIsScannerOpen(false);
          setIsRegisteringBarcode(false);
          setProductToRegisterBarcode(null);
          setIsScanningForFilter(false);
        }}
        onScan={handleScan}
      />

      {/* Dialog de confirmação para cadastro de código de barras */}
      <Dialog open={showBarcodeRegisterDialog} onOpenChange={setShowBarcodeRegisterDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Produto sem código de barras</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              O produto <strong>{productToRegisterBarcode?.nome}</strong> não possui código de barras cadastrado.
            </p>
            <p className="text-sm text-muted-foreground">
              Deseja cadastrar o código de barras agora?
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => handleRegisterBarcodeResponse(false)}
            >
              Não
            </Button>
            <Button
              onClick={() => handleRegisterBarcodeResponse(true)}
            >
              Sim, escanear código
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
