-- Inserir dados fake para demonstração

-- Inserir usuários fake (senha padrão: "123456")
INSERT INTO users (name, email, password_hash, cpf, role, cargo, whatsapp_number, blocked) VALUES
('Admin Sistema', 'admin@cpv.com', '$2a$10$rQ8YvVjK7xYZqZ8YvVjK7.eOjXQYZ8YvVjK7xYZqZ8YvVjK7xYZ', '12345678900', 'admin', 'Administrador', '11999999999', false),
('João Silva', 'joao@cpv.com', '$2a$10$rQ8YvVjK7xYZqZ8YvVjK7.eOjXQYZ8YvVjK7xYZqZ8YvVjK7xYZ', '98765432100', 'employee', 'Tapeceiro', '11988888888', false),
('Maria Santos', 'maria@cpv.com', '$2a$10$rQ8YvVjK7xYZqZ8YvVjK7.eOjXQYZ8YvVjK7xYZqZ8YvVjK7xYZ', '11122233344', 'employee', 'Costureira', '11977777777', false),
('Pedro Costa', 'pedro@cpv.com', '$2a$10$rQ8YvVjK7xYZqZ8YvVjK7.eOjXQYZ8YvVjK7xYZqZ8YvVjK7xYZ', '55566677788', 'employee', 'Tapeceiro', '11966666666', false)
ON CONFLICT DO NOTHING;

-- Inserir roles para admin
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM users WHERE email = 'admin@cpv.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Inserir carros fake
INSERT INTO carros (cliente, telefone, marca, modelo, placa, observacoes) VALUES
('Carlos Mendes', '11955555555', 'Toyota', 'Corolla 2020', 'ABC-1234', 'Cliente preferencial'),
('Ana Paula', '11944444444', 'Honda', 'Civic 2019', 'DEF-5678', 'Pedido urgente'),
('Roberto Lima', '11933333333', 'Ford', 'Focus 2021', 'GHI-9012', null),
('Juliana Rocha', '11922222222', 'Chevrolet', 'Onix 2022', 'JKL-3456', 'Primeira vez'),
('Fernando Alves', '11911111111', 'Volkswagen', 'Gol 2018', 'MNO-7890', null),
('Beatriz Souza', '11900000000', 'Hyundai', 'HB20 2020', 'PQR-1357', 'Cliente VIP')
ON CONFLICT DO NOTHING;

-- Inserir produção fake
INSERT INTO producao (carro_id, funcionario_id, tipo_capa, material, cor, status, prazo, observacoes)
SELECT 
  c.id,
  u.id,
  (ARRAY['Banco Completo', 'Banco Dianteiro', 'Banco Traseiro', 'Volante', 'Painel'])[((random() * 4)::int + 1)],
  (ARRAY['Couro Sintético', 'Couro Legítimo', 'Tecido Premium', 'Neoprene'])[((random() * 3)::int + 1)],
  (ARRAY['Preto', 'Cinza', 'Bege', 'Marrom', 'Vermelho'])[((random() * 4)::int + 1)],
  (ARRAY['aguardando', 'em_producao', 'finalizado'])[((random() * 2)::int + 1)]::status_producao,
  CURRENT_DATE + ((random() * 15)::int + 1) * interval '1 day',
  'Pedido de teste - Dados fake'
FROM 
  (SELECT id FROM carros ORDER BY random() LIMIT 10) c,
  (SELECT id FROM users WHERE role = 'employee' ORDER BY random() LIMIT 1) u
ON CONFLICT DO NOTHING;

-- Inserir agendamentos fake
INSERT INTO agendamentos (cliente, carro_id, servico, data, horario, status, telefone, observacoes)
SELECT 
  'Cliente Teste ' || gs,
  c.id,
  (ARRAY['Troca de Capa', 'Reparo', 'Manutenção', 'Instalação Completa'])[((random() * 3)::int + 1)],
  CURRENT_DATE + gs * interval '1 day',
  ('08:00:00'::time + ((random() * 9)::int) * interval '1 hour')::time,
  (ARRAY['agendado', 'confirmado'])[((random() * 1)::int + 1)]::status_agendamento,
  '11900000' || lpad(gs::text, 3, '0'),
  CASE WHEN random() > 0.5 THEN 'Observação teste' ELSE null END
FROM 
  generate_series(1, 10) gs,
  (SELECT id FROM carros ORDER BY random() LIMIT 1) c
ON CONFLICT DO NOTHING;

-- Inserir garantias fake
INSERT INTO garantias (carro_id, servico, validade, ativa, observacao)
SELECT 
  c.id,
  (ARRAY['Troca de Capa Banco', 'Instalação Volante', 'Reparo Costura', 'Serviço Completo'])[((random() * 3)::int + 1)],
  CURRENT_DATE + ((random() * 365)::int + 30) * interval '1 day',
  true,
  CASE WHEN random() > 0.7 THEN 'Garantia estendida' ELSE null END
FROM 
  (SELECT id FROM carros) c
ON CONFLICT DO NOTHING;

-- Inserir recebimentos fake
INSERT INTO recebimentos (valor, forma_pagamento, referencia, data, observacoes)
SELECT 
  ((random() * 1500 + 500)::numeric(10,2)),
  (ARRAY['Dinheiro', 'Pix', 'Cartão', 'Transferência'])[((random() * 3)::int + 1)],
  'REF-' || lpad(gs::text, 6, '0'),
  CURRENT_DATE - gs * interval '1 day',
  CASE WHEN random() > 0.6 THEN 'Pagamento teste' ELSE null END
FROM generate_series(1, 20) gs
ON CONFLICT DO NOTHING;

-- Inserir horários disponíveis
INSERT INTO horarios_disponiveis (dia, hora, disponivel)
SELECT 
  (CURRENT_DATE + day_offset)::date,
  ('08:00:00'::time + hour_num * interval '1 hour')::time,
  true
FROM 
  generate_series(0, 13) AS day_offset,
  generate_series(0, 9) AS hour_num
WHERE EXTRACT(DOW FROM CURRENT_DATE + day_offset) NOT IN (0, 6)
ON CONFLICT (dia, hora) DO NOTHING;

-- Inserir registros de ponto fake
INSERT INTO ponto (user_id, entrada, saida)
SELECT 
  u.id,
  (CURRENT_DATE - gs * interval '1 day' + '08:00:00'::time)::timestamptz,
  (CURRENT_DATE - gs * interval '1 day' + '17:00:00'::time)::timestamptz
FROM 
  generate_series(1, 30) gs,
  (SELECT id FROM users WHERE role = 'employee' ORDER BY random() LIMIT 1) u
ON CONFLICT DO NOTHING;