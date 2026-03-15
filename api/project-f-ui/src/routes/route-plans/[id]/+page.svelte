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
  import polyline from '@mapbox/polyline';
  import mapboxgl from 'mapbox-gl';

  const routePlanId = get(page).params.id ?? '';

  let routePlan: RoutePlanDetail | null = null;
  let routeStops: RoutePlanStop[] = [];
  let drivers: DriverRecord[] = [];
  let activeRole: 'org_admin' | 'dispatcher' | 'driver' | 'viewer' | null = null;

  let assignDriverId = '';
  let assignVehicleId = '';

  let status = '';
  let error = '';

  let mapContainer: HTMLDivElement | null = null;
  let map: mapboxgl.Map | null = null;
  let mapInitialized = false;
  let markers: mapboxgl.Marker[] = [];
  const routeSourceId = 'route-line';

  function getLineCoords(geometry: unknown): number[][] | null {
    if (typeof geometry === 'string') {
      return polyline.decode(geometry as string).map(([lat, lon]) => [lon, lat]);
    }
    if (geometry && typeof geometry === 'object') {
      const geo = geometry as Record<string, unknown>;
      if (geo.type === 'LineString' && Array.isArray(geo.coordinates)) {
        return geo.coordinates as number[][];
      }
      const routes = (geo as any).routes;
      if (Array.isArray(routes) && routes[0]?.geometry) {
        return polyline.decode(routes[0].geometry).map(([lat, lon]: [number, number]) => [lon, lat]);
      }
    }
    return null;
  }

  async function renderMap() {
    if (!mapContainer || !routePlan) return;
    const lineCoords = getLineCoords((routePlan as any).geometry);
    if (!lineCoords || lineCoords.length === 0) return;

    if (!map && !mapInitialized) {
      mapInitialized = true;
      mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN ?? '';
      map = new mapboxgl.Map({
        container: mapContainer,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: lineCoords[0] as [number, number],
        zoom: 11,
      });
      map.addControl(new mapboxgl.NavigationControl(), 'top-right');
      map.on('load', () => drawRoute(lineCoords));
      return;
    }

    if (map && map.isStyleLoaded()) {
      drawRoute(lineCoords);
    } else if (map) {
      map.once('load', () => drawRoute(lineCoords));
    }
  }

  function drawRoute(lineCoords: number[][]) {
    if (!map) return;

    const routeGeoJson = {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: lineCoords },
    } as const;

    if (map.getSource(routeSourceId)) {
      (map.getSource(routeSourceId) as mapboxgl.GeoJSONSource).setData(routeGeoJson);
    } else {
      map.addSource(routeSourceId, { type: 'geojson', data: routeGeoJson });
      map.addLayer({
        id: 'route-line-layer',
        type: 'line',
        source: routeSourceId,
        paint: { 'line-color': '#5ad2ff', 'line-width': 4 },
      });
    }

    markers.forEach((m) => m.remove());
    markers = [];
    routeStops.forEach((stop, idx) => {
      if (!stop.location && !(stop as any).lon) return;
      const lon = (stop as any).lon ?? (stop as any).location?.[0];
      const lat = (stop as any).lat ?? (stop as any).location?.[1];
      if (lon == null || lat == null) return;
      const el = document.createElement('div');
      el.textContent = String(stop.stopOrder ?? idx + 1);
      el.style.cssText =
        'background:#f2c94c;color:#0f1320;font-weight:700;font-size:11px;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid #0f1320;';
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([lon, lat])
        .addTo(map!);
      markers.push(marker);
    });

    const bounds = lineCoords.reduce(
      (acc, coord) => acc.extend(coord as [number, number]),
      new mapboxgl.LngLatBounds(lineCoords[0] as [number, number], lineCoords[0] as [number, number]),
    );
    map.fitBounds(bounds, { padding: 40, duration: 500 });
  }

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
      if ((routePlan as any).geometry) {
        setTimeout(() => renderMap(), 0);
      }
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
  <div style="margin-bottom:12px;font-size:14px;color:var(--muted);">
    <a href="/route-plans" style="color:var(--muted);text-decoration:none;">← Route Plans</a>
    / Plan #{routePlanId.slice(0, 8)}
  </div>

  <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;">
    <h2 style="margin:0;">Route Plan Detail</h2>
    <a class="button secondary" href="/route-plans">← Back</a>
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
        <div><span class={`status ${routePlan.status}`}>● {routePlan.status}</span></div>
      </div>
      <div>
        <label>Plan Date</label>
        <div>{routePlan.planDate ?? '—'}</div>
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
        <button class="button" style="margin-top:12px;" onclick={assign}>Assign Driver</button>
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
              <th>Driver</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {#each routePlan.trips as trip}
              <tr>
                <td style="font-family:var(--mono,monospace);font-size:12px;">{trip.tripId.slice(0, 8)}…</td>
                <td>{drivers.find((d) => d.id === trip.driverId)?.name ?? trip.driverId?.slice(0, 8) ?? '—'}</td>
                <td><span class={`status ${trip.status}`}>● {trip.status}</span></td>
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
              <th>Distance</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            {#each routeStops as stop}
              <tr>
                <td>{stop.stopOrder}</td>
                <td style="font-family:var(--mono,monospace);font-size:12px;">{stop.stopId ? stop.stopId.slice(0, 8) + '…' : '—'}</td>
                <td>{stop.etaAt ? new Date(stop.etaAt).toLocaleString() : '—'}</td>
                <td>{stop.distanceMeters != null ? `${(stop.distanceMeters / 1000).toFixed(1)} km` : '—'}</td>
                <td>{stop.durationSeconds != null ? `${Math.round(stop.durationSeconds / 60)} min` : '—'}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </section>

    {#if (routePlan as any).geometry}
      <section style="margin-top:20px;">
        <h3 style="margin:0 0 8px;">Route Map</h3>
        <div
          bind:this={mapContainer}
          style="height:440px;border-radius:12px;border:1px solid var(--border);overflow:hidden;"
        ></div>
      </section>
    {/if}
  {/if}
</div>
