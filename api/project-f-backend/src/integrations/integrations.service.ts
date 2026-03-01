import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHmac } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  ImportStopsCsvDto,
  IngestExternalOrderDto,
  UpsertWebhookSubscriptionDto,
} from './dto/webhook-subscription.dto';

export interface WebhookSubscriptionRow {
  id: string;
  organizationId: string | null;
  url: string;
  secret: string;
  eventFilters: Prisma.JsonValue | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class IntegrationsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertWebhook(
    organizationId: string,
    payload: UpsertWebhookSubscriptionDto,
  ) {
    if (!payload?.url?.trim()) {
      throw new BadRequestException('url is required');
    }
    if (!payload?.secret?.trim()) {
      throw new BadRequestException('secret is required');
    }

    const rows = await this.prisma.$queryRaw<WebhookSubscriptionRow[]>(Prisma.sql`
      INSERT INTO "WebhookSubscription"
        ("id", "organizationId", "url", "secret", "eventFilters", "isActive", "createdAt", "updatedAt")
      VALUES
        (
          gen_random_uuid(),
          ${organizationId}::uuid,
          ${payload.url.trim()},
          ${payload.secret.trim()},
          ${payload.eventFilters ? JSON.stringify(payload.eventFilters) : null}::jsonb,
          ${payload.isActive ?? true},
          NOW(),
          NOW()
        )
      RETURNING *
    `);

    return rows[0];
  }

  async listWebhooks(organizationId: string) {
    return this.prisma.$queryRaw<WebhookSubscriptionRow[]>(Prisma.sql`
      SELECT *
      FROM "WebhookSubscription"
      WHERE "organizationId" = ${organizationId}::uuid
      ORDER BY "createdAt" DESC
    `);
  }

  async removeWebhook(organizationId: string, id: string) {
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      DELETE FROM "WebhookSubscription"
      WHERE "id" = ${id}::uuid
      AND "organizationId" = ${organizationId}::uuid
      RETURNING "id"
    `);

    if (!rows[0]) {
      throw new NotFoundException('Webhook subscription not found');
    }

    return { success: true };
  }

  async buildSignedDelivery(
    organizationId: string,
    id: string,
    payload: Record<string, unknown>,
  ) {
    const rows = await this.prisma.$queryRaw<
      Array<{ id: string; url: string; secret: string; isActive: boolean }>
    >(Prisma.sql`
      SELECT "id", "url", "secret", "isActive"
      FROM "WebhookSubscription"
      WHERE "id" = ${id}::uuid
      AND "organizationId" = ${organizationId}::uuid
      LIMIT 1
    `);

    const sub = rows[0];
    if (!sub) {
      throw new NotFoundException('Webhook subscription not found');
    }
    if (!sub.isActive) {
      throw new BadRequestException('Webhook subscription is inactive');
    }

    const body = JSON.stringify(payload);
    const signature = createHmac('sha256', sub.secret).update(body).digest('hex');

    return {
      targetUrl: sub.url,
      signature,
      payload,
    };
  }

  async exportStopsCsv(organizationId: string) {
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        externalRef: string | null;
        location: Prisma.JsonValue;
        serviceSeconds: number | null;
        priority: number | null;
      }>
    >(Prisma.sql`
      SELECT "id", "externalRef", "location", "serviceSeconds", "priority"
      FROM "Stop"
      WHERE "organizationId" = ${organizationId}::uuid
      ORDER BY "createdAt" ASC
    `);

    const header = 'id,externalRef,lon,lat,serviceSeconds,priority';
    const lines = rows.map((row) => {
      const location = Array.isArray(row.location) ? (row.location as number[]) : [null, null];
      const lon = Number(location[0] ?? '');
      const lat = Number(location[1] ?? '');
      return [
        row.id,
        row.externalRef ?? '',
        Number.isFinite(lon) ? String(lon) : '',
        Number.isFinite(lat) ? String(lat) : '',
        row.serviceSeconds ?? '',
        row.priority ?? '',
      ].join(',');
    });

    return [header, ...lines].join('\n');
  }

  async importStopsCsv(organizationId: string, payload: ImportStopsCsvDto) {
    if (!payload?.csv?.trim()) {
      throw new BadRequestException('csv is required');
    }

    const lines = payload.csv
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length < 2) {
      throw new BadRequestException('csv must include header and at least one row');
    }

    let imported = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i += 1) {
      const cols = lines[i].split(',');
      if (cols.length < 6) {
        errors.push(`line ${i + 1}: expected 6 columns`);
        continue;
      }

      const externalRef = cols[1]?.trim() || null;
      const lon = Number(cols[2]);
      const lat = Number(cols[3]);
      const serviceSeconds = cols[4] ? Number(cols[4]) : null;
      const priority = cols[5] ? Number(cols[5]) : null;

      if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
        errors.push(`line ${i + 1}: invalid location`);
        continue;
      }

      await this.prisma.$executeRaw`
        INSERT INTO "Stop"
          ("id", "organizationId", "externalRef", "location", "serviceSeconds", "priority", "createdAt", "updatedAt")
        VALUES
          (
            gen_random_uuid(),
            ${organizationId}::uuid,
            ${externalRef},
            ${JSON.stringify([lon, lat])}::jsonb,
            ${serviceSeconds},
            ${priority},
            NOW(),
            NOW()
          )
      `;
      imported += 1;
    }

    return {
      imported,
      failed: errors.length,
      errors,
    };
  }

  async ingestExternalOrder(
    organizationId: string,
    payload: IngestExternalOrderDto,
  ) {
    if (!payload?.externalRef?.trim()) {
      throw new BadRequestException('externalRef is required');
    }
    if (!Array.isArray(payload.location) || payload.location.length !== 2) {
      throw new BadRequestException('location must be [lon, lat]');
    }

    const rows = await this.prisma.$queryRaw<
      Array<{ id: string; externalRef: string | null }>
    >(Prisma.sql`
      INSERT INTO "Stop"
        ("id", "organizationId", "externalRef", "location", "serviceSeconds", "priority", "createdAt", "updatedAt")
      VALUES
        (
          gen_random_uuid(),
          ${organizationId}::uuid,
          ${payload.externalRef.trim()},
          ${JSON.stringify(payload.location)}::jsonb,
          ${payload.serviceSeconds ?? null},
          ${payload.priority ?? null},
          NOW(),
          NOW()
        )
      RETURNING "id", "externalRef"
    `);

    return {
      orderIngested: true,
      stopId: rows[0]?.id,
      externalRef: rows[0]?.externalRef,
    };
  }
}
