export interface DriverStopStatusUpdateDto {
  status: 'enroute' | 'arrived' | 'completed' | 'failed';
  note?: string;
}
