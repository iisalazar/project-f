import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../prisma/prisma.service';
import { ListOptimizationJobsCommand } from '../commands/list-optimization-jobs.command';

@CommandHandler(ListOptimizationJobsCommand)
export class ListOptimizationJobsHandler implements ICommandHandler<ListOptimizationJobsCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: ListOptimizationJobsCommand) {
    const { ownerUserId, params } = command;
    const pageSize = Math.min(Math.max(params.pageSize ?? 20, 1), 100);
    const page = Math.max(params.page ?? 1, 1);

    const where: Record<string, any> = { ownerUserId };
    if (params.status) {
      where.status = params.status;
    }
    if (params.createdAtFrom || params.createdAtTo) {
      where.createdAt = {};
      if (params.createdAtFrom) {
        where.createdAt.gte = new Date(params.createdAtFrom);
      }
      if (params.createdAtTo) {
        where.createdAt.lte = new Date(params.createdAtTo);
      }
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.optimizationJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          version: true,
        },
      }),
      this.prisma.optimizationJob.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
    };
  }
}
