export class ListOptimizationJobsCommand {
  constructor(
    public readonly ownerUserId: string,
    public readonly params: {
      status?: string;
      createdAtFrom?: string;
      createdAtTo?: string;
      page?: number;
      pageSize?: number;
    },
  ) {}
}
