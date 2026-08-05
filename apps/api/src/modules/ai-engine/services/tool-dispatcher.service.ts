import { Injectable } from '@nestjs/common';

@Injectable()
export class ToolDispatcherService {
  async dispatch(toolName: string, args: any) {
    const tools = [
      'log_meal', 'log_health', 'log_transaction', 'get_daily_summary',
      'get_financial_report', 'get_health_trends', 'process_voice_note', 'ocr_receipt'
    ];

    if (!tools.includes(toolName)) {
      throw new Error(`Tool ${toolName} not found`);
    }

    // Execute tool
    return { success: true, toolName, args };
  }
}
