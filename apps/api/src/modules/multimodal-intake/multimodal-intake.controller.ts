import { Controller, Post, Body, UseGuards, Req, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VoiceProcessorService } from './services/voice-processor.service';
import { VisionProcessorService } from './services/vision-processor.service';
import { IntakeClassifierService } from './services/intake-classifier.service';
import { IntakeDispatcherService } from './services/intake-dispatcher.service';

@Controller('multimodal-intake')
@UseGuards(JwtAuthGuard)
export class MultimodalIntakeController {
  constructor(
    private readonly voiceProcessor: VoiceProcessorService,
    private readonly visionProcessor: VisionProcessorService,
    private readonly intakeClassifier: IntakeClassifierService,
    private readonly intakeDispatcher: IntakeDispatcherService,
  ) {}

  @Post('voice')
  @UseInterceptors(FileInterceptor('audio'))
  async processVoice(@Req() req: any, @UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('Audio file is required');
    }

    const userId = req.user.id;
    const text = await this.voiceProcessor.transcribeAudio(file.buffer, file.mimetype);
    const classifiedData = await this.intakeClassifier.classifyText(text);
    return this.intakeDispatcher.dispatch(userId, classifiedData);
  }

  @Post('photo')
  async processPhoto(
    @Req() req: any,
    @Body() body: { image: string; mimeType: string; context?: string; provider?: string }
  ) {
    if (!body.image || !body.mimeType) {
      throw new BadRequestException('Image and mimeType are required');
    }

    const userId = req.user.id;
    const classifiedData = await this.visionProcessor.analyzeImage(body.image, body.mimeType, body.context, body.provider);
    return this.intakeDispatcher.dispatch(userId, classifiedData, { imageBase64: body.image, mimeType: body.mimeType });
  }

  @Post('text')
  async processText(@Req() req: any, @Body() body: { text: string }) {
    if (!body.text) {
      throw new BadRequestException('Text is required');
    }

    const userId = req.user.id;
    const classifiedData = await this.intakeClassifier.classifyText(body.text);
    return this.intakeDispatcher.dispatch(userId, classifiedData);
  }
}
