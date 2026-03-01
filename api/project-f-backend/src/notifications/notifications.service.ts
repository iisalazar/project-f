import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { UpsertNotificationTemplateDto } from './dto/notification-template.dto';

export interface NotificationTemplateRow {
  id: string;
  organizationId: string;
  eventType: string;
  channel: string;
  templateBody: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertTemplate(
    organizationId: string,
    payload: UpsertNotificationTemplateDto,
  ) {
    if (!payload?.eventType?.trim()) {
      throw new BadRequestException('eventType is required');
    }
    if (!payload?.channel?.trim()) {
      throw new BadRequestException('channel is required');
    }
    if (!payload?.templateBody?.trim()) {
      throw new BadRequestException('templateBody is required');
    }

    const rows = await this.prisma.$queryRaw<NotificationTemplateRow[]>(Prisma.sql`
      INSERT INTO "NotificationTemplate"
        ("id", "organizationId", "eventType", "channel", "templateBody", "createdAt", "updatedAt")
      VALUES
        (
          gen_random_uuid(),
          ${organizationId}::uuid,
          ${payload.eventType.trim()},
          ${payload.channel.trim()},
          ${payload.templateBody.trim()},
          NOW(),
          NOW()
        )
      ON CONFLICT ("organizationId", "eventType", "channel")
      DO UPDATE SET
        "templateBody" = EXCLUDED."templateBody",
        "updatedAt" = NOW()
      RETURNING *
    `);

    return rows[0];
  }

  async listTemplates(organizationId: string) {
    return this.prisma.$queryRaw<NotificationTemplateRow[]>(Prisma.sql`
      SELECT *
      FROM "NotificationTemplate"
      WHERE "organizationId" = ${organizationId}::uuid
      ORDER BY "createdAt" DESC
    `);
  }

  async removeTemplate(organizationId: string, templateId: string) {
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      DELETE FROM "NotificationTemplate"
      WHERE "id" = ${templateId}::uuid
      AND "organizationId" = ${organizationId}::uuid
      RETURNING "id"
    `);

    if (!rows[0]) {
      throw new NotFoundException('Notification template not found');
    }

    return { success: true };
  }

  async enqueueEvent(
    ownerUserId: string,
    organizationId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ) {
    const templateRows = await this.prisma.$queryRaw<
      Array<{ templateBody: string; channel: string }>
    >(Prisma.sql`
      SELECT "templateBody", "channel"
      FROM "NotificationTemplate"
      WHERE "organizationId" = ${organizationId}::uuid
      AND "eventType" = ${eventType}
      ORDER BY "updatedAt" DESC
      LIMIT 1
    `);

    if (!templateRows[0]) {
      return { queued: false };
    }

    const recipient =
      (typeof payload.recipient === 'string' && payload.recipient) ||
      'customer@unknown.local';

    await this.prisma.$executeRaw`
      INSERT INTO "NotificationEvent"
        ("id", "ownerUserId", "eventType", "channel", "recipient", "payload", "status", "createdAt")
      VALUES
        (
          gen_random_uuid(),
          ${ownerUserId}::uuid,
          ${eventType},
          ${templateRows[0].channel},
          ${recipient},
          ${JSON.stringify({ templateBody: templateRows[0].templateBody, data: payload })}::jsonb,
          'pending',
          NOW()
        )
    `;

    return { queued: true };
  }

  async processPending(limit = 100) {
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id"
      FROM "NotificationEvent"
      WHERE "status" = 'pending'
      ORDER BY "createdAt" ASC
      LIMIT ${Math.max(1, Math.min(limit, 500))}
    `);

    if (rows.length === 0) {
      return { processed: 0 };
    }

    await this.prisma.$executeRaw`
      UPDATE "NotificationEvent"
      SET "status" = 'sent'
      WHERE "id" IN (${Prisma.join(rows.map((row) => Prisma.sql`${row.id}::uuid`))})
    `;

    return { processed: rows.length };
  }
}
