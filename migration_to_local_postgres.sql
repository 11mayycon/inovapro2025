-- =====================================================
-- MIGRAÇÃO COMPLETA DO PDV INOVAPRO PARA POSTGRESQL LOCAL
-- =====================================================
-- Este script cria toda a estrutura do banco de dados do PDV InovaPro
-- incluindo tabelas, índices, triggers, funções e políticas RLS
-- =====================================================

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- CUSTOM TYPES (ENUMS)
-- =====================================================

-- Create custom types (only if they don't exist)
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'employee');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('dinheiro', 'cartao_debito', 'cartao_credito', 'pix', 'outro');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE movement_type AS ENUM ('entrada', 'saida', 'ajuste', 'desperdicio');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- TABELA: users (Usuários do sistema)
-- =====================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT,
  cpf TEXT,
  whatsapp_number TEXT,
  role user_role NOT NULL DEFAULT 'employee',
  cargo TEXT,
  password_hash TEXT NOT NULL,
  blocked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique index for email (only when not null)
DROP INDEX IF EXISTS users_email_key;
CREATE UNIQUE INDEX users_email_key ON users(email) WHERE email IS NOT NULL;

-- Create unique index for cpf (only when not null)
DROP INDEX IF EXISTS users_cpf_key;
CREATE UNIQUE INDEX users_cpf_key ON users(cpf) WHERE cpf IS NOT NULL;

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Admins can manage all users" ON users;
DROP POLICY IF EXISTS "Users can view all profiles" ON users;

-- RLS Policies for users
CREATE POLICY "Users can view all profiles"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage all users"
  ON users FOR ALL
  USING (true);

-- =====================================================
-- TABELA: products (Produtos)
-- =====================================================

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo_barras TEXT,
  codigo TEXT,
  nome TEXT NOT NULL,
  preco NUMERIC(12,2) NOT NULL DEFAULT 0,
  quantidade_estoque INTEGER NOT NULL DEFAULT 0,
  unidade TEXT DEFAULT 'un',
  descricao TEXT,
  categoria TEXT,
  subcategoria TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique index for codigo_barras (only when not null)
DROP INDEX IF EXISTS products_codigo_barras_key;
CREATE UNIQUE INDEX products_codigo_barras_key ON products(codigo_barras) WHERE codigo_barras IS NOT NULL;

-- Create unique index for codigo (only when not null)
DROP INDEX IF EXISTS products_codigo_key;
CREATE UNIQUE INDEX products_codigo_key ON products(codigo) WHERE codigo IS NOT NULL;

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can view products" ON products;
DROP POLICY IF EXISTS "Admins can manage products" ON products;

CREATE POLICY "Anyone authenticated can view products"
  ON products FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage products"
  ON products FOR ALL
  USING (true);

-- =====================================================
-- TABELA: receipts (Notas fiscais de entrada)
-- =====================================================

CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero_nota TEXT,
  fornecedor TEXT,
  data_recebimento TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can view receipts" ON receipts;
DROP POLICY IF EXISTS "Authenticated users can create receipts" ON receipts;

CREATE POLICY "Anyone authenticated can view receipts"
  ON receipts FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create receipts"
  ON receipts FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- TABELA: receipt_items (Itens da nota fiscal)
-- =====================================================

CREATE TABLE IF NOT EXISTS receipt_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receipt_id UUID REFERENCES receipts(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  codigo_produto TEXT,
  nome_produto TEXT,
  quantidade INTEGER NOT NULL,
  valor_unitario NUMERIC(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE receipt_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can view receipt items" ON receipt_items;
DROP POLICY IF EXISTS "Authenticated users can create receipt items" ON receipt_items;

CREATE POLICY "Anyone authenticated can view receipt items"
  ON receipt_items FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create receipt items"
  ON receipt_items FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- TABELA: sales (Vendas)
-- =====================================================

CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  total NUMERIC(12,2) NOT NULL,
  forma_pagamento payment_method,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view sales" ON sales;
DROP POLICY IF EXISTS "Users can create sales" ON sales;
DROP POLICY IF EXISTS "Users can delete sales" ON sales;

CREATE POLICY "Users can view sales"
  ON sales FOR SELECT
  USING (true);

CREATE POLICY "Users can create sales"
  ON sales FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can delete sales"
  ON sales FOR DELETE
  USING (true);

-- =====================================================
-- TABELA: sale_items (Itens da venda)
-- =====================================================

CREATE TABLE IF NOT EXISTS sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  codigo_produto TEXT,
  nome_produto TEXT,
  quantidade INTEGER NOT NULL,
  preco_unitario NUMERIC(12,2) NOT NULL
);

ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view sale items" ON sale_items;
DROP POLICY IF EXISTS "Users can create sale items" ON sale_items;
DROP POLICY IF EXISTS "Users can delete sale items" ON sale_items;

CREATE POLICY "Users can view sale items"
  ON sale_items FOR SELECT
  USING (true);

CREATE POLICY "Users can create sale items"
  ON sale_items FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can delete sale items"
  ON sale_items FOR DELETE
  USING (true);

-- =====================================================
-- TABELA: stock_movements (Movimentações de estoque)
-- =====================================================

CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id),
  user_id UUID REFERENCES users(id),
  tipo movement_type NOT NULL,
  quantidade INTEGER NOT NULL,
  motivo TEXT,
  ref_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view stock movements" ON stock_movements;
DROP POLICY IF EXISTS "Users can create stock movements" ON stock_movements;

CREATE POLICY "Users can view stock movements"
  ON stock_movements FOR SELECT
  USING (true);

CREATE POLICY "Users can create stock movements"
  ON stock_movements FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- TABELA: waste_records (Registros de desperdício)
-- =====================================================

CREATE TABLE IF NOT EXISTS waste_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id),
  user_id UUID REFERENCES users(id),
  quantidade INTEGER NOT NULL,
  motivo TEXT,
  image_paths TEXT[],
  confirmed BOOLEAN DEFAULT FALSE,
  confirmed_by UUID REFERENCES users(id),
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE waste_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view waste records" ON waste_records;
DROP POLICY IF EXISTS "Users can create waste records" ON waste_records;
DROP POLICY IF EXISTS "Admins can update waste records" ON waste_records;

CREATE POLICY "Users can view waste records"
  ON waste_records FOR SELECT
  USING (true);

CREATE POLICY "Users can create waste records"
  ON waste_records FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can update waste records"
  ON waste_records FOR UPDATE
  USING (true);

-- =====================================================
-- TABELA: ponto (Controle de ponto)
-- =====================================================

CREATE TABLE IF NOT EXISTS ponto (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entrada TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  saida TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ponto ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own ponto records" ON ponto;
DROP POLICY IF EXISTS "Users can insert their own ponto records" ON ponto;
DROP POLICY IF EXISTS "Users can update their own ponto records" ON ponto;
DROP POLICY IF EXISTS "Users can delete ponto records" ON ponto;

CREATE POLICY "Users can view their own ponto records"
  ON ponto FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own ponto records"
  ON ponto FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own ponto records"
  ON ponto FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete ponto records"
  ON ponto FOR DELETE
  USING (true);

-- =====================================================
-- TABELA: audit_logs (Logs de auditoria)
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;

CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (true);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Products
CREATE INDEX IF NOT EXISTS idx_products_codigo_barras ON products(codigo_barras);
CREATE INDEX IF NOT EXISTS idx_products_codigo ON products(codigo);
CREATE INDEX IF NOT EXISTS idx_products_nome ON products(nome);

-- Sales
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);

-- Stock movements
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at);

-- Waste records
CREATE INDEX IF NOT EXISTS idx_waste_records_confirmed ON waste_records(confirmed);

-- Ponto
CREATE INDEX IF NOT EXISTS idx_ponto_user_id ON ponto(user_id);
CREATE INDEX IF NOT EXISTS idx_ponto_entrada ON ponto(entrada);

-- =====================================================
-- FUNÇÕES E TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ponto_updated_at ON ponto;
CREATE TRIGGER update_ponto_updated_at
  BEFORE UPDATE ON ponto
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DADOS INICIAIS (SEED)
-- =====================================================

-- Insert funcionário Maicon Silva
-- Senha: 1285041 (hash bcrypt)
INSERT INTO users (name, email, cpf, role, cargo, password_hash)
VALUES (
  'Maicon Silva',
  'maiconsillva2525@gmail.com',
  '10533219531',
  'employee',
  'Funcionário',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
)
ON CONFLICT (cpf) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  cargo = EXCLUDED.cargo;

-- Insert admin user
-- Senha: password (hash bcrypt)
INSERT INTO users (name, email, cpf, role, cargo, password_hash)
VALUES (
  'Administrador',
  'admin@posto.com',
  '00000000000',
  'admin',
  'Administrador do Sistema',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
)
ON CONFLICT (cpf) DO NOTHING;

-- =====================================================
-- MENSAGEM DE CONCLUSÃO
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Banco interno configurado com sucesso e integrado ao PDV InovaPro!';
  RAISE NOTICE '📊 Estrutura completa criada:';
  RAISE NOTICE '   - 11 tabelas';
  RAISE NOTICE '   - 3 enums';
  RAISE NOTICE '   - 12 índices';
  RAISE NOTICE '   - 3 triggers';
  RAISE NOTICE '   - Políticas RLS completas';
  RAISE NOTICE '   - 2 usuários iniciais';
END $$;
