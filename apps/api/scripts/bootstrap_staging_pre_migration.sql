-- ==============================================================================
-- BOOTSTRAP DE STAGING — ETAPA PRÉ-MIGRATION (VITA SAÚDE - G4.2)
-- ==============================================================================
-- Executado ANTES de rodar prisma migrate deploy.
-- Provisiona o banco vita_saude_staging, cria roles, configura timeouts e isola o schema public.
--
-- Uso via psql:
-- psql -h 127.0.0.1 -p 5434 -U vita_staging_admin -d postgres \
--   -v MIGRATOR_PASS="$STAGING_MIGRATOR_PASSWORD" \
--   -v APP_PASS="$STAGING_APP_PASSWORD" \
--   -f apps/api/scripts/bootstrap_staging_pre_migration.sql
-- ==============================================================================

\set ON_ERROR_STOP on

-- 1. Criação condicional e idempotente do banco vita_saude_staging
SELECT 'CREATE DATABASE vita_saude_staging WITH TEMPLATE template0 ENCODING ''UTF8'' LC_COLLATE ''C'' LC_CTYPE ''C'''
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'vita_saude_staging')
\gexec

-- 2. Timezone UTC no nível do banco de dados
ALTER DATABASE vita_saude_staging SET timezone TO 'UTC';

-- 3. Criação idempotente das roles dedicadas de staging (sem superuser)
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

-- 4. Aplicação das senhas fornecidas via variáveis psql
ALTER ROLE vita_staging_migrator WITH PASSWORD :'MIGRATOR_PASS';
ALTER ROLE vita_staging_app WITH PASSWORD :'APP_PASS';

-- 5. Timeouts defensivos e Timezone UTC kernel-enforced nas roles
ALTER ROLE vita_staging_migrator SET timezone TO 'UTC';
ALTER ROLE vita_staging_migrator SET lock_timeout = '5000ms';
ALTER ROLE vita_staging_migrator SET statement_timeout = '30000ms';

ALTER ROLE vita_staging_app SET timezone TO 'UTC';

-- 6. Concessão de conexão estritamente para as roles de staging
REVOKE ALL ON DATABASE vita_saude_staging FROM PUBLIC;
GRANT CONNECT ON DATABASE vita_saude_staging TO vita_staging_migrator;
GRANT CONNECT ON DATABASE vita_saude_staging TO vita_staging_app;

-- 7. Troca explícita de banco para configurar permissões de schema
\connect vita_saude_staging vita_staging_admin
\set ON_ERROR_STOP on

-- Revogação do privilégio default de criação pública no schema public
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

-- Concessão exclusiva de DDL para a role de migração
GRANT ALL ON SCHEMA public TO vita_staging_migrator;

-- Concessão restrita de USAGE (somente navegação, sem permissão CREATE) para a app
GRANT USAGE ON SCHEMA public TO vita_staging_app;

SELECT 'BOOTSTRAP PRÉ-MIGRATION CONCLUÍDO COM SUCESSO' as status;
