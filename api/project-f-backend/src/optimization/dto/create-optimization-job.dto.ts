export interface OptimizationDriverDto {
  id: number;
  name: string;
  startLocation: [number, number];
  endLocation: [number, number];
  availabilityWindow?: [number, number];
  maxTasks?: number;
  breaks?: Array<{
    id: number | string;
    timeWindows?: Array<[number, number]>;
    serviceSeconds?: number;
  }>;
}

export interface OptimizationStopDto {
  id: number;
  location: [number, number];
  serviceSeconds?: number;
  priority?: number;
  skills?: number[];
}

export interface OptimizationShipmentStepDto {
  id: number;
  location: [number, number];
  serviceSeconds?: number;
}

export interface OptimizationShipmentDto {
  id: number;
  pickup: OptimizationShipmentStepDto;
  delivery: OptimizationShipmentStepDto;
  priority?: number;
  skills?: number[];
}

export interface CreateOptimizationJobRequestDto {
  drivers: OptimizationDriverDto[];
  stops: OptimizationStopDto[];
  shipments?: OptimizationShipmentDto[];
}
