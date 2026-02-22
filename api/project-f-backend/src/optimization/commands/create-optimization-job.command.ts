import type { CreateOptimizationJobRequestDto } from '../dto/create-optimization-job.dto';

export class CreateOptimizationJobCommand {
  constructor(
    public readonly payload: CreateOptimizationJobRequestDto,
    public readonly ownerUserId: string,
  ) {}
}
