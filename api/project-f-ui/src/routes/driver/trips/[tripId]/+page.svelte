<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { getMe } from '$lib/services/auth-api';
  import {
    getDriverTripStops,
    updateDriverStopStatus,
  } from '$lib/services/operations-api';
  import type { DriverTripStop } from '$lib/domain/operations';

  const tripId = get(page).params.tripId ?? '';
  let stops: DriverTripStop[] = [];

  let status = '';
  let error = '';

  async function load() {
    error = '';
    status = 'Loading trip stops...';

    try {
      stops = await getDriverTripStops(tripId);
      status = `Loaded ${stops.length} stops.`;
    } catch (err) {
      status = '';
      error = (err as Error).message;
    }
  }

  async function setStopStatus(
    tripStopId: string,
    nextStatus: 'enroute' | 'arrived' | 'completed' | 'failed',
  ) {
    error = '';

    try {
      await updateDriverStopStatus(tripStopId, { status: nextStatus });
      await load();
    } catch (err) {
      error = (err as Error).message;
    }
  }

  onMount(async () => {
    try {
      await getMe();
      await load();
    } catch {
      goto('/login');
    }
  });
</script>

<div class="card">
  <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;">
    <div>
      <h2 style="margin:0;">Trip Detail</h2>
      <p class="muted" style="margin:4px 0 0;">{tripId}</p>
    </div>
    <a class="button secondary" href="/driver/workboard">Back to Workboard</a>
  </div>

  {#if status}
    <p class="muted" style="margin-top:16px;">{status}</p>
  {/if}
  {#if error}
    <p style="margin-top:16px;color:var(--danger);">{error}</p>
  {/if}

  {#if stops.length === 0}
    <p class="muted" style="margin-top:16px;">No stops found for this trip.</p>
  {:else}
    <table class="table" style="margin-top:16px;">
      <thead>
        <tr>
          <th>Order</th>
          <th>Trip Stop ID</th>
          <th>Status</th>
          <th>ETA</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each stops as stop}
          <tr>
            <td>{stop.stopOrder}</td>
            <td>{stop.tripStopId}</td>
            <td><span class={`status ${stop.status}`}>{stop.status}</span></td>
            <td>{stop.etaAt ? new Date(stop.etaAt).toLocaleString() : '-'}</td>
            <td style="display:flex;gap:8px;flex-wrap:wrap;">
              <button class="button secondary" on:click={() => setStopStatus(stop.tripStopId, 'enroute')}>Enroute</button>
              <button class="button secondary" on:click={() => setStopStatus(stop.tripStopId, 'arrived')}>Arrived</button>
              <button class="button secondary" on:click={() => setStopStatus(stop.tripStopId, 'completed')}>Completed</button>
              <button class="button secondary" on:click={() => setStopStatus(stop.tripStopId, 'failed')}>Failed</button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>
