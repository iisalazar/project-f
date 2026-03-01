import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DriversService } from './drivers.service';

describe('DriversService', () => {
  it('creates driver', async () => {
    const tx = {
      user: {
        upsert: jest.fn(),
      },
      $executeRaw: jest.fn(),
      $queryRaw: jest.fn().mockResolvedValue([
        {
          id: 'driver-1',
          organizationId: 'org-1',
          userId: null,
          name: 'Driver 1',
          email: null,
          phone: null,
          state: 'idle',
          shiftStartSeconds: null,
          shiftEndSeconds: null,
          startLocation: null,
          endLocation: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ]),
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    } as any;

    const service = new DriversService(prisma);
    const result = await service.create('org-1', { name: 'Driver 1' });

    expect(result.name).toBe('Driver 1');
  });

  it('rejects invalid uuid on getById', async () => {
    const prisma = { $queryRaw: jest.fn() } as any;
    const service = new DriversService(prisma);

    await expect(service.getById('org-1', 'bad-id')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws not found when update result is empty', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([]),
    } as any;

    const service = new DriversService(prisma);

    await expect(
      service.update(
        '11111111-1111-4111-8111-111111111111',
        '22222222-2222-4222-8222-222222222222',
        { name: 'updated' },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('maps driver to login user when createLoginUser is enabled', async () => {
    const tx = {
      user: {
        upsert: jest
          .fn()
          .mockResolvedValue({
            id: '11111111-1111-4111-8111-111111111111',
          }),
      },
      $executeRaw: jest.fn().mockResolvedValue(1),
      $queryRaw: jest.fn().mockResolvedValue([
        {
          id: 'driver-2',
          organizationId: 'org-1',
          userId: '11111111-1111-4111-8111-111111111111',
          name: 'Driver 2',
          email: 'driver@example.com',
          phone: null,
          state: 'idle',
          shiftStartSeconds: null,
          shiftEndSeconds: null,
          startLocation: null,
          endLocation: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ]),
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    } as any;

    const service = new DriversService(prisma);
    const result = await service.create('org-1', {
      name: 'Driver 2',
      email: 'driver@example.com',
      createLoginUser: true,
    });

    expect(tx.user.upsert).toHaveBeenCalledTimes(1);
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(result.userId).toBe('11111111-1111-4111-8111-111111111111');
  });
});
