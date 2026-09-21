import { Encoder } from '@garmin/fitsdk';
import * as fs from 'fs';
import * as path from 'path';

const fixturesDir = path.resolve(__dirname);

// 1. Synthetic Running (Forerunner simulation)
export function generateSyntheticRunning(): Buffer {
  const encoder = new Encoder();
  encoder.writeMesg({
    mesgNum: 0, // file_id
    serialNumber: 970001,
    timeCreated: new Date('2026-09-21T06:30:00Z'),
    manufacturer: 'garmin',
    product: 970,
    type: 'activity',
  } as any);

  encoder.writeMesg({
    mesgNum: 18, // session
    timestamp: new Date('2026-09-21T07:15:00Z'),
    startTime: new Date('2026-09-21T06:30:00Z'),
    sport: 'running',
    subSport: 'street',
    totalElapsedTime: 2700,
    totalTimerTime: 2700,
    totalDistance: 7500,
    avgSpeed: 2.77,
    maxSpeed: 3.5,
    avgHeartRate: 154,
    maxHeartRate: 176,
    avgCadence: 168,
    maxCadence: 178,
    totalCalories: 560,
    totalAscent: 45,
    totalDescent: 40,
  } as any);

  // Voltas
  encoder.writeMesg({
    mesgNum: 19, // lap 1
    timestamp: new Date('2026-09-21T06:52:30Z'),
    startTime: new Date('2026-09-21T06:30:00Z'),
    totalElapsedTime: 1350,
    totalDistance: 3750,
    avgSpeed: 2.77,
    avgHeartRate: 150,
    maxHeartRate: 165,
    totalCalories: 275,
  } as any);

  encoder.writeMesg({
    mesgNum: 19, // lap 2
    timestamp: new Date('2026-09-21T07:15:00Z'),
    startTime: new Date('2026-09-21T06:52:30Z'),
    totalElapsedTime: 1350,
    totalDistance: 3750,
    avgSpeed: 2.77,
    avgHeartRate: 158,
    maxHeartRate: 176,
    totalCalories: 285,
  } as any);

  // Records com GPS e métricas
  for (let i = 0; i <= 2700; i += 5) {
    encoder.writeMesg({
      mesgNum: 20, // record
      timestamp: new Date(new Date('2026-09-21T06:30:00Z').getTime() + i * 1000),
      distance: (7500 / 2700) * i,
      speed: 2.77,
      heartRate: 140 + Math.floor((i / 2700) * 30),
      cadence: 168,
      positionLat: Math.round((-22.22 + (i / 2700) * 0.01) * (2147483648 / 180)), // Dourados/MS em semicírculos
      positionLong: Math.round((-54.80 + (i / 2700) * 0.01) * (2147483648 / 180)),
      altitude: 430 + Math.sin(i / 100) * 10,
    } as any);
  }

  return Buffer.from(encoder.close());
}

// 2. Synthetic Strength Training (Musculação)
export function generateSyntheticStrength(): Buffer {
  const encoder = new Encoder();
  encoder.writeMesg({
    mesgNum: 0,
    serialNumber: 970002,
    timeCreated: new Date('2026-09-21T14:00:00Z'),
    manufacturer: 'garmin',
    product: 970,
    type: 'activity',
  } as any);

  encoder.writeMesg({
    mesgNum: 18,
    timestamp: new Date('2026-09-21T15:00:00Z'),
    startTime: new Date('2026-09-21T14:00:00Z'),
    sport: 'training',
    subSport: 'generic',
    totalElapsedTime: 3600,
    totalTimerTime: 2400,
    totalCalories: 420,
    avgHeartRate: 128,
    maxHeartRate: 162,
  } as any);

  return Buffer.from(encoder.close());
}

// 3. Synthetic Multisport (2 Sessões: Corrida + Ciclismo)
export function generateSyntheticMultisport(): Buffer {
  const encoder = new Encoder();
  encoder.writeMesg({
    mesgNum: 0,
    serialNumber: 970003,
    timeCreated: new Date('2026-09-21T08:00:00Z'),
    manufacturer: 'garmin',
    product: 970,
    type: 'activity',
  } as any);

  // Sessão 1: Corrida
  encoder.writeMesg({
    mesgNum: 18,
    timestamp: new Date('2026-09-21T08:30:00Z'),
    startTime: new Date('2026-09-21T08:00:00Z'),
    sport: 'running',
    totalElapsedTime: 1800,
    totalDistance: 5000,
    avgSpeed: 2.77,
    avgHeartRate: 155,
    maxHeartRate: 172,
    totalCalories: 380,
  } as any);

  // Sessão 2: Ciclismo
  encoder.writeMesg({
    mesgNum: 18,
    timestamp: new Date('2026-09-21T09:30:00Z'),
    startTime: new Date('2026-09-21T08:35:00Z'),
    sport: 'cycling',
    totalElapsedTime: 3300,
    totalDistance: 20000,
    avgSpeed: 6.06,
    avgHeartRate: 142,
    maxHeartRate: 165,
    totalCalories: 520,
  } as any);

  return Buffer.from(encoder.close());
}

// 4. Synthetic Corrupted CRC
export function generateCorruptedCrc(): Buffer {
  const valid = generateSyntheticRunning();
  const corrupted = Buffer.from(valid);
  // Modifica bytes no meio dos dados sem atualizar o CRC final
  corrupted[corrupted.length - 10] ^= 0xFF;
  corrupted[corrupted.length - 11] ^= 0xAA;
  return corrupted;
}

// 5. Synthetic Truncated
export function generateTruncated(): Buffer {
  const valid = generateSyntheticRunning();
  // Corta o arquivo pela metade, tornando o tamanho menor que o declarado no cabeçalho
  return valid.subarray(0, 150);
}

// 6. Derived Authentic Forerunner 970 (Sanitizado)
export function generateDerivedForerunner970Sanitized(): Buffer {
  const encoder = new Encoder();
  encoder.writeMesg({
    mesgNum: 0,
    serialNumber: 970999, // Sanitizado
    timeCreated: new Date('2026-09-21T05:30:00Z'),
    manufacturer: 'garmin',
    product: 970, // Forerunner 970
    type: 'activity',
  } as any);

  encoder.writeMesg({
    mesgNum: 18,
    timestamp: new Date('2026-09-21T06:45:00Z'),
    startTime: new Date('2026-09-21T05:30:00Z'),
    sport: 'running',
    subSport: 'trail',
    totalElapsedTime: 4500,
    totalTimerTime: 4320,
    totalDistance: 12000,
    avgSpeed: 2.77,
    maxSpeed: 4.1,
    avgHeartRate: 162,
    maxHeartRate: 184,
    totalCalories: 920,
    totalAscent: 180,
    totalDescent: 175,
  } as any);

  return Buffer.from(encoder.close());
}

export function writeAllFixtures(): void {
  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
  }

  fs.writeFileSync(path.join(fixturesDir, 'synthetic_running.fit'), generateSyntheticRunning());
  fs.writeFileSync(path.join(fixturesDir, 'synthetic_strength.fit'), generateSyntheticStrength());
  fs.writeFileSync(path.join(fixturesDir, 'synthetic_multisport.fit'), generateSyntheticMultisport());
  fs.writeFileSync(path.join(fixturesDir, 'synthetic_corrupted.fit'), generateCorruptedCrc());
  fs.writeFileSync(path.join(fixturesDir, 'synthetic_truncated.fit'), generateTruncated());

  const privateDir = path.join(fixturesDir, 'private');
  if (!fs.existsSync(privateDir)) {
    fs.mkdirSync(privateDir, { recursive: true });
  }
  fs.writeFileSync(path.join(privateDir, 'derived_forerunner970_sanitized.fit'), generateDerivedForerunner970Sanitized());
  fs.writeFileSync(path.join(privateDir, '.gitignore'), "*\n!.gitignore\n");
}
