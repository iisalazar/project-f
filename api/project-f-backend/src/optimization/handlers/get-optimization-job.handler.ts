import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../prisma/prisma.service';
import { GetOptimizationJobCommand } from '../commands/get-optimization-job.command';

@CommandHandler(GetOptimizationJobCommand)
export class GetOptimizationJobHandler implements ICommandHandler<GetOptimizationJobCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: GetOptimizationJobCommand) {
    const { ownerUserId, jobId } = command;
    if (!this.isUuid(jobId)) {
      throw new BadRequestException('jobId must be a valid UUID');
    }
    const job = await this.prisma.optimizationJob.findFirst({
      where: { id: jobId, ownerUserId },
      include: {
        logs: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            type: true,
            message: true,
            createdAt: true,
            data: true,
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return job;
  }

  private isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }
}
