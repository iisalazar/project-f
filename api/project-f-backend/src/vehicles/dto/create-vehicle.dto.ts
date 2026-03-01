export interface CreateVehicleDto {
  name: string;
  capacity?: Record<string, unknown> | null;
  skills?: string[] | null;
}
