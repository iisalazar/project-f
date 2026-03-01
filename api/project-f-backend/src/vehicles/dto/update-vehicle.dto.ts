import type { CreateVehicleDto } from './create-vehicle.dto';

export interface UpdateVehicleDto extends Partial<CreateVehicleDto> {}
