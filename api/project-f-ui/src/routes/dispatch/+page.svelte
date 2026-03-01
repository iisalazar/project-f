<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { apiFetch } from '$lib/api';
  import { dispatchRoute, dispatchStop } from '$lib/services/operations-api';

  let routePlanId = '';
  let routeDriverId = '';
  let routeVehicleId = '';

  let stopId = '';
  let stopDriverId = '';

  let status = '';
  let error = '';

  onMount(async () => {
    try {
      await apiFetch('/auth/me');
    } catch {
      goto('/login');
    }
  });

  async function submitRouteDispatch() {
    status = '';
    error = '';
    try {
      const response = await dispatchRoute({ routePlanId, driverId: routeDriverId, vehicleId: routeVehicleId || undefined });
      status = `Route dispatch created: ${response.dispatchId}`;
    } catch (err) {
      error = (err as Error).message;
    }
  }

  async function submitStopDispatch() {
    status = '';
    error = '';
    try {
      const response = await dispatchStop({ stopId, driverId: stopDriverId });
      status = `Stop dispatch created: ${response.dispatchId}`;
    } catch (err) {
      error = (err as Error).message;
    }
  }
</script>

<div class="row" style="grid-template-columns:1fr;gap:16px;">
  <section class="card">
    <h2 style="margin:0 0 8px;">Dispatch Route</h2>
    <div class="row two">
      <div>
        <label>Route Plan ID</label>
        <input class="input" bind:value={routePlanId} placeholder="UUID" />
      </div>
      <div>
        <label>Driver ID</label>
        <input class="input" bind:value={routeDriverId} placeholder="UUID" />
      </div>
      <div>
        <label>Vehicle ID (optional)</label>
        <input class="input" bind:value={routeVehicleId} placeholder="UUID" />
      </div>
    </div>
    <button class="button" style="margin-top:16px;" on:click={submitRouteDispatch}>Dispatch Route</button>
  </section>

  <section class="card">
    <h2 style="margin:0 0 8px;">Dispatch Stop</h2>
    <div class="row two">
      <div>
        <label>Stop ID</label>
        <input class="input" bind:value={stopId} placeholder="UUID" />
      </div>
      <div>
        <label>Driver ID</label>
        <input class="input" bind:value={stopDriverId} placeholder="UUID" />
      </div>
    </div>
    <button class="button" style="margin-top:16px;" on:click={submitStopDispatch}>Dispatch Stop</button>
  </section>

  {#if status}
    <p class="muted">{status}</p>
  {/if}
  {#if error}
    <p style="color:var(--danger);">{error}</p>
  {/if}
</div>
