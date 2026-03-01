<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import {
    createPlan,
    getOptimizationStatus,
    listRoutePlans,
  } from '$lib/services/operations-api';
  import { listDrivers, type DriverRecord } from '$lib/services/drivers-api';
  import { getMe } from '$lib/services/auth-api';
  import MapPointPicker from '$lib/components/MapPointPicker.svelte';

  const sampleJobs = [
    { id: 101, location: [121.0509, 14.5547], service: 300 },
    { id: 102, location: [121.06, 14.56], service: 180 },
  ];
  type JobRow = {
    id: number;
    lon: number;
    lat: number;
    service?: number;
  };

  let planDate = new Date().toISOString().slice(0, 10);
  let jobsPayload = JSON.stringify(sampleJobs, null, 2);
  let jobsInputMode: 'table' | 'json' = 'table';
  let jobsTable: JobRow[] = sampleJobs.map((item) => ({
    id: item.id,
    lon: item.location[0],
    lat: item.location[1],
    service: item.service,
  }));
  let drivers: DriverRecord[] = [];
  let selectedDriverIds: string[] = [];

  let jobId = '';
  let jobStatus = '';
  let routePlanId = '';

  let status = '';
  let error = '';
  let activeMapRowIndex: number | null = null;
  let mapPoint: [number, number] | null = null;

  onMount(async () => {
    try {
      const me = await getMe();
      if (me.auth?.needsOnboarding) {
        goto('/onboarding/organization');
        return;
      }
      const response = await listDrivers({ pageSize: 200 });
      drivers = response.items;
    } catch {
      goto('/login');
    }
  });

  function toggleDriver(driverId: string) {
    if (selectedDriverIds.includes(driverId)) {
      selectedDriverIds = selectedDriverIds.filter((id) => id !== driverId);
      return;
    }
    selectedDriverIds = [...selectedDriverIds, driverId];
  }

  async function submitPlan() {
    error = '';
    status = 'Submitting optimization...';
    routePlanId = '';

    try {
      const jobs =
        jobsInputMode === 'json'
          ? (JSON.parse(jobsPayload) as Array<{
              id: number;
              location: [number, number];
              service?: number;
            }>)
          : jobsTable.map((item) => ({
              id: Number(item.id),
              location: [Number(item.lon), Number(item.lat)] as [number, number],
              service:
                item.service === undefined || item.service === null
                  ? undefined
                  : Number(item.service),
            }));

      if (selectedDriverIds.length === 0) {
        throw new Error('Select at least one driver.');
      }
      if (!Array.isArray(jobs) || jobs.length === 0) {
        throw new Error('Jobs payload must be a non-empty array.');
      }
      for (const job of jobs) {
        if (
          !Number.isFinite(job.id) ||
          !Array.isArray(job.location) ||
          job.location.length !== 2 ||
          !Number.isFinite(job.location[0]) ||
          !Number.isFinite(job.location[1])
        ) {
          throw new Error(
            'Each job must have numeric id and location [lon, lat].',
          );
        }
      }

      const response = await createPlan({
        planDate,
        selectedDriverIds,
        jobs,
      });

      jobId = response.jobId;
      jobStatus = 'enqueued';
      status = `Plan queued (${response.jobId}).`;
    } catch (err) {
      status = '';
      error = (err as Error).message;
    }
  }

  async function refreshStatus() {
    if (!jobId) return;

    error = '';
    status = 'Checking job status...';

    try {
      const response = await getOptimizationStatus(jobId);
      jobStatus = response.status;
      status = `Job ${response.id}: ${response.status} (attempts: ${response.attempts})`;

      if (response.status === 'completed') {
        await findRoutePlan();
      }
    } catch (err) {
      error = (err as Error).message;
      status = '';
    }
  }

  async function findRoutePlan() {
    try {
      const routePlans = await listRoutePlans({ date: planDate });
      if (routePlans[0]) {
        routePlanId = routePlans[0].id;
      }
    } catch {
      // keep status from job polling; route plan lookup is best-effort
    }
  }

  function addJobRow() {
    jobsTable = [
      ...jobsTable,
      { id: Date.now(), lon: 0, lat: 0, service: undefined },
    ];
  }

  function removeJobRow(index: number) {
    jobsTable = jobsTable.filter((_, idx) => idx !== index);
  }

  function updateJobRow(index: number, patch: Partial<JobRow>) {
    jobsTable = jobsTable.map((item, idx) =>
      idx === index ? { ...item, ...patch } : item,
    );
  }

  function openMapPicker(index: number) {
    const row = jobsTable[index];
    if (!row) {
      return;
    }

    activeMapRowIndex = index;
    mapPoint = [row.lon, row.lat];
  }

  function closeMapPicker() {
    activeMapRowIndex = null;
    mapPoint = null;
  }

  function applyMapPoint() {
    if (activeMapRowIndex === null || !mapPoint) {
      return;
    }

    updateJobRow(activeMapRowIndex, {
      lon: Number(mapPoint[0].toFixed(6)),
      lat: Number(mapPoint[1].toFixed(6)),
    });
    closeMapPicker();
  }
</script>

<div class="card">
  <h2 style="margin:0 0 8px;">Planning Workspace</h2>
  <p class="muted" style="margin-top:0;">Create dated optimization jobs with selected organization drivers.</p>

  <div class="row two" style="margin-top:16px;">
    <div>
      <label>Plan Date</label>
      <input class="input" type="date" bind:value={planDate} />
    </div>
    <div>
      <label>Selected Drivers</label>
      <div class="muted">{selectedDriverIds.length} selected</div>
    </div>
  </div>

  <div style="margin-top:16px;">
    <label>Drivers</label>
    {#if drivers.length === 0}
      <p class="muted">No drivers found. Create drivers first.</p>
    {:else}
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;">
        {#each drivers as driver}
          <button
            class="button secondary"
            style={`text-align:left;${selectedDriverIds.includes(driver.id) ? 'border-color:var(--accent);' : ''}`}
            on:click={() => toggleDriver(driver.id)}
          >
            {driver.name} ({driver.state})
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <div style="margin-top:16px;">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
      <label>Jobs Input</label>
      <div style="display:flex;gap:8px;">
        <button
          class="button secondary"
          style={jobsInputMode === 'table' ? 'border-color:var(--accent);' : ''}
          on:click={() => (jobsInputMode = 'table')}
        >
          Table
        </button>
        <button
          class="button secondary"
          style={jobsInputMode === 'json' ? 'border-color:var(--accent);' : ''}
          on:click={() => (jobsInputMode = 'json')}
        >
          JSON
        </button>
      </div>
    </div>

    {#if jobsInputMode === 'table'}
      <table class="table" style="margin-top:8px;">
        <thead>
          <tr>
            <th>ID</th>
            <th>Longitude</th>
            <th>Latitude</th>
            <th>Service (sec)</th>
            <th>Map</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#each jobsTable as row, idx}
            <tr>
              <td>
                <input
                  class="input"
                  type="number"
                  value={row.id}
                  on:input={(event) =>
                    updateJobRow(idx, {
                      id: Number((event.currentTarget as HTMLInputElement).value),
                    })}
                />
              </td>
              <td>
                <input
                  class="input"
                  type="number"
                  step="0.000001"
                  value={row.lon}
                  on:input={(event) =>
                    updateJobRow(idx, {
                      lon: Number((event.currentTarget as HTMLInputElement).value),
                    })}
                />
              </td>
              <td>
                <input
                  class="input"
                  type="number"
                  step="0.000001"
                  value={row.lat}
                  on:input={(event) =>
                    updateJobRow(idx, {
                      lat: Number((event.currentTarget as HTMLInputElement).value),
                    })}
                />
              </td>
              <td>
                <input
                  class="input"
                  type="number"
                  value={row.service ?? ''}
                  on:input={(event) => {
                    const value = (event.currentTarget as HTMLInputElement).value;
                    updateJobRow(idx, {
                      service: value === '' ? undefined : Number(value),
                    });
                  }}
                />
              </td>
              <td>
                <button class="button secondary" on:click={() => openMapPicker(idx)}>
                  Pick on Map
                </button>
              </td>
              <td>
                <button class="button secondary" on:click={() => removeJobRow(idx)}>
                  Remove
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
      <div style="margin-top:8px;">
        <button class="button secondary" on:click={addJobRow}>Add Job</button>
      </div>
      {#if activeMapRowIndex !== null}
        <section class="card" style="margin-top:12px;">
          <h3 style="margin:0 0 8px;">Pick Job #{activeMapRowIndex + 1} Location</h3>
          <MapPointPicker bind:value={mapPoint} label="Job Location" height={300} />
          <div style="display:flex;gap:8px;margin-top:12px;">
            <button class="button" on:click={applyMapPoint} disabled={!mapPoint}>
              Use This Point
            </button>
            <button class="button secondary" on:click={closeMapPicker}>Cancel</button>
          </div>
        </section>
      {/if}
    {:else}
      <textarea rows="12" bind:value={jobsPayload}></textarea>
    {/if}
  </div>

  <div style="display:flex;gap:12px;margin-top:16px;flex-wrap:wrap;">
    <button class="button" on:click={submitPlan}>Run Plan</button>
    <button class="button secondary" on:click={refreshStatus} disabled={!jobId}>Refresh Status</button>
    <a class="button secondary" href="/route-plans">Open Route Plans</a>
  </div>

  {#if jobId}
    <p class="muted" style="margin-top:16px;">Job ID: <span class="code" style="padding:2px 8px;">{jobId}</span></p>
  {/if}

  {#if jobStatus}
    <p class="muted">Current status: {jobStatus}</p>
  {/if}

  {#if routePlanId}
    <p class="muted">
      Route plan created for {planDate}:
      <a class="badge" href={`/route-plans/${routePlanId}`}>{routePlanId}</a>
    </p>
  {/if}

  {#if status}
    <p class="muted">{status}</p>
  {/if}
  {#if error}
    <p style="color:var(--danger);">{error}</p>
  {/if}
</div>
