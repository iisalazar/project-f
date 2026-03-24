<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { getMe } from '$lib/services/auth-api';
  import { getDashboardSummary, listRoutePlans } from '$lib/services/operations-api';
  import type { RoutePlanListItem } from '$lib/domain/operations';

  let selectedDate = new Date().toISOString().slice(0, 10);

  let summary: {
    date: string;
    routePlans: { total: number; inProgress: number; completed: number };
    drivers: { active: number };
    stops: { done: number; total: number };
  } | null = null;

  let routePlans: RoutePlanListItem[] = [];
  let status = '';
  let error = '';

  function formatDate(d: string) {
    return new Date(d + 'T00:00:00').toLocaleDateString(undefined, {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
    });
  }

  function shiftDate(days: number) {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + days);
    selectedDate = d.toISOString().slice(0, 10);
    loadData();
  }

  async function loadData() {
    status = 'Loading…';
    error = '';
    try {
      const [s, plans] = await Promise.all([
        getDashboardSummary(selectedDate),
        listRoutePlans({ date: selectedDate }),
      ]);
      summary = s;
      routePlans = plans;
      status = '';
    } catch (err) {
      status = '';
      error = (err as Error).message;
    }
  }

  onMount(async () => {
    try {
      const me = await getMe();
      if (me.auth?.needsOnboarding) {
        goto('/onboarding/organization');
        return;
      }
      if (me.auth?.activeRole === 'driver') {
        goto('/driver/workboard');
        return;
      }
      await loadData();
    } catch {
      goto('/login');
    }
  });
</script>

<div class="card">
  <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;">
    <h2 style="margin:0;">Dashboard</h2>
    <div style="display:flex;align-items:center;gap:8px;">
      <button class="button secondary" onclick={() => shiftDate(-1)}>←</button>
      <span style="font-size:14px;font-weight:600;">{formatDate(selectedDate)}</span>
      <button class="button secondary" onclick={() => shiftDate(1)}>→</button>
    </div>
  </div>

  {#if status}
    <p class="muted" style="margin-top:16px;">{status}</p>
  {/if}
  {#if error}
    <p style="margin-top:16px;color:var(--danger);">{error}</p>
  {/if}

  {#if summary}
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-top:20px;">
      <div class="card" style="border-top:3px solid var(--accent);">
        <div style="font-size:12px;color:var(--muted);margin-bottom:4px;">Route Plans Today</div>
        <div style="font-size:32px;font-weight:700;color:var(--accent);">{summary.routePlans.total}</div>
        <div style="font-size:13px;margin-top:4px;">
          <span style="color:var(--accent);">● {summary.routePlans.inProgress} in progress</span>
          &nbsp;·&nbsp;
          <span class="muted">{summary.routePlans.completed} done</span>
        </div>
      </div>

      <div class="card" style="border-top:3px solid var(--accent-2,#f2c94c);">
        <div style="font-size:12px;color:var(--muted);margin-bottom:4px;">Active Drivers</div>
        <div style="font-size:32px;font-weight:700;color:var(--accent-2,#f2c94c);">{summary.drivers.active}</div>
        <div style="font-size:13px;margin-top:4px;color:var(--muted);">on trips today</div>
      </div>

      <div class="card" style="border-top:3px solid var(--success);">
        <div style="font-size:12px;color:var(--muted);margin-bottom:4px;">Stops Done</div>
        <div style="font-size:32px;font-weight:700;color:var(--success);">{summary.stops.done} / {summary.stops.total}</div>
        <div style="font-size:13px;margin-top:4px;color:var(--muted);">
          {summary.stops.total > 0 ? Math.round((summary.stops.done / summary.stops.total) * 100) : 0}% complete
        </div>
      </div>
    </div>

    <section style="margin-top:24px;">
      <h3 style="margin:0 0 8px;">Route Plans</h3>
      {#if routePlans.length === 0}
        <div class="card" style="text-align:center;padding:32px;color:var(--muted);">
          No route plans for this date.
          <a class="button secondary" href="/plan" style="display:inline-block;margin-left:12px;">Create plan →</a>
        </div>
      {:else}
        <table class="table">
          <thead>
            <tr>
              <th>Plan ID</th>
              <th>Status</th>
              <th>Date</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {#each routePlans as plan}
              <tr style="cursor:pointer;" onclick={() => goto(`/route-plans/${plan.id}`)}>
                <td style="font-family:var(--mono,monospace);font-size:12px;">#{plan.id.slice(0, 8)}…</td>
                <td><span class={`status ${plan.status}`}>● {plan.status}</span></td>
                <td>{plan.planDate ?? '—'}</td>
                <td>{plan.updatedAt ? new Date(plan.updatedAt).toLocaleString() : '—'}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </section>
  {/if}
</div>
