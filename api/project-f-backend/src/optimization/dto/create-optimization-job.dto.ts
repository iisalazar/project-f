export interface OptimizationDriverDto {
  id: string;
  name: string;
  startLocation: [number, number];
  endLocation: [number, number];
  availabilityWindow?: [number, number];
  maxTasks?: number;
}

export interface OptimizationStopDto {
  id: string;
  location: [number, number];
  serviceSeconds?: number;
}

export interface CreateOptimizationJobRequestDto {
  drivers: OptimizationDriverDto[];
  stops: OptimizationStopDto[];
}
