-- ==============================================================================
-- BOOTSTRAP DE STAGING — ETAPA PÓS-MIGRATION (VITA SAÚDE - G4.2)
-- ==============================================================================
-- Executado APÓS prisma migrate deploy.
-- Concede DML para a role de runtime da aplicação (vita_staging_app),
-- protege a tabela interna _prisma_migrations e executa asserções ativas de segurança.
--
-- Uso via psql:
-- psql -h 127.0.0.1 -p 5434 -U vita_staging_migrator -d vita_saude_staging \
--   -f apps/api/scripts/bootstrap_staging_post_migration.sql
-- ==============================================================================

\set ON_ERROR_STOP on

-- 1. Default Privileges para tabelas e sequências futuras geradas pelo migrator
ALTER DEFAULT PRIVILEGES FOR ROLE vita_staging_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO vita_staging_app;

ALTER DEFAULT PRIVILEGES FOR ROLE vita_staging_migrator IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO vita_staging_app;

-- 2. Concessão explícita para as tabelas já criadas pelas migrations
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO vita_staging_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO vita_staging_app;

-- 3. Proteção Estrita de _prisma_migrations (auditoria interna de migrações)
-- A role da aplicação JAMAIS deve possuir permissão de INSERT, UPDATE, DELETE ou TRUNCATE
REVOKE ALL ON TABLE public._prisma_migrations FROM vita_staging_app;
REVOKE ALL ON TABLE public._prisma_migrations FROM PUBLIC;

-- 4. Asserções de Segurança Automatizadas com Bloqueio Fatal em Caso de Falha
\connect vita_saude_staging vita_staging_app
\set ON_ERROR_STOP on

-- Asserção 4.1: A role vita_staging_app NÃO deve conseguir criar tabelas
DO $$
BEGIN
  BEGIN
    CREATE TABLE public._privilege_test_forbidden (id int);
    DROP TABLE public._privilege_test_forbidden;
    RAISE EXCEPTION 'FALHA DE SEGURANÇA CRÍTICA: A role vita_staging_app conseguiu criar tabelas no schema public!';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'ASSERÇÃO APROVADA: Criação de tabelas bloqueada com sucesso para vita_staging_app.';
  END;
END
$$;

-- Asserção 4.2: A role vita_staging_app NÃO deve conseguir modificar _prisma_migrations
DO $$
BEGIN
  BEGIN
    DELETE FROM public._prisma_migrations WHERE 1=0;
    RAISE EXCEPTION 'FALHA DE SEGURANÇA CRÍTICA: A role vita_staging_app possui privilégio de escrita na tabela _prisma_migrations!';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'ASSERÇÃO APROVADA: Tabela _prisma_migrations protegida contra vita_staging_app.';
  END;
END
$$;

SELECT 'BOOTSTRAP PÓS-MIGRATION E ASSERÇÕES CONCLUÍDOS COM SUCESSO' as status;
