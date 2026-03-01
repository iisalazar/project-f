export interface VroomVehicleDto {
  id: number | string;
  start: [number, number];
  end?: [number, number];
  time_window?: [number, number];
  max_tasks?: number;
}

export interface VroomJobDto {
  id: number;
  location: [number, number];
  service?: number;
}

export interface VroomOptimizationRequestDto {
  vehicles?: VroomVehicleDto[];
  jobs: VroomJobDto[];
  planDate?: string;
  selectedDriverIds?: string[];
}
