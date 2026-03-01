<script lang="ts">
  import { onDestroy } from 'svelte';
  import mapboxgl from 'mapbox-gl';

  export let value: Record<string, unknown> = {};
  export let view: 'json' | 'table' = 'json';
  export let jsonText = '';
  export let jsonError = '';
  export let label = 'Request Payload';

  let dataRoot: Record<string, unknown> = {};
  let driversTable: DriverRow[] = [];
  let stopsTable: StopRow[] = [];
  let nextDriverId = 1;
  let nextStopId = 1;
  let inputMapContainer: HTMLDivElement | null = null;
  let inputMap: mapboxgl.Map | null = null;
  let inputMarker: mapboxgl.Marker | null = null;
  let inputMapInitialized = false;
  let activePicker: PickerTarget | null = null;
  let pickerLabel = '';
  let lastValueRef: Record<string, unknown> | null = null;

  type DriverRow = {
    rowId: number;
    id: number;
    name: string;
    startLocation: [number, number] | null;
    endLocation: [number, number] | null;
    maxTasks: number | null;
    extra: Record<string, unknown>;
  };

  type StopRow = {
    rowId: number;
    id: number;
    location: [number, number] | null;
    serviceSeconds: number | null;
    extra: Record<string, unknown>;
  };

  type PickerTarget =
    | { kind: 'driver-start'; index: number }
    | { kind: 'driver-end'; index: number }
    | { kind: 'stop'; index: number };

  $: if (value !== lastValueRef) {
    lastValueRef = value;
    dataRoot = (value ?? {}) as Record<string, unknown>;
    normalizeDataRoot();
    jsonText = JSON.stringify(dataRoot, null, 2);
  }

  onDestroy(() => {
    if (inputMap) {
      inputMap.remove();
      inputMap = null;
      inputMarker = null;
      inputMapInitialized = false;
    }
  });

  function normalizeDataRoot() {
    const driversRaw = Array.isArray((dataRoot as any)?.drivers)
      ? ((dataRoot as any).drivers as any[])
      : [];
    const stopsRaw = Array.isArray((dataRoot as any)?.stops)
      ? ((dataRoot as any).stops as any[])
      : [];
    driversTable = normalizeDrivers(driversRaw);
    stopsTable = normalizeStops(stopsRaw);
  }

  function normalizeDrivers(items: any[]): DriverRow[] {
    let nextId = 1;
    const rows = items.map((item, index) => {
      const rowId = index + 1;
      nextId = Math.max(nextId, rowId + 1);
      const payloadId = normalizeId((item as any)?.id, rowId);
      const extra = { ...(item ?? {}) } as Record<string, unknown>;
      delete (extra as any).id;
      delete (extra as any).name;
      delete (extra as any).startLocation;
      delete (extra as any).endLocation;
      delete (extra as any).maxTasks;
      return {
        rowId,
        id: payloadId,
        name: String((item as any)?.name ?? ''),
        startLocation: normalizeLocation((item as any)?.startLocation),
        endLocation: normalizeLocation((item as any)?.endLocation),
        maxTasks: normalizeNumber((item as any)?.maxTasks),
        extra,
      };
    });
    nextDriverId = nextId;
    return rows;
  }

  function normalizeStops(items: any[]): StopRow[] {
    let nextId = 1;
    const rows = items.map((item, index) => {
      const rowId = index + 1;
      nextId = Math.max(nextId, rowId + 1);
      const payloadId = normalizeId((item as any)?.id, rowId);
      const extra = { ...(item ?? {}) } as Record<string, unknown>;
      delete (extra as any).id;
      delete (extra as any).location;
      delete (extra as any).serviceSeconds;
      return {
        rowId,
        id: payloadId,
        location: normalizeLocation((item as any)?.location),
        serviceSeconds: normalizeNumber((item as any)?.serviceSeconds),
        extra,
      };
    });
    nextStopId = nextId;
    return rows;
  }

  function normalizeLocation(value: unknown): [number, number] | null {
    if (!Array.isArray(value) || value.length < 2) return null;
    const lon = Number(value[0]);
    const lat = Number(value[1]);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
    return [lon, lat];
  }

  function normalizeNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function normalizeId(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function syncToDataRoot(updateJson = true) {
    dataRoot = {
      ...(dataRoot ?? {}),
      drivers: driversTable.map((row) => ({
        id: row.id,
        name: row.name,
        startLocation: row.startLocation,
        endLocation: row.endLocation,
        ...(row.maxTasks !== null ? { maxTasks: row.maxTasks } : {}),
        ...row.extra,
      })),
      stops: stopsTable.map((row) => ({
        id: row.id,
        location: row.location,
        ...(row.serviceSeconds !== null ? { serviceSeconds: row.serviceSeconds } : {}),
        ...row.extra,
      })),
    };
    value = dataRoot;
    if (updateJson) {
      jsonText = JSON.stringify(dataRoot, null, 2);
    }
  }

  function handleJsonInput(text: string) {
    jsonText = text;
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      jsonError = '';
      value = parsed;
      dataRoot = parsed;
      normalizeDataRoot();
    } catch (err) {
      jsonError = (err as Error).message;
    }
  }

  function setRequestView(nextView: 'json' | 'table') {
    view = nextView;
    if (nextView === 'json') {
      jsonText = JSON.stringify(dataRoot, null, 2);
      activePicker = null;
      if (inputMap) {
        inputMap.remove();
        inputMap = null;
        inputMarker = null;
        inputMapInitialized = false;
      }
      return;
    }
    normalizeDataRoot();
  }

  function addDriverRow() {
    const row: DriverRow = {
      rowId: nextDriverId,
      id: nextDriverId,
      name: '',
      startLocation: null,
      endLocation: null,
      maxTasks: null,
      extra: {},
    };
    nextDriverId += 1;
    driversTable = [...driversTable, row];
    syncToDataRoot();
  }

  function removeDriverRow(index: number) {
    driversTable = driversTable.filter((_, idx) => idx !== index);
    syncToDataRoot();
  }

  function updateDriverRow(index: number, patch: Partial<DriverRow>) {
    driversTable = driversTable.map((row, idx) => (idx === index ? { ...row, ...patch } : row));
    syncToDataRoot();
  }

  function addStopRow() {
    const row: StopRow = {
      rowId: nextStopId,
      id: nextStopId,
      location: null,
      serviceSeconds: null,
      extra: {},
    };
    nextStopId += 1;
    stopsTable = [...stopsTable, row];
    syncToDataRoot();
  }

  function removeStopRow(index: number) {
    stopsTable = stopsTable.filter((_, idx) => idx !== index);
    syncToDataRoot();
  }

  function updateStopRow(index: number, patch: Partial<StopRow>) {
    stopsTable = stopsTable.map((row, idx) => (idx === index ? { ...row, ...patch } : row));
    syncToDataRoot();
  }

  function updateLocationPart(
    index: number,
    kind: 'driver-start' | 'driver-end' | 'stop',
    part: 'lon' | 'lat',
    value: string,
  ) {
    const numeric = Number(value);
    const existing =
      kind === 'stop'
        ? stopsTable[index]?.location
        : kind === 'driver-start'
          ? driversTable[index]?.startLocation
          : driversTable[index]?.endLocation;
    const lon = part === 'lon' ? numeric : existing?.[0];
    const lat = part === 'lat' ? numeric : existing?.[1];
    const next = Number.isFinite(lon) && Number.isFinite(lat) ? ([lon, lat] as [number, number]) : null;
    if (kind === 'stop') {
      updateStopRow(index, { location: next });
    } else if (kind === 'driver-start') {
      updateDriverRow(index, { startLocation: next });
    } else {
      updateDriverRow(index, { endLocation: next });
    }
  }

  function openPicker(target: PickerTarget) {
    activePicker = target;
    if (target.kind === 'driver-start') {
      pickerLabel = `Driver ${driversTable[target.index]?.rowId ?? target.index + 1} start`;
    } else if (target.kind === 'driver-end') {
      pickerLabel = `Driver ${driversTable[target.index]?.rowId ?? target.index + 1} end`;
    } else {
      pickerLabel = `Stop ${stopsTable[target.index]?.rowId ?? target.index + 1}`;
    }
    ensureInputMap();
  }

  function ensureInputMap() {
    if (!inputMapContainer) return;
    if (!inputMap && !inputMapInitialized) {
      inputMapInitialized = true;
      const defaultCenter: [number, number] = [121.0437, 14.676];
      mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN ?? '';
      inputMap = new mapboxgl.Map({
        container: inputMapContainer,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: defaultCenter,
        zoom: 12,
      });
      inputMap.addControl(new mapboxgl.NavigationControl(), 'top-right');
      inputMap.on('click', (event) => {
        if (!activePicker) return;
        const next: [number, number] = [event.lngLat.lng, event.lngLat.lat];
        if (activePicker.kind === 'driver-start') {
          updateDriverRow(activePicker.index, { startLocation: next });
        } else if (activePicker.kind === 'driver-end') {
          updateDriverRow(activePicker.index, { endLocation: next });
        } else {
          updateStopRow(activePicker.index, { location: next });
        }
        updateInputMarker(next);
      });
    }
    setTimeout(() => {
      inputMap?.resize();
      const current = activePicker ? resolvePickerLocation(activePicker) : null;
      if (current) {
        inputMap?.setCenter(current);
        updateInputMarker(current);
      }
    }, 0);
  }

  function resolvePickerLocation(target: PickerTarget): [number, number] | null {
    if (target.kind === 'driver-start') return driversTable[target.index]?.startLocation ?? null;
    if (target.kind === 'driver-end') return driversTable[target.index]?.endLocation ?? null;
    return stopsTable[target.index]?.location ?? null;
  }

  function updateInputMarker(coord: [number, number]) {
    if (!inputMap) return;
    if (!inputMarker) {
      inputMarker = new mapboxgl.Marker({ color: '#5ad2ff' }).setLngLat(coord).addTo(inputMap);
      return;
    }
    inputMarker.setLngLat(coord);
  }
</script>

<svelte:head>
  <link
    href="https://api.mapbox.com/mapbox-gl-js/v3.7.0/mapbox-gl.css"
    rel="stylesheet"
  />
</svelte:head>

<div style="margin-top:24px;">
  <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
    <label style="margin:0;">{label}</label>
    <div style="display:flex;gap:8px;">
      <button
        class={`button ${view === 'json' ? '' : 'secondary'}`}
        style="padding:6px 12px;"
        on:click={() => setRequestView('json')}
      >
        JSON
      </button>
      <button
        class={`button ${view === 'table' ? '' : 'secondary'}`}
        style="padding:6px 12px;"
        on:click={() => setRequestView('table')}
      >
        Table
      </button>
    </div>
  </div>

  {#if view === 'json'}
    <textarea
      rows="18"
      bind:value={jsonText}
      on:input={(event) => handleJsonInput((event.target as HTMLTextAreaElement).value)}
    ></textarea>
    {#if jsonError}
      <p style="margin-top:8px;color:var(--danger);">{jsonError}</p>
    {/if}
  {:else}
    <div style="margin-top:12px;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
        <h3 style="margin:0;">Drivers</h3>
        <button class="button secondary" on:click={addDriverRow}>Add Driver</button>
      </div>
      <div style="margin-top:12px;overflow:auto;border:1px solid var(--border);border-radius:12px;">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:var(--surface);">
              <th style="text-align:left;padding:10px;">ID</th>
              <th style="text-align:left;padding:10px;">Name</th>
              <th style="text-align:left;padding:10px;">Max Tasks</th>
              <th style="text-align:left;padding:10px;">Start (lon, lat)</th>
              <th style="text-align:left;padding:10px;">End (lon, lat)</th>
              <th style="text-align:left;padding:10px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each driversTable as driver, idx}
              <tr>
                <td style="padding:10px;">{driver.rowId}</td>
                <td style="padding:10px;">
                  <input
                    type="text"
                    value={driver.name}
                    on:input={(event) =>
                      updateDriverRow(idx, { name: (event.target as HTMLInputElement).value })
                    }
                  />
                </td>
                <td style="padding:10px;">
                  <input
                    type="number"
                    step="1"
                    value={driver.maxTasks ?? ''}
                    on:input={(event) =>
                      updateDriverRow(idx, {
                        maxTasks: normalizeNumber((event.target as HTMLInputElement).value),
                      })
                    }
                  />
                </td>
                <td style="padding:10px;">
                  <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
                    <span class="muted" style="min-width:180px;">
                      {driver.startLocation
                        ? `${driver.startLocation[0].toFixed(6)}, ${driver.startLocation[1].toFixed(6)}`
                        : 'No point selected'}
                    </span>
                    <button
                      class="button secondary"
                      on:click={() => openPicker({ kind: 'driver-start', index: idx })}
                    >
                      Pick
                    </button>
                  </div>
                </td>
                <td style="padding:10px;">
                  <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
                    <span class="muted" style="min-width:180px;">
                      {driver.endLocation
                        ? `${driver.endLocation[0].toFixed(6)}, ${driver.endLocation[1].toFixed(6)}`
                        : 'No point selected'}
                    </span>
                    <button
                      class="button secondary"
                      on:click={() => openPicker({ kind: 'driver-end', index: idx })}
                    >
                      Pick
                    </button>
                  </div>
                </td>
                <td style="padding:10px;">
                  <button class="button secondary" on:click={() => removeDriverRow(idx)}>Delete</button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>

    <div style="margin-top:24px;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
        <h3 style="margin:0;">Stops</h3>
        <button class="button secondary" on:click={addStopRow}>Add Stop</button>
      </div>
      <div style="margin-top:12px;overflow:auto;border:1px solid var(--border);border-radius:12px;">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:var(--surface);">
              <th style="text-align:left;padding:10px;">ID</th>
              <th style="text-align:left;padding:10px;">Location (lon, lat)</th>
              <th style="text-align:left;padding:10px;">Service Seconds</th>
              <th style="text-align:left;padding:10px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each stopsTable as stop, idx}
              <tr>
                <td style="padding:10px;">{stop.rowId}</td>
                <td style="padding:10px;">
                  <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
                    <span class="muted" style="min-width:180px;">
                      {stop.location
                        ? `${stop.location[0].toFixed(6)}, ${stop.location[1].toFixed(6)}`
                        : 'No point selected'}
                    </span>
                    <button class="button secondary" on:click={() => openPicker({ kind: 'stop', index: idx })}>
                      Pick
                    </button>
                  </div>
                </td>
                <td style="padding:10px;">
                  <input
                    type="number"
                    step="1"
                    value={stop.serviceSeconds ?? ''}
                    on:input={(event) =>
                      updateStopRow(idx, {
                        serviceSeconds: normalizeNumber((event.target as HTMLInputElement).value),
                      })
                    }
                  />
                </td>
                <td style="padding:10px;">
                  <button class="button secondary" on:click={() => removeStopRow(idx)}>Delete</button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>

    <div style="margin-top:24px;">
      <label style="display:block;margin-bottom:8px;">Map Picker</label>
      {#if activePicker}
        <p class="muted" style="margin:0 0 8px;">
          Picking location for {pickerLabel}. Click the map to set coordinates.
        </p>
      {:else}
        <p class="muted" style="margin:0 0 8px;">Select a row to pick a location.</p>
      {/if}
      <div
        bind:this={inputMapContainer}
        style="height:360px;border-radius:16px;border:1px solid var(--border);overflow:hidden;"
      ></div>
    </div>
  {/if}
</div>
