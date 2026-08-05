import { Injectable } from '@nestjs/common';

@Injectable()
export class WebhookQueueService {
  async addJob(payload: any) {
    // Add job to BullMQ
    return { jobId: 'mock-id' };
  }
}
