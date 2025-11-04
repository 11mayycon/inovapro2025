import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, CheckCircle, FileText, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function ImportarProdutosSQL() {
  const [loading, setLoading] = useState(false);
  const [imported, setImported] = useState(0);
  const [totalFiltered, setTotalFiltered] = useState(0);
  const [totalParsed, setTotalParsed] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();

  const parseSQL = (sqlContent: string) => {
    const products = [];
    
    // Regex para extrair valores do INSERT
    const valueRegex = /\('([^']*)',\s*('([^']*)'|null),\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*('([^']*)'|null)/g;
    
    let match;
    let parsed = 0;
    
    while ((match = valueRegex.exec(sqlContent)) !== null) {
      parsed++;
      
      const codigo_barras = match[3] || null;
      const nome = match[4];
      const preco = match[5];
      const quantidade_estoque = match[6];
      const unidade = match[7];
      const descricao = match[9] || null;
      
      // Filtrar: apenas produtos com código de barras OU [codigo] na descrição
      const temCodigoBarras = codigo_barras !== null && codigo_barras.trim() !== '';
      const temCodigoNaDescricao = descricao && descricao.includes('[codigo]');
      
      if (temCodigoBarras || temCodigoNaDescricao) {
        products.push({
          codigo_barras: codigo_barras && codigo_barras.trim() !== '' ? codigo_barras : null,
          nome: nome,
          preco: parseFloat(preco),
          quantidade_estoque: parseInt(quantidade_estoque),
          unidade: unidade,
          descricao: descricao
        });
      }
    }
    
    return { products, parsed };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setImported(0);
      setTotalFiltered(0);
      setTotalParsed(0);
    }
  };

  const importarProdutos = async () => {
    if (!file) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Por favor, selecione um arquivo SQL.',
      });
      return;
    }

    try {
      setLoading(true);
      setImported(0);

      const sqlContent = await file.text();
      const { products, parsed } = parseSQL(sqlContent);
      
      setTotalParsed(parsed);
      setTotalFiltered(products.length);

      if (products.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Nenhum produto encontrado',
          description: 'Não foram encontrados produtos com código de barras ou [codigo] na descrição.',
        });
        setLoading(false);
        return;
      }

      console.log(`Total parseado: ${parsed}`);
      console.log(`Com código de barras ou [codigo]: ${products.length}`);

      // Inserir produtos em lotes de 50
      const batchSize = 50;
      let totalImported = 0;
      let errors = 0;

      for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);
        
        const { error } = await supabase
          .from('products')
          .insert(batch);

        if (error) {
          console.error('Erro ao importar lote:', error);
          errors += batch.length;
          
          // Tentar importar individualmente em caso de erro
          for (const product of batch) {
            const { error: individualError } = await supabase
              .from('products')
              .insert([product]);
            
            if (!individualError) {
              totalImported++;
              setImported(totalImported);
            }
          }
        } else {
          totalImported += batch.length;
          setImported(totalImported);
        }
      }

      toast({
        title: 'Importação concluída!',
        description: `${totalImported} produtos importados com sucesso${errors > 0 ? `, ${errors} erros` : ''}.`,
      });

    } catch (error: any) {
      console.error('Erro ao importar:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao importar',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Importar Produtos (SQL)</h1>
          <p className="text-muted-foreground">
            Importe produtos do arquivo SQL (apenas com código de barras ou [codigo])
          </p>
        </div>

        <Card className="p-6">
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  {file ? (
                    <FileText className="w-10 h-10 text-primary" />
                  ) : (
                    <Upload className="w-10 h-10 text-primary" />
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-2">
                  {file ? file.name : 'Selecione um arquivo SQL'}
                </h3>
                <p className="text-muted-foreground">
                  {file 
                    ? 'Arquivo carregado. Clique em importar para processar.'
                    : 'Escolha o arquivo SQL com os produtos'}
                </p>
              </div>

              {totalParsed > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2 text-blue-600">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">
                      {totalParsed} produtos parseados, {totalFiltered} filtrados
                    </span>
                  </div>
                  {imported > 0 && (
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">
                        {imported} produtos importados
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <Input
                type="file"
                accept=".sql"
                onChange={handleFileChange}
                disabled={loading}
              />

              <Button
                onClick={importarProdutos}
                disabled={loading || !file}
                className="w-full"
                size="lg"
              >
                {loading ? 'Importando...' : 'Iniciar Importação'}
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              <p className="font-semibold mb-2">Critérios de importação:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Produtos COM código de barras</li>
                <li>OU produtos com [codigo] na descrição</li>
                <li>Outros produtos serão ignorados</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
