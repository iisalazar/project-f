import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createPlan,
  dispatchRoute,
  dispatchStop,
  getDriverStops,
  getOptimizationSolution,
  getOptimizationStatus,
  getTodayTrip,
  updateDriverStopStatus,
} from './operations-api';

const apiFetchMock = vi.fn();

vi.mock('$lib/api', () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

describe('operations-api', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it('createPlan posts to /plan/optimize', async () => {
    apiFetchMock.mockResolvedValue({ jobId: 'job-1' });

    const payload = {
      vehicles: [{ id: 1, start: [121, 14] as [number, number] }],
      jobs: [{ id: 10, location: [121.1, 14.1] as [number, number] }],
    };
    const result = await createPlan(payload);

    expect(result).toEqual({ jobId: 'job-1' });
    expect(apiFetchMock).toHaveBeenCalledWith('/plan/optimize', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  });

  it('calls optimization status and solution endpoints', async () => {
    apiFetchMock.mockResolvedValueOnce({ id: 'job-1', status: 'enqueued', attempts: 0 });
    apiFetchMock.mockResolvedValueOnce({ routes: [] });

    await getOptimizationStatus('job-1');
    await getOptimizationSolution('job-1');

    expect(apiFetchMock).toHaveBeenNthCalledWith(1, '/v1/optimizations/job-1');
    expect(apiFetchMock).toHaveBeenNthCalledWith(2, '/v1/optimizations/job-1/solution');
  });

  it('dispatches route and stop', async () => {
    apiFetchMock.mockResolvedValue({ dispatchId: 'd-1', status: 'assigned' });

    await dispatchRoute({ routePlanId: 'route-1', driverId: 'driver-1', vehicleId: 'vehicle-1' });
    await dispatchStop({ stopId: 'stop-1', driverId: 'driver-1' });

    expect(apiFetchMock).toHaveBeenNthCalledWith(1, '/dispatch/route', {
      method: 'POST',
      body: JSON.stringify({ routePlanId: 'route-1', driverId: 'driver-1', vehicleId: 'vehicle-1' }),
    });
    expect(apiFetchMock).toHaveBeenNthCalledWith(2, '/dispatch/stop', {
      method: 'POST',
      body: JSON.stringify({ stopId: 'stop-1', driverId: 'driver-1' }),
    });
  });

  it('handles driver read/write endpoints', async () => {
    apiFetchMock.mockResolvedValueOnce({ tripId: 'trip-1' });
    apiFetchMock.mockResolvedValueOnce([{ tripStopId: 'ts-1' }]);
    apiFetchMock.mockResolvedValueOnce({ tripStopId: 'ts-1', status: 'completed' });

    await getTodayTrip();
    await getDriverStops();
    await updateDriverStopStatus('ts-1', { status: 'completed', note: 'done' });

    expect(apiFetchMock).toHaveBeenNthCalledWith(1, '/driver/trip/today');
    expect(apiFetchMock).toHaveBeenNthCalledWith(2, '/driver/stops');
    expect(apiFetchMock).toHaveBeenNthCalledWith(3, '/driver/stops/ts-1/status', {
      method: 'POST',
      body: JSON.stringify({ status: 'completed', note: 'done' }),
    });
  });
});
