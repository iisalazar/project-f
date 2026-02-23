<script lang="ts">
  import { onMount } from 'svelte';
  import { apiFetch } from '$lib/api';
  import type { OptimizationJobDetail } from '$lib/types';
  import { page } from '$app/stores';
  import { get } from 'svelte/store';
  import { goto } from '$app/navigation';
  import polyline from '@mapbox/polyline';
  import mapboxgl from 'mapbox-gl';
  import OptimizationInputBuilder from '$lib/components/OptimizationInputBuilder.svelte';

  let job: OptimizationJobDetail | null = null;
  let error = '';
  let status = '';
  let selectedRouteIndex = 0;
  let mapContainer: HTMLDivElement | null = null;
  let map: mapboxgl.Map | null = null;
  let routeSourceId = 'route-line';
  let markers: mapboxgl.Marker[] = [];
  let mapInitialized = false;
  let drivers: any[] = [];
  let requestView: 'json' | 'table' = 'json';
  let dataRoot: Record<string, unknown> = {};
  let jsonText = '';
  let jsonError = '';

  const jobId = get(page).params.jobId as string;

  $: drivers = (dataRoot as any)?.drivers ?? [];

  async function loadJob() {
    error = '';
    status = 'Loading job…';
    try {
      await apiFetch('/auth/me');
      job = await apiFetch(`/optimization/jobs/${jobId}`);
      dataRoot = ((job.data as any) ?? {}) as Record<string, unknown>;
      jsonText = JSON.stringify(dataRoot, null, 2);
      status = '';
    } catch (err) {
      const apiError = err as Error & { status?: number };
      if (apiError.status === 403) {
        goto('/login');
        return;
      }
      error = apiError.message;
      status = '';
    }
  }

  onMount(() => {
    loadJob();
  });

  $: if (job && job.result) {
    setTimeout(() => renderMap(), 0);
  }

  async function renderMap() {
    if (!mapContainer) return;
    const routes = (job?.result as any)?.routes ?? [];
    if (!routes.length) return;

    const route = routes[selectedRouteIndex] ?? routes[0];
    const geometry = route?.geometry;
    if (!geometry) return;

    const decoded = polyline.decode(geometry);
    const lineCoords = decoded.map((pair) => [pair[1], pair[0]]);

    if (!map && !mapInitialized) {
      mapInitialized = true;
      mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN ?? '';
      map = new mapboxgl.Map({
        container: mapContainer,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: lineCoords[0] ?? [0, 0],
        zoom: 11,
      });
      map.addControl(new mapboxgl.NavigationControl(), 'top-right');
      map.on('load', () => {
        drawRoute(route, lineCoords);
      });
      return;
    }

    if (map && map.isStyleLoaded()) {
      drawRoute(route, lineCoords);
    } else if (map) {
      map.once('load', () => drawRoute(route, lineCoords));
    }
  }

  function drawRoute(route: any, lineCoords: number[][]) {
    if (!map) return;

    const routeGeoJson = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: lineCoords,
      },
    } as const;

    const steps = route?.steps ?? [];
    const points = steps
      .filter((step: any) => step?.location)
      .map((step: any) => {
        const [lon, lat] = step.location;
        const type = step.type ?? 'job';
        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [lon, lat],
          },
          properties: {
            kind: type,
            label: type === 'job' ? `Job ${step.job ?? step.id ?? ''}` : type,
          },
        };
      });

    if (map.getSource(routeSourceId)) {
      (map.getSource(routeSourceId) as mapboxgl.GeoJSONSource).setData(routeGeoJson);
    } else {
      map.addSource(routeSourceId, { type: 'geojson', data: routeGeoJson });
      map.addLayer({
        id: 'route-line-layer',
        type: 'line',
        source: routeSourceId,
        paint: {
          'line-color': '#5ad2ff',
          'line-width': 4,
        },
      });
    }

    markers.forEach((marker) => marker.remove());
    markers = [];
    const coordCounts = new Map<string, number>();
    for (const point of points) {
      const [lon, lat] = point.geometry.coordinates;
      const kind = point.properties.kind;
      const label = point.properties.label;
      const color = kind === 'start' ? '#5dd39e' : kind === 'end' ? '#ff6b6b' : '#f2c94c';
      const key = `${lon.toFixed(5)}:${lat.toFixed(5)}`;
      const count = coordCounts.get(key) ?? 0;
      coordCounts.set(key, count + 1);
      const offset = count * 0.00015;
      const jittered: [number, number] = [lon + offset, lat + offset];
      const marker = new mapboxgl.Marker({ color })
        .setLngLat(jittered)
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setText(label))
        .addTo(map);
      markers.push(marker);
    }

    const bounds = lineCoords.reduce(
      (acc, coord) => acc.extend(coord as [number, number]),
      new mapboxgl.LngLatBounds(lineCoords[0], lineCoords[0]),
    );
    map.fitBounds(bounds, { padding: 30, duration: 500 });
  }
</script>

<div class="card">
  <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;">
    <div>
      <h2 style="margin:0;">Job Detail</h2>
      <p class="muted" style="margin:4px 0 0;">{jobId}</p>
    </div>
    <button class="button secondary" on:click={loadJob}>Refresh</button>
  </div>

  {#if status}
    <p class="muted" style="margin-top:16px;">{status}</p>
  {/if}
  {#if error}
    <p style="margin-top:16px;color:var(--danger);">{error}</p>
  {/if}

  {#if job}
    <div class="row two" style="margin-top:16px;">
      <div>
        <label>Status</label>
        <div class={`status ${job.status}`}>{job.status}</div>
      </div>
      <div>
        <label>Created</label>
        <div>{new Date(job.createdAt).toLocaleString()}</div>
      </div>
      <div>
        <label>Updated</label>
        <div>{new Date(job.updatedAt).toLocaleString()}</div>
      </div>
      <div>
        <label>Result Version</label>
        <div>{job.resultVersion ?? '—'}</div>
      </div>
    </div>

    {#if job.errorMessage}
      <p style="margin-top:16px;color:var(--danger);">{job.errorMessage}</p>
    {/if}

    <OptimizationInputBuilder
      bind:value={dataRoot}
      bind:view={requestView}
      bind:jsonText={jsonText}
      bind:jsonError={jsonError}
      label="Request Data"
    />

    <div style="margin-top:24px;">
      <label>Result</label>
      {#if job.result}
        {#if (job.result as any).routes?.length}
          <div style="margin-bottom:12px;display:flex;gap:12px;align-items:center;">
            <label style="margin:0;">Driver Route</label>
            <select
              bind:value={selectedRouteIndex}
              on:change={() => renderMap()}
              style="max-width:240px;"
            >
              {#each (job.result as any).routes as route, idx}
                <option value={idx}>
                  {drivers.find((d: any) => d.id === route.vehicle)?.name ??
                    `Driver ${route.vehicle ?? idx + 1}`}
                </option>
              {/each}
            </select>
          </div>
          <div
            bind:this={mapContainer}
            style="height:520px;border-radius:16px;border:1px solid var(--border);overflow:hidden;"
          ></div>
        {/if}
        <div class="code">{JSON.stringify(job.result, null, 2)}</div>
      {:else}
        <p class="muted">No result yet.</p>
      {/if}
    </div>

    <div style="margin-top:24px;">
      <label>Logs</label>
      {#if job.logs.length === 0}
        <p class="muted">No logs yet.</p>
      {:else}
        <ul>
          {#each job.logs as log}
            <li style="margin-bottom:8px;">
              <span class="badge">{log.type}</span>
              <span style="margin-left:8px;">{log.message}</span>
              <span class="muted" style="margin-left:8px;">{new Date(log.createdAt).toLocaleString()}</span>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}
</div>
