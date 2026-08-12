import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CategorizerService } from './categorizer.service';

/**
 * Mapeamento de métodos de pagamento da Pluggy para o enum PaymentMethod do Prisma.
 * A Pluggy pode retornar valores como "TRANSFER", "pix", "CREDIT", etc.
 * que NÃO correspondem diretamente ao enum do Prisma.
 */
const PLUGGY_PAYMENT_METHOD_MAP: Record<string, string> = {
  // Mapeamentos exatos Pluggy -> Prisma
  'CREDIT_CARD': 'CREDIT_CARD',
  'CREDIT': 'CREDIT_CARD',
  'CREDITO': 'CREDIT_CARD',
  'CARTAO_CREDITO': 'CREDIT_CARD',
  'CARTÃO_CRÉDITO': 'CREDIT_CARD',
  'DEBIT_CARD': 'DEBIT_CARD',
  'DEBIT': 'DEBIT_CARD',
  'DEBITO': 'DEBIT_CARD',
  'CARTAO_DEBITO': 'DEBIT_CARD',
  'CARTÃO_DÉBITO': 'DEBIT_CARD',
  'PIX': 'PIX',
  'CASH': 'CASH',
  'DINHEIRO': 'CASH',
  'BANK_TRANSFER': 'BANK_TRANSFER',
  'TRANSFER': 'BANK_TRANSFER',
  'TRANSFERENCIA': 'BANK_TRANSFER',
  'TRANSFERÊNCIA': 'BANK_TRANSFER',
  'TED': 'BANK_TRANSFER',
  'DOC': 'BANK_TRANSFER',
  'WIRE': 'BANK_TRANSFER',
  'BOLETO': 'BOLETO',
  'BILLET': 'BOLETO',
  'OTHER': 'OTHER',
  'OUTROS': 'OTHER',
};

function normalizePluggyPaymentMethod(pluggyMethod?: string): string {
  if (!pluggyMethod) return 'OTHER';
  const upper = pluggyMethod.toUpperCase().trim();
  return PLUGGY_PAYMENT_METHOD_MAP[upper] || 'OTHER';
}

@Injectable()
export class OpenFinanceService {
  private readonly logger = new Logger(OpenFinanceService.name);
  private readonly baseUrl = 'https://api.pluggy.ai';

  constructor(
    private readonly prisma: PrismaService,
    private readonly categorizer: CategorizerService,
  ) {}

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
   * Registra a nova conexão após sucesso no Widget Pluggy Connect.
   * Aguarda a sincronização inicial completar antes de retornar.
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

    // Sincronização inicial - executa e aguarda (não mais fire-and-forget)
    // para que o frontend receba os dados ao chamar fetchData() logo após
    try {
      const syncResult = await this.syncItem(userId, connection.id);
      this.logger.log(`Sincronização inicial concluída para item ${payload.itemId}: ${JSON.stringify(syncResult)}`);
      return { ...connection, syncResult };
    } catch (err) {
      this.logger.error(`Erro na sincronização inicial do item ${payload.itemId}:`, err);
      // Retorna a conexão mesmo com erro na sync, para não quebrar o fluxo
      return { ...connection, syncError: 'Sincronização inicial falhou, tente novamente.' };
    }
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
    this.logger.log(`[SYNC] Iniciando sync do item ${connection.itemId} para userId=${userId}`);

    // 1. Busca Contas do Item
    this.logger.log(`[SYNC] Buscando contas na Pluggy para itemId=${connection.itemId}...`);
    const accountsRes = await fetch(`${this.baseUrl}/accounts?itemId=${connection.itemId}`, {
      headers: { 'X-API-KEY': apiKey },
    });

    if (!accountsRes.ok) {
      const errText = await accountsRes.text();
      this.logger.error(`[SYNC] Erro ao buscar contas na Pluggy (status=${accountsRes.status}): ${errText}`);
      throw new Error(`Erro ao buscar contas na Pluggy: ${errText}`);
    }

    const accountsData = await accountsRes.json();
    const pluggyAccounts = accountsData.results || [];
    this.logger.log(`[SYNC] Pluggy retornou ${pluggyAccounts.length} conta(s) para o item ${connection.itemId}`);

    const syncedAccounts = [];
    const accountMapByPluggyId: Record<string, any> = {};
    let createdTransactionsCount = 0;
    let skippedTransactionsCount = 0;
    let errorTransactionsCount = 0;

    for (const pAcc of pluggyAccounts) {
      this.logger.log(`[SYNC] Processando conta Pluggy: id=${pAcc.id}, name=${pAcc.name}, type=${pAcc.type}, balance=${pAcc.balance}`);
      
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
        this.logger.log(`[SYNC] Conta atualizada: ${paymentAcc.id} (${paymentAcc.name})`);
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
        this.logger.log(`[SYNC] Nova conta criada: ${paymentAcc.id} (${paymentAcc.name})`);
      }
      syncedAccounts.push(paymentAcc);
      accountMapByPluggyId[pAcc.id] = paymentAcc;
    }

    // 2. Busca Transações por Item (todas as contas e cartões de uma só vez)
    this.logger.log(`[SYNC] Buscando transações por itemId ${connection.itemId} na Pluggy...`);
    let pluggyTransactions: any[] = [];
    
    let txRes = await fetch(`${this.baseUrl}/transactions?itemId=${connection.itemId}&pageSize=500`, {
      headers: { 'X-API-KEY': apiKey },
    });

    if (txRes.ok) {
      const txData = await txRes.json();
      pluggyTransactions = txData.results || [];
      this.logger.log(`[SYNC] Pluggy retornou ${pluggyTransactions.length} transações para o item ${connection.itemId}`);
    } else {
      const errText = await txRes.text();
      this.logger.warn(`[SYNC] Busca por itemId falhou (status=${txRes.status}): ${errText}. Tentando por conta individual...`);
    }

    // Fallback por conta individual se a busca por itemId retornar 0 ou falhar
    if (pluggyTransactions.length === 0) {
      for (const pAcc of pluggyAccounts) {
        this.logger.log(`[SYNC] Fallback: buscando transações para accountId=${pAcc.id}...`);
        const singleTxRes = await fetch(`${this.baseUrl}/transactions?accountId=${pAcc.id}&pageSize=500`, {
          headers: { 'X-API-KEY': apiKey },
        });
        if (singleTxRes.ok) {
          const singleData = await singleTxRes.json();
          if (singleData.results && singleData.results.length > 0) {
            this.logger.log(`[SYNC] Fallback accountId=${pAcc.id}: ${singleData.results.length} transações encontradas`);
            pluggyTransactions.push(...singleData.results);
          } else {
            this.logger.log(`[SYNC] Fallback accountId=${pAcc.id}: 0 transações`);
          }
        } else {
          const errText = await singleTxRes.text();
          this.logger.warn(`[SYNC] Fallback accountId=${pAcc.id} falhou (status=${singleTxRes.status}): ${errText}`);
        }
      }
      this.logger.log(`[SYNC] Busca fallback total: ${pluggyTransactions.length} transações.`);
    }

    // 3. Processa e salva todas as transações importadas
    this.logger.log(`[SYNC] Processando ${pluggyTransactions.length} transações...`);
    for (const pTx of pluggyTransactions) {
      try {
        const targetPaymentAcc = accountMapByPluggyId[pTx.accountId] || syncedAccounts[0];
        if (!targetPaymentAcc) {
          this.logger.warn(`[SYNC] Transação ignorada - sem conta correspondente. accountId=${pTx.accountId}, desc="${pTx.description}"`);
          skippedTransactionsCount++;
          continue;
        }

        const txAmount = Math.abs(pTx.amount || 0);
        const txType = (pTx.amount || 0) < 0 ? 'EXPENSE' : 'INCOME';
        const txDate = pTx.date ? new Date(pTx.date) : new Date();
        const txDescription = (pTx.description || pTx.merchant?.name || 'Transação Pluggy').trim();

        // Normaliza o método de pagamento da Pluggy para o enum do Prisma
        const rawPluggyMethod = pTx.paymentData?.paymentMethod;
        const normalizedPaymentMethod = normalizePluggyPaymentMethod(rawPluggyMethod);

        const existingTx = await this.prisma.transaction.findFirst({
          where: {
            userId,
            paymentAccountId: targetPaymentAcc.id,
            amount: txAmount,
            date: txDate,
            description: txDescription,
          },
        });

        if (existingTx) {
          skippedTransactionsCount++;
          continue;
        }

        let categoryId: string | undefined;
        try {
          const catResult = await this.categorizer.categorizeDescription(txDescription, userId);
          let category = await this.prisma.transactionCategory.findFirst({
            where: { name: catResult.category },
          });
          if (!category) {
            category = await this.prisma.transactionCategory.create({
              data: {
                name: catResult.category,
                type: txType,
                color: catResult.color || '#3b82f6',
                icon: catResult.icon || 'Tag',
              },
            });
          }
          categoryId = category.id;
        } catch (catErr) {
          this.logger.warn(`[SYNC] Erro ao categorizar '${txDescription}' (continuando sem categoria):`, catErr);
        }

        await this.prisma.transaction.create({
          data: {
            userId,
            paymentAccountId: targetPaymentAcc.id,
            type: txType,
            amount: txAmount,
            date: txDate,
            description: txDescription,
            paymentMethod: normalizedPaymentMethod as any,
            categoryId,
          },
        });
        createdTransactionsCount++;
      } catch (txErr: any) {
        errorTransactionsCount++;
        this.logger.error(
          `[SYNC] ❌ Erro ao salvar transação Pluggy: desc="${pTx.description}", amount=${pTx.amount}, date=${pTx.date}, accountId=${pTx.accountId}, paymentMethod=${pTx.paymentData?.paymentMethod}. Erro: ${txErr.message || txErr}`,
        );
      }
    }

    this.logger.log(
      `[SYNC] ✅ Sync concluído para item ${connection.itemId}: ` +
      `${createdTransactionsCount} criadas, ${skippedTransactionsCount} existentes/ignoradas, ${errorTransactionsCount} erros`,
    );

    await this.prisma.openFinanceConnection.update({
      where: { id: connection.id },
      data: { status: 'CONNECTED', lastSyncAt: new Date() },
    });

    return {
      success: true,
      syncedAccountsCount: syncedAccounts.length,
      createdTransactionsCount,
      skippedTransactionsCount,
      errorTransactionsCount,
    };
  }

  /**
   * Sincroniza todas as conexões (bancos e cartões) do usuário de uma só vez
   */
  async syncAllUserItems(userId: string) {
    const connections = await this.prisma.openFinanceConnection.findMany({
      where: { userId },
    });

    this.logger.log(`[SYNC-ALL] Iniciando sync de ${connections.length} conexões para userId=${userId}`);

    let totalSynced = 0;
    let totalCreated = 0;
    let totalErrors = 0;
    for (const conn of connections) {
      try {
        const res = await this.syncItem(userId, conn.id);
        if (res.syncedAccountsCount) totalSynced += res.syncedAccountsCount;
        if (res.createdTransactionsCount) totalCreated += res.createdTransactionsCount;
        if (res.errorTransactionsCount) totalErrors += res.errorTransactionsCount;
      } catch (err) {
        this.logger.error(`[SYNC-ALL] Erro ao sincronizar conexão ${conn.itemId}:`, err);
      }
    }

    this.logger.log(
      `[SYNC-ALL] ✅ Completo: ${connections.length} conexões, ${totalSynced} contas, ${totalCreated} transações criadas, ${totalErrors} erros`,
    );

    return {
      success: true,
      connectionsCount: connections.length,
      syncedAccountsCount: totalSynced,
      createdTransactionsCount: totalCreated,
      errorTransactionsCount: totalErrors,
    };
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
