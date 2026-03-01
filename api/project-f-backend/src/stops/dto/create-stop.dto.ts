export interface CreateStopDto {
  externalRef?: string;
  location: [number, number];
  serviceSeconds?: number;
  timeWindow?: Record<string, unknown> | null;
  priority?: number;
}
