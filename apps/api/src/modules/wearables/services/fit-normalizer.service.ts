import { Injectable, Logger } from '@nestjs/common';
import { SportCategory } from '@prisma/client';
import { DecodedFitData } from './fit-worker-supervisor.service';

export interface TelemetryPoint {
  offsetSec: number;
  hr?: number;
  speed?: number;
  cadence?: number;
  altitude?: number;
  power?: number;
  lat?: number;
  lon?: number;
}

export interface NormalizedLap {
  lapIndex: number;
  startTime: Date;
  totalTimeSeconds: number;
  distanceMeters?: number;
  avgSpeedMeterSec?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  caloriesEstimated?: number;
}

export interface NormalizedActivityData {
  sessionIndex: number;
  sportCategory: SportCategory;
  sportNameOriginal?: string;
  startedAt: Date;
  finishedAt?: Date;
  localDate: string;
  timezone: string;
  timezoneOffsetMinutes: number;
  timezoneConfirmed: boolean;
  durationSeconds: number;
  movingDurationSeconds?: number;
  distanceMeters?: number;
  elevationGainMeters?: number;
  elevationLossMeters?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  avgPaceSecMeter?: number;
  avgCadence?: number;
  maxCadence?: number;
  totalCaloriesEstimated?: number;
  aerobicTrainingEffect?: number;
  anaerobicTrainingEffect?: number;
  deviceManufacturer?: string;
  deviceModel?: string;
  laps: NormalizedLap[];
  telemetry: {
    formatVersion: number;
    samplingRateSeconds: number;
    sampleCount: number;
    hasLocationData: boolean;
    samples: TelemetryPoint[];
    retentionExpiresAt: Date;
  };
  strengthSets?: Array<{
    setNumber: number;
    reps?: number;
    weightKg?: number;
    durationSeconds?: number;
    setType?: string;
  }>;
}

@Injectable()
export class FitNormalizerService {
  private readonly logger = new Logger(FitNormalizerService.name);

  // Conversão de semicírculos Garmin para graus decimais
  private semicirclesToDegrees(semicircles?: number): number | undefined {
    if (semicircles === undefined || semicircles === null) return undefined;
    return (semicircles * 180) / 2147483648; // 2^31
  }

  // Mapeamento de modalidades FIT para SportCategory
  private mapSportCategory(sport?: string | number, subSport?: string | number): SportCategory {
    const s = String(sport || '').toLowerCase();
    const sub = String(subSport || '').toLowerCase();

    if (s.includes('running') || s === '1') return SportCategory.RUNNING;
    if (s.includes('cycling') || s === '2') return SportCategory.CYCLING;
    if (s.includes('swimming') || s === '5') return SportCategory.SWIMMING;
    if (s.includes('training') || sub.includes('strength') || s.includes('fitness_equipment')) {
      return SportCategory.STRENGTH_TRAINING;
    }
    if (s.includes('walking') || s === '11') return SportCategory.WALKING;
    if (s.includes('hiit')) return SportCategory.HIIT;
    if (s.includes('cardio')) return SportCategory.CARDIO;
    return SportCategory.OTHER;
  }

  // Cálculo de timezone e localDate
  private computeTemporalFields(utcDate: Date, userTimezone?: string): {
    localDate: string;
    timezone: string;
    timezoneOffsetMinutes: number;
    timezoneConfirmed: boolean;
  } {
    // Fuso do perfil do usuário autenticado. Caso não configurado no perfil, usa fallback com timezoneConfirmed = false
    const tz = userTimezone && userTimezone.trim().length > 0 ? userTimezone.trim() : 'America/Sao_Paulo';
    const isConfirmed = Boolean(userTimezone && userTimezone.trim().length > 0);

    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const localDate = formatter.format(utcDate); // Formato YYYY-MM-DD

      // Calcular offset numérico em minutos para aquela data específica no fuso
      const utcString = utcDate.toLocaleString('en-US', { timeZone: 'UTC' });
      const tzString = utcDate.toLocaleString('en-US', { timeZone: tz });
      const diffMs = new Date(tzString).getTime() - new Date(utcString).getTime();
      const timezoneOffsetMinutes = Math.round(diffMs / 60000);

      return { localDate, timezone: tz, timezoneOffsetMinutes, timezoneConfirmed: isConfirmed };
    } catch {
      // Fallback seguro caso o timezone IANA seja inválido
      const iso = utcDate.toISOString().split('T')[0];
      return { localDate: iso, timezone: 'UTC', timezoneOffsetMinutes: 0, timezoneConfirmed: false };
    }
  }

  normalize(decoded: DecodedFitData, userTimezone?: string, hasLocationConsent = false): NormalizedActivityData[] {
    const sessions = decoded.sessionMesgs || [];
    const activities: NormalizedActivityData[] = [];

    // Se o arquivo não contiver sessionMesgs explícitos, criar uma sessão padrão a partir dos records
    if (sessions.length === 0 && (decoded.recordMesgs || []).length > 0) {
      const firstRecord = decoded.recordMesgs[0];
      const lastRecord = decoded.recordMesgs[decoded.recordMesgs.length - 1];
      const startTime = new Date(firstRecord.timestamp || Date.now());
      const endTime = new Date(lastRecord.timestamp || startTime.getTime() + 60000);
      sessions.push({
        startTime,
        timestamp: endTime,
        totalElapsedTime: Math.round((endTime.getTime() - startTime.getTime()) / 1000),
        sport: 'generic',
      });
    }

    sessions.forEach((session, sessionIndex) => {
      const startedAt = new Date(session.startTime || session.timestamp || Date.now());
      const durationSeconds = Math.round(session.totalTimerTime || session.totalElapsedTime || 0);
      const finishedAt = session.timestamp ? new Date(session.timestamp) : new Date(startedAt.getTime() + durationSeconds * 1000);

      const temporal = this.computeTemporalFields(startedAt, userTimezone);
      const sportCategory = this.mapSportCategory(session.sport, session.subSport);

      // Verificação de divergência entre offset bruto do FIT e fuso IANA do perfil do usuário
      if (session.timestamp && session.localTimestamp) {
        const fitOffsetMinutes = Math.round(
          (new Date(session.localTimestamp).getTime() - new Date(session.timestamp).getTime()) / 60000
        );
        if (Math.abs(fitOffsetMinutes - temporal.timezoneOffsetMinutes) > 5) {
          this.logger.warn({
            event: 'TIMEZONE_OFFSET_DIVERGENCE',
            fitOffsetMinutes,
            ianaOffsetMinutes: temporal.timezoneOffsetMinutes,
            userTimezone: temporal.timezone,
            startedAt: startedAt.toISOString(),
          });
        }
      }

      // 1. Normalização de Voltas (Laps)
      const laps: NormalizedLap[] = (decoded.lapMesgs || []).map((lap, idx) => ({
        lapIndex: idx + 1,
        startTime: new Date(lap.startTime || startedAt),
        totalTimeSeconds: Number(lap.totalElapsedTime || lap.totalTimerTime || 0),
        distanceMeters: lap.totalDistance ? Number(lap.totalDistance) : undefined,
        avgSpeedMeterSec: lap.avgSpeed ? Number(lap.avgSpeed) : undefined,
        avgHeartRate: lap.avgHeartRate ? Math.round(Number(lap.avgHeartRate)) : undefined,
        maxHeartRate: lap.maxHeartRate ? Math.round(Number(lap.maxHeartRate)) : undefined,
        caloriesEstimated: lap.totalCalories ? Number(lap.totalCalories) : undefined,
      }));

      // 2. Normalização de Telemetria com Downsampling (baldes de 5s)
      const records = decoded.recordMesgs || [];
      const bucketSizeSec = 5;
      const bucketsMap = new Map<number, {
        hrs: number[];
        speeds: number[];
        altitudes: number[];
        cadences: number[];
        powers: number[];
        lats: number[];
        lons: number[];
      }>();

      records.forEach((rec) => {
        if (!rec.timestamp) return;
        const recTime = new Date(rec.timestamp).getTime();
        const diffSec = Math.max(0, Math.floor((recTime - startedAt.getTime()) / 1000));
        const bucketOffset = Math.floor(diffSec / bucketSizeSec) * bucketSizeSec;

        if (!bucketsMap.has(bucketOffset)) {
          bucketsMap.set(bucketOffset, { hrs: [], speeds: [], altitudes: [], cadences: [], powers: [], lats: [], lons: [] });
        }
        const b = bucketsMap.get(bucketOffset)!;

        if (rec.heartRate != null) b.hrs.push(Number(rec.heartRate));
        if (rec.speed != null) b.speeds.push(Number(rec.speed));
        if (rec.altitude != null) b.altitudes.push(Number(rec.altitude));
        if (rec.cadence != null) b.cadences.push(Number(rec.cadence));
        if (rec.power != null) b.powers.push(Number(rec.power));

        // GPS: Apenas se o usuário tiver consentido com LOCATION_DATA_PROCESSING
        if (hasLocationConsent && rec.positionLat != null && rec.positionLong != null) {
          const latDeg = this.semicirclesToDegrees(rec.positionLat);
          const lonDeg = this.semicirclesToDegrees(rec.positionLong);
          if (latDeg != null && lonDeg != null) {
            b.lats.push(latDeg);
            b.lons.push(lonDeg);
          }
        }
      });

      const avg = (arr: number[]) => arr.length > 0 ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2)) : undefined;

      const telemetryPoints: TelemetryPoint[] = Array.from(bucketsMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([offsetSec, b]) => ({
          offsetSec,
          hr: b.hrs.length ? Math.round(avg(b.hrs)!) : undefined,
          speed: avg(b.speeds),
          altitude: hasLocationConsent ? avg(b.altitudes) : undefined,
          cadence: b.cadences.length ? Math.round(avg(b.cadences)!) : undefined,
          power: b.powers.length ? Math.round(avg(b.powers)!) : undefined,
          lat: hasLocationConsent && b.lats.length ? avg(b.lats) : undefined,
          lon: hasLocationConsent && b.lons.length ? avg(b.lons) : undefined,
        }));

      // Retenção: 180 dias a partir da data do treino
      const retentionExpiresAt = new Date(startedAt.getTime() + 180 * 24 * 60 * 60 * 1000);

      // 3. Normalização de Séries de Musculação (se existirem setMesgs)
      const strengthSets = (decoded.setMesgs || []).map((s, idx) => ({
        setNumber: idx + 1,
        reps: s.repetitions != null ? Number(s.repetitions) : undefined,
        weightKg: s.weight != null ? Number(s.weight) : undefined,
        durationSeconds: s.duration != null ? Number(s.duration) : undefined,
        setType: s.category != null ? String(s.category) : undefined,
      }));

      // 4. Dispositivo (extrai de deviceInfoMesgs ou fallback para fileIdMesgs)
      const device = decoded.deviceInfoMesgs?.[0] || decoded.fileIdMesgs?.[0];
      const deviceManufacturer = device?.manufacturer ? String(device.manufacturer) : 'garmin';
      const deviceModel = device?.productName ? String(device.productName) : (device?.product ? String(device.product) : undefined);

      activities.push({
        sessionIndex,
        sportCategory,
        sportNameOriginal: session.sport ? String(session.sport) : undefined,
        startedAt,
        finishedAt,
        localDate: temporal.localDate,
        timezone: temporal.timezone,
        timezoneOffsetMinutes: temporal.timezoneOffsetMinutes,
        timezoneConfirmed: temporal.timezoneConfirmed,
        durationSeconds,
        movingDurationSeconds: session.totalTimerTime ? Math.round(Number(session.totalTimerTime)) : undefined,
        distanceMeters: session.totalDistance ? Number(session.totalDistance) : undefined,
        elevationGainMeters: session.totalAscent ? Number(session.totalAscent) : undefined,
        elevationLossMeters: session.totalDescent ? Number(session.totalDescent) : undefined,
        avgHeartRate: session.avgHeartRate ? Math.round(Number(session.avgHeartRate)) : undefined,
        maxHeartRate: session.maxHeartRate ? Math.round(Number(session.maxHeartRate)) : undefined,
        avgPaceSecMeter: session.avgSpeed ? Number((1 / Number(session.avgSpeed)).toFixed(4)) : undefined,
        avgCadence: session.avgCadence ? Math.round(Number(session.avgCadence)) : undefined,
        maxCadence: session.maxCadence ? Math.round(Number(session.maxCadence)) : undefined,
        totalCaloriesEstimated: session.totalCalories ? Number(session.totalCalories) : undefined,
        aerobicTrainingEffect: session.totalTrainingEffect ? Number(session.totalTrainingEffect) : undefined,
        anaerobicTrainingEffect: session.totalAnaerobicTrainingEffect ? Number(session.totalAnaerobicTrainingEffect) : undefined,
        deviceManufacturer,
        deviceModel,
        laps,
        telemetry: {
          formatVersion: 1,
          samplingRateSeconds: bucketSizeSec,
          sampleCount: telemetryPoints.length,
          hasLocationData: hasLocationConsent && telemetryPoints.some((p) => p.lat != null),
          samples: telemetryPoints,
          retentionExpiresAt,
        },
        strengthSets: strengthSets.length > 0 ? strengthSets : undefined,
      });
    });

    return activities;
  }
}
