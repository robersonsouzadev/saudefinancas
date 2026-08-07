import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ExerciseDBService {
  private readonly logger = new Logger(ExerciseDBService.name);

  // Free/Open fallback GIF map for instant zero-config demonstration
  private readonly defaultGifMap: Record<string, string> = {
    'Supino Reto com Barra': 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Bench_Press/0.jpg',
    'Supino Inclinado com Halteres': 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Incline_Dumbbell_Bench_Press/0.jpg',
    'Flexão de Braço': 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Push-up/0.jpg',
    'Puxada Frontal Aberta': 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Wide-Grip_Lat_Pulldown/0.jpg',
    'Barra Fixa Pronada': 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pull-up/0.jpg',
    'Desenvolvimento Militar com Barra': 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Shoulder_Press/0.jpg',
    'Elevação Lateral com Halteres': 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Lateral_Raise/0.jpg',
    'Rosca Direta com Barra W': 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/EZ-bar_Curl/0.jpg',
    'Tríceps Pulley na Corda': 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Triceps_Pushdown/0.jpg',
    'Agachamento Livre com Barra': 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Squat/0.jpg',
    'Leg Press 45°': 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Leg_Press/0.jpg',
    'Stiff com Barra': 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Stiff-Legged_Barbell_Deadlift/0.jpg',
    'Abdominal Supra no Solo': 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Crunch/0.jpg',
  };

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

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
