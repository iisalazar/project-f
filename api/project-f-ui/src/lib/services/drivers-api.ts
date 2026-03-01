import { apiFetch } from '$lib/api';

export interface DriverRecord {
  id: string;
  organizationId: string;
  name: string;
  email: string | null;
  phone: string | null;
  state: 'idle' | 'enroute' | 'arrived' | 'completed' | 'failed';
  shiftStartSeconds: number | null;
  shiftEndSeconds: number | null;
  startLocation: [number, number] | null;
  endLocation: [number, number] | null;
  createdAt: string;
  updatedAt: string;
}

export interface DriverListResponse {
  items: DriverRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DriverCreateUpdatePayload {
  name?: string;
  email?: string;
  phone?: string;
  state?: DriverRecord['state'];
  shiftStartSeconds?: number;
  shiftEndSeconds?: number;
  startLocation?: [number, number];
  endLocation?: [number, number];
}

export function listDrivers(params?: { search?: string; state?: string; page?: number; pageSize?: number }) {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.state) query.set('state', params.state);
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiFetch<DriverListResponse>(`/drivers${suffix}`);
}

export function getDriver(driverId: string) {
  return apiFetch<DriverRecord>(`/drivers/${driverId}`);
}

export function createDriver(payload: DriverCreateUpdatePayload) {
  return apiFetch<DriverRecord>('/drivers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateDriver(driverId: string, payload: DriverCreateUpdatePayload) {
  return apiFetch<DriverRecord>(`/drivers/${driverId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteDriver(driverId: string) {
  return apiFetch<{ success: boolean }>(`/drivers/${driverId}`, {
    method: 'DELETE',
  });
}
