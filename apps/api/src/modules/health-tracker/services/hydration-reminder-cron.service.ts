import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { MessageSenderService } from '../../whatsapp/services/message-sender.service';

@Injectable()
export class HydrationReminderCronService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HydrationReminderCronService.name);
  private timer: NodeJS.Timeout | null = null;
  private lastReminderSentMap = new Map<string, Date>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly messageSender: MessageSenderService,
  ) {}

  onModuleInit() {
    this.logger.log('💧 Inicializando serviço de Lembretes de Hidratação Inteligente via WhatsApp');
    // Rodar verificação a cada 60 segundos
    this.timer = setInterval(() => this.checkAndSendHydrationReminders(), 60000);
    // Verificação inicial após 10 segundos
    setTimeout(() => this.checkAndSendHydrationReminders(), 10000);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async checkAndSendHydrationReminders() {
    try {
      const now = new Date();
      const todayDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

      // Buscar todas as configurações de hidratação ativas
      const settings = await this.prisma.hydrationSetting.findMany({
        where: {
          notifyWhatsapp: true,
          user: {
            isActive: true,
          },
        },
        include: {
          user: true,
        },
      });

      for (const setting of settings) {
        const user = setting.user;
        if (!user || !user.isActive) continue;

        const targetPhone = user.whatsappPhone || user.phone;
        if (!targetPhone) continue;

        // Horário atual no fuso horário do usuário (ou SP)
        const userTz = user.timezone || 'America/Sao_Paulo';
        let currentHour = 12;
        try {
          const hourStr = new Intl.DateTimeFormat('en-US', {
            timeZone: userTz,
            hour: 'numeric',
            hour12: false,
          }).format(now);
          currentHour = parseInt(hourStr, 10);
        } catch (e) {
          currentHour = now.getHours();
        }

        // Respeitar horário de início (default 8) e fim (default 21 - limite 21h)
        const start = setting.startHour ?? 8;
        const end = Math.min(21, setting.endHour ?? 21); // limite 21h

        if (currentHour < start || currentHour >= end) {
          continue; // Fora do janela de funcionamento
        }

        // Buscar log de saúde de hoje
        const todayLog = await this.prisma.dailyHealthLog.findUnique({
          where: {
            userId_date: {
              userId: user.id,
              date: todayDate,
            },
          },
        });

        const waterIntakeMl = todayLog?.waterIntakeMl || 0;
        const waterGoalMl = todayLog?.waterGoalMl || setting.dailyGoalMl || 2500;

        // Se já atingiu a meta do dia, não envia mais lembretes!
        if (waterIntakeMl >= waterGoalMl) {
          continue;
        }

        // Verificar intervalo configurado pelo usuário (em minutos, ex: 90)
        const intervalMinutes = setting.reminderInterval || 90;
        const lastSent = this.lastReminderSentMap.get(user.id);

        if (lastSent) {
          const diffMinutes = (now.getTime() - lastSent.getTime()) / (1000 * 60);
          if (diffMinutes < intervalMinutes) {
            continue; // Ainda não passou o intervalo necessário
          }
        }

        // Atualizar timestamp do último envio
        this.lastReminderSentMap.set(user.id, now);

        const currentLiters = (waterIntakeMl / 1000).toFixed(2);
        const goalLiters = (waterGoalMl / 1000).toFixed(2);
        const remainingMl = waterGoalMl - waterIntakeMl;
        const remainingLiters = (remainingMl / 1000).toFixed(2);
        const progressPct = Math.round((waterIntakeMl / waterGoalMl) * 100);

        const messageText = `💧 *Lembrete de Hidratação — Saúde & Finanças*\n\nOlá, *${user.name || 'Usuário'}*! Está na hora de tomar água! 🥤\n\n📊 *Seu Progresso Hoje*: ${currentLiters} L de ${goalLiters} L (${progressPct}%)\n🎯 *Faltam*: ${remainingLiters} L para atingir sua meta diária!\n\n💡 *Recomendação OMS*: Tomar porções fracionadas de 250ml a 350ml melhora sua disposição, metabolismo e foco mental.\n\n✅ _Registre rápida com 1 clique:_\nhttps://app.robersonsouza.com.br/saude`;

        this.logger.log(`Disparando lembrete de hidratação para ${user.email} (${targetPhone}) - Progresso: ${waterIntakeMl}/${waterGoalMl}ml`);

        await this.messageSender.sendMessage(
          targetPhone,
          messageText,
          user.uazapiInstance || undefined,
          user.uazapiToken || undefined,
        );
      }
    } catch (err: any) {
      this.logger.error(`Erro no cron de lembretes de hidratação: ${err.message}`, err.stack);
    }
  }
}
