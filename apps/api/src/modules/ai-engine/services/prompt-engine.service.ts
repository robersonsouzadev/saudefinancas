import { Injectable } from '@nestjs/common';

@Injectable()
export class PromptEngineService {
  compile(templateName: string, variables: Record<string, any>): string {
    // Mock template compilation
    return `System prompt for ${variables.userId || 'user'}`;
  }
}
