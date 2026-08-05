import { Injectable } from '@nestjs/common';

export interface FoodItemInfo {
  id: string;
  name: string;
  caloriesPer100g: number;
  carbsPer100g: number;
  proteinPer100g: number;
  fatPer100g: number;
  fiberPer100g: number;
  source: 'TACO' | 'USDA' | 'CUSTOM';
}

@Injectable()
export class FoodDatabaseService {
  private tacoDatabase: Map<string, FoodItemInfo> = new Map();

  constructor() {
    this.initializeTacoDatabase();
  }

  private initializeTacoDatabase() {
    const rice: FoodItemInfo = {
      id: 'taco-1',
      name: 'Arroz branco cozido',
      caloriesPer100g: 130,
      carbsPer100g: 28.1,
      proteinPer100g: 2.5,
      fatPer100g: 0.2,
      fiberPer100g: 1.6,
      source: 'TACO',
    };
    const beans: FoodItemInfo = {
      id: 'taco-2',
      name: 'Feijão carioca cozido',
      caloriesPer100g: 76,
      carbsPer100g: 13.6,
      proteinPer100g: 4.8,
      fatPer100g: 0.5,
      fiberPer100g: 8.5,
      source: 'TACO',
    };
    const beef: FoodItemInfo = {
      id: 'taco-3',
      name: 'Alcatra grelhada',
      caloriesPer100g: 241,
      carbsPer100g: 0,
      proteinPer100g: 31.9,
      fatPer100g: 11.6,
      fiberPer100g: 0,
      source: 'TACO',
    };
    
    this.tacoDatabase.set('arroz branco', rice);
    this.tacoDatabase.set('feijao', beans);
    this.tacoDatabase.set('alcatra', beef);
  }

  async searchFood(query: string): Promise<FoodItemInfo[]> {
    const results: FoodItemInfo[] = [];
    const normalizedQuery = query.toLowerCase();
    
    for (const [key, food] of this.tacoDatabase.entries()) {
      if (key.includes(normalizedQuery) || food.name.toLowerCase().includes(normalizedQuery)) {
        results.push(food);
      }
    }
    
    return results;
  }

  async getFoodById(id: string): Promise<FoodItemInfo | null> {
    for (const food of this.tacoDatabase.values()) {
      if (food.id === id) {
        return food;
      }
    }
    return null;
  }
}
