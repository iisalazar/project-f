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

  $: currentStop = stops.find(
    (s) => s.status !== 'completed' && s.status !== 'failed' && s.status !== 'skipped',
  ) ?? null;

  $: doneCount = stops.filter((s) => s.status === 'completed').length;

  $: tripStatus = (() => {
    if (stops.length === 0) return 'pending';
    if (stops.every((s) => s.status === 'completed')) return 'completed';
    if (stops.some((s) => s.status === 'arrived' || s.status === 'enroute')) return 'active';
    return 'pending';
  })();

  async function load() {
    error = '';
    status = 'Loading trip stops...';
    try {
      stops = await getDriverTripStops(tripId);
      status = '';
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
    <a class="button secondary" href="/driver/workboard">← Workboard</a>
  </div>

  {#if error}
    <p style="margin-top:16px;color:var(--danger);">{error}</p>
  {/if}

  {#if stops.length > 0}
    <div class="card" style="margin-top:16px;display:flex;gap:24px;flex-wrap:wrap;align-items:center;">
      <div>
        <label style="font-size:12px;">Status</label>
        <div><span class={`status ${tripStatus}`}>● {tripStatus}</span></div>
      </div>
      <div>
        <label style="font-size:12px;">Done</label>
        <div style="font-size:20px;font-weight:700;color:var(--success);">{doneCount} / {stops.length}</div>
      </div>
    </div>

    {#if currentStop}
      <div class="card" style="margin-top:16px;border:1px solid var(--accent);">
        <h3 style="margin:0 0 4px;color:var(--accent);">Current stop — #{currentStop.stopOrder}</h3>
        <p class="muted" style="margin:0 0 16px;">
          ETA: {currentStop.etaAt ? new Date(currentStop.etaAt).toLocaleTimeString() : '—'}
        </p>
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          {#if currentStop.status === 'pending' || currentStop.status === 'enroute'}
            <button
              class="button"
              style="flex:1;min-height:48px;"
              onclick={() => setStopStatus(currentStop!.tripStopId, 'arrived')}
            >
              Mark arrived
            </button>
          {/if}
          {#if currentStop.status === 'arrived'}
            <button
              class="button"
              style="flex:1;min-height:48px;"
              onclick={() => setStopStatus(currentStop!.tripStopId, 'completed')}
            >
              Mark complete
            </button>
          {/if}
          <button
            class="button secondary"
            style="flex:1;min-height:48px;border-color:var(--danger);color:var(--danger);"
            onclick={() => setStopStatus(currentStop!.tripStopId, 'failed')}
          >
            Report issue
          </button>
        </div>
      </div>
    {/if}

    <section style="margin-top:20px;">
      <h3 style="margin:0 0 8px;">All Stops</h3>
      <table class="table">
        <thead>
          <tr>
            <th></th>
            <th>Order</th>
            <th>Status</th>
            <th>ETA</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {#each stops as stop}
            <tr style={stop.status === 'completed' ? 'opacity:0.45;' : ''}>
              <td style="font-size:16px;">
                {#if stop.tripStopId === currentStop?.tripStopId}→{:else if stop.status === 'completed'}✓{:else}&nbsp;{/if}
              </td>
              <td>{stop.stopOrder}</td>
              <td><span class={`status ${stop.status}`}>{stop.status}</span></td>
              <td>{stop.etaAt ? new Date(stop.etaAt).toLocaleTimeString() : '—'}</td>
              <td>
                {#if stop.status === 'pending' || stop.status === 'enroute'}
                  <button class="button secondary" onclick={() => setStopStatus(stop.tripStopId, 'arrived')}>Arrived</button>
                {:else if stop.status === 'arrived'}
                  <button class="button secondary" onclick={() => setStopStatus(stop.tripStopId, 'completed')}>Complete</button>
                {:else}
                  &nbsp;
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </section>
  {:else if !status}
    <p class="muted" style="margin-top:16px;">No stops found for this trip.</p>
  {/if}

  {#if status}
    <p class="muted" style="margin-top:16px;">{status}</p>
  {/if}
</div>
