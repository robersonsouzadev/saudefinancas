#!/usr/bin/env bash

# ==============================================================================
# PROCEDIMENTO DE BACKUP SEGURO DA PRODUÇÃO — VITA SAÚDE (G4.2)
# ==============================================================================
# Cria snapshot consistente da base de dados de produção antes do provisionamento
# de staging. Garante permissões restritivas 0600 desde o primeiro byte via
# criação atômica com install -m 0600.
# ==============================================================================

set -euo pipefail

PROD_CONTAINER="sf-db-qo40k8o4g8owcoww0s4sccog-213922496244"
BACKUP_DIR="/data/vita-saude-backups/prod-pre-g4-2"
TIMESTAMP=$(date -u +%s)
BACKUP_FILE="${BACKUP_DIR}/saudefinancas_prod_${TIMESTAMP}.dump"

echo "================================================================================"
echo "   SALVAGUARDA DE PRODUÇÃO — PROCEDIMENTO DE BACKUP FACTUAL (G4.2)              "
echo "================================================================================"

# 1. Criação do diretório de backup com permissão restrita 0700
echo "[Passo 1] Assegurando diretório de backup com permissões 0700..."
install -d -m 0700 "$BACKUP_DIR"

# 2. Criação atômica do arquivo temporário com permissão 0600 ANTES da escrita
echo "[Passo 2] Criando arquivo temporário vazio com permissões 0600 desde o início..."
install -m 0600 /dev/null "${BACKUP_FILE}.tmp"

# 3. Execução do pg_dump via docker exec com redirecionamento em modo append (>>)
echo "[Passo 3] Executando pg_dump formato custom comprimido (-Fc)..."
docker exec "$PROD_CONTAINER" pg_dump \
  -U sf_user -d saudefinancas -Fc --no-owner --no-privileges \
  >> "${BACKUP_FILE}.tmp"

# 4. Renomeação atômica após término bem-sucedido
echo "[Passo 4] Renomeando atomicamente o arquivo temporário para o destino final..."
mv "${BACKUP_FILE}.tmp" "$BACKUP_FILE"

# 5. Validação estrutural da TOC (Table of Contents) via pg_restore --list
echo "[Passo 5] Inspecionando consistência estrutural do dump via TOC..."
docker exec -i "$PROD_CONTAINER" pg_restore --list < "$BACKUP_FILE" > /dev/null

SHA256=$(sha256sum "$BACKUP_FILE" | awk '{print $1}')
SIZE=$(stat -c '%s' "$BACKUP_FILE")
PERMS=$(stat -c '%a %U:%G' "$BACKUP_FILE")

echo ""
echo "================================================================================"
echo " [BACKUP DE SALVAGUARDA CONCLUÍDO COM SUCESSO]                                 "
echo " Arquivo:    $BACKUP_FILE"
echo " SHA-256:    $SHA256"
echo " Tamanho:    $SIZE bytes"
echo " Permissões: $PERMS"
echo " Nota: pg_restore --list valida integridade da TOC, não comprova restauração.  "
echo " Proibição: NUNCA restaurar este arquivo no ambiente de staging.               "
echo "================================================================================"
