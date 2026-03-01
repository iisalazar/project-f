<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { getMe } from '$lib/services/auth-api';
  import { listDrivers, type DriverRecord } from '$lib/services/drivers-api';
  import { listRoutePlans } from '$lib/services/operations-api';
  import type { RoutePlanListItem } from '$lib/domain/operations';

  let items: RoutePlanListItem[] = [];
  let drivers: DriverRecord[] = [];

  let date = new Date().toISOString().slice(0, 10);
  let statusFilter = '';
  let driverId = '';

  let status = '';
  let error = '';

  async function load() {
    error = '';
    status = 'Loading route plans...';

    try {
      items = await listRoutePlans({
        date: date || undefined,
        status: statusFilter || undefined,
        driverId: driverId || undefined,
      });
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

      const response = await listDrivers({ pageSize: 200 });
      drivers = response.items;
      await load();
    } catch {
      goto('/login');
    }
  });
</script>

<div class="card">
  <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;">
    <div>
      <h2 style="margin:0;">Route Plans</h2>
      <p class="muted" style="margin:4px 0 0;">View and filter daily route plans.</p>
    </div>
    <a class="button" href="/plan">New Plan</a>
  </div>

  <div class="row two" style="margin-top:16px;">
    <div>
      <label>Date</label>
      <input class="input" type="date" bind:value={date} />
    </div>
    <div>
      <label>Status</label>
      <select bind:value={statusFilter}>
        <option value="">All</option>
        <option value="draft">Draft</option>
        <option value="optimized">Optimized</option>
        <option value="dispatched">Dispatched</option>
        <option value="in_progress">In Progress</option>
        <option value="completed">Completed</option>
        <option value="failed">Failed</option>
      </select>
    </div>
    <div>
      <label>Driver</label>
      <select bind:value={driverId}>
        <option value="">All Drivers</option>
        {#each drivers as driver}
          <option value={driver.id}>{driver.name}</option>
        {/each}
      </select>
    </div>
    <div style="align-self:flex-end;">
      <button class="button secondary" on:click={load}>Apply Filters</button>
    </div>
  </div>

  {#if status}
    <p class="muted" style="margin-top:16px;">{status}</p>
  {/if}
  {#if error}
    <p style="margin-top:16px;color:var(--danger);">{error}</p>
  {/if}

  {#if items.length === 0}
    <p class="muted" style="margin-top:16px;">No route plans found for current filters.</p>
  {:else}
    <table class="table" style="margin-top:16px;">
      <thead>
        <tr>
          <th>Route Plan ID</th>
          <th>Date</th>
          <th>Status</th>
          <th>Updated</th>
        </tr>
      </thead>
      <tbody>
        {#each items as item}
          <tr style="cursor:pointer;" on:click={() => goto(`/route-plans/${item.id}`)}>
            <td>{item.id}</td>
            <td>{item.planDate ?? '-'}</td>
            <td><span class={`status ${item.status}`}>{item.status}</span></td>
            <td>{new Date(item.updatedAt).toLocaleString()}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>
