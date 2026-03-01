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
  vehicles?: VroomVehicle[];
  jobs: VroomJob[];
  planDate?: string;
  selectedDriverIds?: string[];
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

export interface DriverTripItem {
  tripId: string;
  routePlanId: string | null;
  driverId: string | null;
  vehicleId: string | null;
  status: string;
  tripDate: string;
  startAt: string | null;
  endAt: string | null;
}

export interface DriverTripStop {
  tripStopId: string;
  tripId: string;
  stopId: string | null;
  stopOrder: number;
  status: string;
  etaAt: string | null;
  arrivedAt?: string | null;
  completedAt?: string | null;
  failureReason?: string | null;
}

export interface DriverStopStatusUpdate {
  status: 'enroute' | 'arrived' | 'completed' | 'failed';
  note?: string;
}

export interface RoutePlanListItem {
  id: string;
  status: string;
  planDate: string | null;
  createdAt: string;
  updatedAt: string;
  summaryMetrics: Record<string, unknown> | null;
}

export interface RoutePlanTrip {
  tripId: string;
  driverId: string | null;
  vehicleId: string | null;
  status: string;
  tripDate: string;
}

export interface RoutePlanDetail {
  id: string;
  status: string;
  planDate: string | null;
  createdAt: string;
  updatedAt: string;
  inputPayload: Record<string, unknown> | null;
  summaryMetrics: Record<string, unknown> | null;
  geometry: Record<string, unknown> | null;
  trips: RoutePlanTrip[];
}

export interface RoutePlanStop {
  routeStopId: string;
  routePlanId: string;
  stopId: string | null;
  stopOrder: number;
  etaAt: string | null;
  distanceMeters: number | null;
  durationSeconds: number | null;
}
