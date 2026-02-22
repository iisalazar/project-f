import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import Polly from 'polly-js';
import { Prisma } from '@prisma/client';
import type { OptimizationJobResultDto } from '../dto/optimization-result.dto';

const VROOM_URL = process.env.VROOM_URL ?? 'http://localhost:3000/';

@Injectable()
export class OptimizationProcessorService {
  private readonly retryPolicy = Polly().waitAndRetry([1000, 2000, 4000]);

  constructor(private readonly prisma: PrismaService) {}

  async processJob(jobId: string) {
    const job = await this.prisma.optimizationJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return;
    }

    await this.prisma.optimizationJob.update({
      where: { id: jobId },
      data: { status: 'processing' },
    });

    await this.prisma.optimizationJobLog.create({
      data: {
        optimizationJobId: jobId,
        type: 'info',
        message: 'Processing started',
      },
    });

    try {
      const payload = job.data as any;
      const vroomRequest = this.buildVroomRequest(payload);
      // eslint-disable-next-line no-console
      console.log('Sending vroom request', JSON.stringify(vroomRequest));

      const vroomResponse = await this.retryPolicy.executeForPromise<OptimizationJobResultDto>(
        async () => {
          const res = await fetch(VROOM_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(vroomRequest),
          });
          if (!res.ok) {
            const text = await res.text();
            throw new Error(`VROOM error: ${res.status} ${text}`);
          }
          return res.json();
        },
      );

      await this.prisma.optimizationJob.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          result: vroomResponse as unknown as Prisma.InputJsonValue,
          resultVersion: 'v1',
          errorMessage: null,
          lastErrorAt: null,
        },
      });

      await this.prisma.optimizationJobLog.create({
        data: {
          optimizationJobId: jobId,
          type: 'info',
          message: 'Processing completed',
        },
      });
    } catch (error: any) {
      await this.prisma.optimizationJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          errorMessage: error?.message ?? 'Unknown error',
          lastErrorAt: new Date(),
        },
      });

      await this.prisma.optimizationJobLog.create({
        data: {
          optimizationJobId: jobId,
          type: 'error',
          message: 'Processing failed',
          data: { error: error?.message ?? 'Unknown error' },
        },
      });
    }
  }

  private buildVroomRequest(payload: any) {
    const vehicles = payload.drivers.map((driver: any) => ({
      id: driver.id,
      start: driver.startLocation,
      end: driver.endLocation,
      time_window: driver.availabilityWindow ?? [28800, 61200],
      max_tasks: driver.maxTasks ?? 4,
    }));

    const jobs = payload.stops.map((stop: any) => ({
      id: stop.id,
      location: stop.location,
      service: stop.serviceSeconds ?? 300,
    }));

    return {
      vehicles,
      jobs,
      options: { g: true },
    };
  }
}
