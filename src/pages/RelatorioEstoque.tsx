import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileDown, Printer, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Product {
  id: string;
  nome: string;
  quantidade_estoque: number;
  categoria?: string;
  subcategoria?: string;
}

export default function RelatorioEstoque() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, nome, quantidade_estoque, categoria, subcategoria') as any;
      
      const result = await supabase
        .from('products')
        .select('*')
        .order('nome');

      if (result.error) throw result.error;
      setProducts(result.data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao carregar produtos',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateHTML = () => {
    const now = new Date();
    const formattedDate = format(now, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
    
    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório de Estoque - PDV-INOVAPRO</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #333;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
        }
        .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 5px;
        }
        .report-title {
            font-size: 18px;
            margin-bottom: 10px;
        }
        .report-date {
            font-size: 14px;
            color: #666;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        th {
            background-color: #f8f9fa;
            font-weight: bold;
        }
        tr:nth-child(even) {
            background-color: #f8f9fa;
        }
        .summary {
            margin-top: 30px;
            padding: 15px;
            background-color: #e3f2fd;
            border-radius: 5px;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 20px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-name">PDV-INOVAPRO</div>
        <div class="report-title">Relatório de Estoque</div>
        <div class="report-date">Gerado em: ${formattedDate}</div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Produto</th>
                <th>Categoria</th>
                <th>Subcategoria</th>
                <th>Quantidade em Estoque</th>
            </tr>
        </thead>
        <tbody>
            ${products.map(product => `
                <tr>
                    <td>${product.nome}</td>
                    <td>${product.categoria || '-'}</td>
                    <td>${product.subcategoria || '-'}</td>
                    <td>${product.quantidade_estoque}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="summary">
        <strong>Resumo:</strong><br>
        Total de produtos: ${products.length}<br>
        Total de itens em estoque: ${products.reduce((sum, p) => sum + p.quantidade_estoque, 0)}
    </div>

    <div class="footer">
        Relatório gerado pelo Sistema de Gestão PDV-INOVAPRO
    </div>
</body>
</html>`;

    return html;
  };

  const exportToHTML = () => {
    const html = generateHTML();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-estoque-${format(new Date(), 'yyyy-MM-dd-HHmm')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Relatório exportado!',
      description: 'Arquivo HTML baixado com sucesso',
    });
  };

  const printReport = () => {
    const html = generateHTML();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  const exportToPDF = async () => {
    try {
      // Usando a API de impressão do navegador para gerar PDF
      const html = generateHTML();
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        
        // Aguardar um pouco para o conteúdo carregar
        setTimeout(() => {
          printWindow.print();
        }, 250);
      }

      toast({
        title: 'Relatório preparado!',
        description: 'Use Ctrl+P ou Cmd+P para salvar como PDF',
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao gerar PDF',
      });
    }
  };

  if (loading) {
    return (
      <Layout title="Relatório de Estoque" showBack>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Relatório de Estoque" showBack>
      <div className="space-y-6">
        {/* Header com botões de exportação */}
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold">Relatório de Estoque</h2>
              <p className="text-muted-foreground">
                Gerado em: {format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={exportToHTML} variant="outline" className="gap-2">
                <FileDown className="w-4 h-4" />
                Exportar HTML
              </Button>
              <Button onClick={exportToPDF} variant="outline" className="gap-2">
                <FileText className="w-4 h-4" />
                Gerar PDF
              </Button>
              <Button onClick={printReport} className="gap-2">
                <Printer className="w-4 h-4" />
                Imprimir
              </Button>
            </div>
          </div>
        </Card>

        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">
                {products.length}
              </div>
              <div className="text-sm text-muted-foreground">
                Total de Produtos
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-success">
                {products.reduce((sum, p) => sum + p.quantidade_estoque, 0)}
              </div>
              <div className="text-sm text-muted-foreground">
                Total de Itens em Estoque
              </div>
            </div>
          </Card>
        </div>

        {/* Tabela de produtos */}
        <Card className="p-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Subcategoria</TableHead>
                  <TableHead className="text-right">Quantidade em Estoque</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Nenhum produto encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.nome}</TableCell>
                      <TableCell>{product.categoria || '-'}</TableCell>
                      <TableCell>{product.subcategoria || '-'}</TableCell>
                      <TableCell className="text-right">{product.quantidade_estoque}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </Layout>
  );
}