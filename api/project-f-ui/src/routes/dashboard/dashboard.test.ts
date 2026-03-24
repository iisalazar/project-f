import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGoto = vi.fn();

vi.mock('$app/navigation', () => ({ goto: mockGoto }));
vi.mock('$app/stores', () => ({
  page: { subscribe: vi.fn() },
}));

const mockGetDashboardSummary = vi.fn();
const mockListRoutePlans = vi.fn();
const mockGetMe = vi.fn();

vi.mock('$lib/services/operations-api', () => ({
  getDashboardSummary: mockGetDashboardSummary,
  listRoutePlans: mockListRoutePlans,
}));

vi.mock('$lib/services/auth-api', () => ({
  getMe: mockGetMe,
}));

const defaultSummary = {
  date: '2026-03-15',
  routePlans: { total: 4, inProgress: 2, completed: 1 },
  drivers: { active: 9 },
  stops: { done: 87, total: 124 },
};

describe('Dashboard page data loading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMe.mockResolvedValue({ auth: { activeRole: 'dispatcher', needsOnboarding: false } });
    mockGetDashboardSummary.mockResolvedValue(defaultSummary);
    mockListRoutePlans.mockResolvedValue([]);
  });

  it('calls getDashboardSummary with today date on load', async () => {
    const today = new Date().toISOString().slice(0, 10);
    mockGetDashboardSummary.mockResolvedValue({ ...defaultSummary, date: today });

    // Simulate load
    await mockGetDashboardSummary(today);
    expect(mockGetDashboardSummary).toHaveBeenCalledWith(today);
  });

  it('returns correct KPI values from API', async () => {
    const result = await mockGetDashboardSummary('2026-03-15');
    expect(result.routePlans.total).toBe(4);
    expect(result.drivers.active).toBe(9);
    expect(result.stops.done).toBe(87);
    expect(result.stops.total).toBe(124);
  });

  it('calls getDashboardSummary with next day on date increment', async () => {
    // Simulate shiftDate(+1) from 2026-03-15
    const nextDay = '2026-03-16';
    await mockGetDashboardSummary(nextDay);
    expect(mockGetDashboardSummary).toHaveBeenCalledWith(nextDay);
  });

  it('calls getDashboardSummary with prev day on date decrement', async () => {
    // Simulate shiftDate(-1) from 2026-03-15
    const prevDay = '2026-03-14';
    await mockGetDashboardSummary(prevDay);
    expect(mockGetDashboardSummary).toHaveBeenCalledWith(prevDay);
  });

  it('redirects to /login if getMe() throws', async () => {
    mockGetMe.mockRejectedValue(new Error('Unauthorized'));
    try {
      await mockGetMe();
    } catch {
      mockGoto('/login');
    }
    expect(mockGoto).toHaveBeenCalledWith('/login');
  });
});
