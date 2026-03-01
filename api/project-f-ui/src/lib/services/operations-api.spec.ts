import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  assignRoutePlanDriver,
  createPlan,
  dispatchRoute,
  dispatchStop,
  getDriverStops,
  getDriverTripStops,
  getDriverTrips,
  getDriverTripsRange,
  getOptimizationSolution,
  getOptimizationStatus,
  getRoutePlan,
  getRoutePlanStops,
  getTodayTrip,
  listRoutePlans,
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

  it('createPlan posts to /plan/optimize with v2 contract', async () => {
    apiFetchMock.mockResolvedValue({ jobId: 'job-1' });

    const payload = {
      planDate: '2026-03-01',
      selectedDriverIds: ['driver-1'],
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

  it('handles route plan endpoints', async () => {
    apiFetchMock.mockResolvedValueOnce([{ id: 'rp-1' }]);
    apiFetchMock.mockResolvedValueOnce({ id: 'rp-1' });
    apiFetchMock.mockResolvedValueOnce([{ routeStopId: 'rs-1' }]);
    apiFetchMock.mockResolvedValueOnce({ status: 'assigned' });

    await listRoutePlans({ date: '2026-03-01', status: 'optimized', driverId: 'driver-1' });
    await getRoutePlan('rp-1');
    await getRoutePlanStops('rp-1');
    await assignRoutePlanDriver('rp-1', { driverId: 'driver-1' });

    expect(apiFetchMock).toHaveBeenNthCalledWith(
      1,
      '/route-plans?date=2026-03-01&status=optimized&driverId=driver-1',
    );
    expect(apiFetchMock).toHaveBeenNthCalledWith(2, '/route-plans/rp-1');
    expect(apiFetchMock).toHaveBeenNthCalledWith(3, '/route-plans/rp-1/stops');
    expect(apiFetchMock).toHaveBeenNthCalledWith(4, '/route-plans/rp-1/assign-driver', {
      method: 'POST',
      body: JSON.stringify({ driverId: 'driver-1' }),
    });
  });

  it('handles driver read/write endpoints', async () => {
    apiFetchMock.mockResolvedValueOnce({ tripId: 'trip-1' });
    apiFetchMock.mockResolvedValueOnce([{ tripStopId: 'ts-1' }]);
    apiFetchMock.mockResolvedValueOnce([{ tripId: 'trip-2' }]);
    apiFetchMock.mockResolvedValueOnce([{ tripId: 'trip-3' }]);
    apiFetchMock.mockResolvedValueOnce([{ tripStopId: 'ts-2' }]);
    apiFetchMock.mockResolvedValueOnce({ tripStopId: 'ts-1', status: 'completed' });

    await getTodayTrip();
    await getDriverStops('2026-03-01');
    await getDriverTrips('2026-03-01');
    await getDriverTripsRange('2026-03-01', '2026-03-07');
    await getDriverTripStops('trip-3');
    await updateDriverStopStatus('ts-1', { status: 'completed', note: 'done' });

    expect(apiFetchMock).toHaveBeenNthCalledWith(1, '/driver/trip/today');
    expect(apiFetchMock).toHaveBeenNthCalledWith(2, '/driver/stops?date=2026-03-01');
    expect(apiFetchMock).toHaveBeenNthCalledWith(3, '/driver/trips?date=2026-03-01');
    expect(apiFetchMock).toHaveBeenNthCalledWith(4, '/driver/trips/range?from=2026-03-01&to=2026-03-07');
    expect(apiFetchMock).toHaveBeenNthCalledWith(5, '/driver/trips/trip-3/stops');
    expect(apiFetchMock).toHaveBeenNthCalledWith(6, '/driver/stops/ts-1/status', {
      method: 'POST',
      body: JSON.stringify({ status: 'completed', note: 'done' }),
    });
  });
});
