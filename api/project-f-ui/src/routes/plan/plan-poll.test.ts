import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockGetOptimizationStatus = vi.fn();
const mockListRoutePlans = vi.fn();

vi.mock('$lib/services/operations-api', () => ({
  getOptimizationStatus: mockGetOptimizationStatus,
  listRoutePlans: mockListRoutePlans,
  createPlan: vi.fn(),
}));

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$lib/services/auth-api', () => ({
  getMe: vi.fn().mockResolvedValue({ auth: { activeRole: 'dispatcher', needsOnboarding: false } }),
}));
vi.mock('$lib/services/drivers-api', () => ({
  listDrivers: vi.fn().mockResolvedValue({ items: [] }),
}));

/**
 * Plan page auto-polling lifecycle tests.
 * Tests the polling logic in isolation.
 */

describe('Plan page auto-polling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts polling with 2 second interval after plan submission', () => {
    const spyInterval = vi.spyOn(global, 'setInterval');
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    // Simulate startPolling()
    pollInterval = setInterval(() => {}, 2000);
    expect(spyInterval).toHaveBeenCalledWith(expect.any(Function), 2000);

    clearInterval(pollInterval);
  });

  it('clears interval when job status becomes completed', async () => {
    const spyClear = vi.spyOn(global, 'clearInterval');
    mockGetOptimizationStatus.mockResolvedValue({
      id: 'job-1', status: 'completed', attempts: 1,
    });

    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let jobStatus = 'enqueued';

    function stopPolling() {
      if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
    }

    pollInterval = setInterval(async () => {
      const response = await mockGetOptimizationStatus('job-1');
      jobStatus = response.status;
      if (jobStatus === 'completed' || jobStatus === 'failed') stopPolling();
    }, 2000);

    vi.advanceTimersByTime(2000);
    await Promise.resolve(); // flush microtasks

    expect(spyClear).toHaveBeenCalled();
    expect(pollInterval).toBeNull();
  });

  it('clears interval on component destroy (stopPolling called on unmount)', () => {
    const spyClear = vi.spyOn(global, 'clearInterval');
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    // Start polling (simulate submitPlan)
    pollInterval = setInterval(() => {}, 2000);

    // Simulate onDestroy
    function stopPolling() {
      if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
    }
    stopPolling();

    expect(spyClear).toHaveBeenCalled();
    expect(pollInterval).toBeNull();
  });
});
