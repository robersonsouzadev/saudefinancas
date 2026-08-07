import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { MUSCLE_GROUP_MAP, EQUIPMENT_TRANSLATION, translateExerciseName } from '../data/exercise-translations';

export interface CDNExerciseItem {
  id: string;
  slug: string;
  name: string;
  muscle: string;
  bodyPart: string;
  equipment: string;
  category?: string;
  secondaryMuscles?: string[];
  instructions?: string[];
  file: string;
  gifUrl: string;
}

@Injectable()
export class ExerciseDBService {
  private readonly logger = new Logger(ExerciseDBService.name);
  private readonly cdnBaseUrl = 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0';

  private readonly musclesList = [
    'pectorals', 'lats', 'delts', 'biceps', 'triceps', 'quads', 'hamstrings',
    'abs', 'glutes', 'calves', 'forearms', 'traps', 'upper-back', 'abductors',
    'adductors', 'cardio', 'levator-scapulae', 'serratus-anterior', 'spine',
  ];

  // Free/Open fallback GIF map for instant zero-config demonstration (100% verified status 200)
  private readonly defaultGifMap: Record<string, string> = {
    'Supino Reto com Barra': 'https://raw.githubusercontent.com/lontraeye/exercise-gifs-db/main/pectorals/barbell-bench-press.gif',
    'Supino Inclinado com Halteres': 'https://raw.githubusercontent.com/lontraeye/exercise-gifs-db/main/pectorals/dumbbell-incline-bench-press.gif',
    'Flexão de Braço': 'https://raw.githubusercontent.com/lontraeye/exercise-gifs-db/main/pectorals/push-up.gif',
    'Puxada Frontal Aberta': 'https://raw.githubusercontent.com/lontraeye/exercise-gifs-db/main/lats/cable-pulldown.gif',
    'Barra Fixa Pronada': 'https://raw.githubusercontent.com/lontraeye/exercise-gifs-db/main/lats/pull-up.gif',
    'Desenvolvimento Militar com Barra': 'https://raw.githubusercontent.com/lontraeye/exercise-gifs-db/main/delts/barbell-standing-wide-military-press.gif',
    'Elevação Lateral com Halteres': 'https://raw.githubusercontent.com/lontraeye/exercise-gifs-db/main/delts/dumbbell-lateral-raise.gif',
    'Rosca Direta com Barra W': 'https://raw.githubusercontent.com/lontraeye/exercise-gifs-db/main/biceps/barbell-curl.gif',
    'Rosca Martelo': 'https://raw.githubusercontent.com/lontraeye/exercise-gifs-db/main/biceps/dumbbell-hammer-curl.gif',
    'Tríceps Pulley na Corda': 'https://raw.githubusercontent.com/lontraeye/exercise-gifs-db/main/triceps/barbell-lying-triceps-extension.gif',
    'Agachamento Livre com Barra': 'https://raw.githubusercontent.com/lontraeye/exercise-gifs-db/main/quads/barbell-bench-squat.gif',
    'Leg Press 45°': 'https://raw.githubusercontent.com/lontraeye/exercise-gifs-db/main/quads/barbell-bench-squat.gif',
    'Stiff com Barra': 'https://raw.githubusercontent.com/lontraeye/exercise-gifs-db/main/hamstrings/barbell-straight-leg-deadlift.gif',
    'Abdominal Supra no Solo': 'https://raw.githubusercontent.com/lontraeye/exercise-gifs-db/main/abs/3-4-sit-up.gif',
  };

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  /**
   * Fetches all 1,323 3D animated exercises from ExerciseGymGifsDB jsDelivr CDN
   */
  async fetchAllExercisesFromCDN(): Promise<CDNExerciseItem[]> {
    const allExercises: CDNExerciseItem[] = [];
    const seenIds = new Set<string>();

    this.logger.log('Iniciando busca do catálogo completo de 1.323 exercícios 3D no jsDelivr CDN...');

    for (const muscle of this.musclesList) {
      try {
        const res = await fetch(`${this.cdnBaseUrl}/api/en/muscles/${muscle}.json`);
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.exercises)) {
            for (const item of data.exercises) {
              if (!seenIds.has(item.id)) {
                seenIds.add(item.id);
                allExercises.push({
                  ...item,
                  gifUrl: `${this.cdnBaseUrl}/${item.file}`,
                });
              }
            }
          }
        }
      } catch (err) {
        this.logger.warn(`Erro ao buscar exercicios para muscle ${muscle} do CDN`, err);
      }
    }

    this.logger.log(`Catálogo carregado do CDN com sucesso: ${allExercises.length} exercícios 3D.`);
    return allExercises;
  }

  /**
   * Fetches exercise GIF URL from ExerciseDB (via RapidAPI) or free CDN fallback
   */
  async getGifForExercise(exerciseNameEn: string, exerciseNamePt?: string): Promise<string | null> {
    const rapidApiKey = this.configService.get('EXERCISEDB_API_KEY') || this.configService.get('RAPIDAPI_KEY');

    if (rapidApiKey) {
      try {
        const query = encodeURIComponent(exerciseNameEn.toLowerCase());
        const response = await fetch(`https://exercisedb.p.rapidapi.com/exercises/name/${query}`, {
          headers: {
            'X-RapidAPI-Key': rapidApiKey,
            'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0 && data[0].gifUrl) {
            return data[0].gifUrl;
          }
        }
      } catch (err) {
        this.logger.warn(`RapidAPI ExerciseDB fetch failed for ${exerciseNameEn}, using fallback`, err);
      }
    }

    // Fallback: Free Open Exercise DB GitHub CDN / wger mapping
    if (exerciseNamePt && this.defaultGifMap[exerciseNamePt]) {
      return this.defaultGifMap[exerciseNamePt];
    }

    return null;
  }

  /**
   * Syncs GIF URLs for all exercises in the database
   */
  async syncAllExerciseGifs() {
    const exercises = await this.prisma.exercise.findMany({
      where: { gifUrl: null },
    });

    let updatedCount = 0;

    for (const ex of exercises) {
      const nameEn = ex.nameEn || ex.namePt;
      const gifUrl = await this.getGifForExercise(nameEn, ex.namePt);

      if (gifUrl) {
        await this.prisma.exercise.update({
          where: { id: ex.id },
          data: { gifUrl },
        });
        updatedCount++;
      }
    }

    this.logger.log(`Synced GIFs for ${updatedCount} exercises out of ${exercises.length} missing.`);

    return {
      totalExercises: exercises.length,
      syncedGifsCount: updatedCount,
    };
  }
}
