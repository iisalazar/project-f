import { apiFetch } from '$lib/api';
import type {
  DispatchRouteRequest,
  DispatchStopRequest,
  DriverStopStatusUpdate,
  DriverTripItem,
  DriverTripStop,
  OptimizationStatus,
  PlanOptimizationRequest,
  RoutePlanDetail,
  RoutePlanListItem,
  RoutePlanStop,
} from '$lib/domain/operations';

export async function createPlan(payload: PlanOptimizationRequest): Promise<{ jobId: string }> {
  return apiFetch('/plan/optimize', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getOptimizationStatus(jobId: string): Promise<OptimizationStatus> {
  return apiFetch(`/v1/optimizations/${jobId}`);
}

export async function getOptimizationSolution(jobId: string): Promise<Record<string, unknown>> {
  return apiFetch(`/v1/optimizations/${jobId}/solution`);
}

export async function dispatchRoute(payload: DispatchRouteRequest): Promise<{ dispatchId: string; status: string }> {
  return apiFetch('/dispatch/route', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function dispatchStop(payload: DispatchStopRequest): Promise<{ dispatchId: string; status: string }> {
  return apiFetch('/dispatch/stop', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function listRoutePlans(params?: {
  date?: string;
  status?: string;
  driverId?: string;
}): Promise<RoutePlanListItem[]> {
  const query = new URLSearchParams();
  if (params?.date) query.set('date', params.date);
  if (params?.status) query.set('status', params.status);
  if (params?.driverId) query.set('driverId', params.driverId);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiFetch(`/route-plans${suffix}`);
}

export async function getRoutePlan(routePlanId: string): Promise<RoutePlanDetail> {
  return apiFetch(`/route-plans/${routePlanId}`);
}

export async function getRoutePlanStops(routePlanId: string): Promise<RoutePlanStop[]> {
  return apiFetch(`/route-plans/${routePlanId}/stops`);
}

export async function assignRoutePlanDriver(
  routePlanId: string,
  payload: { driverId: string; vehicleId?: string },
): Promise<{ routePlanId: string; tripId: string; dispatchId: string; status: string }> {
  return apiFetch(`/route-plans/${routePlanId}/assign-driver`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getTodayTrip(): Promise<Record<string, unknown> | null> {
  return apiFetch('/driver/trip/today');
}

export async function getDriverStops(date?: string): Promise<DriverTripStop[]> {
  const suffix = date ? `?date=${encodeURIComponent(date)}` : '';
  return apiFetch(`/driver/stops${suffix}`);
}

export async function getDriverTrips(date: string): Promise<DriverTripItem[]> {
  return apiFetch(`/driver/trips?date=${encodeURIComponent(date)}`);
}

export async function getDriverTripsRange(from: string, to: string): Promise<DriverTripItem[]> {
  return apiFetch(`/driver/trips/range?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
}

export async function getDriverTripStops(tripId: string): Promise<DriverTripStop[]> {
  return apiFetch(`/driver/trips/${tripId}/stops`);
}

export async function updateDriverStopStatus(tripStopId: string, payload: DriverStopStatusUpdate) {
  return apiFetch(`/driver/stops/${tripStopId}/status`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
