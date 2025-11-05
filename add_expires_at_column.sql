-- Adiciona coluna expires_at para contas temporárias
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Adiciona comentário explicativo
COMMENT ON COLUMN users.expires_at IS 'Data e hora de expiração para contas teste (NULL = conta permanente)';

-- Cria índice para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_users_expires_at ON users(expires_at) WHERE expires_at IS NOT NULL;
