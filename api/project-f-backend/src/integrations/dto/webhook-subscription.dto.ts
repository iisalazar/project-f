export interface UpsertWebhookSubscriptionDto {
  url: string;
  secret: string;
  eventFilters?: string[];
  isActive?: boolean;
}

export interface ImportStopsCsvDto {
  csv: string;
}

export interface IngestExternalOrderDto {
  externalRef: string;
  location: [number, number];
  serviceSeconds?: number;
  priority?: number;
}
