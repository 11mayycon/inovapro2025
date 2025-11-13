-- Criar enum para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'funcionario');

-- Criar enum para status de produção
CREATE TYPE public.status_producao AS ENUM ('aguardando', 'em_producao', 'finalizado', 'expedido');

-- Criar enum para status de agendamento
CREATE TYPE public.status_agendamento AS ENUM ('agendado', 'confirmado', 'cancelado', 'concluido');

-- Criar tabela de roles de usuário (SEGURANÇA)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Função de segurança para verificar role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Função para verificar se usuário é admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- Tabela de carros/veículos
CREATE TABLE public.carros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    modelo TEXT NOT NULL,
    marca TEXT NOT NULL,
    placa TEXT NOT NULL UNIQUE,
    cliente TEXT NOT NULL,
    telefone TEXT NOT NULL,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de produção
CREATE TABLE public.producao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    carro_id UUID REFERENCES public.carros(id) ON DELETE CASCADE NOT NULL,
    funcionario_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    tipo_capa TEXT NOT NULL,
    material TEXT NOT NULL,
    cor TEXT NOT NULL,
    status status_producao DEFAULT 'aguardando' NOT NULL,
    prazo DATE NOT NULL,
    fotos TEXT[],
    observacoes TEXT,
    data_inicio TIMESTAMP WITH TIME ZONE,
    data_finalizacao TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de expedição
CREATE TABLE public.expedicao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producao_id UUID REFERENCES public.producao(id) ON DELETE CASCADE NOT NULL,
    data_retirada TIMESTAMP WITH TIME ZONE DEFAULT now(),
    retirado_por TEXT NOT NULL,
    recibo_numero TEXT NOT NULL,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de agendamentos
CREATE TABLE public.agendamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente TEXT NOT NULL,
    carro_id UUID REFERENCES public.carros(id) ON DELETE SET NULL,
    servico TEXT NOT NULL,
    data DATE NOT NULL,
    horario TIME NOT NULL,
    status status_agendamento DEFAULT 'agendado' NOT NULL,
    telefone TEXT NOT NULL,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de horários disponíveis
CREATE TABLE public.horarios_disponiveis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dia DATE NOT NULL,
    hora TIME NOT NULL,
    disponivel BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (dia, hora)
);

-- Tabela de garantias
CREATE TABLE public.garantias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    carro_id UUID REFERENCES public.carros(id) ON DELETE CASCADE NOT NULL,
    servico TEXT NOT NULL,
    validade DATE NOT NULL,
    observacao TEXT,
    ativa BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de recebimentos
CREATE TABLE public.recebimentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    valor NUMERIC(10, 2) NOT NULL,
    forma_pagamento TEXT NOT NULL,
    referencia TEXT NOT NULL,
    data DATE DEFAULT CURRENT_DATE NOT NULL,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS em todas as tabelas
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.producao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expedicao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horarios_disponiveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garantias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recebimentos ENABLE ROW LEVEL SECURITY;

-- Policies para user_roles (apenas admins podem gerenciar)
CREATE POLICY "Admins can manage user roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policies para carros (admins veem tudo, funcionários veem apenas os seus)
CREATE POLICY "Admins can manage all carros"
ON public.carros
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Funcionarios can view carros"
ON public.carros
FOR SELECT
TO authenticated
USING (true);

-- Policies para producao
CREATE POLICY "Admins can manage all producao"
ON public.producao
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Funcionarios can view their producao"
ON public.producao
FOR SELECT
TO authenticated
USING (funcionario_id = auth.uid());

CREATE POLICY "Funcionarios can update their producao"
ON public.producao
FOR UPDATE
TO authenticated
USING (funcionario_id = auth.uid())
WITH CHECK (funcionario_id = auth.uid());

-- Policies para expedicao (apenas admins)
CREATE POLICY "Admins can manage expedicao"
ON public.expedicao
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- Policies para agendamentos (apenas admins)
CREATE POLICY "Admins can manage agendamentos"
ON public.agendamentos
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- Policies para horarios_disponiveis (admins gerenciam, todos visualizam)
CREATE POLICY "Everyone can view horarios"
ON public.horarios_disponiveis
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage horarios"
ON public.horarios_disponiveis
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- Policies para garantias (apenas admins)
CREATE POLICY "Admins can manage garantias"
ON public.garantias
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- Policies para recebimentos (apenas admins)
CREATE POLICY "Admins can manage recebimentos"
ON public.recebimentos
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_carros_updated_at
BEFORE UPDATE ON public.carros
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_producao_updated_at
BEFORE UPDATE ON public.producao
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agendamentos_updated_at
BEFORE UPDATE ON public.agendamentos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();