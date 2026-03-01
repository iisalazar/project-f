import { BadRequestException, Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateV2OptimizationCommand } from '../commands/create-v2-optimization.command';
import { V2PayloadService } from '../services/v2-payload.service';

@CommandHandler(CreateV2OptimizationCommand)
@Injectable()
export class CreateV2OptimizationHandler implements ICommandHandler<CreateV2OptimizationCommand> {
  private readonly sqsClient: SQSClient;
  private readonly queueUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly payloadService: V2PayloadService,
  ) {
    this.queueUrl = process.env.SQS_OPTIMIZE_QUEUE_URL ?? '';
    this.sqsClient = new SQSClient({
      region: process.env.AWS_REGION ?? 'ap-southeast-1',
      endpoint: process.env.SQS_ENDPOINT,
    });
  }

  async execute(command: CreateV2OptimizationCommand) {
    const { payload, ownerUserId, organizationId } = command;
    if (!payload) {
      throw new BadRequestException('Request body is required');
    }

    const normalized = await this.payloadService.vroomToLegacyPayload(
      payload,
      organizationId,
      this.prisma,
    );
    const jobPayload = {
      ...normalized,
      organizationId,
    };

    const job = await this.prisma.optimizationJob.create({
      data: {
        ownerUserId,
        version: 'v2',
        status: 'enqueued',
        data: jobPayload as unknown as Prisma.InputJsonValue,
        dataVersion: 'v2-vroom',
      },
    });

    await this.prisma.optimizationJobLog.create({
      data: {
        optimizationJobId: job.id,
        type: 'info',
        message: 'V2 job enqueued',
      },
    });

    if (!this.queueUrl) {
      throw new BadRequestException('SQS_OPTIMIZE_QUEUE_URL is not configured');
    }

    await this.sqsClient.send(
      new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify({ jobId: job.id }),
      }),
    );

    return { jobId: job.id };
  }
}
