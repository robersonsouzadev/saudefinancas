import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class OpenFinanceService {
  private readonly logger = new Logger(OpenFinanceService.name);
  private readonly baseUrl = 'https://api.pluggy.ai';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtém a API Key de autenticação da Pluggy.
   * Dá prioridade às credenciais individuais salvas no perfil do Usuário.
   * Se o usuário não configurou credenciais próprias, usa as credenciais globais do .env.
   */
  private async getPluggyApiKey(userId?: string): Promise<string> {
    let clientId = process.env.PLUGGY_CLIENT_ID;
    let clientSecret = process.env.PLUGGY_CLIENT_SECRET;

    // Se informado userId, busca se o usuário possui chaves próprias (BYOK - Bring Your Own Key)
    if (userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user?.pluggyClientId && user?.pluggyClientSecret) {
        clientId = user.pluggyClientId;
        clientSecret = user.pluggyClientSecret;
      }
    }

    if (!clientId || !clientSecret) {
      if (process.env.PLUGGY_API_KEY) {
        return process.env.PLUGGY_API_KEY;
      }
      throw new BadRequestException('Credenciais da Pluggy (Client ID / Client Secret) não configuradas.');
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
        throw new BadRequestException('Falha ao autenticar na Pluggy. Verifique o Client ID e Client Secret informados.');
      }

      const data = await res.json();
      return data.apiKey;
    } catch (err: any) {
      this.logger.error('Erro na autenticação da Pluggy', err);
      throw new BadRequestException(err.message || 'Erro ao conectar à API da Pluggy.');
    }
  }

  /**
   * Retorna se o usuário tem chaves configuradas (individuais ou globais)
   */
  async getUserCredentials(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const hasUserKeys = !!(user?.pluggyClientId && user?.pluggyClientSecret);
    const hasGlobalKeys = !!(process.env.PLUGGY_CLIENT_ID && process.env.PLUGGY_CLIENT_SECRET) || !!process.env.PLUGGY_API_KEY;

    return {
      configured: hasUserKeys || hasGlobalKeys,
      hasCustomKeys: hasUserKeys,
      pluggyClientId: user?.pluggyClientId || null,
    };
  }

  /**
   * Salva ou atualiza as chaves individuais da Pluggy do usuário
   */
  async saveUserCredentials(userId: string, clientId: string, clientSecret: string) {
    if (!clientId || !clientSecret) {
      throw new BadRequestException('Client ID e Client Secret são obrigatórios.');
    }

    // Salva temporariamente e valida se as chaves funcionam
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        pluggyClientId: clientId.trim(),
        pluggyClientSecret: clientSecret.trim(),
      },
    });

    try {
      // Testa se a autenticação funciona com as novas chaves
      await this.getPluggyApiKey(userId);
    } catch (err) {
      // Se falhar, reverte
      await this.prisma.user.update({
        where: { id: userId },
        data: { pluggyClientId: null, pluggyClientSecret: null },
      });
      throw new BadRequestException('Chaves da Pluggy inválidas. Verifique o Client ID e Client Secret digitados.');
    }

    return { success: true, message: 'Credenciais da Pluggy salvas e validadas com sucesso!' };
  }

  /**
   * Gera um Connect Token de curta duração para o widget do frontend (Pluggy Connect)
   */
  async createConnectToken(userId: string, itemId?: string) {
    const apiKey = await this.getPluggyApiKey(userId);

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
   * Retorna o status de integração do Open Finance do usuário
   */
  async getStatus(userId: string) {
    const creds = await this.getUserCredentials(userId);

    const connections = await this.prisma.openFinanceConnection.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      configured: creds.configured,
      hasCustomKeys: creds.hasCustomKeys,
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
   * Sincroniza contas bancárias e transações do Item Pluggy para a conta do Usuário
   */
  async syncItem(userId: string, connectionId: string) {
    const connection = await this.prisma.openFinanceConnection.findFirst({
      where: { id: connectionId, userId },
    });

    if (!connection) {
      throw new NotFoundException('Conexão Open Finance não encontrada.');
    }

    const apiKey = await this.getPluggyApiKey(userId);

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
      let accType: any = 'CHECKING';
      if (pAcc.type === 'SAVINGS') accType = 'SAVINGS';
      else if (pAcc.type === 'CREDIT') accType = 'DIGITAL_WALLET';

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
