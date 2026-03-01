<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { apiFetch } from '$lib/api';
  import { getDriverStops, getTodayTrip, updateDriverStopStatus } from '$lib/services/operations-api';

  let trip: Record<string, unknown> | null = null;
  let stops: Record<string, unknown>[] = [];
  let status = '';
  let error = '';

  async function load() {
    error = '';
    try {
      [trip, stops] = await Promise.all([getTodayTrip(), getDriverStops()]);
      status = `Loaded ${stops.length} stops`;
    } catch (err) {
      error = (err as Error).message;
      status = '';
    }
  }

  async function setStopStatus(tripStopId: string, nextStatus: 'enroute' | 'arrived' | 'completed' | 'failed') {
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
      await apiFetch('/auth/me');
      await load();
    } catch {
      goto('/login');
    }
  });
</script>

<div class="card">
  <h2 style="margin:0 0 8px;">Driver Today</h2>

  {#if trip}
    <p class="muted">Active trip: {(trip.tripId as string) ?? 'N/A'}</p>
  {:else}
    <p class="muted">No trip found for today.</p>
  {/if}

  {#if status}
    <p class="muted">{status}</p>
  {/if}
  {#if error}
    <p style="color:var(--danger);">{error}</p>
  {/if}

  {#if stops.length > 0}
    <table class="table" style="margin-top:16px;">
      <thead>
        <tr>
          <th>Trip Stop ID</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each stops as stop}
          <tr>
            <td>{String(stop.tripStopId ?? '')}</td>
            <td>{String(stop.status ?? '')}</td>
            <td style="display:flex;gap:8px;flex-wrap:wrap;">
              <button class="button secondary" on:click={() => setStopStatus(String(stop.tripStopId), 'enroute')}>Enroute</button>
              <button class="button secondary" on:click={() => setStopStatus(String(stop.tripStopId), 'arrived')}>Arrived</button>
              <button class="button secondary" on:click={() => setStopStatus(String(stop.tripStopId), 'completed')}>Completed</button>
              <button class="button secondary" on:click={() => setStopStatus(String(stop.tripStopId), 'failed')}>Failed</button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>
