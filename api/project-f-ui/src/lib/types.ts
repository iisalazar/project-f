export interface OptimizationJobListItem {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  version: string;
}

export interface OptimizationJobListResponse {
  items: OptimizationJobListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface OptimizationJobLog {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  data?: Record<string, unknown> | null;
}

export interface OptimizationJobDetail {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  version: string;
  data: Record<string, unknown>;
  result: Record<string, unknown> | null;
  resultVersion?: string | null;
  errorMessage?: string | null;
  lastErrorAt?: string | null;
  logs: OptimizationJobLog[];
}

export interface AuthMeResponse {
  id: string;
  email: string;
}
