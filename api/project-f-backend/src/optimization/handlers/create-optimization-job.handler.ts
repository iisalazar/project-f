import { BadRequestException, Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOptimizationJobCommand } from '../commands/create-optimization-job.command';

const DEFAULT_WINDOW: [number, number] = [8 * 3600, 17 * 3600];

@CommandHandler(CreateOptimizationJobCommand)
@Injectable()
export class CreateOptimizationJobHandler implements ICommandHandler<CreateOptimizationJobCommand> {
  private readonly sqsClient: SQSClient;
  private readonly queueUrl: string;

  constructor(private readonly prisma: PrismaService) {
    this.queueUrl = process.env.SQS_OPTIMIZE_QUEUE_URL ?? '';
    this.sqsClient = new SQSClient({
      region: process.env.AWS_REGION ?? 'ap-southeast-1',
      endpoint: process.env.SQS_ENDPOINT,
    });
  }

  async execute(command: CreateOptimizationJobCommand) {
    const { payload, ownerUserId } = command;
    if (!payload) {
      throw new BadRequestException('Request body is required');
    }

    const { drivers, stops } = payload;
    if (!Array.isArray(drivers) || drivers.length === 0) {
      throw new BadRequestException('drivers must be a non-empty array');
    }
    if (!Array.isArray(stops) || stops.length === 0) {
      throw new BadRequestException('stops must be a non-empty array');
    }

    const driverIds = new Set<string>();
    for (const driver of drivers) {
      if (!driver?.id || !driver?.name) {
        throw new BadRequestException('driver.id and driver.name are required');
      }
      if (driverIds.has(driver.id)) {
        throw new BadRequestException('driver ids must be unique');
      }
      driverIds.add(driver.id);
      this.assertLocation(driver.startLocation, 'driver.startLocation');
      this.assertLocation(driver.endLocation, 'driver.endLocation');
    }

    const stopIds = new Set<string>();
    for (const stop of stops) {
      if (!stop?.id) {
        throw new BadRequestException('stop.id is required');
      }
      if (stopIds.has(stop.id)) {
        throw new BadRequestException('stop ids must be unique');
      }
      stopIds.add(stop.id);
      this.assertLocation(stop.location, 'stop.location');
    }

    const normalized = {
      drivers: drivers.map((driver) => ({
        ...driver,
        availabilityWindow: driver.availabilityWindow ?? DEFAULT_WINDOW,
        serviceSeconds: undefined,
      })),
      stops: stops.map((stop) => ({
        ...stop,
        serviceSeconds: stop.serviceSeconds ?? 300,
      })),
    };

    const job = await this.prisma.optimizationJob.create({
      data: {
        ownerUserId,
        version: 'v1',
        status: 'enqueued',
        data: normalized,
        dataVersion: 'v1',
      },
    });

    await this.prisma.optimizationJobLog.create({
      data: {
        optimizationJobId: job.id,
        type: 'info',
        message: 'Job enqueued',
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

  private assertLocation(value: unknown, label: string) {
    if (!Array.isArray(value) || value.length !== 2) {
      throw new BadRequestException(`${label} must be [lon, lat]`);
    }
    const [lon, lat] = value as number[];
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
      throw new BadRequestException(`${label} must be numbers`);
    }
    if (lon < -180 || lon > 180 || lat < -90 || lat > 90) {
      throw new BadRequestException(`${label} out of range`);
    }
  }
}
