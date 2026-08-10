import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { MessageSenderService } from '../../whatsapp/services/message-sender.service';

@Injectable()
export class MedicationReminderCronService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MedicationReminderCronService.name);
  private timer: NodeJS.Timeout | null = null;

  // Track sent reminders in memory to avoid duplicate triggers within the same minute
  // Key format: `${medicationId}_${scheduleTime}_${YYYY-MM-DD}`
  private sentReminders = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly messageSender: MessageSenderService,
  ) {}

  onModuleInit() {
    this.logger.log('⏰ Inicializando serviço contínuo de Lembretes de Medicamentos via WhatsApp');
    // Rodar checagem a cada 30 segundos
    this.timer = setInterval(() => this.checkAndSendReminders(), 30000);
    // Rodar uma checagem inicial imediata após 3 segundos
    setTimeout(() => this.checkAndSendReminders(), 3000);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async checkAndSendReminders() {
    try {
      const now = new Date();

      // Obter horário atual em formato HH:mm (tanto no fuso de SP quanto no fuso local do servidor)
      const spTimeStr = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(now);

      const localTimeStr = now.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      const dateKey = now.toISOString().split('T')[0];
      const targetTimes = Array.from(new Set([spTimeStr, localTimeStr]));

      // Limpar registros de dias anteriores do Set para economizar memória
      if (this.sentReminders.size > 5000) {
        this.sentReminders.clear();
      }

      // Buscar todos os agendamentos ativos para os horários atuais
      const schedules = await this.prisma.medicationSchedule.findMany({
        where: {
          time: { in: targetTimes },
          notifyWhatsapp: true,
          medication: {
            isActive: true,
          },
        },
        include: {
          medication: {
            include: {
              user: true,
            },
          },
        },
      });

      for (const sched of schedules) {
        const med = sched.medication;
        const user = med.user;

        if (!user || !user.isActive) continue;

        const targetPhone = user.whatsappPhone || user.phone;
        if (!targetPhone) continue;

        const reminderKey = `${med.id}_${sched.time}_${dateKey}`;
        if (this.sentReminders.has(reminderKey)) {
          continue; // Já enviado hoje nesta janela de minuto
        }

        // Verificar se já foi tomado hoje
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const existingLog = await this.prisma.medicationIntakeLog.findFirst({
          where: {
            medicationId: med.id,
            createdAt: { gte: todayStart },
            status: 'TOMADO',
          },
        });

        if (existingLog) {
          this.sentReminders.add(reminderKey);
          continue; // Já foi tomado hoje!
        }

        // Marcar como enviado antes do disparo para evitar corrida
        this.sentReminders.add(reminderKey);

        const dosageStr = med.dosage ? `${med.dosage} ${med.unit || ''}`.trim() : '';
        const brandStr = med.brand ? ` (${med.brand})` : '';
        const instructionsStr = med.instructions ? `\n📝 *Instruções*: ${med.instructions}` : '';

        const textMessage = `💊 *Lembrete de Medicamento — Saúde & Finanças*\n\nOlá, *${user.name || 'Usuário'}*!\nEstá no horário de tomar o seu medicamento:\n\n🔹 *${med.name}*${brandStr}\n📏 *Dose*: ${dosageStr || '1 dose'}\n⏰ *Horário*: ${sched.time}${instructionsStr}\n\n✅ _Acesse a plataforma para marcar como tomado ou responder este aviso:_\nhttps://app.robersonsouza.com.br/medicamentos`;

        this.logger.log(`Disparando lembrete de medicamento "${med.name}" para ${user.email} (${targetPhone}) no horário ${sched.time}`);

        await this.messageSender.sendMessage(
          targetPhone,
          textMessage,
          user.uazapiInstance || undefined,
          user.uazapiToken || undefined,
        );
      }
    } catch (err: any) {
      this.logger.error(`Erro ao processar cron de lembretes de medicamentos: ${err.message}`, err.stack);
    }
  }

  /**
   * Disparo manual imediato para teste
   */
  async sendTestReminder(medicationId: string, userId: string) {
    const med = await this.prisma.medication.findFirst({
      where: { id: medicationId, userId },
      include: { user: true, schedules: true },
    });

    if (!med || !med.user) {
      return { success: false, message: 'Medicamento ou usuário não encontrado' };
    }

    const targetPhone = med.user.whatsappPhone || med.user.phone;
    if (!targetPhone) {
      return { success: false, message: 'Cadastre seu telefone de WhatsApp em Configurações antes de testar.' };
    }

    const dosageStr = med.dosage ? `${med.dosage} ${med.unit || ''}`.trim() : '';
    const brandStr = med.brand ? ` (${med.brand})` : '';
    const schedTime = med.schedules && med.schedules[0] ? med.schedules[0].time : '15:35';
    const instructionsStr = med.instructions ? `\n📝 *Instruções*: ${med.instructions}` : '';

    const testMessage = `🧪 *[TESTE] Lembrete de Medicamento — Saúde & Finanças*\n\nOlá, *${med.user.name || 'Usuário'}*!\nEste é um teste de lembrete em tempo real do seu medicamento:\n\n🔹 *${med.name}*${brandStr}\n📏 *Dose*: ${dosageStr || '1 dose'}\n⏰ *Horário Agendado*: ${schedTime}${instructionsStr}\n\n✨ _Se você recebeu esta mensagem, o sistema de lembretes automáticos por WhatsApp está 100% ativo!_`;

    return this.messageSender.sendMessage(
      targetPhone,
      testMessage,
      med.user.uazapiInstance || undefined,
      med.user.uazapiToken || undefined,
    );
  }
}
