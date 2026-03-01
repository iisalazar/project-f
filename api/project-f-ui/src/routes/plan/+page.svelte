<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { createPlan, getOptimizationStatus } from '$lib/services/operations-api';
  import { listDrivers, type DriverRecord } from '$lib/services/drivers-api';
  import { getMe } from '$lib/services/auth-api';

  const sample = {
    vehicles: [{ id: 1, start: [121.0437, 14.676], end: [121.0437, 14.676], time_window: [28800, 61200] }],
    jobs: [{ id: 101, location: [121.0509, 14.5547], service: 300 }],
  };

  let payload = JSON.stringify(sample, null, 2);
  let jobId = '';
  let status = '';
  let result = '';
  let error = '';
  let drivers: DriverRecord[] = [];
  let selectedDriverIds: string[] = [];

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

  function applySelectedDriversToPayload() {
    try {
      const parsed = JSON.parse(payload) as { vehicles?: any[] };
      const selected = drivers.filter((driver) => selectedDriverIds.includes(driver.id));
      parsed.vehicles = selected.map((driver, index) => ({
        id: index + 1,
        start: (driver.startLocation as [number, number] | null) ?? [121.0437, 14.676],
        end: (driver.endLocation as [number, number] | null) ?? (driver.startLocation as [number, number] | null) ?? [121.0437, 14.676],
        time_window: [28800, 61200],
      }));
      payload = JSON.stringify(parsed, null, 2);
      error = '';
      status = `Applied ${selected.length} drivers to vehicles payload.`;
    } catch (err) {
      error = (err as Error).message;
      status = '';
    }
  }

  async function submitPlan() {
    error = '';
    status = 'Submitting optimization...';
    result = '';
    try {
      const body = JSON.parse(payload);
      const response = await createPlan(body);
      jobId = response.jobId;
      status = `Plan queued (${response.jobId})`;
    } catch (err) {
      status = '';
      error = (err as Error).message;
    }
  }

  async function refreshStatus() {
    if (!jobId) return;
    error = '';
    try {
      const response = await getOptimizationStatus(jobId);
      status = `Status: ${response.status} (attempts: ${response.attempts})`;
      result = JSON.stringify(response, null, 2);
    } catch (err) {
      error = (err as Error).message;
    }
  }
</script>

<div class="card">
  <h2 style="margin:0 0 8px;">Plan Optimization (v2)</h2>
  <p class="muted" style="margin-top:0;">Run `POST /plan/optimize` with VROOM-native payload.</p>

  <div style="margin-bottom:16px;">
    <label>Driver Selection (from /drivers)</label>
    {#if drivers.length === 0}
      <p class="muted">No drivers found. Add drivers first from the Drivers page.</p>
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
      <div style="margin-top:8px;">
        <button class="button secondary" on:click={applySelectedDriversToPayload}>
          Apply Selected Drivers To Payload
        </button>
      </div>
    {/if}
  </div>

  <label>Payload (vehicles + jobs)</label>
  <textarea rows="16" bind:value={payload}></textarea>

  <div style="display:flex;gap:12px;margin-top:16px;flex-wrap:wrap;">
    <button class="button" on:click={submitPlan}>Run Plan</button>
    <button class="button secondary" on:click={refreshStatus} disabled={!jobId}>Refresh Status</button>
  </div>

  {#if jobId}
    <p class="muted" style="margin-top:16px;">Job ID: <span class="code" style="padding:2px 8px;">{jobId}</span></p>
  {/if}

  {#if status}
    <p class="muted">{status}</p>
  {/if}
  {#if error}
    <p style="color:var(--danger);">{error}</p>
  {/if}
  {#if result}
    <pre class="code" style="margin-top:16px;">{result}</pre>
  {/if}
</div>
