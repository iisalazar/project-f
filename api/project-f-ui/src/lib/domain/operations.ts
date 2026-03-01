export interface VroomVehicle {
  id: number;
  start: [number, number];
  end?: [number, number];
  time_window?: [number, number];
}

export interface VroomJob {
  id: number;
  location: [number, number];
  service?: number;
}

export interface PlanOptimizationRequest {
  vehicles: VroomVehicle[];
  jobs: VroomJob[];
}

export interface OptimizationStatus {
  id: string;
  status: string;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  error: Record<string, unknown> | null;
}

export interface DispatchRouteRequest {
  routePlanId: string;
  driverId: string;
  vehicleId?: string;
}

export interface DispatchStopRequest {
  stopId: string;
  driverId: string;
}

export interface DriverStopStatusUpdate {
  status: 'enroute' | 'arrived' | 'completed' | 'failed';
  note?: string;
}
