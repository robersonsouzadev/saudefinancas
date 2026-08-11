import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export interface TacoFoodItem {
  id: number;
  category: string;
  name: string;
  calories: number; // kcal por 100g
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
}

// Base Curada de Alimentos da Tabela TACO (UNICAMP - 4ª Edição)
const TACO_ITEMS_DB: TacoFoodItem[] = [
  { id: 1, category: 'Cereais', name: 'Arroz, tipo 1, cozido', calories: 128, proteinG: 2.5, carbsG: 28.1, fatG: 0.2, fiberG: 1.6 },
  { id: 2, category: 'Cereais', name: 'Arroz, integral, cozido', calories: 124, proteinG: 2.6, carbsG: 25.8, fatG: 1.0, fiberG: 2.7 },
  { id: 3, category: 'Leguminosas', name: 'Feijão, carioca, cozido', calories: 76, proteinG: 4.8, carbsG: 13.6, fatG: 0.5, fiberG: 8.5 },
  { id: 4, category: 'Leguminosas', name: 'Feijão, preto, cozido', calories: 77, proteinG: 4.5, carbsG: 14.0, fatG: 0.5, fiberG: 8.4 },
  { id: 5, category: 'Carnes', name: 'Frango, peito, sem pele, grelhado', calories: 159, proteinG: 32.0, carbsG: 0.0, fatG: 2.5, fiberG: 0.0 },
  { id: 6, category: 'Carnes', name: 'Carne, bovina, alcatra, sem gordura, grelhada', calories: 241, proteinG: 31.9, carbsG: 0.0, fatG: 11.6, fiberG: 0.0 },
  { id: 7, category: 'Carnes', name: 'Carne, bovina, patinho, magro, grelhado', calories: 219, proteinG: 35.9, carbsG: 0.0, fatG: 7.3, fiberG: 0.0 },
  { id: 8, category: 'Carnes', name: 'Carne, bovina, contra-filé, grelhado', calories: 278, proteinG: 29.9, carbsG: 0.0, fatG: 16.6, fiberG: 0.0 },
  { id: 9, category: 'Carnes', name: 'Carne, moída, bovina, refogada', calories: 224, proteinG: 26.6, carbsG: 0.0, fatG: 12.2, fiberG: 0.0 },
  { id: 10, category: 'Ovos', name: 'Ovo, de galinha, cozido', calories: 146, proteinG: 13.3, carbsG: 0.6, fatG: 9.5, fiberG: 0.0 },
  { id: 11, category: 'Ovos', name: 'Ovo, de galinha, frito', calories: 240, proteinG: 15.6, carbsG: 1.2, fatG: 18.6, fiberG: 0.0 },
  { id: 12, category: 'Tubérculos', name: 'Batata, inglesa, cozida', calories: 52, proteinG: 1.2, carbsG: 11.9, fatG: 0.0, fiberG: 1.3 },
  { id: 13, category: 'Tubérculos', name: 'Batata, doce, cozida', calories: 77, proteinG: 0.6, carbsG: 18.4, fatG: 0.1, fiberG: 2.2 },
  { id: 14, category: 'Tubérculos', name: 'Mandioca, cozida', calories: 125, proteinG: 0.6, carbsG: 30.1, fatG: 0.3, fiberG: 1.6 },
  { id: 15, category: 'Hortaliças', name: 'Alface, crespa, crua', calories: 11, proteinG: 1.3, carbsG: 1.7, fatG: 0.2, fiberG: 1.8 },
  { id: 16, category: 'Hortaliças', name: 'Tomate, salada, cru', calories: 15, proteinG: 1.1, carbsG: 3.1, fatG: 0.2, fiberG: 1.2 },
  { id: 17, category: 'Hortaliças', name: 'Cenoura, crua', calories: 34, proteinG: 1.3, carbsG: 7.7, fatG: 0.2, fiberG: 3.2 },
  { id: 18, category: 'Hortaliças', name: 'Brócolis, cozido', calories: 25, proteinG: 2.1, carbsG: 4.4, fatG: 0.5, fiberG: 3.4 },
  { id: 19, category: 'Frutas', name: 'Banana, prata, crua', calories: 98, proteinG: 1.3, carbsG: 26.0, fatG: 0.1, fiberG: 2.0 },
  { id: 20, category: 'Frutas', name: 'Maçã, fuji, crua com casca', calories: 56, proteinG: 0.3, carbsG: 15.2, fatG: 0.2, fiberG: 1.3 },
  { id: 21, category: 'Frutas', name: 'Mamão, papaia, cru', calories: 40, proteinG: 0.5, carbsG: 10.4, fatG: 0.1, fiberG: 1.0 },
  { id: 22, category: 'Frutas', name: 'Abacate, cru', calories: 96, proteinG: 1.2, carbsG: 6.0, fatG: 8.4, fiberG: 6.3 },
  { id: 23, category: 'Laticínios', name: 'Leite, integral', calories: 61, proteinG: 3.2, carbsG: 4.7, fatG: 3.2, fiberG: 0.0 },
  { id: 24, category: 'Laticínios', name: 'Leite, desnatado', calories: 35, proteinG: 3.4, carbsG: 4.9, fatG: 0.1, fiberG: 0.0 },
  { id: 25, category: 'Laticínios', name: 'Queijo, muçarela', calories: 330, proteinG: 22.6, carbsG: 3.0, fatG: 25.2, fiberG: 0.0 },
  { id: 26, category: 'Laticínios', name: 'Queijo, minas, frescal', calories: 264, proteinG: 17.4, carbsG: 3.2, fatG: 20.2, fiberG: 0.0 },
  { id: 27, category: 'Cereais', name: 'Pão, francês', calories: 300, proteinG: 8.0, carbsG: 58.6, fatG: 3.1, fiberG: 2.3 },
  { id: 28, category: 'Cereais', name: 'Pão, de forma, integral', calories: 253, proteinG: 9.4, carbsG: 49.9, fatG: 3.7, fiberG: 6.9 },
  { id: 29, category: 'Cereais', name: 'Macarrão, espaguete, cozido', calories: 157, proteinG: 5.8, carbsG: 30.8, fatG: 0.9, fiberG: 1.8 },
  { id: 30, category: 'Cereais', name: 'Aveia, em flocos', calories: 394, proteinG: 13.9, carbsG: 66.6, fatG: 8.5, fiberG: 9.1 },
  { id: 31, category: 'Gorduras', name: 'Azeite, de oliva, extra virgem', calories: 884, proteinG: 0.0, carbsG: 0.0, fatG: 100.0, fiberG: 0.0 },
  { id: 32, category: 'Gorduras', name: 'Manteiga, sem sal', calories: 726, proteinG: 0.4, carbsG: 0.1, fatG: 82.4, fiberG: 0.0 },
  { id: 33, category: 'Pescados', name: 'Tilápia, filé, assado/grelhado', calories: 128, proteinG: 26.0, carbsG: 0.0, fatG: 2.7, fiberG: 0.0 },
  { id: 34, category: 'Pescados', name: 'Salmão, sem pele, grelhado', calories: 229, proteinG: 24.2, carbsG: 0.0, fatG: 14.0, fiberG: 0.0 },
  { id: 35, category: 'Preparações', name: 'Tapioca, massa pronta, frita/grelhada', calories: 240, proteinG: 0.2, carbsG: 59.0, fatG: 0.1, fiberG: 0.5 },
  { id: 36, category: 'Preparações', name: 'Pão de queijo, assado', calories: 360, proteinG: 5.1, carbsG: 38.5, fatG: 21.4, fiberG: 0.6 },
  { id: 37, category: 'Frutas', name: 'Açaí, polpa com xarope de guaraná', calories: 110, proteinG: 0.7, carbsG: 21.5, fatG: 3.8, fiberG: 2.6 },
];

@Injectable()
export class TacoDatabaseService {
  private readonly logger = new Logger(TacoDatabaseService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Busca alimentos por nome (fuzzy match) na tabela TACO
   */
  async searchFood(query: string, limit = 15): Promise<TacoFoodItem[]> {
    if (!query || query.trim().length === 0) {
      return TACO_ITEMS_DB.slice(0, limit);
    }

    const cleanQuery = query.toLowerCase().trim();

    // 1. Tenta buscar no banco relacional se a tabela TacoFood estiver populada
    try {
      const dbFoods = await this.prisma.tacoFood.findMany({
        where: {
          name: {
            contains: cleanQuery,
            mode: 'insensitive',
          },
        },
        take: limit,
      });

      if (dbFoods && dbFoods.length > 0) {
        return dbFoods.map((f) => ({
          id: f.id,
          category: f.category,
          name: f.name,
          calories: f.calories,
          proteinG: f.proteinG,
          carbsG: f.carbsG,
          fatG: f.fatG,
          fiberG: f.fiberG || 0,
        }));
      }
    } catch (e) {
      // Caso a migration/seed ainda esteja em andamento, faz fallback no array TACO em memória
    }

    // 2. Fallback no array em memória
    return TACO_ITEMS_DB.filter((item) =>
      item.name.toLowerCase().includes(cleanQuery) ||
      item.category.toLowerCase().includes(cleanQuery)
    ).slice(0, limit);
  }

  /**
   * Retorna alimento TACO por ID
   */
  async getFoodById(id: number): Promise<TacoFoodItem | null> {
    try {
      const dbFood = await this.prisma.tacoFood.findUnique({ where: { id } });
      if (dbFood) {
        return {
          id: dbFood.id,
          category: dbFood.category,
          name: dbFood.name,
          calories: dbFood.calories,
          proteinG: dbFood.proteinG,
          carbsG: dbFood.carbsG,
          fatG: dbFood.fatG,
          fiberG: dbFood.fiberG || 0,
        };
      }
    } catch (e) {}

    return TACO_ITEMS_DB.find((item) => item.id === id) || null;
  }

  /**
   * Calcula macronutrientes proporcionais para uma porção em gramas
   */
  calculateNutritionForWeight(food: TacoFoodItem, weightG: number) {
    const factor = weightG / 100;
    return {
      calories: Math.round(food.calories * factor),
      proteinG: Math.round(food.proteinG * factor * 10) / 10,
      carbsG: Math.round(food.carbsG * factor * 10) / 10,
      fatG: Math.round(food.fatG * factor * 10) / 10,
      fiberG: Math.round((food.fiberG || 0) * factor * 10) / 10,
    };
  }

  /**
   * Tenta encontrar o melhor alimento correspondente da tabela TACO para a saída da IA
   */
  findBestMatch(aiFoodName: string): TacoFoodItem | null {
    if (!aiFoodName) return null;
    const nameLower = aiFoodName.toLowerCase();

    // Palavras-chave de busca prioritária
    if (nameLower.includes('arroz')) return TACO_ITEMS_DB[0];
    if (nameLower.includes('feijão') || nameLower.includes('feijao')) return TACO_ITEMS_DB[2];
    if (nameLower.includes('frango') || nameLower.includes('peito')) return TACO_ITEMS_DB[4];
    if (nameLower.includes('carne') || nameLower.includes('alcatra') || nameLower.includes('bife')) return TACO_ITEMS_DB[5];
    if (nameLower.includes('ovo')) return TACO_ITEMS_DB[9];
    if (nameLower.includes('batata')) return TACO_ITEMS_DB[11];
    if (nameLower.includes('salada') || nameLower.includes('alface')) return TACO_ITEMS_DB[14];
    if (nameLower.includes('pão') || nameLower.includes('pao')) return TACO_ITEMS_DB[26];
    if (nameLower.includes('macarrão') || nameLower.includes('massa')) return TACO_ITEMS_DB[28];

    return null;
  }
}
