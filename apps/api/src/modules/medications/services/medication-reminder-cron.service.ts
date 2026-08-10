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
      const dateKey = now.toISOString().split('T')[0];

      // Limpar registros antigos do Set para economizar memória
      if (this.sentReminders.size > 5000) {
        this.sentReminders.clear();
      }

      // Buscar todos os agendamentos ativos com notificação de WhatsApp ativada
      const schedules = await this.prisma.medicationSchedule.findMany({
        where: {
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

        // Tentar obter o horário atual no fuso horário do usuário, no fuso de SP e no fuso local do servidor
        const timezonesToTest = Array.from(new Set([
          user.timezone || 'America/Sao_Paulo',
          'America/Sao_Paulo',
          'America/Campo_Grande',
          'America/Cuiaba',
          'America/Manaus',
        ]));

        let matchedWindow = false;
        let detectedUserTime = '';

        for (const tz of timezonesToTest) {
          try {
            const timeParts = new Intl.DateTimeFormat('en-US', {
              timeZone: tz,
              hour: 'numeric',
              minute: 'numeric',
              hour12: false,
            }).formatToParts(now);

            const hourPart = timeParts.find((p) => p.type === 'hour')?.value || '0';
            const minPart = timeParts.find((p) => p.type === 'minute')?.value || '0';

            const nowHour = parseInt(hourPart, 10);
            const nowMin = parseInt(minPart, 10);

            // Parser do horário agendado "HH:mm"
            const [schedHourStr, schedMinStr] = (sched.time || '00:00').split(':');
            const schedHour = parseInt(schedHourStr, 10);
            const schedMin = parseInt(schedMinStr, 10);

            const nowTotalMin = nowHour * 60 + nowMin;
            const schedTotalMin = schedHour * 60 + schedMin;

            let diffMin = nowTotalMin - schedTotalMin;
            if (diffMin < -1400) diffMin += 1440; // Virada de meia noite

            // Tolera janela de 0 a 4 minutos para garantir entrega mesmo com pequenas variações de relógio
            if (diffMin >= 0 && diffMin <= 4) {
              matchedWindow = true;
              detectedUserTime = `${hourPart.padStart(2, '0')}:${minPart.padStart(2, '0')}`;
              break;
            }
          } catch (e) {
            // Fuso inválido, continua testando
          }
        }

        // Se não casar com nenhuma janela de horário nos fusos testados, pula
        if (!matchedWindow) {
          continue;
        }

        const reminderKey = `${med.id}_${sched.time}_${dateKey}`;
        if (this.sentReminders.has(reminderKey)) {
          continue; // Já enviado hoje nesta janela
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

        // Marcar como enviado antes do disparo para evitar corrida de execuções
        this.sentReminders.add(reminderKey);

        const dosageStr = med.dosage ? `${med.dosage} ${med.unit || ''}`.trim() : '';
        const brandStr = med.brand ? ` (${med.brand})` : '';
        const instructionsStr = med.instructions ? `\n📝 *Instruções*: ${med.instructions}` : '';

        const textMessage = `💊 *Lembrete de Medicamento — Saúde & Finanças*\n\nOlá, *${user.name || 'Usuário'}*!\nEstá no horário de tomar o seu medicamento:\n\n🔹 *${med.name}*${brandStr}\n📏 *Dose*: ${dosageStr || '1 dose'}\n⏰ *Horário Agendado*: ${sched.time} (Horário Atual: ${detectedUserTime})${instructionsStr}\n\n✅ _Acesse a plataforma para marcar como tomado ou responder este aviso:_\nhttps://app.robersonsouza.com.br/medicamentos`;

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
