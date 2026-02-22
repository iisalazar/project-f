export class GetOptimizationJobCommand {
  constructor(public readonly ownerUserId: string, public readonly jobId: string) {}
}
