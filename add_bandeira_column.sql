-- Adicionar coluna bandeira na tabela sales se não existir
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS bandeira text;