import { Injectable } from '@nestjs/common';
import { SqsMessageHandler } from '@ssut/nestjs-sqs';
import { OptimizationProcessorService } from './services/optimization-processor.service';

@Injectable()
export class OptimizationSqsHandler {
  constructor(private readonly processor: OptimizationProcessorService) {}

  @SqsMessageHandler('optimize-job-1', false)
  async handleMessage1(message: { Body?: string }) {
    await this.process(message);
  }

  @SqsMessageHandler('optimize-job-2', false)
  async handleMessage2(message: { Body?: string }) {
    await this.process(message);
  }

  private async process(message: { Body?: string }) {
    if (!message.Body) {
      return;
    }

    let jobId = '';
    try {
      const parsed = JSON.parse(message.Body);
      jobId = parsed.jobId as string;
    } catch {
      return;
    }

    if (!jobId) {
      return;
    }

    await this.processor.processJob(jobId);
  }
}
