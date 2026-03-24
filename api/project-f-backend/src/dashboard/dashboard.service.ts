import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(organizationId: string, date: string) {
    const validatedDate = this.assertDate(date);

    const [planRows, activityRows] = await Promise.all([
      this.prisma.$queryRaw<Array<{ status: string; cnt: bigint }>>(
        Prisma.sql`
          SELECT rp."status", COUNT(*)::bigint AS cnt
          FROM "RoutePlan" rp
          WHERE rp."organizationId" = ${organizationId}::uuid
            AND rp."planDate" = ${validatedDate}::date
          GROUP BY rp."status"
        `,
      ),
      this.prisma.$queryRaw<
        Array<{
          activeDrivers: bigint;
          totalStops: bigint;
          completedStops: bigint;
        }>
      >(
        Prisma.sql`
          SELECT
            COUNT(DISTINCT t."driverId")::bigint AS "activeDrivers",
            COUNT(ts."id")::bigint               AS "totalStops",
            COUNT(ts."id") FILTER (WHERE ts."status" = 'completed')::bigint AS "completedStops"
          FROM "Trip" t
          LEFT JOIN "TripStop" ts ON ts."tripId" = t."id"
          WHERE t."organizationId" = ${organizationId}::uuid
            AND t."tripDate" = ${validatedDate}::date
        `,
      ),
    ]);

    const byStatus = Object.fromEntries(
      planRows.map((r) => [r.status, Number(r.cnt)]),
    );
    const activity = activityRows[0];

    return {
      date: validatedDate,
      routePlans: {
        total: planRows.reduce((s, r) => s + Number(r.cnt), 0),
        inProgress:
          (byStatus['dispatched'] ?? 0) + (byStatus['in_progress'] ?? 0),
        completed: byStatus['completed'] ?? 0,
      },
      drivers: {
        active: Number(activity?.activeDrivers ?? 0),
      },
      stops: {
        done: Number(activity?.completedStops ?? 0),
        total: Number(activity?.totalStops ?? 0),
      },
    };
  }

  private assertDate(value: string): string {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException(
        `Invalid date: "${value}". Expected YYYY-MM-DD.`,
      );
    }
    return value;
  }
}
