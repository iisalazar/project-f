export interface VroomViolation {
  cause: string;
  duration?: number;
}

export interface VroomStep {
  type: 'start' | 'job' | 'end' | string;
  id?: number;
  job?: number;
  setup: number;
  service: number;
  waiting_time: number;
  arrival: number;
  duration: number;
  distance: number;
  location: [number, number];
  violations: VroomViolation[];
}

export interface VroomRoute {
  vehicle: number | string;
  cost: number;
  setup: number;
  service: number;
  duration: number;
  waiting_time: number;
  distance: number;
  priority: number;
  geometry?: string;
  steps: VroomStep[];
  violations: VroomViolation[];
}

export interface VroomSummary {
  cost: number;
  setup: number;
  routes: number;
  service: number;
  duration: number;
  waiting_time: number;
  distance: number;
  priority: number;
  unassigned: number;
  violations: VroomViolation[];
  computing_times: {
    loading: number;
    routing: number;
    solving: number;
  };
}

export interface VroomUnassigned {
  id: number;
  location?: [number, number];
  type?: string;
  reason?: string;
}

export interface OptimizationJobResultDto {
  code: number;
  summary: VroomSummary;
  unassigned: VroomUnassigned[];
  routes: VroomRoute[];
}
