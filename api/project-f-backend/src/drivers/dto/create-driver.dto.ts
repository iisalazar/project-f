export interface CreateDriverDto {
  name: string;
  email?: string;
  phone?: string;
  state?: 'idle' | 'enroute' | 'arrived' | 'completed' | 'failed';
  shiftStartSeconds?: number;
  shiftEndSeconds?: number;
  startLocation?: [number, number];
  endLocation?: [number, number];
}
