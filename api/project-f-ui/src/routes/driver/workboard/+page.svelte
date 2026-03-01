<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { getMe } from '$lib/services/auth-api';
  import { getDriverTrips, getDriverTripsRange } from '$lib/services/operations-api';
  import type { DriverTripItem } from '$lib/domain/operations';

  type Tab = 'today' | 'past' | 'future';

  let tab: Tab = 'today';
  let date = new Date().toISOString().slice(0, 10);
  let trips: DriverTripItem[] = [];

  let status = '';
  let error = '';

  function offsetDate(base: string, days: number): string {
    const d = new Date(`${base}T00:00:00`);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  async function load() {
    error = '';
    status = 'Loading trips...';

    try {
      if (tab === 'today') {
        trips = await getDriverTrips(date);
      } else if (tab === 'past') {
        const from = offsetDate(date, -14);
        const to = offsetDate(date, -1);
        trips = await getDriverTripsRange(from, to);
      } else {
        const from = offsetDate(date, 1);
        const to = offsetDate(date, 14);
        trips = await getDriverTripsRange(from, to);
      }
      status = '';
    } catch (err) {
      status = '';
      error = (err as Error).message;
    }
  }

  async function setTab(next: Tab) {
    tab = next;
    await load();
  }

  onMount(async () => {
    try {
      const me = await getMe();
      if (me.auth?.needsOnboarding) {
        goto('/onboarding/organization');
        return;
      }
      await load();
    } catch {
      goto('/login');
    }
  });
</script>

<div class="card">
  <h2 style="margin:0 0 8px;">Driver Workboard</h2>
  <p class="muted" style="margin-top:0;">Review assigned trips by Today, Past, and Future windows.</p>

  <div class="row two" style="margin-top:16px;">
    <div>
      <label>Anchor Date</label>
      <input class="input" type="date" bind:value={date} on:change={load} />
    </div>
    <div style="align-self:flex-end;display:flex;gap:8px;flex-wrap:wrap;">
      <button class="button secondary" style={tab === 'today' ? 'border-color:var(--accent);' : ''} on:click={() => setTab('today')}>Today</button>
      <button class="button secondary" style={tab === 'past' ? 'border-color:var(--accent);' : ''} on:click={() => setTab('past')}>Past</button>
      <button class="button secondary" style={tab === 'future' ? 'border-color:var(--accent);' : ''} on:click={() => setTab('future')}>Future</button>
    </div>
  </div>

  {#if status}
    <p class="muted" style="margin-top:16px;">{status}</p>
  {/if}
  {#if error}
    <p style="margin-top:16px;color:var(--danger);">{error}</p>
  {/if}

  {#if trips.length === 0}
    <p class="muted" style="margin-top:16px;">No trips found for this view.</p>
  {:else}
    <table class="table" style="margin-top:16px;">
      <thead>
        <tr>
          <th>Trip ID</th>
          <th>Date</th>
          <th>Status</th>
          <th>Route Plan</th>
        </tr>
      </thead>
      <tbody>
        {#each trips as trip}
          <tr style="cursor:pointer;" on:click={() => goto(`/driver/trips/${trip.tripId}`)}>
            <td>{trip.tripId}</td>
            <td>{trip.tripDate}</td>
            <td><span class={`status ${trip.status}`}>{trip.status}</span></td>
            <td>{trip.routePlanId ?? '-'}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>
