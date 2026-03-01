import type { VroomOptimizationRequestDto } from '../dto/vroom-optimization.dto';

export class CreateV2OptimizationCommand {
  constructor(
    public readonly payload: VroomOptimizationRequestDto,
    public readonly ownerUserId: string,
    public readonly organizationId: string,
  ) {}
}
