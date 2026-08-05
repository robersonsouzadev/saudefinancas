#!/bin/bash

# ==============================================================================
# SCRIPT DE IMPLANTAÇÃO AUTOMÁTICA EM VPS — SAÚDE & FINANÇAS
# ==============================================================================

echo "🚀 Iniciando Implantação do Saúde & Finanças na VPS..."

# 1. Verifica se Docker está instalado
if ! command -v docker &> /dev/null
then
    echo "⚠️ Docker não encontrado. Instalando Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
fi

# 2. Verifica se Docker Compose está instalado
if ! command -v docker-compose &> /dev/null
then
    echo "⚠️ Docker Compose não encontrado. Instalando..."
    sudo apt-get update && sudo apt-get install -y docker-compose-plugin docker-compose
fi

# 3. Cria arquivo .env se não existir
if [ ! -f .env ]; then
    echo "📝 Criando arquivo .env a partir do .env.example..."
    cp .env.example .env
fi

# 4. Baixa as imagens e sobe os contêineres Docker em segundo plano
echo "📦 Construindo imagens Docker e iniciando serviços (PostgreSQL pgvector, Redis, API NestJS, Web Next.js)..."
docker-compose down --remove-orphans
docker-compose up --build -d

echo "✅ Implantação concluída com sucesso!"
echo "🌐 Web Interface: http://localhost:3000 (ou http://IP_DA_SUA_VPS:3000)"
echo "🔌 API NestJS: http://localhost:3001/api (ou http://IP_DA_SUA_VPS:3001/api)"
