import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://fouylveqthojpruiscwq.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvdXlsdmVxdGhvanBydWlzY3dxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDkyMzk4NiwiZXhwIjoyMDc2NDk5OTg2fQ.wx9ap9QnhKj8fCyO4_3-bjp3DhxlN4PbBlDcHvFwbwU";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function parseAndImportProducts() {
  try {
    console.log('Lendo arquivo SQL...');
    const sqlContent = readFileSync('products_rows_1.sql', 'utf-8');
    
    // Regex para extrair os valores dos produtos
    const valueRegex = /\('([^']*)',\s*('([^']*)'|null),\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*('([^']*)'|null)/g;
    
    const products = [];
    let match;
    let totalParsed = 0;
    
    console.log('Parseando produtos...');
    
    while ((match = valueRegex.exec(sqlContent)) !== null) {
      totalParsed++;
      
      const id = match[1];
      const codigo_barras = match[3] || null; // pode ser null
      const nome = match[4];
      const preco = match[5];
      const quantidade_estoque = match[6];
      const unidade = match[7];
      const descricao = match[9] || null; // pode ser null
      
      // Filtrar: só produtos com código de barras OU [codigo] na descrição
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
    
    console.log(`\n📊 Estatísticas:`);
    console.log(`   Total parseado: ${totalParsed}`);
    console.log(`   Com código de barras ou [codigo]: ${products.length}`);
    console.log(`   Filtrados: ${totalParsed - products.length}`);
    
    if (products.length === 0) {
      console.log('\n⚠️  Nenhum produto encontrado com os critérios especificados.');
      return;
    }
    
    console.log(`\n🚀 Iniciando importação de ${products.length} produtos...`);
    
    // Inserir em lotes de 100
    const batchSize = 100;
    let imported = 0;
    let errors = 0;
    
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('products')
        .insert(batch)
        .select();
      
      if (error) {
        console.error(`❌ Erro no lote ${Math.floor(i / batchSize) + 1}:`, error.message);
        errors += batch.length;
      } else {
        imported += batch.length;
        console.log(`✅ Lote ${Math.floor(i / batchSize) + 1}: ${batch.length} produtos importados (${imported}/${products.length})`);
      }
    }
    
    console.log(`\n✨ Importação concluída!`);
    console.log(`   ✅ Importados: ${imported}`);
    console.log(`   ❌ Erros: ${errors}`);
    
  } catch (error) {
    console.error('❌ Erro fatal:', error);
  }
}

parseAndImportProducts();
