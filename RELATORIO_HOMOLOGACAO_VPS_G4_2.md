# Relatório Factual de Homologação — Fase G4.2 na VPS

**Data/Hora (UTC):** 2026-09-22T19:50:00Z  
**Alvo Designado:** `root@72.60.249.235`  
**Pacote Técnico Auditado:** `pacote_tecnico_g4_2_v12.zip`  
**SHA-256 Declarado do Pacote:** `182c7d9761a4cac055f3c2c144489a67087be32fb8d8ab982916be2315a4dfcf`  

---

## 1. Status Formal

```text
STATUS OBRIGATÓRIO:
G4.2 = BLOCKED
G5   = BLOCKED
G6   = BLOCKED
G7   = BLOCKED
```

**Motivo do Bloqueio:** Acionamento imediato da **Regra de Parada** na Fase 1. O host remoto `72.60.249.235` encontra-se inalcançável via rede (timeouts em ICMP ping, SSH porta 22, HTTP/HTTPS portas 80/443 e portas de aplicação 3000/3001). Conforme diretriz mandatória de salvaguarda, nenhuma suposição ou improviso foi realizado.

---

## 2. Evidências Factuais de Execução e Diagnóstico de Rede

### 2.1 Tentativa de Conexão SSH
- **Comando:**
  ```bash
  ssh -o BatchMode=yes -o ConnectTimeout=5 root@72.60.249.235 "echo SSH_OK"
  ```
- **Exit Code:** `1`
- **Stderr / Saída:**
  ```text
  ssh: connect to host 72.60.249.235 port 22: Connection timed out
  ```

### 2.2 Teste de Conectividade de Rede (Porta 22 e ICMP Ping)
- **Comando:**
  ```powershell
  Test-NetConnection -ComputerName 72.60.249.235 -Port 22; ping 72.60.249.235
  ```
- **Exit Code:** `1`
- **Resultado Bruto:**
  ```text
  AVISO: TCP connect to (72.60.249.235 : 22) failed
  AVISO: Ping to 72.60.249.235 failed with status: TimedOut

  ComputerName           : 72.60.249.235
  RemoteAddress          : 72.60.249.235
  RemotePort             : 22
  InterfaceAlias         : Wi-Fi
  SourceAddress          : 192.168.1.103
  PingSucceeded          : False
  PingReplyDetails (RTT) : 0 ms
  TcpTestSucceeded       : False

  Disparando 72.60.249.235 com 32 bytes de dados:
  Esgotado o tempo limite do pedido.
  Esgotado o tempo limite do pedido.
  Esgotado o tempo limite do pedido.
  Esgotado o tempo limite do pedido.

  Estatísticas do Ping para 72.60.249.235:
      Pacotes: Enviados = 4, Recebidos = 0, Perdidos = 4 (100% de perda)
  ```

### 2.3 Varredura Abrangente de Portas na VPS
- **Portas Testadas:** 22 (SSH), 80 (HTTP), 443 (HTTPS), 3000 (Web), 3001 (API), 8000 (Alt), 8080 (Alt)
- **Resultado:**
  ```text
  Port 22: CLOSED/TIMEOUT (timed out)
  Port 80: CLOSED/TIMEOUT (timed out)
  Port 443: CLOSED/TIMEOUT (timed out)
  Port 3000: CLOSED/TIMEOUT (timed out)
  Port 3001: CLOSED/TIMEOUT (timed out)
  Port 8000: CLOSED/TIMEOUT (timed out)
  Port 8080: CLOSED/TIMEOUT (timed out)
  ```

### 2.4 Rota de Rastreamento de Pacotes (Traceroute)
- **Comando:**
  ```cmd
  tracert -d -w 1000 -h 15 72.60.249.235
  ```
- **Resultado:**
  ```text
    1     1 ms     1 ms     1 ms  192.168.1.1 
    2     1 ms     1 ms     1 ms  192.168.15.1 
    3     *        *        *     Esgotado o tempo limite do pedido.
    4     5 ms     5 ms     5 ms  201.1.227.6 
    5     *        *        *     Esgotado o tempo limite do pedido.
    6    22 ms     *        *     152.255.205.114 
    7     *        *        *     Esgotado o tempo limite do pedido.
    8    35 ms    35 ms    36 ms  200.25.56.18 
    9    31 ms    31 ms    31 ms  200.25.51.64 
   10    37 ms    33 ms    33 ms  200.25.51.134 
   11     *        *        *     Esgotado o tempo limite do pedido.
   12     *        *        *     Esgotado o tempo limite do pedido.
   13     *        *        *     Esgotado o tempo limite do pedido.
   14     *        *        *     Esgotado o tempo limite do pedido.
   15     *        *        *     Esgotado o tempo limite do pedido.
  ```
- **Diagnóstico:** O tráfego sai normalmente da rede local e atinge a infraestrutura do provedor de trânsito internacional (salto 10: `200.25.51.134`), mas é descartado/interrompido antes de atingir o destino final `72.60.249.235`.

### 2.5 Resolução DNS e Requisição HTTP Externa
- Domínios registrados:
  - `app.robersonsouza.com.br` -> `72.60.249.235`
  - `appapi.robersonsouza.com.br` -> `72.60.249.235`
- Requisição a `https://app.robersonsouza.com.br`:
  - **Resultado:** `Failed: <urlopen error timed out>`

---

## 3. Estado dos Recursos Protegidos

- **Containers de Produção:** Nenhuma operação pôde ser executada ou inspecionada devido à inacessibilidade do host.
- **Banco de Produção (`saudefinancas`):** Nenhuma alteração realizada (zero conexões, zero DDL/DML, zero comandos).
- **Diretório de Produção (`/data/saudefinancas`):** 100% intocado.
- **Salvaguarda / Backup:** O comando `pg_dump` não pôde ser disparado pois dependia da sessão SSH no host.
- **Ambiente de Staging:** Nenhum contêiner, volume ou rede foi criado na VPS.

---

## 4. Conclusão e Ações Recomendadas

Em cumprimento estrito à **Regra de Parada** do protocolo de homologação:
1. O processo foi **interrompido imediatamente**.
2. O status formal foi definido como **`G4.2 = BLOCKED`**, mantendo `G5 = BLOCKED`, `G6 = BLOCKED` e `G7 = BLOCKED`.
3. Recomenda-se verificar:
   - Se a máquina virtual na VPS (`72.60.249.235`) está ligada e operacional no painel do provedor (Hostinger/DigitalOcean/Hetzner/etc.).
   - Se o firewall de borda ou Security Group do provedor está bloqueando conexões de entrada ou requer autorização de IP (whitelist).
   - Se houve alteração recente no IP público da VPS ou na porta de escuta do serviço SSH.
