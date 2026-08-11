import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class OpenFinanceService {
  private readonly logger = new Logger(OpenFinanceService.name);
  private readonly baseUrl = 'https://api.pluggy.ai';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtém a API Key de autenticação da Pluggy usando CLIENT_ID e CLIENT_SECRET
   */
  private async getPluggyApiKey(): Promise<string> {
    const clientId = process.env.PLUGGY_CLIENT_ID;
    const clientSecret = process.env.PLUGGY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new BadRequestException('PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET não estão configurados no arquivo .env.');
    }

    try {
      const res = await fetch(`${this.baseUrl}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, clientSecret }),
      });

      if (!res.ok) {
        const errText = await res.text();
        this.logger.error(`Erro ao autenticar na Pluggy: ${errText}`);
        throw new BadRequestException('Falha ao autenticar na API da Pluggy. Verifique suas credenciais.');
      }

      const data = await res.json();
      return data.apiKey;
    } catch (err: any) {
      this.logger.error('Erro na autenticação da Pluggy', err);
      throw new BadRequestException(err.message || 'Erro ao conectar à API da Pluggy.');
    }
  }

  /**
   * Gera um Connect Token de curta duração para o widget do frontend (Pluggy Connect)
   */
  async createConnectToken(userId: string, itemId?: string) {
    const apiKey = await this.getPluggyApiKey();

    try {
      const res = await fetch(`${this.baseUrl}/connect_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': apiKey,
        },
        body: JSON.stringify({
          itemId: itemId || undefined,
          clientUserId: userId,
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();
      return { connectToken: data.accessToken };
    } catch (err: any) {
      this.logger.error('Erro ao gerar Connect Token na Pluggy', err);
      throw new BadRequestException('Falha ao gerar o token de conexão do Open Finance.');
    }
  }

  /**
   * Retorna o status de integração do Open Finance
   */
  async getStatus(userId: string) {
    const hasPluggy = !!(process.env.PLUGGY_CLIENT_ID && process.env.PLUGGY_CLIENT_SECRET);

    const connections = await this.prisma.openFinanceConnection.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      configured: hasPluggy,
      provider: 'PLUGGY',
      connections,
    };
  }

  /**
   * Registra a nova conexão após sucesso no Widget Pluggy Connect
   */
  async connectWidget(userId: string, payload: { itemId: string; institutionName?: string }) {
    if (!payload.itemId) {
      throw new BadRequestException('Item ID é obrigatório.');
    }

    const existing = await this.prisma.openFinanceConnection.findFirst({
      where: { userId, itemId: payload.itemId },
    });

    let connection;
    if (existing) {
      connection = await this.prisma.openFinanceConnection.update({
        where: { id: existing.id },
        data: {
          status: 'CONNECTED',
          institutionName: payload.institutionName || existing.institutionName,
          lastSyncAt: new Date(),
        },
      });
    } else {
      connection = await this.prisma.openFinanceConnection.create({
        data: {
          userId,
          provider: 'PLUGGY',
          itemId: payload.itemId,
          institutionName: payload.institutionName || 'Banco Conectado (Pluggy)',
          status: 'CONNECTED',
          lastSyncAt: new Date(),
        },
      });
    }

    // Dispara sincronização inicial em segundo plano
    this.syncItem(userId, connection.id).catch((err) => {
      this.logger.error(`Erro na sincronização inicial do item ${payload.itemId}:`, err);
    });

    return connection;
  }

  /**
   * Sincroniza contas bancárias e transações do Item Pluggy para o sistema
   */
  async syncItem(userId: string, connectionId: string) {
    const connection = await this.prisma.openFinanceConnection.findFirst({
      where: { id: connectionId, userId },
    });

    if (!connection) {
      throw new NotFoundException('Conexão Open Finance não encontrada.');
    }

    const apiKey = await this.getPluggyApiKey();

    // 1. Busca Contas do Item
    const accountsRes = await fetch(`${this.baseUrl}/accounts?itemId=${connection.itemId}`, {
      headers: { 'X-API-KEY': apiKey },
    });

    if (!accountsRes.ok) {
      throw new Error(`Erro ao buscar contas na Pluggy: ${await accountsRes.text()}`);
    }

    const accountsData = await accountsRes.json();
    const pluggyAccounts = accountsData.results || [];

    const syncedAccounts = [];

    for (const pAcc of pluggyAccounts) {
      // Mapeia tipo de conta
      let accType: any = 'CHECKING';
      if (pAcc.type === 'SAVINGS') accType = 'SAVINGS';
      else if (pAcc.type === 'CREDIT') accType = 'DIGITAL_WALLET';

      // Upsert na tabela PaymentAccount
      const existingAcc = await this.prisma.paymentAccount.findFirst({
        where: { userId, openFinanceItemId: pAcc.id },
      });

      let paymentAcc;
      if (existingAcc) {
        paymentAcc = await this.prisma.paymentAccount.update({
          where: { id: existingAcc.id },
          data: {
            balance: pAcc.balance || 0,
            name: `${pAcc.name} (${connection.institutionName})`,
            bankName: connection.institutionName,
            lastSyncedAt: new Date(),
          },
        });
      } else {
        paymentAcc = await this.prisma.paymentAccount.create({
          data: {
            userId,
            name: `${pAcc.name} (${connection.institutionName})`,
            bankName: connection.institutionName,
            accountType: accType,
            balance: pAcc.balance || 0,
            openFinanceProvider: 'PLUGGY',
            openFinanceItemId: pAcc.id,
            lastSyncedAt: new Date(),
          },
        });
      }
      syncedAccounts.push(paymentAcc);

      // 2. Busca Transações dos últimos 30 dias para essa conta
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const fromStr = thirtyDaysAgo.toISOString().split('T')[0];

      const txRes = await fetch(`${this.baseUrl}/transactions?accountId=${pAcc.id}&from=${fromStr}`, {
        headers: { 'X-API-KEY': apiKey },
      });

      if (txRes.ok) {
        const txData = await txRes.json();
        const pluggyTransactions = txData.results || [];

        for (const pTx of pluggyTransactions) {
          const txAmount = Math.abs(pTx.amount);
          const txType = pTx.amount < 0 ? 'EXPENSE' : 'INCOME';
          const txDate = new Date(pTx.date);

          // Verifica se a transação já foi importada
          const existingTx = await this.prisma.transaction.findFirst({
            where: {
              userId,
              paymentAccountId: paymentAcc.id,
              amount: txAmount,
              date: txDate,
              description: pTx.description,
            },
          });

          if (!existingTx) {
            await this.prisma.transaction.create({
              data: {
                userId,
                paymentAccountId: paymentAcc.id,
                type: txType,
                amount: txAmount,
                date: txDate,
                description: pTx.description || 'Transação Pluggy',
                paymentMethod: 'PIX',
              },
            });
          }
        }
      }
    }

    // Atualiza status da conexão
    await this.prisma.openFinanceConnection.update({
      where: { id: connection.id },
      data: { status: 'CONNECTED', lastSyncAt: new Date() },
    });

    return { success: true, syncedAccountsCount: syncedAccounts.length };
  }

  /**
   * Processador de Webhooks da Pluggy
   */
  async handleWebhook(payload: any) {
    this.logger.log('Webhook recebido da Pluggy:', JSON.stringify(payload));
    const { event, itemId } = payload;

    if (itemId && (event === 'item/updated' || event === 'transactions/created')) {
      const connection = await this.prisma.openFinanceConnection.findFirst({
        where: { itemId },
      });

      if (connection) {
        await this.syncItem(connection.userId, connection.id);
      }
    }

    return { received: true };
  }
}
