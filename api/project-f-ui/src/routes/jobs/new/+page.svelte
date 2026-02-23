<script lang="ts">
  import { apiFetch } from '$lib/api';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import OptimizationInputBuilder from '$lib/components/OptimizationInputBuilder.svelte';

  let error = '';
  let status = '';

  const sample = {
    drivers: [
      {
        id: 1,
        name: 'Juan Dela Cruz',
        startLocation: [121.0437, 14.676],
        endLocation: [121.0437, 14.676],
        maxTasks: 4,
      },
    ],
    stops: [
      { id: 1, location: [121.0509, 14.5547], serviceSeconds: 300 },
      { id: 2, location: [121.0600, 14.5600], serviceSeconds: 180 },
    ],
  };

  let requestView: 'json' | 'table' = 'json';
  let dataRoot: Record<string, unknown> = { ...sample };
  let payload = JSON.stringify(sample, null, 2);
  let jsonError = '';

  onMount(async () => {
    try {
      await apiFetch('/auth/me');
    } catch {
      goto('/login');
    }
  });

  async function submit() {
    error = '';
    status = 'Submitting job…';
    try {
      const parsed = requestView === 'json' ? JSON.parse(payload) : dataRoot;
      const response = await apiFetch<{ jobId: string }>('/optimization/jobs', {
        method: 'POST',
        body: JSON.stringify(parsed),
      });
      status = 'Job created. Redirecting…';
      await goto(`/jobs/${response.jobId}`);
    } catch (err) {
      error = (err as Error).message;
      status = '';
    }
  }

  function resetSample() {
    dataRoot = { ...sample };
    requestView = 'json';
    payload = JSON.stringify(sample, null, 2);
    jsonError = '';
  }
</script>

<div class="card">
  <h2 style="margin:0 0 8px;">Create Optimization Job</h2>
  <p class="muted" style="margin-top:0;">
    Provide the request payload as JSON or use the table builder.
  </p>

  <OptimizationInputBuilder
    bind:value={dataRoot}
    bind:view={requestView}
    bind:jsonText={payload}
    bind:jsonError={jsonError}
  />

  <div style="display:flex;gap:12px;margin-top:16px;">
    <button class="button" on:click={submit}>Submit Job</button>
    <button class="button secondary" on:click={resetSample}>Reset Sample</button>
  </div>

  {#if status}
    <p class="muted" style="margin-top:16px;">{status}</p>
  {/if}
  {#if error}
    <p style="margin-top:16px;color:var(--danger);">{error}</p>
  {/if}
</div>
