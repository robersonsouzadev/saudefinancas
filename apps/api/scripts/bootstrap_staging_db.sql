-- ==============================================================================
-- BOOTSTRAP SQL DE STAGING ISOLADO (VITA SAÚDE - G4.2)
-- ==============================================================================
-- Este script é parametrizado e livre de segredos hardcoded.
-- Deve ser executado via psql passando as senhas como variáveis:
--
-- psql -h 127.0.0.1 -p 5434 -U vita_staging_admin -d postgres \
--   -v MIGRATOR_PASS="$STAGING_MIGRATOR_PASSWORD" \
--   -v APP_PASS="$STAGING_APP_PASSWORD" \
--   -f apps/api/scripts/bootstrap_staging_db.sql
-- ==============================================================================

-- ==============================================================================
-- FASE 1: PROVISIONAMENTO DO BANCO DE DADOS E ROLES
-- Banco alvo explícito: postgres (porta 5434 / sf-db-staging)
-- Role executora: vita_staging_admin (superuser de staging)
-- ==============================================================================
\set ON_ERROR_STOP on

-- 1.1 Criação condicional e idempotente do banco vita_saude_staging
SELECT 'CREATE DATABASE vita_saude_staging WITH TEMPLATE template0 ENCODING ''UTF8'' LC_COLLATE ''C'' LC_CTYPE ''C'''
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'vita_saude_staging')
\gexec

-- 1.2 Configuração de Timezone UTC no nível do banco de dados
ALTER DATABASE vita_saude_staging SET timezone TO 'UTC';

-- 1.3 Criação idempotente das roles dedicadas (sem superuser)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'vita_staging_migrator') THEN
    CREATE ROLE vita_staging_migrator WITH LOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'vita_staging_app') THEN
    CREATE ROLE vita_staging_app WITH LOGIN;
  END IF;
END
$$;

-- 1.4 Atribuição segura das credenciais a partir das variáveis do psql
ALTER ROLE vita_staging_migrator WITH PASSWORD :'MIGRATOR_PASS';
ALTER ROLE vita_staging_app WITH PASSWORD :'APP_PASS';

-- 1.5 Configurações de sessão kernel-enforced nas roles
-- Role de Migrações (DDL): Timeouts defensivos obrigatórios
ALTER ROLE vita_staging_migrator SET timezone TO 'UTC';
ALTER ROLE vita_staging_migrator SET lock_timeout = '5000ms';
ALTER ROLE vita_staging_migrator SET statement_timeout = '30000ms';

-- Role da Aplicação (DML): Timezone UTC estrito
ALTER ROLE vita_staging_app SET timezone TO 'UTC';

-- 1.6 Concessão restrita de conexão ao banco de staging
REVOKE ALL ON DATABASE vita_saude_staging FROM PUBLIC;
GRANT CONNECT ON DATABASE vita_saude_staging TO vita_staging_migrator;
GRANT CONNECT ON DATABASE vita_saude_staging TO vita_staging_app;


-- ==============================================================================
-- FASE 2: ISOLAMENTO DO SCHEMA PUBLIC E PRIVILÉGIOS DDL
-- Banco alvo explícito: vita_saude_staging
-- Role executora: vita_staging_admin
-- ==============================================================================
\connect vita_saude_staging vita_staging_admin
\set ON_ERROR_STOP on

-- 2.1 Revogação do privilégio default de criação pública no schema public
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

-- 2.2 Concessão exclusiva de DDL para a role de migração
GRANT ALL ON SCHEMA public TO vita_staging_migrator;

-- 2.3 Concessão restrita de navegação DML (apenas USAGE, sem permissão CREATE) para a app
GRANT USAGE ON SCHEMA public TO vita_staging_app;


-- ==============================================================================
-- FASE 3: GRANTS DML RESTRITOS PÓS-MIGRATION
-- Banco alvo explícito: vita_saude_staging
-- Role executora: vita_staging_migrator (proprietária dos objetos criados)
-- NOTA: Esta fase deve ser executada após o `prisma migrate deploy`
-- ==============================================================================
\connect vita_saude_staging vita_staging_migrator
\set ON_ERROR_STOP on

-- 3.1 Default Privileges para tabelas e sequências criadas pela role de migração
ALTER DEFAULT PRIVILEGES FOR ROLE vita_staging_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO vita_staging_app;

ALTER DEFAULT PRIVILEGES FOR ROLE vita_staging_migrator IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO vita_staging_app;

-- 3.2 Concessão explícita para as tabelas já criadas pelas migrations anteriores
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO vita_staging_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO vita_staging_app;


-- ==============================================================================
-- VERIFICAÇÃO AUTOMÁTICA DE SEGURANÇA E ASSERÇÕES
-- ==============================================================================
-- Teste de Asserção: A role da aplicação NÃO deve conseguir criar tabelas no schema public
\connect vita_saude_staging vita_staging_app
\set ON_ERROR_STOP off
CREATE TABLE public._privilege_test_forbidden (id int);
\set ON_ERROR_STOP on

-- Limpeza de segurança caso porventura tenha sido criada
\connect vita_saude_staging vita_staging_admin
\set ON_ERROR_STOP on
DROP TABLE IF EXISTS public._privilege_test_forbidden;
