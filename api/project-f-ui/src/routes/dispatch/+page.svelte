<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import {
    dispatchRoute,
    dispatchStop,
    listRoutePlans,
  } from '$lib/services/operations-api';
  import { listDrivers, type DriverRecord } from '$lib/services/drivers-api';
  import { getMe } from '$lib/services/auth-api';
  import type { RoutePlanListItem } from '$lib/domain/operations';

  let routePlanId = '';
  let routeDriverId = '';
  let routeVehicleId = '';

  let stopId = '';
  let stopDriverId = '';
  let routePlans: RoutePlanListItem[] = [];
  let drivers: DriverRecord[] = [];

  let status = '';
  let error = '';

  onMount(async () => {
    try {
      const me = await getMe();
      if (me.auth?.needsOnboarding) {
        goto('/onboarding/organization');
        return;
      }

      const [driverResponse, routePlanResponse] = await Promise.all([
        listDrivers({ pageSize: 200 }),
        listRoutePlans({ date: new Date().toISOString().slice(0, 10) }),
      ]);

      drivers = driverResponse.items;
      routePlans = routePlanResponse;

      if (drivers[0]) {
        routeDriverId = drivers[0].id;
        stopDriverId = drivers[0].id;
      }
      if (routePlans[0]) {
        routePlanId = routePlans[0].id;
      }
    } catch {
      goto('/login');
    }
  });

  async function submitRouteDispatch() {
    status = '';
    error = '';

    try {
      const response = await dispatchRoute({
        routePlanId,
        driverId: routeDriverId,
        vehicleId: routeVehicleId || undefined,
      });
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
        <label>Route Plan</label>
        <select bind:value={routePlanId}>
          {#if routePlans.length === 0}
            <option value="">No route plans found</option>
          {:else}
            {#each routePlans as plan}
              <option value={plan.id}>{plan.id} ({plan.status})</option>
            {/each}
          {/if}
        </select>
      </div>
      <div>
        <label>Driver ID</label>
        <select bind:value={routeDriverId}>
          {#each drivers as driver}
            <option value={driver.id}>{driver.name} ({driver.state})</option>
          {/each}
        </select>
      </div>
      <div>
        <label>Vehicle ID (optional)</label>
        <input class="input" bind:value={routeVehicleId} placeholder="UUID" />
      </div>
    </div>
    <button class="button" style="margin-top:16px;" on:click={submitRouteDispatch} disabled={!routePlanId || !routeDriverId}>Dispatch Route</button>
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
        <select bind:value={stopDriverId}>
          {#each drivers as driver}
            <option value={driver.id}>{driver.name} ({driver.state})</option>
          {/each}
        </select>
      </div>
    </div>
    <button class="button" style="margin-top:16px;" on:click={submitStopDispatch} disabled={!stopId || !stopDriverId}>Dispatch Stop</button>
  </section>

  {#if status}
    <p class="muted">{status}</p>
  {/if}
  {#if error}
    <p style="color:var(--danger);">{error}</p>
  {/if}
</div>
