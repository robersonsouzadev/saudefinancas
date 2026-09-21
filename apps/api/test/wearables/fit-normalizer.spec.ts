import { describe, it, expect } from 'vitest';
import { FitNormalizerService } from '../../src/modules/wearables/services/fit-normalizer.service';
import { SportCategory } from '@prisma/client';

describe('FitNormalizerService', () => {
  const normalizer = new FitNormalizerService();

  it('deve calcular corretamente timezone America/Campo_Grande (Dourados/MS, UTC-4) e offset -240', () => {
    // 21 de Setembro de 2026 às 14:00 UTC = 10:00 em Dourados/MS
    const utcDate = new Date('2026-09-21T14:00:00Z');

    const decodedMock = {
      sessionMesgs: [{
        startTime: utcDate,
        timestamp: new Date('2026-09-21T15:00:00Z'),
        sport: 'running',
        totalElapsedTime: 3600,
        totalDistance: 10000,
      }],
      lapMesgs: [],
      recordMesgs: [],
      setMesgs: [],
      fileIdMesgs: [],
      deviceInfoMesgs: [{ manufacturer: 'garmin', productName: 'Forerunner 970' }],
      sportMesgs: [],
      errors: [],
    };

    const result = normalizer.normalize(decodedMock, 'America/Campo_Grande', false);

    expect(result.length).toBe(1);
    const act = result[0];
    expect(act.timezone).toBe('America/Campo_Grande');
    expect(act.timezoneOffsetMinutes).toBe(-240);
    expect(act.localDate).toBe('2026-09-21');
    expect(act.timezoneConfirmed).toBe(true);
    expect(act.deviceModel).toBe('Forerunner 970');
  });

  it('deve manter localDate ancorado estritamente no horário inicial para atividades que cruzam a meia-noite', () => {
    // Treino iniciando às 23:45 do dia 20 e terminando à 01:15 do dia 21 (em Dourados/MS)
    // 23:45 Campo Grande (UTC-4) = 03:45 UTC do dia 21
    const startedAtUtc = new Date('2026-09-21T03:45:00Z'); // 23:45 em Campo Grande do dia 20/09
    const finishedAtUtc = new Date('2026-09-21T05:15:00Z'); // 01:15 em Campo Grande do dia 21/09

    const decodedMock = {
      sessionMesgs: [{
        startTime: startedAtUtc,
        timestamp: finishedAtUtc,
        sport: 'cycling',
        totalElapsedTime: 5400,
        totalDistance: 35000,
      }],
      lapMesgs: [],
      recordMesgs: [],
      setMesgs: [],
      fileIdMesgs: [],
      deviceInfoMesgs: [],
      sportMesgs: [],
      errors: [],
    };

    const result = normalizer.normalize(decodedMock, 'America/Campo_Grande', false);
    const act = result[0];

    // O localDate deve ser 2026-09-20 (data de início local)
    expect(act.localDate).toBe('2026-09-20');
    expect(act.sportCategory).toBe(SportCategory.CYCLING);
  });

  it('deve descartar coordenadas GPS quando hasLocationConsent for falso', () => {
    const startTime = new Date('2026-09-21T10:00:00Z');
    // Coordenadas em semicírculos para Dourados/MS (~ -22.22, -54.80)
    const latSemicircles = Math.round((-22.22 * 2147483648) / 180);
    const lonSemicircles = Math.round((-54.80 * 2147483648) / 180);

    const decodedMock = {
      sessionMesgs: [{ startTime, totalElapsedTime: 60, sport: 'running' }],
      lapMesgs: [],
      recordMesgs: [
        { timestamp: startTime, heartRate: 145, positionLat: latSemicircles, positionLong: lonSemicircles },
        { timestamp: new Date(startTime.getTime() + 5000), heartRate: 150, positionLat: latSemicircles, positionLong: lonSemicircles },
      ],
      setMesgs: [],
      fileIdMesgs: [],
      deviceInfoMesgs: [],
      sportMesgs: [],
      errors: [],
    };

    // Sem consentimento de GPS
    const resultWithoutConsent = normalizer.normalize(decodedMock, 'America/Campo_Grande', false);
    expect(resultWithoutConsent[0].telemetry.hasLocationData).toBe(false);
    expect(resultWithoutConsent[0].telemetry.samples[0].lat).toBeUndefined();
    expect(resultWithoutConsent[0].telemetry.samples[0].lon).toBeUndefined();
    expect(resultWithoutConsent[0].telemetry.samples[0].hr).toBe(145);

    // Com consentimento de GPS
    const resultWithConsent = normalizer.normalize(decodedMock, 'America/Campo_Grande', true);
    expect(resultWithConsent[0].telemetry.hasLocationData).toBe(true);
    expect(resultWithConsent[0].telemetry.samples[0].lat).toBeCloseTo(-22.22, 1);
    expect(resultWithConsent[0].telemetry.samples[0].lon).toBeCloseTo(-54.80, 1);
  });

  it('deve suportar múltiplas sessões no mesmo arquivo FIT (ex: Triatlo com N sessões)', () => {
    const t0 = new Date('2026-09-21T08:00:00Z');
    const t1 = new Date('2026-09-21T08:30:00Z');
    const t2 = new Date('2026-09-21T09:30:00Z');

    const decodedMock = {
      sessionMesgs: [
        { startTime: t0, timestamp: t1, sport: 'swimming', totalElapsedTime: 1800 },
        { startTime: t1, timestamp: t2, sport: 'cycling', totalElapsedTime: 3600 },
      ],
      lapMesgs: [],
      recordMesgs: [],
      setMesgs: [],
      fileIdMesgs: [],
      deviceInfoMesgs: [],
      sportMesgs: [],
      errors: [],
    };

    const activities = normalizer.normalize(decodedMock, 'America/Campo_Grande', false);

    expect(activities.length).toBe(2);
    expect(activities[0].sessionIndex).toBe(0);
    expect(activities[0].sportCategory).toBe(SportCategory.SWIMMING);
    expect(activities[1].sessionIndex).toBe(1);
    expect(activities[1].sportCategory).toBe(SportCategory.CYCLING);
  });
});
