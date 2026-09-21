import { describe, it, expect } from 'vitest';
import { FitWorkerSupervisorService, FitParserTimeoutError } from '../../src/modules/wearables/services/fit-worker-supervisor.service';
import { Encoder } from '@garmin/fitsdk';

function createSampleFitBuffer(): Buffer {
  const encoder = new Encoder();
  encoder.writeMesg({
    mesgNum: 0,
    serialNumber: 970002,
    timeCreated: new Date('2026-09-21T07:00:00Z'),
    manufacturer: 'garmin',
    product: 970,
    type: 'activity',
  } as any);
  encoder.writeMesg({
    mesgNum: 18,
    timestamp: new Date('2026-09-21T07:45:00Z'),
    startTime: new Date('2026-09-21T07:00:00Z'),
    sport: 'running',
    subSport: 'trail',
    totalElapsedTime: 2700,
    totalTimerTime: 2700,
    totalDistance: 7500,
    avgSpeed: 2.77,
    avgHeartRate: 158,
    maxHeartRate: 178,
    totalCalories: 580,
  } as any);
  return Buffer.from(encoder.close());
}

describe('FitWorkerSupervisorService', () => {
  const supervisor = new FitWorkerSupervisorService();

  it('deve processar com sucesso um arquivo FIT válido dentro do tempo limite', async () => {
    const buffer = createSampleFitBuffer();
    const result = await supervisor.parseWithSupervisor(buffer, 10000);

    expect(result).toBeDefined();
    expect(result.sessionMesgs.length).toBe(1);
    expect(result.sessionMesgs[0].sport).toBe('running');
    expect(result.sessionMesgs[0].totalDistance).toBe(7500);
  });

  it('deve interromper via worker.terminate() e rejeitar com PARSER_TIMEOUT quando o tempo limite for excedido', async () => {
    const buffer = createSampleFitBuffer();
    // Timeout artificialmente baixo de 1ms para forçar a ação do supervisor
    await expect(supervisor.parseWithSupervisor(buffer, 1)).rejects.toThrow(FitParserTimeoutError);
  });
});
