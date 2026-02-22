export type Coordinates = [number, number];

export interface PrototypeVehicleDto {
  id: number;
  start: Coordinates;
  end: Coordinates;
}

export interface PrototypeJobDto {
  id: number;
  location: Coordinates;
  service: number;
}

export interface PrototypeTestRequestDto {
  vehicles: PrototypeVehicleDto[];
  jobs: PrototypeJobDto[];
  options?: Record<string, unknown>;
}
