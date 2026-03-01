export interface VroomVehicleDto {
  id: number | string;
  start: [number, number];
  end?: [number, number];
  time_window?: [number, number];
  max_tasks?: number;
  breaks?: Array<{
    id: number | string;
    time_windows?: Array<[number, number]>;
    service?: number;
  }>;
}

export interface VroomJobDto {
  id: number;
  location: [number, number];
  service?: number;
  priority?: number;
  skills?: number[];
}

export interface VroomShipmentStepDto {
  id: number;
  location: [number, number];
  service?: number;
}

export interface VroomShipmentDto {
  id: number;
  pickup: VroomShipmentStepDto;
  delivery: VroomShipmentStepDto;
  skills?: number[];
  priority?: number;
}

export interface VroomOptimizationRequestDto {
  vehicles?: VroomVehicleDto[];
  jobs: VroomJobDto[];
  shipments?: VroomShipmentDto[];
  planDate?: string;
  selectedDriverIds?: string[];
}
