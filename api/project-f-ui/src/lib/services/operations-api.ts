import { apiFetch } from '$lib/api';
import type {
  DispatchRouteRequest,
  DispatchStopRequest,
  DriverStopStatusUpdate,
  OptimizationStatus,
  PlanOptimizationRequest,
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

export async function getTodayTrip(): Promise<Record<string, unknown> | null> {
  return apiFetch('/driver/trip/today');
}

export async function getDriverStops(): Promise<Record<string, unknown>[]> {
  return apiFetch('/driver/stops');
}

export async function updateDriverStopStatus(tripStopId: string, payload: DriverStopStatusUpdate) {
  return apiFetch(`/driver/stops/${tripStopId}/status`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
