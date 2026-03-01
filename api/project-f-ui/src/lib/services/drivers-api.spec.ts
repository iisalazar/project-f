import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDriver, deleteDriver, getDriver, listDrivers, updateDriver } from './drivers-api';

const apiFetchMock = vi.fn();

vi.mock('$lib/api', () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

describe('drivers-api', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it('lists drivers with query params', async () => {
    apiFetchMock.mockResolvedValue({ items: [] });
    await listDrivers({ search: 'john', state: 'idle', page: 2, pageSize: 10 });
    expect(apiFetchMock).toHaveBeenCalledWith('/drivers?search=john&state=idle&page=2&pageSize=10');
  });

  it('calls get/create/update/delete endpoints', async () => {
    apiFetchMock.mockResolvedValue({});

    await getDriver('d1');
    await createDriver({ name: 'Driver 1' });
    await updateDriver('d1', { name: 'Updated' });
    await deleteDriver('d1');

    expect(apiFetchMock).toHaveBeenNthCalledWith(1, '/drivers/d1');
    expect(apiFetchMock).toHaveBeenNthCalledWith(2, '/drivers', {
      method: 'POST',
      body: JSON.stringify({ name: 'Driver 1' }),
    });
    expect(apiFetchMock).toHaveBeenNthCalledWith(3, '/drivers/d1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated' }),
    });
    expect(apiFetchMock).toHaveBeenNthCalledWith(4, '/drivers/d1', {
      method: 'DELETE',
    });
  });
});
