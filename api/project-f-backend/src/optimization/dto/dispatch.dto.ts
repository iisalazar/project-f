export interface DispatchRouteRequestDto {
  routePlanId: string;
  driverId: string;
  vehicleId?: string;
}

export interface DispatchStopRequestDto {
  stopId: string;
  driverId: string;
  vehicleId?: string;
}
