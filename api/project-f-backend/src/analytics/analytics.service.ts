import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async aggregateKpis(organizationId: string, from: string, to: string) {
    const fromDate = this.assertDate(from, 'from');
    const toDate = this.assertDate(to, 'to');
    if (fromDate > toDate) {
      throw new BadRequestException('from must be less than or equal to to');
    }

    const summary = await this.summaryReport(organizationId, fromDate, toDate);
    const metricDate = toDate;

    const metrics = [
      { key: 'on_time_rate', value: summary.onTimeRate },
      { key: 'avg_stop_duration_seconds', value: summary.avgStopDurationSeconds },
      { key: 'total_drive_seconds', value: summary.totalDriveSeconds },
      { key: 'total_idle_seconds', value: summary.totalIdleSeconds },
    ];

    for (const metric of metrics) {
      await this.prisma.$executeRaw`
        INSERT INTO "AnalyticsSnapshot"
          ("id", "organizationId", "metricDate", "metricKey", "metricValue", "createdAt")
        VALUES
          (
            gen_random_uuid(),
            ${organizationId}::uuid,
            ${metricDate}::date,
            ${metric.key},
            ${metric.value},
            NOW()
          )
        ON CONFLICT ("organizationId", "metricDate", "metricKey")
        DO UPDATE SET
          "metricValue" = EXCLUDED."metricValue"
      `;
    }

    return {
      aggregated: metrics.length,
      metricDate,
      metrics,
    };
  }

  async summaryReport(organizationId: string, from: string, to: string) {
    const rows = await this.prisma.$queryRaw<
      Array<{
        totalStops: bigint;
        onTimeStops: bigint;
        avgStopDurationSeconds: number | null;
        totalDriveSeconds: number | null;
        totalIdleSeconds: number | null;
      }>
    >(Prisma.sql`
      SELECT
        COUNT(ts."id")::bigint AS "totalStops",
        COUNT(ts."id") FILTER (
          WHERE ts."completedAt" IS NOT NULL
          AND (ts."etaAt" IS NULL OR ts."completedAt" <= ts."etaAt")
        )::bigint AS "onTimeStops",
        AVG(EXTRACT(EPOCH FROM (ts."completedAt" - ts."arrivedAt")))
          FILTER (WHERE ts."completedAt" IS NOT NULL AND ts."arrivedAt" IS NOT NULL)
          AS "avgStopDurationSeconds",
        SUM(EXTRACT(EPOCH FROM (t."endAt" - t."startAt")))
          FILTER (WHERE t."startAt" IS NOT NULL AND t."endAt" IS NOT NULL)
          AS "totalDriveSeconds",
        SUM(GREATEST(0, EXTRACT(EPOCH FROM (t."endAt" - t."startAt"))
          - COALESCE(EXTRACT(EPOCH FROM (ts."completedAt" - ts."arrivedAt")), 0)))
          FILTER (WHERE t."startAt" IS NOT NULL AND t."endAt" IS NOT NULL)
          AS "totalIdleSeconds"
      FROM "Trip" t
      LEFT JOIN "TripStop" ts ON ts."tripId" = t."id"
      WHERE t."organizationId" = ${organizationId}::uuid
      AND t."tripDate" >= ${from}::date
      AND t."tripDate" <= ${to}::date
    `);

    const row = rows[0] ?? {
      totalStops: 0n,
      onTimeStops: 0n,
      avgStopDurationSeconds: 0,
      totalDriveSeconds: 0,
      totalIdleSeconds: 0,
    };

    const totalStops = Number(row.totalStops ?? 0n);
    const onTimeStops = Number(row.onTimeStops ?? 0n);

    return {
      from,
      to,
      totalStops,
      onTimeStops,
      onTimeRate: totalStops > 0 ? onTimeStops / totalStops : 0,
      avgStopDurationSeconds: Number(row.avgStopDurationSeconds ?? 0),
      totalDriveSeconds: Number(row.totalDriveSeconds ?? 0),
      totalIdleSeconds: Number(row.totalIdleSeconds ?? 0),
    };
  }

  async driverScorecards(organizationId: string, from: string, to: string) {
    const fromDate = this.assertDate(from, 'from');
    const toDate = this.assertDate(to, 'to');

    return this.prisma.$queryRaw<
      Array<{
        driverId: string;
        driverName: string;
        totalStops: bigint;
        completedStops: bigint;
        failedStops: bigint;
        onTimeStops: bigint;
      }>
    >(Prisma.sql`
      SELECT
        d."id" AS "driverId",
        d."name" AS "driverName",
        COUNT(ts."id")::bigint AS "totalStops",
        COUNT(ts."id") FILTER (WHERE ts."status" = 'completed')::bigint AS "completedStops",
        COUNT(ts."id") FILTER (WHERE ts."status" = 'failed')::bigint AS "failedStops",
        COUNT(ts."id") FILTER (
          WHERE ts."completedAt" IS NOT NULL
          AND (ts."etaAt" IS NULL OR ts."completedAt" <= ts."etaAt")
        )::bigint AS "onTimeStops"
      FROM "Trip" t
      JOIN "Driver" d ON d."id" = t."driverId"
      LEFT JOIN "TripStop" ts ON ts."tripId" = t."id"
      WHERE t."organizationId" = ${organizationId}::uuid
      AND t."tripDate" >= ${fromDate}::date
      AND t."tripDate" <= ${toDate}::date
      GROUP BY d."id", d."name"
      ORDER BY d."name" ASC
    `);
  }

  private assertDate(value: string, field: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException(`${field} must be in YYYY-MM-DD format`);
    }
    return value;
  }
}
