# 🚀 Guia de Implantação do Saúde & Finanças na VPS

Este repositório está **100% pronto para produção** usando **Docker Compose**, suporte a vetores no PostgreSQL (`pgvector`), cache no **Redis**, backend **NestJS 11** e frontend **Next.js 15**.

---

## 1. Como Criar o Repositório no GitHub

Como o repositório `https://github.com/robersonsouzadev/saudefinancas.git` ainda não existia na sua conta do GitHub, siga os passos abaixo para ativá-lo:

1. Acesse [https://github.com/new](https://github.com/new)
2. No campo **Repository name**, digite: `saudefinancas`
3. Marque a opção **Public** ou **Private** (conforme sua preferência).
4. **NÃO marque** "Add a README file" (já criamos o projeto completo localmente).
5. Clique no botão verde **Create repository**.
6. No seu terminal local na pasta do projeto, execute o comando final de envio:

```bash
git push -u origin main
```

---

## 2. Como Hospedar na sua VPS (IP: `2.24.82.19`)

Conecte na sua VPS via SSH e execute os passos simples abaixo:

### Passo 1: Clonar o repositório na VPS
```bash
ssh root@2.24.82.19
git clone https://github.com/robersonsouzadev/saudefinancas.git
cd saudefinancas
```

### Passo 2: Configurar as Variáveis de Ambiente
```bash
cp .env.example .env
nano .env
```
*(Altere as senhas do PostgreSQL se desejar, e insira suas API Keys da OpenAI / Anthropic se tiver).*

### Passo 3: Executar a Implantação em 1 Clique com Docker
```bash
chmod +x deploy.sh
./deploy.sh
```

---

## 3. URLs de Acesso na VPS

Após subir os contêineres Docker, o sistema estará operando com todos os 4 serviços:

- **🌐 Interface Web (Next.js 15):** [http://2.24.82.19:3000](http://2.24.82.19:3000)
- **🔌 Backend API (NestJS 11):** [http://2.24.82.19:3001/api](http://2.24.82.19:3001/api)
- **🐘 Banco de Dados pgvector:** `2.24.82.19:5432`
- **⚡ Cache & Filas Redis:** `2.24.82.19:6379`
