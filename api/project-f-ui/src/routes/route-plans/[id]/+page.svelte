<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { getMe } from '$lib/services/auth-api';
  import { listDrivers, type DriverRecord } from '$lib/services/drivers-api';
  import {
    assignRoutePlanDriver,
    getRoutePlan,
    getRoutePlanStops,
  } from '$lib/services/operations-api';
  import type { RoutePlanDetail, RoutePlanStop } from '$lib/domain/operations';

  const routePlanId = get(page).params.id ?? '';

  let routePlan: RoutePlanDetail | null = null;
  let routeStops: RoutePlanStop[] = [];
  let drivers: DriverRecord[] = [];
  let activeRole: 'org_admin' | 'dispatcher' | 'driver' | 'viewer' | null = null;

  let assignDriverId = '';
  let assignVehicleId = '';

  let status = '';
  let error = '';

  async function load() {
    error = '';
    status = 'Loading route plan...';

    try {
      const [detail, stops] = await Promise.all([
        getRoutePlan(routePlanId),
        getRoutePlanStops(routePlanId),
      ]);
      routePlan = detail;
      routeStops = stops;
      status = '';
    } catch (err) {
      status = '';
      error = (err as Error).message;
    }
  }

  async function assign() {
    if (!assignDriverId) {
      error = 'Select a driver first.';
      return;
    }

    error = '';
    status = 'Assigning driver...';

    try {
      await assignRoutePlanDriver(routePlanId, {
        driverId: assignDriverId,
        vehicleId: assignVehicleId || undefined,
      });
      status = 'Driver assigned.';
      await load();
    } catch (err) {
      status = '';
      error = (err as Error).message;
    }
  }

  onMount(async () => {
    try {
      const me = await getMe();
      activeRole = me.auth?.activeRole ?? null;
      if (me.auth?.needsOnboarding) {
        goto('/onboarding/organization');
        return;
      }

      const response = await listDrivers({ pageSize: 200 });
      drivers = response.items;
      if (drivers[0]) {
        assignDriverId = drivers[0].id;
      }
      await load();
    } catch {
      goto('/login');
    }
  });
</script>

<div class="card">
  <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;">
    <div>
      <h2 style="margin:0;">Route Plan Detail</h2>
      <p class="muted" style="margin:4px 0 0;">{routePlanId}</p>
    </div>
    <a class="button secondary" href="/route-plans">Back</a>
  </div>

  {#if status}
    <p class="muted" style="margin-top:16px;">{status}</p>
  {/if}
  {#if error}
    <p style="margin-top:16px;color:var(--danger);">{error}</p>
  {/if}

  {#if routePlan}
    <div class="row two" style="margin-top:16px;">
      <div>
        <label>Status</label>
        <div class={`status ${routePlan.status}`}>{routePlan.status}</div>
      </div>
      <div>
        <label>Plan Date</label>
        <div>{routePlan.planDate ?? '-'}</div>
      </div>
      <div>
        <label>Created</label>
        <div>{new Date(routePlan.createdAt).toLocaleString()}</div>
      </div>
      <div>
        <label>Updated</label>
        <div>{new Date(routePlan.updatedAt).toLocaleString()}</div>
      </div>
    </div>

    {#if activeRole === 'org_admin' || activeRole === 'dispatcher'}
      <section class="card" style="margin-top:20px;">
        <h3 style="margin:0 0 8px;">Assign Driver</h3>
        <div class="row two">
          <div>
            <label>Driver</label>
            <select bind:value={assignDriverId}>
              {#each drivers as driver}
                <option value={driver.id}>{driver.name} ({driver.state})</option>
              {/each}
            </select>
          </div>
          <div>
            <label>Vehicle ID (optional)</label>
            <input class="input" bind:value={assignVehicleId} placeholder="UUID" />
          </div>
        </div>
        <button class="button" style="margin-top:12px;" on:click={assign}>Assign Driver</button>
      </section>
    {/if}

    <section style="margin-top:20px;">
      <h3 style="margin:0 0 8px;">Trips</h3>
      {#if routePlan.trips.length === 0}
        <p class="muted">No trips linked yet.</p>
      {:else}
        <table class="table">
          <thead>
            <tr>
              <th>Trip ID</th>
              <th>Driver ID</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {#each routePlan.trips as trip}
              <tr>
                <td>{trip.tripId}</td>
                <td>{trip.driverId ?? '-'}</td>
                <td><span class={`status ${trip.status}`}>{trip.status}</span></td>
                <td>{trip.tripDate}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </section>

    <section style="margin-top:20px;">
      <h3 style="margin:0 0 8px;">Stops</h3>
      {#if routeStops.length === 0}
        <p class="muted">No route stops persisted yet.</p>
      {:else}
        <table class="table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Stop ID</th>
              <th>ETA</th>
              <th>Distance (m)</th>
              <th>Duration (s)</th>
            </tr>
          </thead>
          <tbody>
            {#each routeStops as stop}
              <tr>
                <td>{stop.stopOrder}</td>
                <td>{stop.stopId ?? '-'}</td>
                <td>{stop.etaAt ? new Date(stop.etaAt).toLocaleString() : '-'}</td>
                <td>{stop.distanceMeters ?? '-'}</td>
                <td>{stop.durationSeconds ?? '-'}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </section>
  {/if}
</div>
